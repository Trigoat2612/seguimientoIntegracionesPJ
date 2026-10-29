/** V1.15.2: publicar/consultar/revertir Seguimiento sin afectar otros módulos. */
import {createHash} from 'node:crypto';
import {db} from './incidencias.js';
import {identifyEditor} from '../src/server/autorizacion-servidor.js';
import {extractTacticalEntries,compareTacticalEntries} from '../src/shared/tactical/resumen-tactico-migracion.js';
import {normalizeForChecksum} from '../src/shared/sync/sincronizacion-modelo.js';
import {tacticalCategoryCounts} from '../src/shared/tactical/tactical.js';
const error=(res,status,message)=>res.status(status).json({error:message});
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
async function control(sql){
 const rows=await sql`SELECT active_source,neon_read_enabled,published_batch_id FROM migration_source_controls WHERE module_key='resumen_tactico'`;
 if(!rows.length)throw Object.assign(new Error('No está configurado Resumen táctico en migration_source_controls.'),{status:503});
 return rows[0];
}
async function latest(sql){
 const rows=await sql`SELECT id,checksum,row_count,source_label,imported_at FROM migration_batches WHERE module_key='resumen_tactico' ORDER BY imported_at DESC,id DESC LIMIT 1`;
 return rows[0]||null;
}
async function existing(sql){
 const rows=await sql`SELECT entry FROM tactical_tracking WHERE is_active=TRUE ORDER BY source_row`;
 return rows.map(r=>r.entry);
}
function verifyCurrent(snapshot,styles,batch){
 if(snapshot?.module!=='resumen_tactico'||snapshot?.sourceSheet?.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()!=='seguimiento')throw Object.assign(new Error('Actualiza y envía la hoja Seguimiento original antes de cotejar.'),{status:400});
 const normalized=extractTacticalEntries(snapshot,styles);
 const checksum=createHash('sha256').update(normalizeForChecksum(snapshot.rows)).digest('hex');
 if(!batch||checksum!==batch.checksum)throw Object.assign(new Error('Seguimiento no coincide con la última copia en Neon. Guarda una nueva copia y vuelve a cotejar.'),{status:409});
 return normalized;
}
export default async function handler(req,res){
 noCache(res);
 if(!['GET','POST'].includes(req.method))return error(res,405,'Método no permitido.');
 try{
  const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='records';
  const actor=publicRead?'consulta':await identifyEditor(req),sql=db(),ctl=await control(sql);
  const enabled=ctl.active_source==='neon'&&ctl.neon_read_enabled;
  if(req.method==='GET'){
   const action=String(req.query?.action||'status');
   if(action==='records'){
    if(!enabled)return error(res,409,'El Resumen táctico todavía utiliza Google Sheets. Publica primero un lote validado.');
    const entries=await existing(sql);
    if(!entries.length)return error(res,409,'La fuente Neon está habilitada, pero no hay integraciones activas. Restablece Google Sheets hasta reconciliar.');
    return res.status(200).json({module:'resumen_tactico',activeSource:'neon',batchId:ctl.published_batch_id,entries,counts:tacticalCategoryCounts(entries)});
   }
   if(action!=='status')return error(res,400,'Acción de lectura desconocida.');
   const [batch,records]=await Promise.all([latest(sql),existing(sql)]);
   return res.status(200).json({module:'resumen_tactico',activeSource:ctl.active_source,neonEnabled:enabled,
    publishedBatchId:ctl.published_batch_id,latestBatch:batch,activeCount:records.length,
    counts:tacticalCategoryCounts(records),scope:'Filas 1 a 36 de Seguimiento; no incorpora automáticamente las filas posteriores.'});
  }
  const action=String(req.body?.action||'');
  if(action==='rollback'){
   if(req.body?.confirm!==true)return error(res,400,'Debes confirmar el regreso a Google Sheets.');
   const affected=await sql`WITH changed AS (
     UPDATE migration_source_controls SET active_source='google_sheets',neon_read_enabled=FALSE,updated_at=NOW()
     WHERE module_key='resumen_tactico' AND active_source='neon' RETURNING published_batch_id
    ), audited AS (
     INSERT INTO tactical_migration_events(event_type,batch_id,actor_email,integration_count)
     SELECT 'reverted_to_google',published_batch_id,${actor},(SELECT count(*)::int FROM tactical_tracking WHERE is_active=TRUE) FROM changed RETURNING id
    ) SELECT count(*)::int AS events FROM audited`;
   return res.status(200).json({activeSource:'google_sheets',changed:Number(affected[0]?.events||0)>0,
    message:'Resumen táctico vuelve a Google Sheets. Los registros publicados y las copias históricas permanecen en Neon.'});
  }
  if(!['preview','publish'].includes(action))return error(res,400,'Acción no admitida.');
  if(action==='publish'&&req.body?.confirm!==true)return error(res,400,'La publicación exige una confirmación expresa.');
  const batch=await latest(sql);
  if(!batch)return error(res,409,'Importa primero Seguimiento desde Sincronización de datos.');
  if(action==='publish'&&String(req.body?.batchId||'')!==batch.id)return error(res,409,'Se registró una copia más reciente. Vuelve a cotejar.');
  const incoming=verifyCurrent(req.body?.snapshot,req.body?.styles,batch);
  const current=await existing(sql);
  const comparison=compareTacticalEntries(incoming.entries,current);
  const categories=tacticalCategoryCounts(incoming.entries);
  const preview={records:incoming.entries.length,comparison,categories,excludedWithName:incoming.excludedWithName,
   warnings:incoming.validationWarnings.concat(incoming.warnings),canPublish:true,
   note:'Criticidad Crítica = Alta en L con relleno verde directo. Se cotejó la hoja actual y su firma con el lote. La fuente vigente no cambia hasta publicar.'};
  if(action==='preview')return res.status(200).json({module:'resumen_tactico',latestBatch:batch,preview});
  // Protección contra publicar lotes fuera de alcance; Excel continúa disponible.
  if(incoming.entries.length>35)return error(res,409,'La extracción supera las 35 filas de datos admitidas por el alcance 2–36.');
  const rowData=JSON.stringify(incoming.entries.map(e=>({sourceRow:e.row,integrationName:e.name,statusRaw:e.statusRaw,statusGroup:e.status,
   dependency:e.dependency,situationalHistory:e.history,developmentClose:e.developmentClose,testsClose:e.testsClose,gsjValidation:e.gsjValidation,
   criticalityRaw:e.criticality,severityGreen:e.green,severityFillColor:e.greenColor,considerations:e.considerations,entry:e})));
  // ÚNICA instrucción SQL: versión activa, filas completas y auditoría, sin borrados.
  const applied=await sql`
   WITH changed AS (
     UPDATE migration_source_controls SET active_source='neon',neon_read_enabled=TRUE,published_batch_id=${batch.id}::uuid,updated_at=NOW()
     WHERE module_key='resumen_tactico' AND (active_source<>'neon' OR published_batch_id IS DISTINCT FROM ${batch.id}::uuid)
     RETURNING module_key
   ), incoming AS (
     SELECT * FROM jsonb_to_recordset(${rowData}::jsonb) AS x(
       "sourceRow" int,"integrationName" text,"statusRaw" text,"statusGroup" text,
       dependency text,"situationalHistory" text,"developmentClose" text,"testsClose" text,"gsjValidation" text,
       "criticalityRaw" text,"severityGreen" boolean,"severityFillColor" text,considerations text,entry jsonb)
   ), inactive AS (
     UPDATE tactical_tracking t SET is_active=FALSE,updated_by=${actor},updated_at=NOW()
     WHERE EXISTS(SELECT 1 FROM changed) AND is_active=TRUE AND NOT EXISTS(SELECT 1 FROM incoming x WHERE x."sourceRow"=t.source_row)
     RETURNING source_row
   ), saved AS (
     INSERT INTO tactical_tracking(source_row,integration_name,status_raw,status_group,dependency,situational_history,
       development_close,tests_close,gsj_validation,criticality_raw,severity_green,severity_fill_color,
       considerations,entry,source_batch_id,is_active,updated_by)
     SELECT i."sourceRow",i."integrationName",i."statusRaw",i."statusGroup",i.dependency,i."situationalHistory",
       i."developmentClose",i."testsClose",i."gsjValidation",i."criticalityRaw",i."severityGreen",i."severityFillColor",
       i.considerations,i.entry,${batch.id}::uuid,TRUE,${actor}
     FROM incoming i CROSS JOIN changed
     ON CONFLICT(source_row) DO UPDATE SET integration_name=EXCLUDED.integration_name,status_raw=EXCLUDED.status_raw,
       status_group=EXCLUDED.status_group,dependency=EXCLUDED.dependency,situational_history=EXCLUDED.situational_history,
       development_close=EXCLUDED.development_close,tests_close=EXCLUDED.tests_close,gsj_validation=EXCLUDED.gsj_validation,
       criticality_raw=EXCLUDED.criticality_raw,severity_green=EXCLUDED.severity_green,
       severity_fill_color=EXCLUDED.severity_fill_color,considerations=EXCLUDED.considerations,
       entry=EXCLUDED.entry,source_batch_id=EXCLUDED.source_batch_id,is_active=TRUE,updated_by=EXCLUDED.updated_by,updated_at=NOW()
     RETURNING source_row
   ), audited AS (
     INSERT INTO tactical_migration_events(event_type,batch_id,actor_email,integration_count)
     SELECT 'published',${batch.id}::uuid,${actor},(SELECT count(*)::int FROM saved)
     FROM changed WHERE (SELECT count(*) FROM saved)=${incoming.entries.length}
     RETURNING id
   ) SELECT count(*)::int AS events FROM audited`;
  const changed=Number(applied[0]?.events||0)>0;
  return res.status(200).json({activeSource:'neon',changed,batchId:batch.id,count:incoming.entries.length,categories,
   message:changed?'Resumen táctico publicado en Neon. Puedes alternar entre ambas fuentes y comparar los resultados.':'El lote ya estaba publicado; no se realizaron cambios.'});
 }catch(e){
  if(e.status)return error(res,e.status,e.message);
  console.error('Resumen táctico:',e.code||e.name||'Error');
  if(e.code==='42P01'||e.code==='42703'||e.code==='23514')return error(res,503,'Estructuras V1.15.2 incompletas o incompatibles. Ejecuta resumen-tactico-v1_15_2.sql en Neon.');
  if(e.code==='23505')return error(res,409,'Existe un conflicto de integridad en el seguimiento. Repite el cotejo.');
  if(/No se encontró|filas|formato|registro|repetid|rango|metadatos|inválid|excede|hoja|lote/i.test(e.message||''))return error(res,400,e.message);
  return error(res,500,'No fue posible consultar o publicar el Resumen táctico. Revisa el servidor y la migración V1.15.2.');
 }
}
