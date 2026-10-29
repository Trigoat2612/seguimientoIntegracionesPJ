/** V1.15.4 · Publicación reversible, cotejo y lectura del Flujo de actividades. */
import {createHash} from 'node:crypto';
import {db} from './incidencias.js';
import {identifyEditor} from '../autorizacion-servidor.js';
import {extractFlowEntries,compareFlowModels,flowPublicationMetadata,rehydrateFlowFromNeon} from '../flujo-actividades-migracion.js';
import {normalizeForChecksum} from '../sincronizacion-modelo.js';
const fail=(res,status,error)=>res.status(status).json({error});
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
async function state(sql){
 const controls=await sql`SELECT module_key,active_source,neon_read_enabled,published_batch_id FROM migration_source_controls WHERE module_key IN ('flujo_actividades','resumen_tactico')`;
 const flow=controls.find(x=>x.module_key==='flujo_actividades'),tactical=controls.find(x=>x.module_key==='resumen_tactico');
 if(!flow||!tactical)throw Object.assign(new Error('La configuración V1.15.2/V1.15.4 está incompleta.'),{status:503});
 return {flow,tactical};
}
async function latest(sql){const r=await sql`SELECT id,checksum,row_count,source_label,imported_at FROM migration_batches WHERE module_key='flujo_actividades' ORDER BY imported_at DESC,id DESC LIMIT 1`;return r[0]||null;}
async function stored(sql){
 const [activities,links,metadata]=await Promise.all([
  sql`SELECT activity_key,activity_position,detail,source_batch_id,tactical_batch_id,no_integration FROM activity_flow_activities WHERE is_active=TRUE ORDER BY activity_position`,
  sql`SELECT link_key,activity_key,link_position,entry,source_batch_id,tactical_batch_id FROM activity_flow_links WHERE is_active=TRUE ORDER BY activity_key,link_position`,
  sql`SELECT source_batch_id,tactical_batch_id,metadata FROM activity_flow_published_metadata WHERE module_key='flujo_actividades'`
 ]);
 return {activities,links,meta:metadata[0]||null};
}
function verifySnapshot(snapshot,batch){
 if(snapshot?.module!=='flujo_actividades'||norm(snapshot?.sourceSheet)!=='etapaactividadintegracion')throw Object.assign(new Error('Carga EtapaActividadIntegracion desde el documento táctico.'),{status:400});
 if(!Array.isArray(snapshot.rows))throw Object.assign(new Error('La copia de actividades no tiene filas.'),{status:400});
 if(!batch||hash(normalizeForChecksum(snapshot.rows))!==batch.checksum)throw Object.assign(new Error('La hoja EtapaActividadIntegracion cambió respecto de la copia guardada. Importa de nuevo antes de publicar.'),{status:409});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return fail(res,405,'Método no permitido.');
 try{
  const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='records';
  const actor=publicRead?'consulta':await identifyEditor(req),sql=db(),ctl=await state(sql);
  const enabled=ctl.flow.active_source==='neon'&&ctl.flow.neon_read_enabled;
  if(req.method==='GET'){
   const action=String(req.query?.action||'status');
   const data=await stored(sql);
   const stale=enabled&&(!data.meta||data.meta.source_batch_id!==ctl.flow.published_batch_id||data.meta.tactical_batch_id!==ctl.tactical.published_batch_id||ctl.tactical.active_source!=='neon'||!ctl.tactical.neon_read_enabled);
   if(action==='records'){
    if(!enabled)return fail(res,409,'El Flujo de actividades todavía utiliza Google Sheets. Publica primero una copia cotejada.');
    if(stale)return fail(res,409,'Resumen táctico o publicación de actividades desactualizados. Vuelve a cotejar y publicar.');
    if(!data.activities.length||data.activities.some(x=>x.source_batch_id!==ctl.flow.published_batch_id||x.tactical_batch_id!==data.meta.tactical_batch_id)||data.links.some(x=>x.source_batch_id!==ctl.flow.published_batch_id||x.tactical_batch_id!==data.meta.tactical_batch_id))return fail(res,409,'El flujo publicado está incompleto o mezcla lotes. Restaura Google Sheets y revisa la publicación.');
    if(data.meta.metadata?.activityCount!==data.activities.length||data.meta.metadata?.linkCount!==data.links.length)return fail(res,409,'Las cantidades del flujo no coinciden con el registro publicado.');
    // Valida también actividades sin integración y claves huérfanas en la reconstrucción.
    rehydrateFlowFromNeon(data.activities,data.links,data.meta.metadata);
    return res.status(200).json({module:'flujo_actividades',batchId:ctl.flow.published_batch_id,tacticalBatchId:data.meta.tactical_batch_id,activities:data.activities,links:data.links,metadata:data.meta.metadata});
   }
   if(action!=='status')return fail(res,400,'Acción no reconocida.');
   const batch=await latest(sql);
   return res.status(200).json({module:'flujo_actividades',activeSource:ctl.flow.active_source,neonEnabled:enabled,publishedBatchId:ctl.flow.published_batch_id,
    sourceTacticalReady:ctl.tactical.active_source==='neon'&&ctl.tactical.neon_read_enabled,tacticalBatchId:ctl.tactical.published_batch_id,
    latestBatch:batch,activityCount:data.activities.length,linkCount:data.links.length,stale});
  }
  const action=String(req.body?.action||'');
  if(action==='rollback'){
   if(req.body?.confirm!==true)return fail(res,400,'Confirma expresamente el regreso a Google Sheets.');
   const rows=await sql`WITH changed AS (
    UPDATE migration_source_controls SET active_source='google_sheets',neon_read_enabled=FALSE,updated_at=NOW()
    WHERE module_key='flujo_actividades' AND active_source='neon' RETURNING published_batch_id
   ),events AS (
    INSERT INTO activity_flow_migration_events(event_type,batch_id,tactical_batch_id,actor_email,activity_count,link_count)
    SELECT 'reverted_to_google',c.published_batch_id,(SELECT tactical_batch_id FROM activity_flow_published_metadata WHERE module_key='flujo_actividades'),${actor},
    (SELECT count(*)::int FROM activity_flow_activities WHERE is_active=TRUE),(SELECT count(*)::int FROM activity_flow_links WHERE is_active=TRUE) FROM changed c RETURNING id
   ) SELECT count(*)::int AS events FROM events`;
   return res.status(200).json({activeSource:'google_sheets',changed:Number(rows[0]?.events||0)>0,message:'Flujo de actividades restaurado a Google Sheets. No se borraron las actividades ni su auditoría.'});
  }
  if(!['preview','publish'].includes(action))return fail(res,400,'Acción no admitida.');
  if(action==='publish'&&req.body?.confirm!==true)return fail(res,400,'La publicación requiere confirmación explícita.');
  if(ctl.tactical.active_source!=='neon'||!ctl.tactical.neon_read_enabled||!ctl.tactical.published_batch_id)return fail(res,409,'Primero publica un Resumen táctico validado en Neon.');
  const batch=await latest(sql);if(!batch)return fail(res,409,'Guarda primero una copia de EtapaActividadIntegracion.');
  if(action==='publish'&&req.body?.batchId!==batch.id)return fail(res,409,'Existe una copia posterior. Vuelve a cotejar.');
  verifySnapshot(req.body?.snapshot,batch);
  const tacticalRows=await sql`SELECT entry FROM tactical_tracking WHERE is_active=TRUE ORDER BY source_row`;
  if(!tacticalRows.length)return fail(res,409,'No hay integraciones de seguimiento publicadas.');
  const model=extractFlowEntries(req.body.snapshot,{entries:tacticalRows.map(x=>x.entry)});
  const existing=await stored(sql);
  const old=existing.activities.length?rehydrateFlowFromNeon(existing.activities,existing.links,existing.meta?.metadata||{}):null;
  const comparison=compareFlowModels(model,old);
  const preview={routes:model.vias.length,steps:model.vias.reduce((n,v)=>n+v.steps.length,0),activities:model.activities.length,
   withoutIntegration:model.activities.filter(a=>a.noIntegration).length,links:model.links.length,unmatched:model.unmatched.length,
   comparison,canPublish:true,warnings:[...model.warnings,...model.sourceWarnings],note:'Incluye actividades sin integración y no infiere validaciones funcionales.'};
  if(action==='preview')return res.status(200).json({module:'flujo_actividades',latestBatch:batch,tacticalBatchId:ctl.tactical.published_batch_id,preview});
  const activityPayload=JSON.stringify(model.activities.map(a=>({...a,activityKey:hash(a.activityKey)})));
  const linkPayload=JSON.stringify(model.links.map(l=>({...l,linkKey:hash(l.linkKey),activityKey:hash(l.activityKey)})));
  const metadata=JSON.stringify({...flowPublicationMetadata(model),activityCount:model.activities.length,linkCount:model.links.length});
  const countActivities=model.activities.length,countLinks=model.links.length;
  // Una sola sentencia/CTE: cambios de fuente, filas, metadatos y auditoría en una transacción.
  const rows=await sql`WITH changed AS (
   UPDATE migration_source_controls SET active_source='neon',neon_read_enabled=TRUE,published_batch_id=${batch.id}::uuid,updated_at=NOW()
   WHERE module_key='flujo_actividades' AND EXISTS (SELECT 1 FROM migration_source_controls tact WHERE tact.module_key='resumen_tactico' AND tact.active_source='neon' AND tact.neon_read_enabled AND tact.published_batch_id=${ctl.tactical.published_batch_id}::uuid)
    AND (active_source<>'neon' OR published_batch_id IS DISTINCT FROM ${batch.id}::uuid
    OR (SELECT tactical_batch_id FROM activity_flow_published_metadata WHERE module_key='flujo_actividades') IS DISTINCT FROM ${ctl.tactical.published_batch_id}::uuid)
   RETURNING module_key
  ),input_a AS (
   SELECT * FROM jsonb_to_recordset(${activityPayload}::jsonb) AS j("activityKey" text,"sourceRow" integer,"activityPosition" integer,"viaName" text,"stepName" text,"stageName" text,"activityName" text,"noIntegration" boolean,detail jsonb)
  ),input_l AS (
   SELECT * FROM jsonb_to_recordset(${linkPayload}::jsonb) AS j("linkKey" text,"activityKey" text,"sourceRow" integer,"linkPosition" integer,entry jsonb)
  ),retired_links AS (
   UPDATE activity_flow_links l SET is_active=FALSE,updated_by=${actor},updated_at=NOW()
   WHERE EXISTS(SELECT 1 FROM changed) AND l.is_active AND NOT EXISTS(SELECT 1 FROM input_l i WHERE i."linkKey"=l.link_key) RETURNING link_key
  ),retired_activities AS (
   UPDATE activity_flow_activities a SET is_active=FALSE,updated_by=${actor},updated_at=NOW()
   WHERE EXISTS(SELECT 1 FROM changed) AND a.is_active AND NOT EXISTS(SELECT 1 FROM input_a i WHERE i."activityKey"=a.activity_key) RETURNING activity_key
  ),saved_a AS (
   INSERT INTO activity_flow_activities(activity_key,source_row,activity_position,route_name,step_name,stage_name,activity_name,no_integration,detail,source_batch_id,tactical_batch_id,is_active,updated_by)
   SELECT i."activityKey",i."sourceRow",i."activityPosition",i."viaName",i."stepName",i."stageName",i."activityName",i."noIntegration",i.detail,${batch.id}::uuid,${ctl.tactical.published_batch_id}::uuid,TRUE,${actor}
   FROM input_a i CROSS JOIN changed
   ON CONFLICT(activity_key) DO UPDATE SET source_row=EXCLUDED.source_row,activity_position=EXCLUDED.activity_position,route_name=EXCLUDED.route_name,step_name=EXCLUDED.step_name,stage_name=EXCLUDED.stage_name,activity_name=EXCLUDED.activity_name,no_integration=EXCLUDED.no_integration,detail=EXCLUDED.detail,source_batch_id=EXCLUDED.source_batch_id,tactical_batch_id=EXCLUDED.tactical_batch_id,is_active=TRUE,updated_by=EXCLUDED.updated_by,updated_at=NOW()
   RETURNING activity_key
  ),saved_l AS (
   INSERT INTO activity_flow_links(link_key,activity_key,source_row,link_position,entry,source_batch_id,tactical_batch_id,is_active,updated_by)
   SELECT i."linkKey",i."activityKey",i."sourceRow",i."linkPosition",i.entry,${batch.id}::uuid,${ctl.tactical.published_batch_id}::uuid,TRUE,${actor}
   FROM input_l i CROSS JOIN changed WHERE EXISTS(SELECT 1 FROM saved_a)
   ON CONFLICT(link_key) DO UPDATE SET activity_key=EXCLUDED.activity_key,source_row=EXCLUDED.source_row,link_position=EXCLUDED.link_position,entry=EXCLUDED.entry,source_batch_id=EXCLUDED.source_batch_id,tactical_batch_id=EXCLUDED.tactical_batch_id,is_active=TRUE,updated_by=EXCLUDED.updated_by,updated_at=NOW()
   RETURNING link_key
  ),stored AS (
   INSERT INTO activity_flow_published_metadata(module_key,source_batch_id,tactical_batch_id,metadata,updated_by)
   SELECT 'flujo_actividades',${batch.id}::uuid,${ctl.tactical.published_batch_id}::uuid,${metadata}::jsonb,${actor}
   FROM changed WHERE (SELECT count(*) FROM saved_a)=${countActivities} AND (SELECT count(*) FROM saved_l)=${countLinks}
   ON CONFLICT(module_key) DO UPDATE SET source_batch_id=EXCLUDED.source_batch_id,tactical_batch_id=EXCLUDED.tactical_batch_id,metadata=EXCLUDED.metadata,updated_by=EXCLUDED.updated_by,updated_at=NOW()
   RETURNING source_batch_id
  ),audited AS (
   INSERT INTO activity_flow_migration_events(event_type,batch_id,tactical_batch_id,actor_email,activity_count,link_count)
   SELECT 'published',source_batch_id,${ctl.tactical.published_batch_id}::uuid,${actor},${countActivities},${countLinks} FROM stored RETURNING id
  ) SELECT count(*)::int AS events FROM audited`;
  const changed=Number(rows[0]?.events||0)>0;
  // No comunicar un falso éxito cuando el UPDATE atómico no hizo cambios (por
  // ejemplo, si el lote táctico se modificó durante la publicación).
  const verified=await state(sql);
  const saved=await stored(sql);
  const consistent=verified.flow.active_source==='neon'&&verified.flow.neon_read_enabled
   &&verified.flow.published_batch_id===batch.id
   &&saved.meta?.source_batch_id===batch.id
   &&saved.meta?.tactical_batch_id===verified.tactical.published_batch_id
   &&verified.tactical.active_source==='neon'&&verified.tactical.neon_read_enabled
   &&saved.activities.filter(x=>x.source_batch_id===batch.id&&x.tactical_batch_id===verified.tactical.published_batch_id).length===countActivities
   &&saved.links.filter(x=>x.source_batch_id===batch.id&&x.tactical_batch_id===verified.tactical.published_batch_id).length===countLinks
   &&saved.activities.length===countActivities&&saved.links.length===countLinks;
  if(!consistent)return fail(res,409,'La publicación no se confirmó íntegramente en Neon. Comprueba que Resumen táctico no haya cambiado y vuelve a cotejar.');
  return res.status(200).json({module:'flujo_actividades',activeSource:'neon',changed,batchId:batch.id,activities:countActivities,links:countLinks,routes:model.vias.length,
   message:changed?'Flujo de actividades publicado en Neon. Compara las vías y los filtros antes de usarlo habitualmente.':'El mismo flujo y seguimiento ya estaban publicados; no se modificaron los datos.'});
 }catch(e){
  if(e.status)return fail(res,e.status,e.message);
  console.error('Flujo de actividades:',e.code||e.name||'Error');
  if(['42P01','42703','23514','42704'].includes(e.code))return fail(res,503,'Esquema V1.15.4 faltante o incompatible. Ejecuta flujo-actividades-v1_15_4.sql en Neon.');
  if(e.code==='23505'||e.code==='23503')return fail(res,409,'Conflicto de relaciones del flujo. Restaura la fuente, coteja y vuelve a publicar.');
  if(/hoja|actividad|etapa|integraci[oó]n|copia|formato|l[ií]mite|fuente|inv[aá]lid|fila|paso|flujo/i.test(e.message||''))return fail(res,400,e.message);
  return fail(res,500,'No se completó la operación del Flujo de actividades. Revisa los registros de la función.');
 }
}
