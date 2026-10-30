/** Resumen documental enriquecido: estado actual, filtros y visualizaciones gerenciales. */
export const DOCUMENT_STATUS_ORDER=Object.freeze(['Observado','Pendiente','Programado','En proceso de firma','Entregado','Validado','Sin seguimiento']);
const normalizeCode=v=>String(v??'').trim().toLocaleUpperCase('es');
const clean=v=>String(v??'').trim();
const statusPriority=Object.fromEntries(DOCUMENT_STATUS_ORDER.map((v,i)=>[v,i]));
/** Orden de códigos documentales: 2.3, 2.4, 4.1, 4.10, 4.100. */
export const compareDocumentCodes=(a,b)=>{
 const first=clean(a),second=clean(b);
 if(!first)return second?1:0;
 if(!second)return -1;
 return first.localeCompare(second,'es',{numeric:true,sensitivity:'base'});
};
const reviewHint=/\b(pendiente(?:s)?|falta(?:n)?|actualizar|subsanar|corregir|por atender)\b/i;
const noPending=/\b(sin pendientes?|no (?:hay|existen?) pendientes?|pendientes? atendid[oa]s?|pendientes? resuelt[oa]s?)\b/i;
const normLabel=v=>clean(v).replace(/\s+/g,' ');
const orderDate=value=>{const s=clean(value);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:s;};
const latestSorter=(a,b)=>{
 const da=orderDate(a?.date)||''; const db=orderDate(b?.date)||'';
 if(da!==db)return db.localeCompare(da,'es');
 const ca=clean(a?.createdAt), cb=clean(b?.createdAt);
 if(ca!==cb)return cb.localeCompare(ca,'es');
 return Number(b?.id||0)-Number(a?.id||0);
};
const uniqueSorted=(list=[])=>[...new Set(list.filter(Boolean).map(normLabel))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
const statusLabel=status=>status==='Sin seguimiento'?'Sin estado':status;

export function buildDocumentDashboard(documents=[],tracking=[],entries=[]){
 const refs=new Map((tracking||[]).map(r=>[normalizeCode(r.documentCode),r]));
 const entryMap=new Map();
 for(const row of entries||[]){
  const code=normalizeCode(row?.documentCode);
  if(!code)continue;
  const item={
   id:row?.id||'',
   documentCode:clean(row?.documentCode),
   date:clean(row?.date),
   status:normLabel(row?.status),
   activity:clean(row?.activity),
   comments:clean(row?.comments),
   responsible:normLabel(row?.responsible),
   validatorTeams:uniqueSorted(row?.validatorTeams||[]),
   stage:clean(row?.stage),
   origin:clean(row?.origin),
   createdAt:clean(row?.createdAt)
  };
  if(!entryMap.has(code))entryMap.set(code,[]);
  entryMap.get(code).push(item);
 }
 for(const list of entryMap.values())list.sort(latestSorter);
 const items=(documents||[]).map(doc=>{
  const code=clean(doc.codigo); const key=normalizeCode(code);
  const row=refs.get(key);
  const docEntries=(entryMap.get(key)||[]);
  const latest=docEntries[0]||row?.latest||null;
  const rawStatus=normLabel(latest?.status);
  const status=rawStatus?(DOCUMENT_STATUS_ORDER.includes(rawStatus)?rawStatus:rawStatus):'Sin seguimiento';
  const text=[latest?.activity,latest?.comments].filter(Boolean).join(' · ');
  const needsClosureReview=status==='Validado'&&reviewHint.test(text)&&!noPending.test(text);
  return {
   id:doc.id,
   code,
   name:clean(doc.documento)||'Sin denominación',
   status,
   statusLabel:statusLabel(status),
   responsible:normLabel(latest?.responsible),
   validatorTeams:uniqueSorted(latest?.validatorTeams||[]),
   latest,
   entries:docEntries,
   entryCount:Math.max(0,Number(row?.entryCount)||docEntries.length||0),
   needsClosureReview,
   priority:statusPriority[status]??50
  };
 });
 items.sort((a,b)=>compareDocumentCodes(a.code,b.code)||a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
 const byStatus=Object.fromEntries(DOCUMENT_STATUS_ORDER.map(s=>[s,0]));
 for(const item of items)byStatus[item.status]=(byStatus[item.status]||0)+1;
 const extraStatuses=uniqueSorted(items.map(item=>item.status).filter(state=>!DOCUMENT_STATUS_ORDER.includes(state)));
 for(const state of extraStatuses)byStatus[state]=items.filter(item=>item.status===state).length;
 const byResponsible={}; const byTeam={}; const byDocumentEntries={};
 for(const item of items){
  if(item.responsible)byResponsible[item.responsible]=(byResponsible[item.responsible]||0)+1;
  for(const team of item.validatorTeams)byTeam[team]=(byTeam[team]||0)+1;
  byDocumentEntries[`${item.code} — ${item.name}`]=item.entryCount;
 }
 return {
  items,
  byStatus,
  total:items.length,
  tracked:items.filter(i=>i.entryCount>0).length,
  events:items.reduce((n,i)=>n+i.entryCount,0),
  needsAction:(byStatus['Observado']||0)+(byStatus['Pendiente']||0),
  validated:byStatus.Validado||0,
  untracked:byStatus['Sin seguimiento']||0,
  closureReview:items.filter(i=>i.needsClosureReview).length,
  byResponsible,
  byTeam,
  byDocumentEntries,
  available:{
   documents:items.map(item=>({value:item.id,label:`${item.code} — ${item.name}`})),
   statuses:[...DOCUMENT_STATUS_ORDER.filter(state=>items.some(item=>item.status===state)),...extraStatuses].map(state=>({value:state,label:statusLabel(state)})),
   responsibles:uniqueSorted(items.map(item=>item.responsible)),
   teams:uniqueSorted(items.flatMap(item=>item.validatorTeams))
  }
 };
}

export function filterDocumentDashboard(items,{query='',status='Todos',team='Todos',documents=[],states=[],responsibles=[],teams=[]}={}){
 const q=clean(query).toLocaleLowerCase('es');
 const docSet=new Set((documents||[]).filter(Boolean));
 const stateSet=new Set((states||[]).filter(Boolean));
 const responsibleSet=new Set((responsibles||[]).filter(Boolean));
 const teamSet=new Set((teams||[]).filter(Boolean));
 return (items||[]).filter(item=>{
  if(docSet.size&&!docSet.has(item.id))return false;
  if(stateSet.size&&!stateSet.has(item.status))return false;
  if(responsibleSet.size&&!responsibleSet.has(item.responsible))return false;
  if(teamSet.size&&!item.validatorTeams.some(team=>teamSet.has(team)))return false;
  if(status==='Con seguimiento'&&item.entryCount===0)return false;
  if(!['Todos','Con seguimiento'].includes(status)&&item.status!==status&&!(status==='Atención prioritaria'&&['Observado','Pendiente'].includes(item.status)))return false;
  if(team!=='Todos'&&!(item.latest?.validatorTeams||[]).includes(team))return false;
  const fields=[item.code,item.name,item.latest?.activity,item.latest?.comments,item.responsible,item.latest?.stage,...item.validatorTeams];
  return !q||fields.some(f=>clean(f).toLocaleLowerCase('es').includes(q));
 });
}

export function summarizeDocumentDashboard(items=[]){
 const byStatus=Object.fromEntries(DOCUMENT_STATUS_ORDER.map(s=>[s,0]));
 for(const item of items)byStatus[item.status]=(byStatus[item.status]||0)+1;
 const extraStatuses=uniqueSorted(items.map(item=>item.status).filter(state=>!DOCUMENT_STATUS_ORDER.includes(state)));
 for(const state of extraStatuses)byStatus[state]=items.filter(item=>item.status===state).length;
 const byResponsible={}; const byTeam={}; const byDocumentEntries={};
 for(const item of items){
  if(item.responsible)byResponsible[item.responsible]=(byResponsible[item.responsible]||0)+1;
  for(const team of item.validatorTeams)byTeam[team]=(byTeam[team]||0)+1;
  byDocumentEntries[`${item.code} — ${item.name}`]=item.entryCount;
 }
 return {
  total:items.length,
  tracked:items.filter(i=>i.entryCount>0).length,
  events:items.reduce((n,i)=>n+i.entryCount,0),
  needsAction:(byStatus['Observado']||0)+(byStatus['Pendiente']||0),
  validated:byStatus.Validado||0,
  untracked:byStatus['Sin seguimiento']||0,
  byStatus,
  byResponsible,
  byTeam,
  byDocumentEntries
 };
}

/** Filtra la tabla de seguimiento. Unión (OR) dentro de cada selector, intersección (AND) entre selectores. */
export function filterDocumentTrackingTable(items,{query='',states=[],teams=[]}={}){
 const q=clean(query).toLocaleLowerCase('es');
 const selectedStates=new Set((states||[]).filter(Boolean));
 const selectedTeams=new Set((teams||[]).filter(Boolean));
 return (items||[]).filter(item=>{
  if(selectedStates.size&&!selectedStates.has(item.status))return false;
  if(selectedTeams.size&&!(item.validatorTeams||[]).some(t=>selectedTeams.has(t)))return false;
  if(!q)return true;
  const latest=item.latest||{};
  return [item.code,item.name,item.status,item.responsible,latest.activity,latest.comments,...(item.validatorTeams||[])].some(v=>clean(v).toLocaleLowerCase('es').includes(q));
 }).sort((a,b)=>compareDocumentCodes(a.code,b.code)||a.name.localeCompare(b.name,'es'));
}
