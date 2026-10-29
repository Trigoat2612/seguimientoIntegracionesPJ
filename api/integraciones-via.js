/** V1.15.3: cotejo, publicación reversible y lectura de Integraciones por vía. */
import {createHash} from 'node:crypto';
import {db} from './incidencias.js';
import {identifyEditor} from '../src/server/autorizacion-servidor.js';
import {extractViaEntries,compareViaEntries,viaPublicationMetadata} from '../src/shared/routes/integraciones-via-migracion.js';
import {normalizeForChecksum} from '../src/shared/sync/sincronizacion-modelo.js';
const send=(res,status,error)=>res.status(status).json({error});
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function state(sql){
 const c=await sql`SELECT module_key,active_source,neon_read_enabled,published_batch_id FROM migration_source_controls WHERE module_key IN ('integraciones_via','resumen_tactico')`;
 const via=c.find(x=>x.module_key==='integraciones_via'),tactical=c.find(x=>x.module_key==='resumen_tactico');
 if(!via||!tactical)throw Object.assign(new Error('No están configurados los módulos V1.15.2 y V1.15.3.'),{status:503});
 return {via,tactical};
}
async function latest(sql){const rows=await sql`SELECT id,checksum,row_count,source_label,imported_at FROM migration_batches WHERE module_key='integraciones_via' ORDER BY imported_at DESC,id DESC LIMIT 1`;return rows[0]||null;}
async function records(sql){const entries=await sql`SELECT relation_key,entry,source_batch_id,tactical_batch_id FROM route_integration_links WHERE is_active=TRUE ORDER BY link_position`;return entries;}
async function publishedMetadata(sql){const r=await sql`SELECT source_batch_id,tactical_batch_id,metadata FROM route_published_metadata WHERE module_key='integraciones_via'`;return r[0]||null;}
async function tacticalRecords(sql){const entries=await sql`SELECT entry FROM tactical_tracking WHERE is_active=TRUE ORDER BY source_row`;return entries.map(e=>e.entry);}
function verifySnapshot(snapshot,batch){
 if(snapshot?.module!=='integraciones_via'||norm(snapshot?.sourceSheet)!=='integracionesetapa')throw Object.assign(new Error('Carga la hoja IntegracionesEtapa original.'),{status:400});
 const checksum=createHash('sha256').update(normalizeForChecksum(snapshot.rows)).digest('hex');
 if(!batch||checksum!==batch.checksum)throw Object.assign(new Error('IntegracionesEtapa difiere de la última copia: guarda una nueva copia y coteja nuevamente.'),{status:409});
}
export default async function handler(req,res){
 noCache(res);if(!['GET','POST'].includes(req.method))return send(res,405,'Método no permitido.');
 try{
  const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='records';
  const actor=publicRead?'consulta':await identifyEditor(req),sql=db(),ctl=await state(sql);
  const enabled=ctl.via.active_source==='neon'&&ctl.via.neon_read_enabled;
  if(req.method==='GET'){
   const action=String(req.query?.action||'status');
   if(action==='records'){
    if(!enabled)return send(res,409,'Integraciones por vía utiliza Google Sheets. Publica primero un lote cotejado.');
    const [rows,meta]=await Promise.all([records(sql),publishedMetadata(sql)]);
    if(!rows.length||!meta||rows.some(x=>x.source_batch_id!==ctl.via.published_batch_id||x.tactical_batch_id!==meta.tactical_batch_id))return send(res,409,'Las asociaciones publicadas no están completas. Restablece Google Sheets y revisa la migración.');
    if(ctl.tactical.active_source!=='neon'||!ctl.tactical.neon_read_enabled||meta.source_batch_id!==ctl.via.published_batch_id||meta.tactical_batch_id!==ctl.tactical.published_batch_id)return send(res,409,'El Resumen táctico cambió desde la última publicación de vías. Coteja y publica de nuevo las asociaciones.');
    return res.status(200).json({module:'integraciones_via',activeSource:'neon',batchId:ctl.via.published_batch_id,tacticalBatchId:meta.tactical_batch_id,entries:rows.map(r=>({entry:r.entry})),metadata:meta.metadata});
   }
   if(action!=='status')return send(res,400,'Acción de consulta desconocida.');
   const [batch,items,meta]=await Promise.all([latest(sql),records(sql),publishedMetadata(sql)]);
   return res.status(200).json({module:'integraciones_via',activeSource:ctl.via.active_source,neonEnabled:enabled,publishedBatchId:ctl.via.published_batch_id,
    tacticalBatchId:ctl.tactical.published_batch_id,sourceTacticalReady:ctl.tactical.active_source==='neon'&&ctl.tactical.neon_read_enabled,
    latestBatch:batch,activeCount:items.length,publishedTacticalBatchId:meta?.tactical_batch_id||null,
    stale:enabled&&(!meta||meta.tactical_batch_id!==ctl.tactical.published_batch_id)});
  }
  const action=String(req.body?.action||'');
  if(action==='rollback'){
   if(req.body?.confirm!==true)return send(res,400,'Confirma expresamente el regreso a Google Sheets.');
   const result=await sql`WITH changed AS (
    UPDATE migration_source_controls SET active_source='google_sheets',neon_read_enabled=FALSE,updated_at=NOW() WHERE module_key='integraciones_via' AND active_source='neon' RETURNING published_batch_id
   ),events AS (
    INSERT INTO route_migration_events(event_type,batch_id,tactical_batch_id,actor_email,association_count)
    SELECT 'reverted_to_google',c.published_batch_id,(SELECT tactical_batch_id FROM route_published_metadata WHERE module_key='integraciones_via'),${actor},(SELECT count(*)::int FROM route_integration_links WHERE is_active=TRUE) FROM changed c RETURNING id
   ) SELECT count(*)::int AS events FROM events`;
   return res.status(200).json({activeSource:'google_sheets',changed:Number(result[0]?.events||0)>0,message:'Integraciones por vía vuelve a Google Sheets. Se conservaron las asociaciones y el historial de Neon.'});
  }
  if(!['preview','publish'].includes(action))return send(res,400,'Acción no admitida.');
  if(action==='publish'&&req.body?.confirm!==true)return send(res,400,'La publicación exige confirmación explícita.');
  if(ctl.tactical.active_source!=='neon'||!ctl.tactical.neon_read_enabled||!ctl.tactical.published_batch_id)return send(res,409,'Publica primero un Resumen táctico validado en Neon.');
  const batch=await latest(sql);if(!batch)return send(res,409,'Importa primero IntegracionesEtapa desde Sincronización de datos.');
  if(action==='publish'&&req.body?.batchId!==batch.id)return send(res,409,'Se registró una copia posterior: vuelve a cotejar.');
  verifySnapshot(req.body?.snapshot,batch);
  const tactical=await tacticalRecords(sql);if(!tactical.length)return send(res,409,'El Resumen táctico publicado no contiene registros.');
  const mapping=req.body?.mapping||{};
  if(typeof mapping!=='object'||Array.isArray(mapping)||JSON.stringify(mapping).length>12000)return send(res,400,'Configuración de columnas inválida.');
  const model=extractViaEntries(req.body.snapshot,{entries:tactical},mapping);
  const existing=await records(sql),comparison=compareViaEntries(model.entries,existing.map(x=>x.entry));
  const preview={records:model.entries.length,routes:model.vias.length,stages:model.vias.reduce((n,v)=>n+v.stages.length,0),
   matched:model.entries.filter(e=>e.matched).length,unmatched:model.unmatched.length,comparison,canPublish:true,
   warnings:[...(model.warnings||[]),...(model.sourceWarnings||[])],
   note:'La fuente de estados se toma del Resumen táctico publicado en Neon. Las asociaciones no constituyen nuevas validaciones funcionales.'};
  if(action==='preview')return res.status(200).json({module:'integraciones_via',latestBatch:batch,tacticalBatchId:ctl.tactical.published_batch_id,preview});
  // Guardado atómico: fuente, relaciones, metadatos y auditoría.
  const payload=JSON.stringify(model.entries.map((e,index)=>({relationKey:createHash('sha256').update([e.via,e.stage,e.name].map(norm).join('|')).digest('hex'),
   sourceRow:e.row,linkPosition:index,routeName:e.via,stageName:e.stage,integrationName:e.name,isReady:e.ready,isMatched:e.matched,entry:e})));
  const meta=JSON.stringify(viaPublicationMetadata(model,mapping));
  const count=model.entries.length;
  const result=await sql`WITH changed AS (
   UPDATE migration_source_controls SET active_source='neon',neon_read_enabled=TRUE,published_batch_id=${batch.id}::uuid,updated_at=NOW()
   WHERE module_key='integraciones_via' AND (active_source<>'neon' OR published_batch_id IS DISTINCT FROM ${batch.id}::uuid
    OR (SELECT tactical_batch_id FROM route_published_metadata WHERE module_key='integraciones_via') IS DISTINCT FROM ${ctl.tactical.published_batch_id}::uuid)
   RETURNING module_key
  ),input AS (
   SELECT * FROM jsonb_to_recordset(${payload}::jsonb) AS j("relationKey" text,"sourceRow" int,"linkPosition" int,"routeName" text,"stageName" text,"integrationName" text,"isReady" boolean,"isMatched" boolean,entry jsonb)
  ),retired AS (
   UPDATE route_integration_links r SET is_active=FALSE,updated_by=${actor},updated_at=NOW()
   WHERE EXISTS(SELECT 1 FROM changed) AND r.is_active=TRUE AND NOT EXISTS(SELECT 1 FROM input i WHERE i."relationKey"=r.relation_key)
   RETURNING relation_key
  ),saved AS (
   INSERT INTO route_integration_links(relation_key,source_row,link_position,route_name,stage_name,integration_name,is_ready,is_matched,entry,source_batch_id,tactical_batch_id,is_active,updated_by)
   SELECT i."relationKey",i."sourceRow",i."linkPosition",i."routeName",i."stageName",i."integrationName",i."isReady",i."isMatched",i.entry,${batch.id}::uuid,${ctl.tactical.published_batch_id}::uuid,TRUE,${actor}
   FROM input i CROSS JOIN changed
   ON CONFLICT(relation_key) DO UPDATE SET source_row=EXCLUDED.source_row,link_position=EXCLUDED.link_position,route_name=EXCLUDED.route_name,stage_name=EXCLUDED.stage_name,integration_name=EXCLUDED.integration_name,is_ready=EXCLUDED.is_ready,is_matched=EXCLUDED.is_matched,entry=EXCLUDED.entry,source_batch_id=EXCLUDED.source_batch_id,tactical_batch_id=EXCLUDED.tactical_batch_id,is_active=TRUE,updated_by=EXCLUDED.updated_by,updated_at=NOW()
   RETURNING relation_key
  ),stored AS (
   INSERT INTO route_published_metadata(module_key,source_batch_id,tactical_batch_id,metadata,updated_by)
   SELECT 'integraciones_via',${batch.id}::uuid,${ctl.tactical.published_batch_id}::uuid,${meta}::jsonb,${actor} FROM changed
   WHERE (SELECT count(*) FROM saved)=${count}
   ON CONFLICT(module_key) DO UPDATE SET source_batch_id=EXCLUDED.source_batch_id,tactical_batch_id=EXCLUDED.tactical_batch_id,metadata=EXCLUDED.metadata,updated_by=EXCLUDED.updated_by,updated_at=NOW()
   RETURNING source_batch_id
  ),audited AS (
   INSERT INTO route_migration_events(event_type,batch_id,tactical_batch_id,actor_email,association_count)
   SELECT 'published',source_batch_id,${ctl.tactical.published_batch_id}::uuid,${actor},${count} FROM stored RETURNING id
  ) SELECT count(*)::int AS events FROM audited`;
  const changed=Number(result[0]?.events||0)>0;
  return res.status(200).json({module:'integraciones_via',activeSource:'neon',changed,batchId:batch.id,tacticalBatchId:ctl.tactical.published_batch_id,count,routeCount:model.vias.length,
   message:changed?'Integraciones por vía publicadas en Neon. Alterna las fuentes y comprueba los PPT.':'El mismo lote y seguimiento ya están publicados; no se alteraron los datos.'});
 }catch(e){
  if(e.status)return send(res,e.status,e.message);
  console.error('Integraciones por vía:',e.code||e.name||'Error');
  if(['42P01','42703','23514','42704'].includes(e.code))return send(res,503,'Esquema V1.15.3 faltante o incompatible. Ejecuta integraciones-via-v1_15_3.sql en la misma base de Neon.');
  if(e.code==='23505')return send(res,409,'Conflicto de claves de asociación. Actualiza el cotejo.');
  if(/hoja|asociaci[oó]n|columna|mapeo|encabezado|formato|fuente|sin.*registro|límite|inv[aá]lid|fila/i.test(e.message||''))return send(res,400,e.message);
  return send(res,500,'No fue posible completar la operación de Integraciones por vía. Revisa el registro del servidor.');
 }
}
