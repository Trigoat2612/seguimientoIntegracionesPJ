/** Bitácora documental 1.15.5.5. Fuente: bitacoraDocumentosClave, B:I.
 * Conserva estados no catalogados del origen, sin ofrecerlos para nuevos registros.
 */
import {readDocumentCode} from './codigo-documento.js';
export const TRACKING_SHEET='bitacoraDocumentosClave';
export const TRACKING_STATUSES=Object.freeze(['Pendiente','Programado','En proceso de firma','Entregado','Validado']);
export const VALIDATOR_TEAMS=Object.freeze(['DP LABORAL','TRANSVERSALES','TODOS LOS DP','GTI','PEJENP']);
const key=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
const text=v=>String(v??'').replace(/\u0000/g,'').trim();
const head=['codigodedocumento','fecha','estado','actividad','comentarios','responsable','equipovalidador','etapa'];
export function sheetIsTracking(name){return key(name)===key(TRACKING_SHEET);}
export function normalizeTrackingStatus(raw,{allowLegacy=false}={}){
 const k=key(raw);const found=TRACKING_STATUSES.find(x=>key(x)===k);
 if(found)return found;
 if(allowLegacy&&k==='observado')return 'Observado';
 return '';
}
export function parseTrackingTeams(value,{strict=false}={}){
 const values=Array.isArray(value)?value:String(value??'').split(/[,;]+/);
 const normalized=[...new Set(values.map(v=>text(v).toUpperCase()).filter(Boolean))];
 if(strict&&normalized.some(v=>!VALIDATOR_TEAMS.includes(v)))throw new Error('Equipo validador no permitido: '+normalized.filter(v=>!VALIDATOR_TEAMS.includes(v)).join(', '));
 return normalized;
}
export function normalizeTrackingDate(value){
 const s=text(value);if(!s)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const d=new Date(s+'T00:00:00Z');if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s)return s;}
 if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const [day,month,year]=s.split('/').map(Number);const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day)return d.toISOString().slice(0,10);}
 if(/^\d{5}(?:\.\d+)?$/.test(s)){const n=Number(s);if(n>=1&&n<=2958465){const d=new Date(Date.UTC(1899,11,30)+Math.trunc(n)*86400000);return d.toISOString().slice(0,10);}}
 throw new Error(`Fecha no reconocida: «${s}». Utiliza dd/mm/aaaa o aaaa-mm-dd.`);
}
export function parseTrackingSnapshot(rows,{allowLegacy=true}={}){
 const errors=[],warnings=[],entries=[];
 if(!Array.isArray(rows))return {entries,errors:['La hoja no contiene filas.'],warnings,headerRow:-1};
 const header=rows.findIndex((row,i)=>i<8&&head.every((h,j)=>key(row?.[j+1])===h));
 if(header<0)return {entries,errors:['No se encontró el encabezado B:I: Código de Documento, Fecha, Estado, Actividad, Comentarios, Responsable, Equipo Validador y Etapa.'],warnings,headerRow:-1};
 for(let i=header+1;i<rows.length;i++){
  const row=rows[i]||[];const vals=Array.from({length:8},(_,j)=>text(row[j+1]));
  if(!vals.some(Boolean))continue;
  const [documentCode,rawDate,rawStatus,activity,comments,responsible,rawTeams,stage]=vals;
  if(!documentCode){errors.push(`Fila ${i+1}: falta el código de documento.`);continue;}
  const status=normalizeTrackingStatus(rawStatus,{allowLegacy});if(!status){errors.push(`Fila ${i+1}: estado no admitido «${rawStatus}».`);continue;}
  if(!TRACKING_STATUSES.includes(status))warnings.push(`Fila ${i+1}: estado histórico «${rawStatus}» conservado sin convertirlo.`);
  let date='';try{date=normalizeTrackingDate(rawDate);}catch(e){errors.push(`Fila ${i+1}: ${e.message}`);continue;}
  const teams=parseTrackingTeams(rawTeams);
  const unknown=teams.filter(t=>!VALIDATOR_TEAMS.includes(t));if(unknown.length)warnings.push(`Fila ${i+1}: equipo(s) no catalogado(s) «${unknown.join(', ')}» conservado(s).`);
  if(!date)warnings.push(`Fila ${i+1}: fecha vacía conservada.`);
  entries.push({documentCode,date,status,sourceStatus:rawStatus,activity,comments,responsible,validatorTeams:teams,stage,sourceRow:i+1});
 }
 return {entries,errors,warnings,headerRow:header+1};
}
export function validateTrackingCreate(input){
 const data=input||{},documentCode=text(data.documentCode),status=normalizeTrackingStatus(data.status);
 if(!documentCode||documentCode.length>100)throw new Error('Código de documento inválido.');
 if(!status)throw new Error('Selecciona un estado de seguimiento válido.');
 const date=normalizeTrackingDate(data.date||'');
 const activity=text(data.activity),comments=text(data.comments),responsible=text(data.responsible),stage=text(data.stage);
 const validatorTeams=parseTrackingTeams(data.validatorTeams,{strict:true});
 if(!activity)throw new Error('La actividad es obligatoria.');
 for(const [name,value,limit] of [['Actividad',activity,2000],['Comentarios',comments,8000],['Responsable',responsible,250],['Etapa',stage,250]])if(value.length>limit)throw new Error(`${name} supera ${limit} caracteres.`);
 return {documentCode,date,status,sourceStatus:status,activity,comments,responsible,validatorTeams,stage};
}
