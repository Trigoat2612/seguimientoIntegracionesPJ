/** Resumen táctico de la hoja Seguimiento. Sin almacenamiento del contenido privado. */
export const TACTICAL_STATES=['Validada','Por validar','En pruebas','En desarrollo'];
// El seguimiento táctico autorizado abarca solo las filas 1 a 36, inclusive.
export const TACTICAL_MAX_ROW=36;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clean=v=>String(v??'').replace(/\u0000/g,'').trim();
export function tacticalState(value){
 const v=norm(value).replace(/\s+/g,' ');
 if(/^(validado|validada)(\b|$)/.test(v))return 'Validada';
 if(/^por validar(\b|$)/.test(v))return 'Por validar';
 if(/^(en pruebas|en prueba)(\b|$)/.test(v))return 'En pruebas';
 if(/^en desarrollo(\b|$)/.test(v))return 'En desarrollo';
 return 'Sin clasificar';
}
function excelDate(value,meta){
 const text=clean(value);if(!text)return '';
 if(/^\d+(?:\.\d+)?$/.test(text)){
  const n=Number(text);if(n>20000&&n<90000&&(meta?.dateStyle||n>40000)){
   const d=new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000);
   return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  }
 }
 return text;
}
/** Alertas documentales: texto pendiente dentro de cualquiera de las tres fechas H, I, J. */
export function tacticalDateAlerts(developmentClose,testsClose,gsjValidation){
 const fields=[['Cierre desarrollo',developmentClose],['Cierre pruebas SOFTPLAN / GTI',testsClose],['Validación GSJ',gsjValidation]];
 return fields.filter(([,value])=>/(?:\bpor\s+informar\b|\brevision\s+con\b)/.test(norm(value).replace(/\s+/g,' ')))
   .map(([field,value])=>({field,value:clean(value)}));
}
export function isGreenFill(hex){
 const m=String(hex||'').replace('#','').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);if(!m)return false;
 const [r,g,b]=m.slice(1).map(x=>parseInt(x,16)),max=Math.max(r,g,b),min=Math.min(r,g,b);
 return (g>r*1.17&&g>b*1.10&&g>=66&&(max-min)>34)||(g>=105&&r<110&&b<110);
}
export function parseTactical(sheets){
 if(!(sheets instanceof Map))throw new Error('El libro táctico no tiene hojas legibles.');
 const entry=[...sheets.entries()].find(([name])=>norm(name)==='seguimiento');
 if(!entry)throw new Error('No se encontró la pestaña «Seguimiento» en el archivo táctico.');
 const [name,allRows]=entry,rows=allRows.slice(0,TACTICAL_MAX_ROW),meta=sheets.cellFormats?.get(name)||new Map(),hasConditional=!!sheets.sheetConditional?.get(name);
 // B y D son la integración y el estado según la fuente. Buscar la cabecera sin asumir su fila.
 const headerIndex=rows.findIndex(row=>row&&(norm(row[1]).includes('integrac')&&(/estado/.test(norm(row[3]))||/criticidad/.test(norm(row[11])))));
 const start=headerIndex>=0?headerIndex+1:1;const entries=[],warnings=[];
 for(let i=start;i<rows.length;i++){
  const row=rows[i]||[],nameValue=clean(row[1]);if(!nameValue)continue;
  const details=[3,4,6,7,8,9,11,12].some(x=>clean(row[x]));
  if(!details)continue;
  if(/^(integraciones|integracion|total|subtotal|especialidad|laboral|estado)(\s|$)/i.test(norm(nameValue)))continue;
  const statusRaw=clean(row[3]);const crit=clean(row[11]);
  const green=isGreenFill(meta.get(`${i}:11`)?.fillColor);
  const developmentClose=excelDate(row[7],meta.get(`${i}:7`));
  const testsClose=excelDate(row[8],meta.get(`${i}:8`));
  const gsjValidation=excelDate(row[9],meta.get(`${i}:9`));
  const dateAlerts=tacticalDateAlerts(developmentClose,testsClose,gsjValidation);
  entries.push({id:`seg-${i+1}`,sheet:name,row:i+1,name:nameValue,statusRaw,statusRawOriginal:statusRaw,status:tacticalState(statusRaw),dependency:clean(row[4]),history:clean(row[6]),developmentClose,testsClose,gsjValidation,dateAlerts,criticality:crit,high:norm(crit)==='alta',green,greenColor:meta.get(`${i}:11`)?.fillColor||'',considerations:clean(row[12])});
 }
 if(!entries.length)warnings.push('No se encontraron integraciones en las columnas indicadas. Revisar encabezados y contenido.');
 const duplicates=new Map();for(const e of entries)duplicates.set(norm(e.name),(duplicates.get(norm(e.name))||0)+1);
 const repeat=[...duplicates].filter(([,n])=>n>1);if(repeat.length)warnings.push(`${repeat.length} nombres de integración se repiten en Seguimiento; se conservan sus filas.`);
 const unknown=entries.filter(e=>e.status==='Sin clasificar');if(unknown.length)warnings.push(`${unknown.length} registros tienen un estado distinto de los cuatro estados definidos.`);
 if(hasConditional)warnings.push('El libro contiene formato condicional: las marcas verdes solo se detectan cuando el relleno se exporta como formato directo de celda.');
 return {entries,warnings,sourceSheet:name,hasConditional,readAt:new Date().toISOString(),sourceCount:entries.length,maxRow:TACTICAL_MAX_ROW};
}
export function getTacticalSummary(data){
 const entries=data?.entries||[];const high=entries.filter(e=>e.high),other=entries.filter(e=>!e.high);
 const counts=arr=>Object.fromEntries([...TACTICAL_STATES,'Sin clasificar'].map(s=>[s,arr.filter(e=>e.status===s).length]));
 return {all:entries.length,high,other,highCounts:counts(high),otherCounts:counts(other),green:entries.filter(e=>e.green).length,dateAlertCount:entries.filter(e=>e.dateAlerts?.length).length};
}
