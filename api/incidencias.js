/** Bitácora documental; Vercel Node API. Nunca confía en un correo enviado por el navegador. */
import {neon} from '@neondatabase/serverless';
import {identifyEditor} from '../src/server/autorizacion-servidor.js';
import {randomUUID} from 'node:crypto';
import {normalizedDocumentCode,validateIncidentCreate,validateIncidentChange,validateIncidentComment} from '../src/shared/documents/bitacora-validacion.js';
import {validateReviewUpdate} from '../src/shared/documents/documento-revision.js';
import {environmentReadiness,canShowLocalDiagnostic} from '../src/server/bitacora-config-servidor.js';
const noCache=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
const uuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''));
function bad(res,status,message){return res.status(status).json({error:message});}
export {identifyEditor} from '../src/server/autorizacion-servidor.js';
export function db(){if(!process.env.DATABASE_URL)throw Object.assign(new Error('Configura DATABASE_URL de Neon en el servidor.'),{status:503});return neon(process.env.DATABASE_URL);}
const publicRow=r=>({id:r.id,documentCode:r.document_code,documentName:r.document_name,title:r.title,description:r.description,severity:r.severity,status:r.status,assignedTo:r.assigned_to,dueDate:r.due_date,evidenceUrl:r.evidence_url,revision:r.revision,createdBy:r.created_by,updatedBy:r.updated_by,createdAt:r.created_at,updatedAt:r.updated_at});
const publicEvent=e=>({id:e.id,incidentId:e.incident_id,type:e.event_type,actor:e.actor_email,comment:e.comment,createdAt:e.created_at,before:e.before_snapshot,after:e.after_snapshot});
export default async function handler(req,res){
 noCache(res);
 if(!['GET','POST','PATCH'].includes(req.method))return bad(res,405,'Método no permitido.');
 try{
  if(req.method==='GET' && req.query?.diagnostico==='1'){
  if(!canShowLocalDiagnostic(process.env,req.headers.host))return bad(res,404,'No disponible.');
  const report=environmentReadiness(process.env);
  return res.status(200).json({service:'bitacora',ready:report.ready,variables:report.present,missing:report.missing,hint:'Solo se indica presencia o ausencia. No se muestran credenciales; reinicia vercel dev tras cambiar el entorno.'});
 }
 const identity=req.method==='GET'?{email:'',canEdit:false}:{email:await identifyEditor(req),canEdit:true};
 const actor=identity.email,sql=db();
  if(req.method==='GET'){
   const code=normalizedDocumentCode(req.query?.documento);
   if(!code||code.length>100)return bad(res,400,'Indica un código de documento válido.');
   const incidents=await sql`SELECT * FROM document_incidents WHERE document_code=${code} ORDER BY created_at DESC LIMIT 250`;
   const events=await sql`SELECT ev.* FROM document_incident_events ev JOIN document_incidents inc ON inc.id=ev.incident_id WHERE inc.document_code=${code} ORDER BY ev.created_at ASC,ev.id ASC LIMIT 2500`;
   const reviews=await sql`SELECT document_code,document_name,document_version,review_status,revision,updated_by,updated_at FROM document_reviews WHERE document_code=${code}`;
   const reviewHistory=await sql`SELECT actor_email,comment,created_at,before_snapshot,after_snapshot FROM document_review_events WHERE document_code=${code} ORDER BY created_at DESC LIMIT 100`;
   const r=reviews[0]||null;
   return res.status(200).json({documentCode:code,items:incidents.map(publicRow),events:events.map(publicEvent),review:r?{documentCode:r.document_code,documentName:r.document_name,version:r.document_version,status:r.review_status,revision:r.revision,updatedBy:r.updated_by,updatedAt:r.updated_at}:null,reviewHistory,actor,canEdit:identity.canEdit,limited:incidents.length===250||events.length===2500});
  }
  if(req.method==='POST'){
   const payload=validateIncidentCreate(req.body),id=randomUUID();
   const r=await sql`
    WITH created AS (
     INSERT INTO document_incidents (id,document_code,document_name,title,description,severity,status,assigned_to,due_date,evidence_url,created_by,updated_by)
     VALUES (${id}::uuid,${payload.documentCode},${payload.documentName},${payload.title},${payload.description},${payload.severity},'Abierta',${payload.assignedTo},${payload.dueDate}::date,${payload.evidenceUrl},${actor},${actor})
     RETURNING *
    ), audit AS (
     INSERT INTO document_incident_events (incident_id,event_type,actor_email,comment,before_snapshot,after_snapshot)
     SELECT id,'creacion',${actor},'Incidencia registrada',NULL,to_jsonb(created) FROM created RETURNING id
    )
    SELECT created.* FROM created JOIN audit ON TRUE
   `;
   return res.status(201).json({item:publicRow(r[0])});
  }
  // La versión y el estado de revisión se almacenan en Neon, fuera del Excel.
  if(req.method==='PATCH' && req.body?.action==='document-review'){
   const v=validateReviewUpdate(req.body);
   const data=await sql`
    WITH original AS MATERIALIZED (SELECT * FROM document_reviews WHERE document_code=${v.documentCode} FOR UPDATE),
    changed AS (
     INSERT INTO document_reviews (document_code,document_name,document_version,review_status,updated_by)
     VALUES (${v.documentCode},${v.documentName},${v.version},${v.status},${actor})
     ON CONFLICT (document_code) DO UPDATE SET
       document_name=EXCLUDED.document_name,
       document_version=EXCLUDED.document_version,
       review_status=EXCLUDED.review_status,
       updated_by=EXCLUDED.updated_by,
       updated_at=NOW(),
       revision=document_reviews.revision+1
     WHERE document_reviews.revision=${v.expectedRevision}
     RETURNING *
    ),
    audit AS (
     INSERT INTO document_review_events (document_code,actor_email,comment,before_snapshot,after_snapshot)
     SELECT c.document_code,${actor},${v.comment},(SELECT to_jsonb(o) FROM original o),to_jsonb(c) FROM changed c
     RETURNING id
    )
    SELECT c.* FROM changed c JOIN audit ON TRUE
   `;
   if(!data.length)return bad(res,409,'El seguimiento del documento cambió. Actualiza la ficha antes de guardar.');
   const r=data[0];
   return res.status(200).json({review:{documentCode:r.document_code,documentName:r.document_name,version:r.document_version,status:r.review_status,revision:r.revision,updatedBy:r.updated_by,updatedAt:r.updated_at}});
  }
  const id=String(req.query?.id||req.body?.id||'');
  if(!uuid(id))return bad(res,400,'ID de incidencia inválido.');
  const action=String(req.body?.action||'update');
  let records;
  if(action==='comment'){
   const payload=validateIncidentComment(req.body);
   records=await sql`
    WITH original AS MATERIALIZED (SELECT * FROM document_incidents WHERE id=${id}::uuid FOR UPDATE),
    changed AS (UPDATE document_incidents AS i SET revision=i.revision+1,updated_by=${actor},updated_at=NOW() FROM original b WHERE i.id=b.id AND i.revision=${payload.expectedRevision} RETURNING i.*),
    audit AS (INSERT INTO document_incident_events(incident_id,event_type,actor_email,comment,before_snapshot,after_snapshot)
       SELECT c.id,'comentario',${actor},${payload.comment},to_jsonb(b),to_jsonb(c) FROM changed c JOIN original b ON b.id=c.id RETURNING id)
    SELECT c.* FROM changed c JOIN audit a ON TRUE
   `;
  }else if(action==='update'){
   const payload=validateIncidentChange(req.body);
   records=await sql`
    WITH original AS MATERIALIZED (SELECT * FROM document_incidents WHERE id=${id}::uuid FOR UPDATE),
    changed AS (UPDATE document_incidents AS i
     SET status=${payload.status},severity=${payload.severity},assigned_to=${payload.assignedTo},due_date=${payload.dueDate}::date,evidence_url=${payload.evidenceUrl},updated_at=NOW(),updated_by=${actor},revision=i.revision+1
     FROM original b WHERE i.id=b.id AND i.revision=${payload.expectedRevision} RETURNING i.*),
    audit AS (INSERT INTO document_incident_events(incident_id,event_type,actor_email,comment,before_snapshot,after_snapshot)
      SELECT c.id,'actualizacion',${actor},${payload.comment},to_jsonb(b),to_jsonb(c) FROM changed c JOIN original b ON b.id=c.id RETURNING id)
    SELECT c.* FROM changed c JOIN audit a ON TRUE
   `;
  }else return bad(res,400,'Acción no admitida.');
  if(!records.length)return bad(res,409,'El registro fue modificado por otro usuario o no existe. Actualiza la bitácora antes de continuar.');
  return res.status(200).json({item:publicRow(records[0])});
 }catch(err){
  if(err.status)return bad(res,err.status,err.message);
  if(/Solicitud inválida|obligatori|incidencia requiere|fecha compromiso|severidad|estado de incidencia|estado documental|evidencia|comentario|versión actual|versión del registro|revisión documental|código válido|código del documento|nombre del documento|motivo|100 caracteres|versión excede|cambio/.test(err.message||''))return bad(res,400,err.message);
  console.error('Incidencias API:',err.code||err.name||'DatabaseError');
  if(err.code==='23514'&&err.constraint==='document_reviews_review_status_check')return bad(res,503,'Los estados de revisión de Neon todavía no están actualizados. Ejecuta estados-revision-v1_15_5_3.sql.');
  if(err.code==='42P01')return bad(res,503,'Faltan tablas en Neon. Ejecuta bitacora-v1_14_3-migracion.sql en la rama conectada a DATABASE_URL.');
  if(/ECONNREFUSED|ENOTFOUND|authentication failed|password authentication/i.test(err.message||''))return bad(res,503,'No se pudo conectar a Neon. Comprueba DATABASE_URL y la rama configurada.');
  return bad(res,500,'Neon rechazó la operación. Comprueba la conexión, las tablas y los permisos en la base de datos.');
 }
}
