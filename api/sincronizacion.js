/** V1.15.0: importaciones preliminares inmutables. Nunca activa Neon como fuente del dashboard. */
import {createHash,randomUUID} from 'node:crypto';
import {identifyEditor,db} from './incidencias.js';
import {SYNC_MODULES,moduleFor,validateSheetSnapshot,normalizeForChecksum,compareSheetRows,snapshotByteLength,MAX_SNAPSHOT_BYTES} from '../sincronizacion-modelo.js';

const reply=(res,status,error)=>res.status(status).json({error});
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
const batchInfo=b=>b?{id:b.id,module:b.module_key,source:b.source_label,rowCount:b.row_count,checksum:b.checksum,importedAt:b.imported_at,importedBy:b.imported_by,comparison:b.comparison,warnings:b.warnings}:null;
async function readLatest(sql,module){
 const batches=await sql`SELECT id,module_key,source_label,row_count,checksum,imported_at,imported_by,comparison,warnings
  FROM migration_batches WHERE module_key=${module} ORDER BY imported_at DESC,id DESC LIMIT 1`;
 if(!batches.length)return {batch:null,rows:[]};
 const raw=await sql`SELECT row_number,cells FROM migration_batch_rows WHERE batch_id=${batches[0].id} ORDER BY row_number`;
 return {batch:batches[0],rows:raw.map(r=>r.cells)};
}
function sanitizedInput(body){
 const moduleId=String(body?.module||''),sourceSheet=String(body?.sourceSheet||'');
 if(!moduleFor(moduleId))throw Object.assign(new Error('Módulo de sincronización desconocido.'),{status:400});
 if(typeof body?.sourceLabel!=='string'||body.sourceLabel.trim().length<2||body.sourceLabel.length>180)throw Object.assign(new Error('Indica una fuente de origen válida.'),{status:400});
 const parsed=validateSheetSnapshot({module:moduleId,sourceSheet,rows:body?.rows});
 if(!parsed.valid)throw Object.assign(new Error(`Validación de origen: ${parsed.errors.slice(0,4).join(' ')}`),{status:400});
 if(snapshotByteLength(parsed.rows)>MAX_SNAPSHOT_BYTES)throw Object.assign(new Error('La hoja supera el límite de 3,2 MB por importación; no se recortará la bitácora. Se requiere importación por lotes.'),{status:413});
 return {moduleId,sourceSheet,sourceLabel:body.sourceLabel.trim(),rows:parsed.rows,warnings:parsed.warnings,count:parsed.count};
}
export default async function handler(req,res){
 noCache(res);
 if(!['GET','POST'].includes(req.method))return reply(res,405,'Método no permitido.');
 try{
  const actor=await identifyEditor(req);
  const sql=db();
  if(req.method==='GET'){
   if(req.query?.action==='history'){
    const moduleId=String(req.query.module||'');if(!moduleFor(moduleId))return reply(res,400,'Módulo inválido.');
    const data=await sql`SELECT id,module_key,source_label,row_count,checksum,imported_at,imported_by,comparison,warnings
      FROM migration_batches WHERE module_key=${moduleId} ORDER BY imported_at DESC,id DESC LIMIT 15`;
    return res.status(200).json({module:moduleId,batches:data.map(batchInfo)});
   }
   const controls=await sql`SELECT s.module_key,s.sheet_name,s.active_source,s.neon_read_enabled,
       b.id,b.source_label,b.row_count,b.checksum,b.imported_by,b.imported_at,b.comparison,b.warnings
     FROM migration_source_controls s
     LEFT JOIN LATERAL (SELECT id,source_label,row_count,checksum,imported_by,imported_at,comparison,warnings
       FROM migration_batches WHERE module_key=s.module_key ORDER BY imported_at DESC,id DESC LIMIT 1) b ON TRUE
     ORDER BY s.module_key`;
   return res.status(200).json({stage:'v1.15.0',readOnlySources:true,
     modules:SYNC_MODULES.map(m=>{
      const row=controls.find(r=>r.module_key===m.id);
      return {...m,activeSource:row?.active_source||'google_sheets',neonEnabled:!!row?.neon_read_enabled,
       lastBatch:row?.id?batchInfo({id:row.id,module_key:m.id,source_label:row.source_label,row_count:row.row_count,checksum:row.checksum,imported_at:row.imported_at,imported_by:row.imported_by,comparison:row.comparison,warnings:row.warnings}):null};
     }),actor});
  }
  const action=String(req.body?.action||'');
  if(!['compare','stage'].includes(action))return reply(res,400,'Acción de sincronización inválida.');
  const input=sanitizedInput(req.body);
  const {batch,rows:previous}=await readLatest(sql,input.moduleId);
  const comparison=compareSheetRows(input.rows,previous);
  const checksum=createHash('sha256').update(normalizeForChecksum(input.rows)).digest('hex');
  if(action==='compare')return res.status(200).json({module:input.moduleId,sourceSheet:input.sourceSheet,checksum,
    currentRows:input.rows.length,lastBatch:batchInfo(batch),comparison,warnings:input.warnings,
    message:'Comparación de la fuente actual contra la última copia preliminar en Neon. No modifica información.'});
  if(batch?.checksum===checksum)return res.status(200).json({staged:false,duplicate:true,
    batch:batchInfo(batch),comparison:{...comparison,identical:true},warnings:input.warnings,
    message:'La hoja coincide con la última copia. No se generó una importación duplicada.'});
  const existing=await sql`SELECT id,module_key,source_label,row_count,checksum,imported_at,imported_by,comparison,warnings
    FROM migration_batches WHERE module_key=${input.moduleId} AND checksum=${checksum} LIMIT 1`;
  if(existing.length)return res.status(200).json({staged:false,duplicate:true,batch:batchInfo(existing[0]),comparison,warnings:input.warnings,
    message:'Esta versión ya está guardada como copia preliminar. Se mantiene el historial existente.'});
  const id=randomUUID(),rowsJson=JSON.stringify(input.rows),comparisonJson=JSON.stringify(comparison),warningsJson=JSON.stringify(input.warnings);
  // Una sola instrucción SQL CTE: cabecera, filas y auditoría se confirman de forma atómica.
  const inserted=await sql`
   WITH new_batch AS (
     INSERT INTO migration_batches(id,module_key,sheet_name,source_label,checksum,row_count,previous_batch_id,comparison,warnings,imported_by)
     VALUES (${id}::uuid,${input.moduleId},${input.sourceSheet},${input.sourceLabel},${checksum},${input.rows.length},${batch?.id||null}::uuid,${comparisonJson}::jsonb,${warningsJson}::jsonb,${actor})
     RETURNING id
   ), copied_rows AS (
     INSERT INTO migration_batch_rows(batch_id,row_number,cells)
     SELECT new_batch.id, e.ordinality::int,e.cells
     FROM new_batch CROSS JOIN LATERAL jsonb_array_elements(${rowsJson}::jsonb) WITH ORDINALITY AS e(cells,ordinality)
     RETURNING row_number
   ), log_event AS (
     INSERT INTO migration_audit_events(module_key,batch_id,event_type,actor_email)
     SELECT ${input.moduleId},new_batch.id,'imported',${actor}
     FROM new_batch
     WHERE (SELECT count(*) FROM copied_rows)=${input.rows.length}
     RETURNING id
   )
   SELECT id FROM new_batch WHERE EXISTS(SELECT 1 FROM log_event)
  `;
  if(!inserted.length)throw new Error('No fue posible confirmar la copia completa.');
  return res.status(201).json({staged:true,duplicate:false,module:input.moduleId,batchId:id,
    rows:input.rows.length,checksum,comparison,warnings:input.warnings,
    activeSource:'google_sheets',message:'Copia preliminar guardada en Neon; las pestañas del tablero no han cambiado de fuente.'});
 }catch(err){
  if(err.status)return reply(res,err.status,err.message);
  console.error('Sincronización:',err.code||err.name||'Error');
  if(err.code==='42P01')return reply(res,503,'Faltan tablas de sincronización. Ejecuta sincronizacion-v1_15_0.sql en Neon.');
  if(err.code==='23505')return reply(res,409,'Una copia idéntica fue registrada simultáneamente. Actualiza el historial.');
  if(err.code==='42P16'||err.code==='42703')return reply(res,503,'El esquema de sincronización de Neon no coincide con esta versión. Comprueba que ejecutaste sincronizacion-v1_15_0.sql en la rama Development.');
  if(/fetch failed|ECONNREFUSED|ENOTFOUND|authentication failed/i.test(err.message||''))return reply(res,503,'No fue posible conectar con Neon. Comprueba DATABASE_URL.');
  return reply(res,500,'Error al comparar o guardar la copia preliminar. Comprueba la migración y el registro del servidor.');
 }
}
