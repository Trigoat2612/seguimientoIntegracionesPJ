/** Planeación del resumen táctico en UNA sola lámina (sin páginas de continuación). */
import {integrationWithEntity,entityPresentation} from './ppt-entities.js';
export const PRESENTATION_STATES=['Validada','Por validar','En pruebas','En desarrollo'];
export const PANEL_GEOMETRY=Object.freeze({
  validated:{w:3.01,columns:2,maxHeight:1.06},
  other:{w:3.01,columns:1,maxHeight:1.06},
  manual:{w:3.01,columns:1,maxHeight:0.34},
  unknown:{w:9.25,columns:4,maxHeight:1.14}
});
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clean=s=>String(s??'').replace(/[\r\n]+/g,' ').trim();
export function isManualRecord(e){return normalize(e?.statusRaw)==='manual';}
function distinct(a){const found=new Set();return (a||[]).filter(e=>{const key=String(e.id??`${e.row}:${e.name}`);if(found.has(key))return false;found.add(key);return true;});}
function charsPerLine(w,cols,pt){
 const available=(w-0.32-(cols-1)*0.14)/cols-0.16;
 return Math.max(9,Math.floor(available*72/(pt*0.53)));
}
/** Estimación conservadora de líneas para dimensionar el espacio vertical. */
export function estimateRows(text,opts={}){
 const {w=3.01,columns=1,font=8.5}=opts;
 const capacity=charsPerLine(w,columns,font);
 const normalized=clean(text);
 if(!normalized)return 1;
 let count=1,line=0;
 for(const word of normalized.split(/\s+/)){
  const len=word.length;
  if(line&&line+1+len>capacity){count++;line=0;}
  if(len>capacity){const full=Math.floor(len/capacity);count+=full;line=len%capacity;}else line+=len+(line?1:0);
 }
 return Math.max(1,count);
}
export const itemLabel=(entry,includeDependency=false)=>integrationWithEntity(entry,includeDependency);
function itemHeight(entry,geom,{font=8.5,compact=false,includeDependency=true}={}){
 const rows=estimateRows(itemLabel(entry,includeDependency),{w:geom.w,columns:geom.columns,font});
 return Math.max(compact?0.125:0.16,rows*(compact?0.102:0.122)+(compact?0.028:0.04));
}
/** Mantiene cada registro; devuelve los que no quepan para redistribución inferior. */
export function takePanelItems(items,start,geom,options={}){
 const cols=Array.from({length:geom.columns},()=>[]),heights=cols.map(()=>0);
 let idx=start;
 while(idx<items.length){
  const entry=items[idx],height=itemHeight(entry,geom,options);
  const target=heights.indexOf(Math.min(...heights));
  if(heights[target]+height>geom.maxHeight+0.0001)break;
  cols[target].push({entry,height});heights[target]+=height;idx++;
 }
 return {columns:cols,nextIndex:idx};
}
/** Ajusta columna y tamaño de letra antes de decidir que un estado no cabe.
 * La estimación respeta cómo se imprimirá Entidad: solo por fila cuando E sea mixta. */
export function fitStatePanel(entries,geom,baseFont=8){
 const entity=entityPresentation([entries.map(entry=>({entry,height:0}))]);
 const attempts=[];
 const possibleCols=[geom.columns,2,3].filter((n,i,a)=>a.indexOf(n)===i);
 for(const cols of possibleCols){
  for(const font of [baseFont,7.8,7.4,7,6.6,6.2]){
   const testGeom={...geom,columns:cols};
   const result=takePanelItems(entries,0,testGeom,{font,compact:true,includeDependency:entity.perIntegration});
   const layout={...result,font,columnsCount:cols};
   if(result.nextIndex===entries.length)return layout;
   attempts.push(layout);
  }
 }
 // Únicamente para volúmenes físicamente imposibles en el cuadro de origen.
 return attempts.sort((a,b)=>b.nextIndex-a.nextIndex||b.font-a.font)[0];
}
function overflowLabel(entry,state){
 return {...entry,name:`${state}: ${entry.name}`,originalState:state};
}
/** Para la banda inferior: auto-ajusta columnas, fuente y distancia vertical,
 * conservando un registro por cada fila del Excel sin crear una lámina adicional. */
export function packOverflowItems(entries){
 const rows=entries.length;
 if(!rows)return {columns:[[],[],[],[]],font:7.3,totalRows:0};
 const settings=[{cols:3,font:7.6,maxRows:5},{cols:4,font:7.2,maxRows:7},{cols:5,font:6.6,maxRows:9},{cols:6,font:6.0,maxRows:11}];
 let setting=settings.find(x=>Math.ceil(rows/x.cols)<=x.maxRows)||settings[settings.length-1];
 const cols=Array.from({length:setting.cols},()=>[]);
 const perCol=Math.ceil(rows/setting.cols),height=Math.min(0.18,1.14/Math.max(1,perCol));
 entries.forEach((entry,i)=>{
  const col=Math.min(setting.cols-1,Math.floor(i/perCol));
  cols[col].push({entry,height});
 });
 return {columns:cols,font:setting.font,totalRows:rows};
}
export function buildTacticalSlidePlan(model){
 const source=model.category?.id==='todas'?model.primary:model.visibleFiltered;
 const selected=distinct(source);
 const manual=distinct(Array.isArray(model.manualEntries)?model.manualEntries:[...(model.nonPrioritized||[]),...selected].filter(isManualRecord));
 const grouped=Object.fromEntries(PRESENTATION_STATES.map(s=>[s,selected.filter(e=>e.status===s&&!isManualRecord(e))]));
 grouped['Otros estados']=selected.filter(e=>!PRESENTATION_STATES.includes(e.status)&&!isManualRecord(e));
 const totals=Object.fromEntries(Object.entries(grouped).map(([state,items])=>[state,items.length]));
 totals.Manual=manual.length;
 const parts={},spill=[],fontByState={};
 for(const state of PRESENTATION_STATES){
  const geom=state==='Validada'?PANEL_GEOMETRY.validated:PANEL_GEOMETRY.other;
  const result=fitStatePanel(grouped[state],geom,state==='Validada'?7.8:8.0);
  parts[state]=result.columns;
  fontByState[state]=result.font;
  // Las integraciones desbordadas mantienen su estado, nunca son "Otros estados".
  spill.push(...grouped[state].slice(result.nextIndex).map(e=>overflowLabel(e,state)));
 }
 const manualResult=fitStatePanel(manual,PANEL_GEOMETRY.manual,7.8);
 parts.Manual=manualResult.columns;
 fontByState.Manual=manualResult.font;
 spill.push(...manual.slice(manualResult.nextIndex).map(e=>overflowLabel(e,'Manual')));
 const continuation=packOverflowItems(spill);
 const unknown=packOverflowItems(grouped['Otros estados']);
 parts.Continuacion=continuation.columns;
 parts['Otros estados']=unknown.columns;
 const page={parts,totals,index:1,totalPages:1,fontByState,continuationFont:continuation.font,unknownFont:unknown.font,overflowCount:continuation.totalRows,unknownCount:unknown.totalRows};
 const inputCount=selected.filter(e=>!isManualRecord(e)).length+manual.length;
 const renderedCount=Object.values(parts).flatMap(cols=>cols.flat()).length;
 if(inputCount!==renderedCount)throw new Error(`Error en la distribución: ${renderedCount} de ${inputCount} registros representados.`);
 return {pages:[page],totals,selectedCount:selected.length,manualCount:manual.length,model};
}
