/** V1.15.5.5 · Consulta pública; escritura y publicación exclusivamente por editor. */
import {createHash} from 'node:crypto';
import {db} from './incidencias.js';
import {identifyEditor} from '../src/server/autorizacion-servidor.js';
import {parseTrackingSnapshot,validateTrackingCreate} from '../src/shared/documents/seguimiento-documental.js';
import {validateSheetSnapshot} from '../src/shared/sync/sincronizacion-modelo.js';
const reply=(res,n,error)=>res.status(n).json({error});
const key=s=>String(s??'').trim().toUpperCase();
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
const serialize=r=>({id:r.id,documentCode:r.document_code,date:r.event_date,status:r.status,sourceStatus:r.source_status,activity:r.activity,comments:r.comments,responsible:r.responsible,validatorTeams:r.validator_teams,stage:r.stage,origin:r.origin,createdAt:r.created_at});
const fingerprint=x=>JSON.stringify([x.documentCode,x.date,x.status,x.sourceStatus,x.activity,x.comments,x.responsible,x.validatorTeams,x.stage]);
const sha=s=>createHash('sha256').update(s).digest('hex');
function makeImportRows(entries){const seen=new Map();return entries.map(x=>{const sig=fingerprint(x),repeat=seen.get(sig)||0;seen.set(sig,repeat+1);return {document_code:x.documentCode,event_date:x.date||null,status:x.status,source_status:x.sourceStatus,activity:x.activity,comments:x.comments,responsible:x.responsible,validator_teams:x.validatorTeams,stage:x.stage,source_row:x.sourceRow,source_key:sha(sig+'#'+repeat)};});}
export default async function handler(req,res){
 noCache(res);
 if(!['GET','POST'].includes(req.method))return reply(res,405,'Método no permitido.');
 try{
  const sql=db();
  if(req.method==='GET'){
   if(req.query?.action==='dashboard'){
    // Lectura pública limitada a documentos activos: mismos datos ya visibles por ficha.
    // La secuencia para importaciones de una misma copia sigue source_row; las
    // anotaciones manuales posteriores se ordenan por fecha de registro.
    const rows=await sql`
      SELECT d.document_code AS "documentCode",
        (SELECT count(*)::int FROM document_tracking_entries t
         WHERE upper(btrim(t.document_code))=upper(btrim(d.document_code))) AS "entryCount",
        (SELECT json_build_object(
           'id',t.id,'documentCode',t.document_code,'date',t.event_date,
           'status',t.status,'activity',t.activity,'comments',t.comments,
           'responsible',t.responsible,'validatorTeams',t.validator_teams,
           'stage',t.stage,'origin',t.origin,'createdAt',t.created_at)
         FROM document_tracking_entries t
         WHERE upper(btrim(t.document_code))=upper(btrim(d.document_code))
         ORDER BY t.created_at DESC,t.source_row DESC NULLS LAST,t.id DESC LIMIT 1) AS latest
      FROM key_documents d WHERE d.is_active=true
    `;
    return res.status(200).json({rows,generatedAt:new Date().toISOString()});
   }
   if(req.query?.action==='status'){
    const r=await sql`SELECT count(*)::int AS total, count(*) FILTER(WHERE origin='import')::int AS imported, count(*) FILTER(WHERE origin='manual')::int AS manual FROM document_tracking_entries`;
    return res.status(200).json(r[0]);
   }
   const code=key(req.query?.documento);
   if(code){
    if(code.length>100)return reply(res,400,'Código documental demasiado largo.');
    const rows=await sql`SELECT * FROM document_tracking_entries WHERE upper(document_code)=${code} ORDER BY event_date DESC NULLS LAST,created_at DESC,id DESC LIMIT 700`;
    return res.status(200).json({documentCode:code,entries:rows.map(serialize),limited:rows.length===700});
   }
   // La información técnica de sincronización se consulta únicamente con identidad editora.
   return reply(res,400,'Indica el código del documento.');
  }
  const actor=await identifyEditor(req),action=String(req.body?.action||'');
  if(action==='create'){
   const v=validateTrackingCreate(req.body?.entry);
   const matched=await sql`SELECT 1 FROM key_documents WHERE upper(document_code)=upper(${v.documentCode}) AND is_active=true LIMIT 1`;
   if(!matched.length)return reply(res,409,'El código no corresponde a un documento publicado en el catálogo.');
   const teamJson=JSON.stringify(v.validatorTeams);
   const rows=await sql`INSERT INTO document_tracking_entries (document_code,event_date,status,source_status,activity,comments,responsible,validator_teams,stage,origin,created_by)
    VALUES (${v.documentCode},${v.date||null}::date,${v.status},${v.status},${v.activity},${v.comments},${v.responsible},ARRAY(SELECT jsonb_array_elements_text(${teamJson}::jsonb)),${v.stage},'manual',${actor}) RETURNING *`;
   return res.status(201).json({entry:serialize(rows[0])});
  }
  if(action!=='preview'&&action!=='publish')return reply(res,400,'Acción no admitida.');
  const batchId=String(req.body?.batchId||'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(batchId))return reply(res,400,'Identificador de copia inválido.');
  const latest=await sql`SELECT id,checksum,row_count FROM migration_batches WHERE module_key='bitacora_documentos_clave' ORDER BY imported_at DESC,id DESC LIMIT 1`;
  if(!latest.length||latest[0].id!==batchId)return reply(res,409,'Debes publicar la última copia importada de bitacoraDocumentosClave.');
  const raw=await sql`SELECT cells FROM migration_batch_rows WHERE batch_id=${batchId}::uuid ORDER BY row_number`;
  if(raw.length!==latest[0].row_count)return reply(res,409,'La copia tiene un número de filas inconsistente.');
  const snapshot=raw.map(r=>r.cells);
  const validated=validateSheetSnapshot({module:'bitacora_documentos_clave',sourceSheet:'bitacoraDocumentosClave',rows:snapshot});
  if(!validated.valid)return reply(res,409,validated.errors.join(' '));
  const parsed=parseTrackingSnapshot(snapshot);
  if(parsed.errors.length)return reply(res,409,parsed.errors.slice(0,6).join(' '));
  const normalized=makeImportRows(parsed.entries);
  const keys=normalized.map(r=>r.source_key);
  const current=keys.length?await sql`SELECT source_key FROM document_tracking_entries WHERE source_key=ANY(${keys}::char(64)[])`:[];
  const known=new Set(current.map(r=>r.source_key.trim()));
  const newCount=normalized.filter(r=>!known.has(r.source_key)).length;
  const catalog=await sql`SELECT document_code FROM key_documents WHERE is_active=true`;
  const codes=new Set(catalog.map(r=>key(r.document_code)));
  const orphan=[...new Set(parsed.entries.map(r=>r.documentCode).filter(c=>!codes.has(key(c))))];
  const report={total:normalized.length,newCount,duplicates:normalized.length-newCount,unmatchedCodes:orphan,warnings:parsed.warnings,canPublish:orphan.length===0};
  if(action==='preview')return res.status(200).json({batchId,preview:report});
  if(req.body?.confirm!==true)return reply(res,400,'Confirma explícitamente la publicación.');
  if(orphan.length)return reply(res,409,'Hay códigos que no aparecen en el catálogo publicado: '+orphan.slice(0,12).join(', '));
  const payload=JSON.stringify(normalized);
  const result=await sql`
   WITH accepted AS (
     INSERT INTO document_tracking_entries(document_code,event_date,status,source_status,activity,comments,responsible,validator_teams,stage,origin,source_key,source_row,source_batch_id,created_by)
     SELECT p.document_code,p.event_date,p.status,p.source_status,p.activity,p.comments,p.responsible,p.validator_teams,p.stage,'import',p.source_key,p.source_row,${batchId}::uuid,${actor}
     FROM jsonb_to_recordset(${payload}::jsonb) AS p(document_code text,event_date date,status text,source_status text,activity text,comments text,responsible text,validator_teams text[],stage text,source_key text,source_row integer)
     ON CONFLICT(source_key) DO NOTHING RETURNING id
   ), event AS (
     INSERT INTO document_tracking_import_events(batch_id,actor_email,rows_read,rows_added)
     SELECT ${batchId}::uuid,${actor},${normalized.length},(SELECT count(*) FROM accepted)
     ON CONFLICT (batch_id) DO NOTHING RETURNING id,rows_added
   ) SELECT (SELECT count(*)::int FROM accepted) AS inserted,(SELECT count(*)::int FROM event) AS events
  `;
  return res.status(200).json({published:true,total:normalized.length,added:result[0].inserted,unchanged:normalized.length-result[0].inserted,message:`Bitácora sincronizada: ${result[0].inserted} anotaciones nuevas; ${normalized.length-result[0].inserted} ya registradas.`});
 }catch(err){
  if(err.status)return reply(res,err.status,err.message);
  if(/Código de documento|estado de seguimiento|actividad es obligatoria|Fecha no reconocida|Equipo validador|supera \d/.test(err.message||''))return reply(res,400,err.message);
  if(err.code==='42P01'||err.code==='42703'||err.code==='23514')return reply(res,503,'La estructura de seguimiento documental no está actualizada. Ejecuta seguimiento-documental-v1_15_5_5.sql en Neon.');
  console.error('Seguimiento documental:',err.code||err.name||'Error');return reply(res,500,'No fue posible completar la operación de seguimiento documental.');
 }
}
