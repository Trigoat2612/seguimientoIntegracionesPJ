/** V1.15.1: normalización y activación reversible SOLO de Documentos Clave. */
import {createHash} from 'node:crypto';
import {db} from './incidencias.js';
import {identifyEditor} from '../src/server/autorizacion-servidor.js';
import {extractKeyDocuments,compareKeyDocuments} from '../src/shared/documents/documentos-clave-migracion.js';
import {normalizeForChecksum} from '../src/shared/sync/sincronizacion-modelo.js';
const respond=(res,status,error)=>res.status(status).json({error});
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
async function readControl(sql){
 const result=await sql`SELECT active_source,neon_read_enabled,published_batch_id
   FROM migration_source_controls WHERE module_key='documentos_clave'`;
 if(!result.length)throw Object.assign(new Error('No existe el control de Documentos Clave en Neon.'),{status:503});
 return result[0];
}
async function latestCopy(sql){
 const rows=await sql`SELECT id,checksum,row_count,imported_at,source_label FROM migration_batches
   WHERE module_key='documentos_clave' ORDER BY imported_at DESC,id DESC LIMIT 1`;
 if(!rows.length)return null;
 return rows[0];
}
async function copyDocuments(sql,id){
 const rows=await sql`SELECT row_number,cells FROM migration_batch_rows WHERE batch_id=${id}::uuid ORDER BY row_number`;
 return extractKeyDocuments({module:'documentos_clave',sourceSheet:'CatalogoDocumentos',rows:rows.map(x=>x.cells)});
}
async function activeDocuments(sql){
 const rows=await sql`SELECT document_code AS code,document_name AS name,source_row AS "sourceRow"
  FROM key_documents WHERE is_active=TRUE ORDER BY source_row,document_code`;
 return rows;
}
async function legacyReferences(sql){
 const rows=await sql`SELECT DISTINCT document_code FROM (
  SELECT document_code FROM document_incidents
  UNION ALL SELECT document_code FROM document_reviews
 ) existing ORDER BY document_code`;
 return rows.map(r=>r.document_code);
}
export default async function handler(req,res){
 noCache(res);
 if(!['GET','POST'].includes(req.method))return respond(res,405,'Método no permitido.');
 try{
  const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='catalog';
  const actor=publicRead?'consulta':await identifyEditor(req);
  const sql=db();const control=await readControl(sql);
  const active=control.active_source==='neon'&&control.neon_read_enabled;
  if(req.method==='GET'){
   const action=String(req.query?.action||'status');
   if(action==='catalog'){
    if(!active)return respond(res,409,'Neon todavía no está habilitado para la lectura de Documentos Clave.');
    return res.status(200).json({module:'documentos_clave',activeSource:'neon',
      batchId:control.published_batch_id,documents:await activeDocuments(sql),actor});
   }
   if(!['status','preview'].includes(action))return respond(res,400,'Acción no admitida.');
   const batch=await latestCopy(sql);
   const info={module:'documentos_clave',activeSource:control.active_source,
    neonEnabled:active,publishedBatchId:control.published_batch_id,latestBatch:batch,
    activeCount:(await activeDocuments(sql)).length};
   if(action==='status'||!batch)return res.status(200).json(info);
   const [incoming,current,refs]=await Promise.all([copyDocuments(sql,batch.id),activeDocuments(sql),legacyReferences(sql)]);
   const diff=compareKeyDocuments(incoming,current);
   const stagedCodes=new Set(incoming.map(d=>d.code.toLocaleUpperCase('es')));
   const unmatched=refs.filter(code=>!stagedCodes.has(code.toLocaleUpperCase('es')));
   return res.status(200).json({...info,preview:{records:incoming.length,comparison:diff,
    referencesChecked:refs.length,unmatchedReferences:unmatched.slice(0,50),
    canPublish:unmatched.length===0,
    note:'Antes de publicar, vuelve a cargar Google Sheets y contrasta su contenido con la copia registrada.'}});
  }
  const action=String(req.body?.action||'');
  if(action==='rollback'){
   if(req.body?.confirm!==true)return respond(res,400,'Confirma expresamente el regreso a Google Sheets.');
   // Un único statement: cambio de origen y auditoría. Las filas y bitácoras permanecen intactas.
   const result=await sql`
    WITH changed AS (
      UPDATE migration_source_controls SET active_source='google_sheets',neon_read_enabled=FALSE,updated_at=NOW()
      WHERE module_key='documentos_clave' AND active_source='neon' RETURNING published_batch_id
    ), logged AS (
      INSERT INTO key_document_migration_events(event_type,batch_id,actor_email,document_count)
      SELECT 'reverted_to_google',published_batch_id,${actor},
       (SELECT count(*)::int FROM key_documents WHERE is_active=TRUE) FROM changed RETURNING id
    ) SELECT count(*)::int AS updated FROM logged`;
   return res.status(200).json({activeSource:'google_sheets',changed:Number(result[0]?.updated||0)>0,
     message:'Documentos Clave volvió a Google Sheets. No se han borrado incidencias ni copias de Neon.'});
  }
  if(action!=='publish')return respond(res,400,'Acción no admitida.');
  if(req.body?.confirm!==true)return respond(res,400,'La publicación requiere confirmación explícita.');
  const batchId=String(req.body?.batchId||'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(batchId))return respond(res,400,'Identificador de copia inválido.');
  const batch=await latestCopy(sql);
  if(!batch||batch.id!==batchId)return respond(res,409,'La copia seleccionada ya no es la última; compara de nuevo.');
  // Reexigir el libro leído desde Google en esta sesión para impedir publicar una copia obsoleta.
  const source=req.body?.snapshot;
  if(source?.module!=='documentos_clave'||!Array.isArray(source.rows))return respond(res,400,'Actualiza el libro Google Sheets y proporciona la copia actual antes de publicar.');
  const incoming=extractKeyDocuments(source);
  const checksum=createHash('sha256').update(normalizeForChecksum(source.rows)).digest('hex');
  if(checksum!==batch.checksum)return respond(res,409,'La hoja actual difiere de la copia preliminar de Neon. Guarda una nueva copia y vuelve a comparar.');
  const refs=await legacyReferences(sql),codes=new Set(incoming.map(d=>d.code.toLocaleUpperCase('es')));
  const unlinked=refs.filter(code=>!codes.has(code.toLocaleUpperCase('es')));
  if(unlinked.length)return respond(res,409,`Existen ${unlinked.length} código(s) con incidencias o revisiones en Neon que no figuran en el catálogo. Reconcílialos antes de publicar: ${unlinked.slice(0,6).join(', ')}.`);
  const documentsJSON=JSON.stringify(incoming);
  // Actualización y auditoría en UN statement SQL atómico. Una publicación simultánea
  // no puede dejar el control activo sin registrar sus filas.
  const applied=await sql`
   WITH changed AS (
    UPDATE migration_source_controls
    SET active_source='neon',neon_read_enabled=TRUE,published_batch_id=${batchId}::uuid,updated_at=NOW()
    WHERE module_key='documentos_clave' AND
      (active_source<>'neon' OR published_batch_id IS DISTINCT FROM ${batchId}::uuid)
    RETURNING module_key
   ), incoming AS (
    SELECT code,name,"sourceRow" AS row_num
    FROM jsonb_to_recordset(${documentsJSON}::jsonb) AS x(code text,name text,"sourceRow" integer)
   ), removed AS (
    UPDATE key_documents d SET is_active=FALSE,updated_by=${actor},updated_at=NOW()
    WHERE EXISTS(SELECT 1 FROM changed) AND d.is_active=TRUE AND
      NOT EXISTS(SELECT 1 FROM incoming s WHERE s.code=d.document_code)
    RETURNING document_code
   ), saved AS (
    INSERT INTO key_documents(document_code,document_name,source_row,source_batch_id,is_active,updated_by)
    SELECT i.code,i.name,i.row_num,${batchId}::uuid,TRUE,${actor}
    FROM incoming i CROSS JOIN changed
    ON CONFLICT (document_code) DO UPDATE SET
       document_name=EXCLUDED.document_name,source_row=EXCLUDED.source_row,
       source_batch_id=EXCLUDED.source_batch_id,is_active=TRUE,
       updated_by=EXCLUDED.updated_by,updated_at=NOW()
    RETURNING document_code
   ), audited AS (
    INSERT INTO key_document_migration_events(event_type,batch_id,actor_email,document_count)
    SELECT 'published',${batchId}::uuid,${actor},(SELECT count(*)::int FROM saved)
    FROM changed WHERE (SELECT count(*) FROM saved)=${incoming.length}
    RETURNING id
   ) SELECT count(*)::int AS events FROM audited`;
  const changed=Number(applied[0]?.events||0)>0;
  return res.status(200).json({activeSource:'neon',changed,batchId,count:incoming.length,
   message:changed?'Catálogo de Documentos Clave publicado en Neon. Puedes consultar la nueva fuente.':'Esta copia ya está publicada en Neon.'});
 }catch(err){
  if(err.status)return respond(res,err.status,err.message);
  console.error('Documentos Clave:',err.code||err.name||'Error');
  if(err.code==='42P01'||err.code==='42703')return respond(res,503,'Faltan estructuras de V1.15.1. Ejecuta documentos-clave-v1_15_1.sql en la base de datos correspondiente.');
  if(err.code==='23514'||err.code==='23505')return respond(res,409,'El catálogo no supera las restricciones de integridad; actualiza los datos y vuelve a comparar.');
  if(/No se encontró|duplicad|Fila \d|código|nombre|vacío|documentos importables|Faltan encabezados/i.test(err.message||''))return respond(res,400,err.message);
  return respond(res,500,'No pudo completarse la operación documental. Consulta los registros del servidor.');
 }
}
