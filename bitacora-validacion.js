/** Contratos de la bitácora. Funciones puras reutilizadas por API y pruebas. */
export const INCIDENT_STATES=Object.freeze(['Abierta','En atención','Subsanada','En verificación','Cerrada','Reabierta']);
export const INCIDENT_SEVERITIES=Object.freeze(['Crítica','Alta','Media','Baja']);
const normalizeText=value=>String(value??'').trim();
export const normalizedDocumentCode=value=>normalizeText(value).toLocaleUpperCase('es');
const limited=(value,max)=>normalizeText(value).slice(0,max);
const isDate=value=>{if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};
export function validEvidenceUrl(value){
 if(!value)return true;
 try{const uri=new URL(value);return uri.protocol==='https:'&&!uri.username&&!uri.password&&uri.href.length<=2048;}catch{return false;}
}
export function validateIncidentCreate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Solicitud inválida.');
 if(typeof input.documentCode!=='string')throw new Error('El código de documento debe enviarse como texto, nunca como número.');
 const documentCode=normalizedDocumentCode(input.documentCode),documentName=limited(input.documentName,350),title=limited(input.title,250),description=limited(input.description,4000),severity=normalizeText(input.severity)||'Media',assignedTo=limited(input.assignedTo,200),dueDate=normalizeText(input.dueDate),evidenceUrl=normalizeText(input.evidenceUrl);
 if(!documentCode||documentCode.length>100||/[\u0000-\u001f]/.test(documentCode))throw new Error('El documento debe tener un código válido (máximo 100 caracteres).');
 if(!documentName)throw new Error('El nombre del documento es obligatorio.');
 if(!title||!description)throw new Error('La incidencia requiere título y descripción.');
 if(!INCIDENT_SEVERITIES.includes(severity))throw new Error('Severidad no admitida.');
 if(dueDate&&!isDate(dueDate))throw new Error('La fecha compromiso debe ser válida.');
 if(!validEvidenceUrl(evidenceUrl))throw new Error('La evidencia debe utilizar una URL HTTPS válida.');
 return {documentCode,documentName,title,description,severity,assignedTo,dueDate:dueDate||null,evidenceUrl};
}
export function validateIncidentChange(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Solicitud inválida.');
 const status=normalizeText(input.status),severity=normalizeText(input.severity),assignedTo=limited(input.assignedTo,200),dueDate=normalizeText(input.dueDate),evidenceUrl=normalizeText(input.evidenceUrl),comment=limited(input.comment,4000),expectedRevision=Number(input.expectedRevision);
 if(!INCIDENT_STATES.includes(status))throw new Error('Estado de incidencia no admitido.');
 if(!INCIDENT_SEVERITIES.includes(severity))throw new Error('Severidad no admitida.');
 if(dueDate&&!isDate(dueDate))throw new Error('La fecha compromiso no es válida.');
 if(!validEvidenceUrl(evidenceUrl))throw new Error('La evidencia debe utilizar una URL HTTPS válida.');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw new Error('No se ha informado la versión actual del registro.');
 if(!comment)throw new Error('Explica el cambio o registra un comentario para conservar la trazabilidad.');
 return {status,severity,assignedTo,dueDate:dueDate||null,evidenceUrl,comment,expectedRevision};
}
export function validateIncidentComment(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Solicitud inválida.');
 const comment=limited(input.comment,4000),expectedRevision=Number(input.expectedRevision);
 if(!comment)throw new Error('El comentario no puede estar vacío.');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw new Error('La versión del registro no es válida.');
 return {comment,expectedRevision};
}
export function summarizeIncidents(items){
 const a=items||[];
 return {total:a.length,abiertas:a.filter(x=>!['Cerrada'].includes(x.status)).length,cerradas:a.filter(x=>x.status==='Cerrada').length,criticas:a.filter(x=>x.severity==='Crítica'&&x.status!=='Cerrada').length};
}
