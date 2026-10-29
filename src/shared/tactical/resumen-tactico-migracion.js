/** V1.15.2: modelo y equivalencias del Resumen táctico sin cortar textos largos. */
import {parseTactical,TACTICAL_MAX_ROW,tacticalCategoryCounts} from './tactical.js';
import {validateSheetSnapshot} from '../sync/sincronizacion-modelo.js';

const hex=/^#[0-9A-Fa-f]{6}$/;
/** Solo relleno directo de la columna L; no se inventan marcas verdes por valor textual. */
export function tacticalStylesFromSheets(sheets){
 const found=[...sheets.entries()].find(([name])=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='seguimiento');
 if(!found)return {fills:[],hasConditional:false};
 const [name]=found,metadata=sheets.cellFormats?.get(name)||new Map();
 const fills=[],dates=[];
 for(const [coord,info] of metadata){
  const [zeroRow,zeroCol]=coord.split(':').map(Number);
  if(zeroRow<0||zeroRow>=TACTICAL_MAX_ROW)continue;
  if(zeroCol===11&&info?.fillColor&&hex.test(info.fillColor))fills.push({row:zeroRow+1,color:info.fillColor.toUpperCase()});
  if([7,8,9].includes(zeroCol)&&info?.dateStyle)dates.push({row:zeroRow+1,column:zeroCol+1});
 }
 return {fills,dates,hasConditional:!!sheets.sheetConditional?.get(name)};
}
export function makeStyledTacticalSheets(rows,styles={}){
 if(!Array.isArray(rows))throw new Error('No hay filas de Seguimiento para reconstruir.');
 if(!styles||!Array.isArray(styles.fills)||styles.fills.length>TACTICAL_MAX_ROW)throw new Error('Metadatos de relleno inválidos.');
 if(typeof styles.hasConditional!=='boolean')throw new Error('Indica si el archivo utiliza formato condicional.');
 const formats=new Map(),seen=new Set();
 for(const fill of styles.fills){
  const row=Number(fill?.row),color=String(fill?.color||'');
  if(!Number.isInteger(row)||row<1||row>TACTICAL_MAX_ROW||!hex.test(color)||seen.has(row))throw new Error('Hay un relleno L inválido o repetido.');
  seen.add(row);formats.set(`${row-1}:11`,{fillColor:color.toUpperCase()});
 }
 if(!Array.isArray(styles.dates||[])||(styles.dates||[]).length>TACTICAL_MAX_ROW*3)throw new Error('Formato de fechas fuera de rango.');
 const seenDates=new Set();
 for(const v of styles.dates||[]){
  const row=Number(v?.row),column=Number(v?.column),key=`${row-1}:${column-1}`;
  if(!Number.isInteger(row)||row<1||row>TACTICAL_MAX_ROW||![8,9,10].includes(column)||seenDates.has(key))throw new Error('Formato de fecha inválido o duplicado.');
  seenDates.add(key);formats.set(key,{dateStyle:true});
 }
 const sheets=new Map([['Seguimiento',rows]]);
 sheets.cellFormats=new Map([['Seguimiento',formats]]);
 sheets.sheetConditional=new Map([['Seguimiento',styles.hasConditional]]);
 return sheets;
}
/** Produce los mismos objetos que parseTactical, comprobando los rangos originales. */
export function extractTacticalEntries(snapshot,styles){
 const check=validateSheetSnapshot(snapshot);
 if(!check.valid)throw new Error(check.errors.slice(0,5).join(' '));
 if(snapshot.module!=='resumen_tactico')throw new Error('Se requiere un lote de Resumen táctico.');
 const sheets=makeStyledTacticalSheets(check.rows,styles);
 const result=parseTactical(sheets);
 if(!result.entries.length)throw new Error('No hay registros tácticos válidos entre las filas 1 y 36.');
 if(result.entries.some(e=>e.row<2||e.row>TACTICAL_MAX_ROW))throw new Error('Hay filas fuera del alcance aprobado.');
 const unique=new Set(result.entries.map(e=>e.row));
 if(unique.size!==result.entries.length)throw new Error('Filas de integración repetidas.');
 return {...result,excludedWithName:check.rows.slice(TACTICAL_MAX_ROW).filter(r=>String(r?.[1]||'').trim()).length,validationWarnings:check.warnings};
}
const fields=['row','name','statusRaw','status','dependency','history','developmentClose','testsClose','gsjValidation','criticality','green','greenColor','considerations'];
export function compareTacticalEntries(incoming,previous){
 const from=new Map((incoming||[]).map(e=>[e.row,e]));
 const to=new Map((previous||[]).map(e=>[e.row,e]));
 let added=0,changed=0,removed=0,unchanged=0;const samples=[];
 for(const [row,e] of from){const prev=to.get(row);if(!prev){added++;if(samples.length<12)samples.push(`Nueva fila ${row}: ${e.name}`);}
  else if(fields.some(k=>e[k]!==prev[k])){changed++;if(samples.length<12)samples.push(`Modificada fila ${row}: ${e.name}`);}else unchanged++;}
 for(const [row,e] of to)if(!from.has(row)){removed++;if(samples.length<12)samples.push(`Retirada fila ${row}: ${e.name}`);}
 return {added,changed,removed,unchanged,identical:added+changed+removed===0,samples};
}
export function tacticalParityReport(source,stored){
 const entriesA=source?.entries||[],entriesB=stored?.entries||[];
 const countA=tacticalCategoryCounts(entriesA),countB=tacticalCategoryCounts(entriesB);
 const mismatches=[];
 for(const [id,count] of Object.entries(countA))if(count!==countB[id])mismatches.push(`Clasificación ${id}: origen ${count} / Neon ${countB[id]}`);
 const difference=compareTacticalEntries(entriesA,entriesB);
 if(!difference.identical)mismatches.push(...difference.samples);
 return {equal:!mismatches.length,sourceRows:entriesA.length,neonRows:entriesB.length,categories:countA,difference,mismatches};
}
export function rehydrateTacticalFromNeon(entries,info={}){
 if(!Array.isArray(entries)||!entries.length)throw new Error('Neon todavía no contiene integraciones tácticas publicadas.');
 return {entries:entries.map(e=>({...e,green:!!e.green,dateAlerts:Array.isArray(e.dateAlerts)?e.dateAlerts:[]})),
  warnings:['Consulta desde Neon: la hoja Seguimiento continúa disponible en Google Sheets para comparar.'],
  sourceSheet:'Seguimiento',sourceCount:entries.length,maxRow:TACTICAL_MAX_ROW,
  readAt:info.readAt||new Date().toISOString(),hasConditional:!!info.hasConditional};
}
