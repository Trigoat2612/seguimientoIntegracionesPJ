/** Estados del seguimiento documental. No modifican los estados de incidencias. */
export const DOCUMENT_REVIEW_STATES=Object.freeze(['Validado','En proceso de firma','Programado']);
export function validateReviewUpdate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Solicitud inválida de seguimiento documental.');
 if(typeof input.documentCode!=='string')throw new Error('El código documental debe ser texto.');
 const documentCode=input.documentCode.trim().toLocaleUpperCase('es');
 const documentName=String(input.documentName||'').trim();
 const version=String(input.version||'').trim();
 const status=String(input.status||'').trim();
 const comment=String(input.comment||'').trim();
 const expectedRevision=Number(input.expectedRevision);
 if(!documentCode||documentCode.length>100||/[\x00-\x1f]/.test(documentCode))throw new Error('El código del documento no es válido.');
 if(!documentName||documentName.length>350)throw new Error('El nombre del documento no es válido.');
 if(version.length>100)throw new Error('La versión excede los 100 caracteres.');
 if(!DOCUMENT_REVIEW_STATES.includes(status))throw new Error('El estado documental no está permitido en esta etapa.');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new Error('La revisión documental actual es inválida.');
 if(!comment||comment.length>2000)throw new Error('Indica el motivo de la actualización (máximo 2000 caracteres).');
 return {documentCode,documentName,version,status,comment,expectedRevision};
}
