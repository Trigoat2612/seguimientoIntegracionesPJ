/** Seguimiento local de observaciones, sin envío a servidor. */
export const STORAGE_KEY='pj_integraciones_observaciones_v2';
export const STATUS=['Abierta','En seguimiento','Resuelta'];
export const TYPES=['Brecha funcional','Brecha técnica','Equivalencia','Atributos','Pruebas','Coordinación','Otra'];
const valid=o=>o&&['system','integration','endpoint'].includes(o.scope)&&typeof o.targetId==='string'&&o.targetId.length<=500&&typeof o.text==='string'&&o.text.trim().length>0&&o.text.length<=2500&&STATUS.includes(o.status);
export function loadObservations(storage=localStorage){try{const data=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');return Array.isArray(data)?data.filter(valid):[];}catch{return [];}}
export function saveObservations(records,storage=localStorage){storage.setItem(STORAGE_KEY,JSON.stringify(records));}
export function observationTargets(hierarchy){const targets=new Set();for(const s of hierarchy.systems){targets.add(s.id);for(const i of s.integrations){targets.add(i.id);for(const e of i.endpoints)targets.add(`endpoint:${e.id}`);}}return targets;}
export function mergeObservationBackup(existing,input){if(!input||input.schema!=='pj-observaciones-v2'||!Array.isArray(input.observations))throw new Error('El archivo no es un respaldo válido de observaciones V2.');
 const validRows=input.observations.filter(o=>valid(o)&&typeof o.id==='string'&&o.id.length<=150&&typeof o.createdAt==='string'&&typeof o.author==='string'&&o.author.length<=120);
 if(input.observations.length!==validRows.length)throw new Error('El respaldo contiene registros inválidos. No se importó ningún cambio.');
 const index=new Map(existing.map(o=>[o.id,o]));for(const row of validRows)index.set(row.id,{id:row.id,scope:row.scope,targetId:row.targetId,text:row.text,author:row.author,status:row.status,category:TYPES.includes(row.category)?row.category:'Otra',createdAt:row.createdAt,updatedAt:row.updatedAt||row.createdAt});return [...index.values()];
}
