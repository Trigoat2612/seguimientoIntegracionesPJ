/** EtapaActividadIntegracion: vía(A) → paso(B) → etapa(C) → actividad(D) → integración(E).
 * El estado/criticidad proceden EXCLUSIVAMENTE de Seguimiento.
 * No se inventan estados para actividades sin integración ni enlaces sin correspondencia.
 */
const value=v=>String(v??'').replace(/\u0000/g,'').trim();
const norm=v=>value(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const key=v=>norm(v).replace(/\b(de|del|el|la|los|las|para|y)\b/g,'').replace(/\s+/g,' ').trim();
const aliases=new Map([
 ['sinarej depositos','sinarej depositos orden pago'],
 ['sinarej depositos orden pago','sinarej depositos orden pago'],
 ['expedientes judiciales exjuq','expedientes judiciales exjuq'],
 ['cejsuperior','cej superior']
]);
const canonical=v=>aliases.get(key(v))||key(v);
const sheetMatch=name=>norm(name).replace(/\s+/g,'')==='etapaactividadintegracion';
const splitIntegrations=text=>value(text).split(/(?:\r?\n|;)+/).map(value).filter(v=>v&&!['-','n/a','no aplica','sin integracion','ninguno','ninguna'].includes(norm(v)));
const headerTokens=[['via','via procesal'],['paso','paso flujo','paso del flujo','paso del flujo de la via'],['etapa','etapa procesal'],['actividad','actividades'],['integracion','integracion asociada','integracion asociada a la actividad']];
function isHeader(row){
 if(!row)return false;
 let hits=0;
 for(let i=0;i<5;i++){const n=norm(row[i]);if(headerTokens[i].some(k=>n===k||n.startsWith(k+' ')))hits++;}
 return hits>=3;
}
export function inspectActividadFlujo(sheets){
 const pair=[...(sheets?.entries?.()||[])].find(([name])=>sheetMatch(name));
 if(!pair)return {found:false,name:'',rows:0,preview:[],availableSheets:[...(sheets?.keys?.()||[])],error:'No existe la hoja EtapaActividadIntegracion en el libro táctico.'};
 const [name,rows]=pair;
 return {found:true,name,rows:rows.length,preview:rows.slice(0,8).map((r,i)=>({row:i+1,cells:(r||[]).slice(0,5).map(value)})),error:''};
}
export function parseActividadFlujo(sheets,tactical){
 const diagnostic=inspectActividadFlujo(sheets);
 const result={vias:[],entries:[],warnings:[],unmatched:[],error:'',sourceSheet:diagnostic.name||'',readAt:new Date().toISOString(),diagnostic};
 if(!diagnostic.found)return {...result,error:diagnostic.error};
 const rows=[...sheets.entries()].find(([name])=>sheetMatch(name))[1];
 const firstNonEmpty=rows.findIndex(r=>(r||[]).slice(0,5).some(v=>value(v)));
 if(firstNonEmpty<0)return {...result,error:'La hoja EtapaActividadIntegracion está vacía.'};
 const start=isHeader(rows[firstNonEmpty])?firstNonEmpty+1:firstNonEmpty;
 const tracker=new Map(),duplicates=new Set();
 for(const t of tactical?.entries||[]){
  const k=canonical(t.name);if(!k)continue;
  if(tracker.has(k)){duplicates.add(t.name);continue;}
  tracker.set(k,t);
 }
 if(duplicates.size)result.warnings.push(`Seguimiento presenta ${duplicates.size} nombre(s) repetido(s); verificar las coincidencias.`);
 const viaMap=new Map(),unmatched=new Set();
 let via='',step='',stage='',activity='';
 for(let r=start;r<rows.length;r++){
  const row=rows[r]||[];
  const cells=Array.from({length:5},(_,i)=>value(row[i]));
  if(!cells.some(Boolean)||isHeader(cells)||(!cells.slice(1).some(Boolean)&&norm(cells[0]).replace(/\s/g,'')==='etapaactividadintegracion'))continue;
  const [va,pa,et,act,integ]=cells;
  // Respetar las celdas fusionadas/filas de continuación. No propagar
  // etapas o actividades a una nueva vía o paso.
  if(va&&norm(va)!==norm(via)){via=va;step='';stage='';activity='';}
  else if(va)via=va;
  if(pa&&norm(pa)!==norm(step)){step=pa;stage='';activity='';}
  else if(pa)step=pa;
  if(et&&norm(et)!==norm(stage)){stage=et;activity='';}
  else if(et)stage=et;
  if(act)activity=act;
  if(!via||!step||!activity){
   if(cells.some(Boolean))result.warnings.push(`Fila ${r+1}: falta vía, paso o actividad; no se asignaron relaciones.`);
   continue;
  }
  const vk=norm(via),sk=norm(step),ak=[norm(stage),norm(activity)].join('|');
  if(!viaMap.has(vk))viaMap.set(vk,{id:`via-${viaMap.size+1}`,name:via,steps:[],stepMap:new Map()});
  const v=viaMap.get(vk);
  if(!v.stepMap.has(sk)){
   v.stepMap.set(sk,{id:`paso-${v.id}-${v.steps.length+1}`,name:step,activities:[],activityMap:new Map(),row:r+1});
   v.steps.push(v.stepMap.get(sk));
  }
  const p=v.stepMap.get(sk);
  if(!p.activityMap.has(ak)){
   p.activityMap.set(ak,{id:`act-${p.id}-${p.activities.length+1}`,name:activity,stage:stage||'Etapa no informada',row:r+1,integrations:[],noIntegration:true});
   p.activities.push(p.activityMap.get(ak));
  }
  const a=p.activityMap.get(ak);
  for(const name of splitIntegrations(integ)){
   a.noIntegration=false;
   const lookup=tracker.get(canonical(name))||null;
   if(!lookup)unmatched.add(name);
   if(a.integrations.some(x=>canonical(x.name)===canonical(name)))continue;
   const matched=!!lookup;
   const entry={id:`int-${a.id}-${a.integrations.length+1}`,via:v.name,step:p.name,stage:a.stage,activity:a.name,name,row:r+1,
    status:matched?lookup.status:'Sin correspondencia',statusRaw:matched?lookup.statusRaw:'',ready:matched&&lookup.status==='Validada',
    high:matched&&!!lookup.high,green:matched&&!!lookup.green,matched,dependency:matched?lookup.dependency||'':'',
    severity:matched?(lookup.high?(lookup.green?'Crítica':'Alta'):'No priorizada'):'Sin correspondencia'};
   a.integrations.push(entry);result.entries.push(entry);
  }
 }
 result.vias=[...viaMap.values()].map(v=>({id:v.id,name:v.name,steps:v.steps.map(p=>({id:p.id,name:p.name,row:p.row,activities:p.activities})),activities:v.steps.reduce((n,s)=>n+s.activities.length,0)}));
 result.unmatched=[...unmatched];
 if(unmatched.size)result.warnings.push(`${unmatched.size} integración(es) de EtapaActividadIntegracion sin coincidencia exacta en Seguimiento; se muestran como pendientes sin validar.`);
 if(!result.vias.length)result.error='No hay registros legibles con vía (A), paso (B) y actividad (D). Revisa las columnas en la hoja EtapaActividadIntegracion.';
 return result;
}
export function matchesActividadSeverity(entry,severity='todas'){
 switch(severity){
  case 'critica':return !!entry.matched&&!!entry.high&&!!entry.green;
  case 'alta':return !!entry.matched&&!!entry.high&&!entry.green;
  case 'no_priorizadas':return !!entry.matched&&!entry.high;
  case 'sin_vinculo':return !entry.matched;
  default:return true;
 }
}
export const ACTIVITY_SEVERITIES=[
 {id:'todas',label:'Todas las severidades'},
 {id:'critica',label:'Severidad Crítica'},
 {id:'alta',label:'Severidad Alta'},
 {id:'no_priorizadas',label:'No priorizadas'},
 {id:'sin_vinculo',label:'Sin correspondencia'}
];
export function actividadView(model,viaName,severity='todas'){
 const via=model?.vias?.find(v=>v.name===viaName)||null;
 if(!via)return null;
 const steps=via.steps.map(step=>({...step,activities:step.activities.map(activity=>({...activity,
  integrations:activity.integrations.filter(i=>matchesActividadSeverity(i,severity))}))}));
 const unique=new Map();
 for(const step of steps)for(const a of step.activities)for(const e of a.integrations){
  const k=canonical(e.name);if(!unique.has(k))unique.set(k,e);
  else if(!e.ready)unique.set(k,e);
 }
 return {name:via.name,steps,activities:steps.reduce((n,s)=>n+s.activities.length,0),
  withoutIntegration:steps.reduce((n,s)=>n+s.activities.filter(a=>a.noIntegration).length,0),
  ready:[...unique.values()].filter(e=>e.ready).length,pending:[...unique.values()].filter(e=>!e.ready).length,
  associations:steps.reduce((n,s)=>n+s.activities.reduce((m,a)=>m+a.integrations.length,0),0)};
}
