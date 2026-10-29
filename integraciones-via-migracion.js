/** V1.15.3: relaciones de IntegracionesEtapa, sin sustituir el intérprete vigente. */
import {parseVias,getAllViaViews} from './vias.js';
import {makeSheetSnapshot,validateSheetSnapshot} from './sincronizacion-modelo.js';

const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fields=['id','via','stage','name','row','ready','status','statusRaw','dependency','high','green','severity','matched'];
export function extractViaEntries(snapshot,tactical,mapping={}){
 const v=validateSheetSnapshot(snapshot);
 if(!v.valid)throw new Error(v.errors.slice(0,4).join(' '));
 if(snapshot.module!=='integraciones_via')throw new Error('Se necesita la hoja IntegracionesEtapa.');
 if(!tactical?.entries?.length)throw new Error('No se recibió el seguimiento táctico para contrastar los estados.');
 const result=parseVias(new Map([['IntegracionesEtapa',v.rows]]),tactical,mapping);
 if(result.error||!result.entries.length)throw new Error(result.error||'Sin asociaciones vía–etapa–integración.');
 if(result.entries.length>15000)throw new Error('El número de asociaciones supera el límite de seguridad.');
 if(result.entries.some(e=>!e.via||!e.stage||!e.name||!Number.isInteger(e.row)))throw new Error('Asociación incompleta en la fuente.');
 const k=new Set();for(const e of result.entries){const key=[e.via,e.stage,e.name].map(norm).join('|');if(k.has(key))throw new Error('La extracción produjo asociaciones duplicadas.');k.add(key);}
 return {...result,sourceSheet:'IntegracionesEtapa',mapping:{...mapping},sourceWarnings:v.warnings};
}
export function compareViaEntries(current=[],previous=[]){
 const a=new Map(current.map(e=>[[e.via,e.stage,e.name].map(norm).join('|'),e]));
 const b=new Map(previous.map(e=>[[e.via,e.stage,e.name].map(norm).join('|'),e]));
 const samples=[];let added=0,removed=0,changed=0,unchanged=0;
 for(const [key,e] of a){const prev=b.get(key);if(!prev){added++;if(samples.length<10)samples.push(`Nueva: ${e.via} / ${e.stage} / ${e.name}`);}
  else if(fields.some(f=>e[f]!==prev[f])){changed++;if(samples.length<10)samples.push(`Modificada: ${e.via} / ${e.stage} / ${e.name}`);}else unchanged++;}
 for(const [key,e] of b)if(!a.has(key)){removed++;if(samples.length<10)samples.push(`Retirada: ${e.via} / ${e.stage} / ${e.name}`);}
 return {added,removed,changed,unchanged,identical:!added&&!removed&&!changed,samples};
}
export function viaParityReport(google,neon){
 const diff=compareViaEntries(google?.entries,neon?.entries),errors=[...diff.samples],views={};
 for(const severity of ['todas','critica','alta','no_priorizadas']){
  const a=getAllViaViews(google,severity),b=getAllViaViews(neon,severity);
  const metrics=arr=>arr.map(v=>[v.name,v.total,v.ready,v.pending,v.associations,v.stages.map(s=>[s.name,s.ready.length,s.pending.length])]);
  if(JSON.stringify(metrics(a))!==JSON.stringify(metrics(b)))errors.push(`Diferencia de vías/etapas con filtro ${severity}`);
  views[severity]={vias:a.length,associations:a.reduce((n,v)=>n+v.associations,0),ready:a.reduce((n,v)=>n+v.ready,0),pending:a.reduce((n,v)=>n+v.pending,0)};
 }
 return {equal:!errors.length,sourceEntries:google?.entries?.length||0,neonEntries:neon?.entries?.length||0,sourceVias:google?.vias?.length||0,neonVias:neon?.vias?.length||0,diff,views,errors};
}
/** Reconstruye exactamente la jerarquía utilizada por renderVias y los PPT. */
export function rehydrateViasFromNeon(records=[],meta={}){
 if(!records.length)throw new Error('Neon aún no contiene asociaciones de Integraciones por vía publicadas.');
 const entries=records.map(r=>({...r.entry}));
 const first=entries[0];
 if(!first||!entries.every(e=>e.id&&e.via&&e.stage&&e.name))throw new Error('Neon contiene relaciones incompletas.');
 const ranks=meta.stageOrder||{},viaOrder=meta.viaOrder||[];
 const vm=new Map();for(const e of entries){if(!vm.has(e.via))vm.set(e.via,{name:e.via,stages:new Map(),ready:0,pending:0});const v=vm.get(e.via);
  if(!v.stages.has(e.stage))v.stages.set(e.stage,{name:e.stage,entries:[],ready:0,pending:0});
  const s=v.stages.get(e.stage);s.entries.push(e);s[e.ready?'ready':'pending']++;v[e.ready?'ready':'pending']++;
 }
 const vias=[...vm.values()].sort((a,b)=>{
  const ai=viaOrder.indexOf(a.name),bi=viaOrder.indexOf(b.name);return (ai<0?999:ai)-(bi<0?999:bi);
 }).map(v=>({...v,stages:[...v.stages.values()].sort((a,b)=>{
  const order=ranks[v.name]||[],ai=order.indexOf(a.name),bi=order.indexOf(b.name);return (ai<0?999:ai)-(bi<0?999:bi);
 })}));
 return {vias,entries,warnings:meta.warnings||[],error:'',sourceSheet:'IntegracionesEtapa',readAt:new Date().toISOString(),unmatched:meta.unmatched||[],diagnostic:meta.diagnostic||{found:true,sourceSheet:'IntegracionesEtapa',rows:records.length,columns:[],preview:[],headerCandidates:[]},headerRow:meta.headerRow??null,mode:meta.mode??null};
}
export function viaPublicationMetadata(model,mapping={}){
 return {mapping,viaOrder:model.vias.map(v=>v.name),stageOrder:Object.fromEntries(model.vias.map(v=>[v.name,v.stages.map(s=>s.name)])),
  unmatched:model.unmatched,warnings:model.warnings,mode:model.mode,headerRow:model.headerRow,
  diagnostic:{found:true,sourceSheet:'IntegracionesEtapa',rows:model.diagnostic?.rows||0,columns:[],preview:[],headerCandidates:[]}};
}
