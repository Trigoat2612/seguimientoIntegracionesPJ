/** V1.15.5.7: indicadores documentales calculados sobre catálogo activo y bitácora publicada. */
export const DOCUMENT_STATUS_ORDER=Object.freeze(['Observado','Pendiente','Programado','En proceso de firma','Entregado','Validado','Sin seguimiento']);
const normalizeCode=v=>String(v??'').trim().toLocaleUpperCase('es');
const clean=v=>String(v??'').trim();
const statusPriority=Object.fromEntries(DOCUMENT_STATUS_ORDER.map((v,i)=>[v,i]));
const reviewHint=/\b(pendiente(?:s)?|falta(?:n)?|actualizar|subsanar|corregir|por atender)\b/i;
const NO_PENDING=/\b(sin pendientes?|no (?:hay|existen?) pendientes?|pendientes? atendid[oa]s?|pendientes? resuelt[oa]s?)\b/i;
export function buildDocumentDashboard(documents=[],tracking=[]){
 const refs=new Map((tracking||[]).map(r=>[normalizeCode(r.documentCode),r]));
 const items=(documents||[]).map(doc=>{
  const code=clean(doc.codigo),row=refs.get(normalizeCode(code));
  const latest=row?.latest||null;
  const status=latest?.status && DOCUMENT_STATUS_ORDER.includes(clean(latest.status))?clean(latest.status):latest?.status?clean(latest.status):'Sin seguimiento';
  const text=[latest?.activity,latest?.comments].filter(Boolean).join(' · ');
  const needsClosureReview=status==='Validado'&&reviewHint.test(text)&&!NO_PENDING.test(text);
  return {id:doc.id,code,name:clean(doc.documento)||'Sin denominación',status,entryCount:Math.max(0,Number(row?.entryCount)||0),latest,needsClosureReview,priority:statusPriority[status]??50};
 });
 items.sort((a,b)=>a.priority-b.priority||a.code.localeCompare(b.code,'es',{numeric:true})||a.name.localeCompare(b.name,'es'));
 const byStatus=Object.fromEntries(DOCUMENT_STATUS_ORDER.map(s=>[s,0]));
 for(const item of items)byStatus[item.status]=(byStatus[item.status]||0)+1;
 return {items,byStatus,total:items.length,tracked:items.filter(i=>i.entryCount>0).length,events:items.reduce((n,i)=>n+i.entryCount,0),needsAction:(byStatus['Observado']||0)+(byStatus['Pendiente']||0),validated:byStatus.Validado||0,untracked:byStatus['Sin seguimiento']||0,closureReview:items.filter(i=>i.needsClosureReview).length};
}
export function filterDocumentDashboard(items,{query='',status='Todos',team='Todos'}={}){
 const q=clean(query).toLocaleLowerCase('es');
 return (items||[]).filter(item=>{
  if(status==='Con seguimiento'&&item.entryCount===0)return false;
  if(!['Todos','Con seguimiento'].includes(status)&&item.status!==status&&!(status==='Atención prioritaria'&&['Observado','Pendiente'].includes(item.status)))return false;
  if(team!=='Todos'&&!(item.latest?.validatorTeams||[]).includes(team))return false;
  const fields=[item.code,item.name,item.latest?.activity,item.latest?.comments,item.latest?.responsible,item.latest?.stage,...(item.latest?.validatorTeams||[])];
  return !q||fields.some(f=>clean(f).toLocaleLowerCase('es').includes(q));
 });
}
