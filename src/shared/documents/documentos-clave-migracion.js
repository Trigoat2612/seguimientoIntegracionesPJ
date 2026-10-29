/** V1.15.1: catálogo normalizado de Documentos Clave. Identificadores siempre TEXT. */
import {validateSheetSnapshot} from '../sync/sincronizacion-modelo.js';
const normalizeHeader=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
const trimmed=v=>String(v??'').replace(/\u0000/g,'').trim();
export function extractKeyDocuments(snapshot){
 const check=validateSheetSnapshot(snapshot);
 if(!check.valid)throw new Error(check.errors.join(' '));
 const rows=check.rows;
 const headerRow=rows.findIndex(r=>r.some(v=>normalizeHeader(v)==='coddocumento')&&r.some(v=>normalizeHeader(v)==='nombredocumento'));
 if(headerRow<0)throw new Error('Faltan encabezados Cod Documento y Nombre Documento.');
 const codeCol=rows[headerRow].findIndex(v=>normalizeHeader(v)==='coddocumento');
 const nameCol=rows[headerRow].findIndex(v=>normalizeHeader(v)==='nombredocumento');
 const documents=[],seen=new Set(),errors=[];
 for(let i=headerRow+1;i<rows.length;i++){
  const row=rows[i];if(!row.some(v=>trimmed(v)))continue;
  const code=trimmed(row[codeCol]),name=trimmed(row[nameCol]);
  if(!code&&!name)continue;
  if(!code||!name){errors.push(`Fila ${i+1}: código y nombre son obligatorios.`);continue;}
  if(code.length>100||name.length>400){errors.push(`Fila ${i+1}: código o nombre excede el límite permitido.`);continue;}
  const identity=code.toLocaleUpperCase('es');
  if(seen.has(identity)){errors.push(`Fila ${i+1}: código repetido «${code}».`);continue;}
  seen.add(identity);documents.push({code,name,sourceRow:i+1});
 }
 if(errors.length)throw new Error(errors.slice(0,8).join(' '));
 if(!documents.length)throw new Error('El catálogo no contiene documentos importables.');
 return documents;
}
/** Comparación por código, independiente del orden del Excel. */
export function compareKeyDocuments(incoming,baseline){
 const old=new Map((baseline||[]).map(x=>[x.code,x]));
 const current=new Map((incoming||[]).map(x=>[x.code,x]));
 const added=[],renamed=[],removed=[],unchanged=[];
 for(const [code,d] of current){
  const prior=old.get(code);
  if(!prior)added.push(code);
  else if(prior.name!==d.name)renamed.push({code,previous:prior.name,current:d.name});
  else unchanged.push(code);
 }
 for(const code of old.keys())if(!current.has(code))removed.push(code);
 return {added:added.length,renamed:renamed.length,removed:removed.length,unchanged:unchanged.length,
  identical:!(added.length||renamed.length||removed.length),sample:{added:added.slice(0,12),renamed:renamed.slice(0,12),removed:removed.slice(0,12)}};
}
/** Reconstituir exactamente CatalogoDocumentos para reutilizar su UI y filtros. */
export function keyDocumentsAsSheets(documents){
 const rows=[['Cod Documento','Nombre Documento']];
 for(const d of documents||[])rows.push([trimmed(d.code),trimmed(d.name)]);
 return new Map([['CatalogoDocumentos',rows]]);
}
