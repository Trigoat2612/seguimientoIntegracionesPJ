import {readDocumentCode} from '../documents/codigo-documento.js';
import {parseTrackingSnapshot,TRACKING_SHEET} from '../documents/seguimiento-documental.js';
/** V1.15.0 · Copia preliminar de hojas, sin cambiar fuentes oficiales ni estados de validación. */
export const SYNC_MODULES=Object.freeze([
 {id:'documentos_clave',sheet:'CatalogoDocumentos',label:'Documentos Clave'},
 {id:'resumen_tactico',sheet:'Seguimiento',label:'Resumen táctico'},
 {id:'integraciones_via',sheet:'IntegracionesEtapa',label:'Integraciones por vía'},
 {id:'flujo_actividades',sheet:'EtapaActividadIntegracion',label:'Flujo de actividades'},
 {id:'bitacora_documentos_clave',sheet:TRACKING_SHEET,label:'Bitácora de Documentos Clave'}
]);
export const moduleFor=id=>SYNC_MODULES.find(m=>m.id===id)||null;
const key=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
const cell=v=>String(v??'').replace(/\u0000/g,'').trim();
const rawCell=v=>String(v??'').replace(/\u0000/g,'');
// Los límites deben responder al uso de cada campo. En Seguimiento!G se
// conserva la bitácora acumulativa sin recortar texto ni saltos de línea.
const MAX_ROWS=3000,MAX_COLUMNS=100;
export const MAX_SNAPSHOT_BYTES=3_200_000; // margen para el límite HTTP de Vercel
export function syncColumnLimit(moduleId,columnIndex){
 if(moduleId==='resumen_tactico'){
  // Índices base cero. G = Estado situacional; M = Consideraciones.
  if(columnIndex===6)return 120_000;
  if(columnIndex===12)return 60_000;
  if([1,3,4,7,8,9,11].includes(columnIndex))return 12_000;
  return 20_000;
 }
 if(moduleId==='documentos_clave'){
  if(columnIndex===0)return 256; // código de documento, siempre texto
  if(columnIndex===1)return 4_000; // denominación documental
 }
 return 24_000;
}
export function snapshotByteLength(rows){return new TextEncoder().encode(JSON.stringify(rows)).byteLength;}
export function locateSheet(sheets,moduleId){
 const cfg=moduleFor(moduleId);if(!cfg||!sheets?.entries)return null;
 return [...sheets.entries()].find(([n])=>key(n)===key(cfg.sheet))||null;
}
/** Objeto compartible y verificable: conserva filas y columnas originales. */
export function makeSheetSnapshot(sheets,moduleId){
 const cfg=moduleFor(moduleId);if(!cfg)throw new Error('Módulo de sincronización desconocido.');
 const entry=locateSheet(sheets,moduleId);if(!entry)throw new Error(`No se encontró la hoja ${cfg.sheet} en la fuente cargada.`);
 const [sheet,raw]=entry;
 const rows=raw.map((row,i)=>(row||[]).map((value,col)=>{
   // Excel puede almacenar 4.10 como 4.1; preservar su formato recuperable
   if(((moduleId==='documentos_clave'&&col===0)||(moduleId==='bitacora_documentos_clave'&&col===1))&&i>0&&(/^-?\d+(?:\.\d+)?$/.test(String(value??'')))){
     const info=sheets.cellFormats?.get(sheet)?.get(`${i}:${col}`);
     return readDocumentCode(value,{...info,numeric:info?.numeric??true}).value;
   }
   return rawCell(value);
 }));
 return {module:moduleId,sourceSheet:sheet,rows};
}
const meaningful=r=>r.some(v=>cell(v)!=='');
/** Validación en cliente y servidor. No normaliza decimales ni altera índices de filas. */
export function validateSheetSnapshot(input){
 const cfg=moduleFor(input?.module),errors=[],warnings=[];
 if(!cfg)return {valid:false,errors:['Módulo inválido.'],warnings:[],rows:[],count:0};
 if(key(input.sourceSheet)!==key(cfg.sheet))errors.push(`La hoja debe llamarse ${cfg.sheet}.`);
 if(!Array.isArray(input.rows))return {valid:false,errors:['Se requiere un arreglo de filas.'],warnings:[],rows:[],count:0};
 if(input.rows.length>MAX_ROWS)errors.push(`La hoja supera las ${MAX_ROWS} filas permitidas.`);
 const rows=[];
 for(const [i,row] of input.rows.entries()){
  if(!Array.isArray(row)||row.length>MAX_COLUMNS){errors.push(`Fila ${i+1}: formato o ancho no permitido.`);continue;}
  rows.push(row.map((v,j)=>{
   if(typeof v!=='string'){errors.push(`Fila ${i+1}, columna ${j+1}: el valor debe ser texto.`);return '';}
   const limit=syncColumnLimit(cfg.id,j);
   if(v.length>limit){
    const label=cfg.id==='resumen_tactico'&&j===6?' (G · Estado situacional)':cfg.id==='resumen_tactico'&&j===12?' (M · Consideraciones)':'';
    errors.push(`Fila ${i+1}, columna ${j+1}${label}: ${v.length.toLocaleString('es-PE')} caracteres, máximo ${limit.toLocaleString('es-PE')}.`);
   }
   return v;
  }));
 }
 const filled=rows.filter(meaningful).length;
 if(!filled)errors.push('La hoja no contiene datos.');
 // El límite total es diferente al de cada celda: evita fallos HTTP 413,
 // incluso cuando cada bitácora individual es válida.
 if(errors.length===0){
  const size=snapshotByteLength(rows);
  if(size>MAX_SNAPSHOT_BYTES)errors.push(`La copia ocupa ${(size/1_000_000).toFixed(2)} MB y supera el máximo de ${(MAX_SNAPSHOT_BYTES/1_000_000).toFixed(2)} MB por importación. Se requiere importar por lotes, sin recortar el historial.`);
 }
 if(cfg.id==='resumen_tactico'){
  // La aplicación vigente procesa exclusivamente las primeras 36 filas del origen.
  if(rows.length>36)warnings.push('Seguimiento incluye filas posteriores a la 36: se conservarán en la copia de auditoría, pero el tablero actual solo procesa hasta la 36.');
  const h=rows.slice(0,8).find(r=>r.some(v=>key(v)==='integraciones'||key(v)==='integracion')||r.some(v=>key(v)==='estado'));
  if(!h)warnings.push('No se reconoció el encabezado de Seguimiento; revisa las columnas B, D y L antes de migrar.');
 }else if(cfg.id==='documentos_clave'){
  const header=rows.findIndex(r=>r.some(v=>key(v)==='coddocumento')&&r.some(v=>key(v)==='nombredocumento'));
  if(header<0)errors.push('Faltan las columnas Cod Documento y Nombre Documento.');
  else {
   const codeCol=rows[header].findIndex(v=>key(v)==='coddocumento');
   const nameCol=rows[header].findIndex(v=>key(v)==='nombredocumento');
   const seen=new Set();let duplicate=0,missing=0;
   for(const row of rows.slice(header+1)){
    if(!meaningful(row))continue;
    const code=cell(row[codeCol]),name=cell(row[nameCol]);
    if(!name)continue;
    if(!code){missing++;continue;}
    if(seen.has(code))duplicate++;seen.add(code);
   }
   if(duplicate)errors.push(`${duplicate} código(s) de documentos duplicados. Deben corregirse antes de importar.`);
   if(missing)errors.push(`${missing} documento(s) sin código. Deben corregirse antes de importar.`);
  }
 }else if(cfg.id==='bitacora_documentos_clave'){
  const parsed=parseTrackingSnapshot(rows);errors.push(...parsed.errors);warnings.push(...parsed.warnings);
  if(parsed.entries.length===0)errors.push('No hay anotaciones documentales para sincronizar.');
 }else if(cfg.id==='flujo_actividades'){
  if(!rows.some(r=>r.length>=5&&meaningful(r)))warnings.push('No se encontraron las cinco columnas esperadas (vía, paso, etapa, actividad e integración).');
 }else if(cfg.id==='integraciones_via'){
  if(!rows.some(r=>r.length>=3&&meaningful(r)))warnings.push('La hoja no tiene tres columnas pobladas; revisar el mapeo de Vía, Etapa e Integración.');
 }
 const columnStats=Array.from({length:Math.max(0,...rows.map(r=>r.length))},(_,j)=>{
  const lengths=rows.map(r=>String(r[j]||'').length);
  return {column:j+1,filled:lengths.filter(Boolean).length,maxChars:Math.max(0,...lengths),limit:syncColumnLimit(cfg.id,j)};
 });
 return {valid:errors.length===0,errors,warnings,count:filled,rows,columnStats,bytes:errors.length?null:snapshotByteLength(rows)};
}
export const normalizeForChecksum=rows=>JSON.stringify(rows);
/** Comparación estricta por posición: permite detectar adiciones, eliminaciones y ediciones. */
export function compareSheetRows(current,previous){
 const a=current||[],b=previous||[];let added=0,removed=0,changed=0,unchanged=0;
 const samples=[];
 for(let i=0;i<Math.max(a.length,b.length);i++){
  const before=b[i],after=a[i];const kind=before===undefined?'added':after===undefined?'removed':JSON.stringify(before)!==JSON.stringify(after)?'changed':'same';
  if(kind==='added')added++;else if(kind==='removed')removed++;else if(kind==='changed')changed++;else unchanged++;
  if(kind!=='same'&&samples.length<15)samples.push({row:i+1,type:kind});
 }
 return {added,removed,changed,unchanged,identical:!added&&!removed&&!changed,samples};
}
