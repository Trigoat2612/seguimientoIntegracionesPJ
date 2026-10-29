/** V1.15.4. Conserva la jerarquía del parser vigente, incluso actividades sin integración. */
import {parseActividadFlujo,actividadView,ACTIVITY_SEVERITIES} from './actividad-flujo.js';
import {validateSheetSnapshot} from '../sync/sincronizacion-modelo.js';

const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const activityId=(via,step,stage,name)=>[via,step,stage,name].map(norm).join('|');
const linkId=(via,step,stage,activity,name)=>[via,step,stage,activity,name].map(norm).join('|');
const fields=['id','via','step','stage','activity','name','row','status','statusRaw','ready','high','green','matched','dependency','severity'];
export function extractFlowEntries(snapshot,tactical){
 const v=validateSheetSnapshot(snapshot);
 if(!v.valid)throw new Error(v.errors.slice(0,4).join(' '));
 if(snapshot.module!=='flujo_actividades')throw new Error('Se requiere EtapaActividadIntegracion.');
 if(!tactical?.entries?.length)throw new Error('Primero publica Resumen táctico en Neon para resolver estados y criticidad.');
 const parsed=parseActividadFlujo(new Map([['EtapaActividadIntegracion',v.rows]]),tactical);
 if(parsed.error||!parsed.vias.length)throw new Error(parsed.error||'No se identificaron vías y pasos.');
 const activities=[],links=[],keys=new Set(),linkKeys=new Set();let sequence=0;
 for(const [vi,via] of parsed.vias.entries())for(const [pi,step] of via.steps.entries())for(const [ai,a] of step.activities.entries()){
  const k=activityId(via.name,step.name,a.stage,a.name);
  if(keys.has(k))throw new Error(`Actividad repetida dentro del mismo paso y etapa: ${a.name}.`);
  keys.add(k);
  const detail={viaId:via.id,viaName:via.name,viaPosition:vi,stepId:step.id,stepName:step.name,stepRow:step.row,stepPosition:pi,activityId:a.id,activityName:a.name,activityRow:a.row,stage:a.stage,activityPosition:ai,noIntegration:a.noIntegration};
  activities.push({activityKey:k,sourceRow:a.row,activityPosition:sequence++,viaName:via.name,stepName:step.name,stageName:a.stage,activityName:a.name,noIntegration:a.noIntegration,detail});
  for(const [position,entry] of a.integrations.entries()){
   const lk=linkId(via.name,step.name,a.stage,a.name,entry.name);
   if(linkKeys.has(lk))throw new Error('Se detectaron vínculos de integración duplicados en una actividad.');
   linkKeys.add(lk);
   links.push({linkKey:lk,activityKey:k,sourceRow:entry.row,linkPosition:position,entry});
  }
 }
 if(activities.length>15000||links.length>20000)throw new Error('El flujo supera el número de actividades o enlaces permitido.');
 if(activities.some(a=>a.noIntegration&&links.some(l=>l.activityKey===a.activityKey)))throw new Error('Una actividad sin integración contiene enlaces inesperados.');
 return {...parsed,activities,links,sourceWarnings:v.warnings};
}
export function flowPublicationMetadata(model){return {sourceSheet:'EtapaActividadIntegracion',warnings:model.warnings||[],unmatched:model.unmatched||[],diagnostic:model.diagnostic||{},viaOrder:model.vias.map(v=>v.name)};}
export function rehydrateFlowFromNeon(activityRows=[],linkRows=[],metadata={}){
 if(!activityRows.length)throw new Error('No hay actividades publicadas en Neon.');
 const viaMap=new Map(),actMap=new Map(),activities=[],links=[],entries=[];
 const sorted=[...activityRows].sort((a,b)=>Number(a.activity_position??a.activityPosition)-Number(b.activity_position??b.activityPosition));
 for(const r of sorted){
  const d=r.detail||r;
  if(!d.viaName||!d.stepName||!d.activityName||!d.activityId||!d.stepId||!d.viaId||!d.stage)throw new Error('Neon contiene una actividad incompleta.');
  const k=r.activity_key||r.activityKey||activityId(d.viaName,d.stepName,d.stage,d.activityName);
  if(actMap.has(k))throw new Error('Neon contiene actividades duplicadas.');
  if(!viaMap.has(d.viaId))viaMap.set(d.viaId,{id:d.viaId,name:d.viaName,steps:[],stepMap:new Map()});
  const via=viaMap.get(d.viaId);
  if(!via.stepMap.has(d.stepId)){
   const step={id:d.stepId,name:d.stepName,row:d.stepRow,activities:[]};via.stepMap.set(d.stepId,step);via.steps.push(step);
  }
  const a={id:d.activityId,name:d.activityName,stage:d.stage,row:d.activityRow,integrations:[],noIntegration:!!d.noIntegration};
  via.stepMap.get(d.stepId).activities.push(a);actMap.set(k,a);activities.push({...r,activityKey:k,detail:d});
 }
 for(const r of linkRows){
  const k=r.activity_key||r.activityKey,a=actMap.get(k),e=r.entry;
  if(!a||!e||!e.id||!e.via||!e.step||!e.activity||!e.name)throw new Error('Neon contiene enlaces de actividad huérfanos o incompletos.');
  if(a.noIntegration)throw new Error('Actividad marcada sin integración contiene enlaces.');
  if(a.integrations.some(x=>norm(x.name)===norm(e.name)))throw new Error('Neon contiene una asociación duplicada.');
  a.integrations.push({...e});entries.push({...e});links.push({...r,activityKey:k});
 }
 for(const a of actMap.values())if(a.noIntegration!==!a.integrations.length)throw new Error('Inconsistencia entre actividad sin integración y asociaciones publicadas.');
 const vias=[...viaMap.values()].map(v=>({id:v.id,name:v.name,steps:v.steps,activities:v.steps.reduce((n,p)=>n+p.activities.length,0)}));
 return {vias,entries,warnings:metadata.warnings||[],unmatched:metadata.unmatched||[],error:'',sourceSheet:'EtapaActividadIntegracion',readAt:new Date().toISOString(),diagnostic:metadata.diagnostic||{found:true,name:'EtapaActividadIntegracion',rows:activities.length},activities,links};
}
function metrics(model){return (model.vias||[]).map(v=>({id:v.id,name:v.name,steps:v.steps.map(s=>({id:s.id,name:s.name,row:s.row,activities:s.activities.map(a=>({id:a.id,name:a.name,stage:a.stage,row:a.row,noIntegration:a.noIntegration,integrations:a.integrations.map(e=>fields.map(f=>e[f]??null))}))}))}));}
export function flowParityReport(google,neon){
 const errors=[];
 if(JSON.stringify(metrics(google))!==JSON.stringify(metrics(neon)))errors.push('Diferencia en jerarquía, orden, actividades o asociaciones.');
 for(const sev of ACTIVITY_SEVERITIES){
  const select=model=>model.vias.map(v=>{const view=actividadView(model,v.name,sev.id);return [v.name,view?.activities,view?.withoutIntegration,view?.ready,view?.pending,view?.associations,view?.steps.map(s=>s.activities.map(a=>a.integrations.map(e=>e.name)))];});
  if(JSON.stringify(select(google))!==JSON.stringify(select(neon)))errors.push(`Diferencia con filtro ${sev.label}.`);
 }
 const amount=m=>({routes:m?.vias?.length||0,steps:(m?.vias||[]).reduce((n,v)=>n+v.steps.length,0),activities:(m?.vias||[]).reduce((n,v)=>n+v.activities,0),links:m?.entries?.length||0,without:(m?.vias||[]).reduce((n,v)=>n+v.steps.reduce((m,s)=>m+s.activities.filter(a=>a.noIntegration).length,0),0)});
 return {equal:!errors.length,source:amount(google),neon:amount(neon),errors};
}
export function compareFlowModels(a,b){
 const flat=m=>new Map((m?.vias||[]).flatMap(v=>v.steps.flatMap(p=>p.activities.map(x=>[activityId(v.name,p.name,x.stage,x.name),JSON.stringify({noIntegration:x.noIntegration,links:x.integrations.map(e=>fields.map(f=>e[f]??null))})]))));
 const now=flat(a),old=flat(b);let added=0,changed=0,removed=0,unchanged=0;const samples=[];
 for(const [k,v] of now){if(!old.has(k)){added++;if(samples.length<8)samples.push('Nueva: '+k);}else if(v!==old.get(k)){changed++;if(samples.length<8)samples.push('Modificada: '+k);}else unchanged++;}
 for(const k of old.keys())if(!now.has(k)){removed++;if(samples.length<8)samples.push('Retirada: '+k);}
 return {added,changed,removed,unchanged,identical:!added&&!changed&&!removed,samples};
}
