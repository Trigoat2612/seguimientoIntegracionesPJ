import {DOCUMENT_STATUS_ORDER,filterDocumentDashboard,summarizeDocumentDashboard,compareDocumentCodes,filterDocumentTrackingTable} from '../../shared/documents/resumen-documental.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const n = value => Number(value || 0).toLocaleString('es-PE');
const tone = {'Observado':'risk','Pendiente':'pending','Programado':'scheduled','En proceso de firma':'signing','Entregado':'delivered','Validado':'validated','Sin seguimiento':'missing'};
const label = state => state === 'Sin seguimiento' ? 'Sin estado' : state;
const statusStyles={risk:'#7f8ea0',pending:'#237184',scheduled:'#2e8452',signing:'#7252a1',delivered:'#a84434',validated:'#bd8733',missing:'#9a7b33',other:'#537c9e'};
const pct=(count,total)=> total ? Math.round(count/total*100) : 0;
const topStates=summary=>[...DOCUMENT_STATUS_ORDER,...Object.keys(summary.byStatus||{}).filter(s=>!DOCUMENT_STATUS_ORDER.includes(s))].filter(state=>(summary.byStatus?.[state]||0)>0);
const metric=(title,amount,caption,theme)=>`<div class="document-summary-metric document-summary-${theme}"><span>${esc(title)}</span><strong>${n(amount)}</strong>${caption?`<small>${esc(caption)}</small>`:''}</div>`;
const stateCard=(title,amount,total)=>`<div class="docdash-state-card docdash-state-${tone[title]||'other'}"><span>${esc(label(title))}</span><strong>${n(amount)}</strong><small>${pct(amount,total)}%</small></div>`;
const shortDate=s=>{const v=String(s||'').trim(); if(!v)return '—'; if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-'); return `${d}/${m}/${y}`;} return v;};
const upperDate = value => {const d=value?new Date(value):new Date(); const text=d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'').toUpperCase(); return text;};
function gauge(summary){
 const total=Math.max(0,Number(summary.total)||0), validated=Math.max(0,Number(summary.validated)||0), percent=total?Math.round(validated/total*100):0;
 const arc=(percent/100*282.74).toFixed(2);
 return `<section class="panel docdash-panel"><div class="docdash-gauge-title">AVANCE GENERAL</div><div class="docdash-gauge-wrap"><div class="docdash-gauge"><svg viewBox="0 0 220 126" role="img" aria-label="Avance documental: ${percent}% validado"><path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#edf2f7" stroke-width="19" stroke-linecap="round"/><path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#1684a2" stroke-width="19" stroke-linecap="round" stroke-dasharray="${arc} 282.74"/></svg><div class="docdash-gauge-inner"><strong>${percent}%</strong><span>${n(validated)} de ${n(total)}</span></div></div></div><p class="docdash-gauge-caption">Validado sobre el total de documentos filtrados</p></section>`;
}
function donut(summary){
 const total=Math.max(0,Number(summary.total)||0); const states=topStates(summary);
 if(!states.length)return `<div class="docdash-status-split"><p class="docdash-empty-note">No hay estados documentales con valores publicados.</p></div>`;
 let acc=0; const parts=states.map(state=>{const count=Number(summary.byStatus[state])||0; const start=acc; const share=total?count/total*100:0; acc+=share; const color=statusStyles[tone[state]||'other']; return `${color} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;}).join(',');
 const legend=states.map(state=>`<div class="docdash-legend-item"><i class="docdash-dot" style="background:${statusStyles[tone[state]||'other']}"></i><span>${esc(label(state))}</span><b>${n(summary.byStatus[state])}</b></div>`).join('');
 return `<div class="docdash-status-split"><div class="docdash-donut" style="--segments:${parts}"><div><strong>${n(total)}</strong><span>documentos</span></div></div><div class="docdash-legend">${legend}</div></div>`;
}
function bars(map,{empty='Sin datos',limit=8,clickable=false,orderByCode=false}={}){
 const entries=Object.entries(map||{}).filter(([,count])=>Number(count)>0);
 if(orderByCode)entries.sort((a,b)=>compareDocumentCodes(a[0].split(' — ')[0],b[0].split(' — ')[0])||a[0].localeCompare(b[0],'es'));
 else entries.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es'));
 const shown=Number.isFinite(limit)?entries.slice(0,limit):entries;
 if(!entries.length)return `<p class="docdash-empty-note">${esc(empty)}</p>`;
 const max=Math.max(...entries.map(([,v])=>v),1);
 return `<div class="docdash-bars ${orderByCode?'docdash-bars-documents':''}">${shown.map(([name,count])=>`<div class="docdash-bar-row${clickable?' docdash-clickable-bar':''}" ${clickable?`data-action="docdash-filter-document" data-docdash-label="${esc(name)}"`:''}><span class="document-summary-state-name" title="${esc(name)}">${esc(name)}</span><span class="document-summary-track"><span class="document-summary-fill document-summary-validated" style="width:${Math.max(6,Math.min(100,count/max*100)).toFixed(2)}%"></span></span><b>${n(count)}</b></div>`).join('')}</div>`;
}
function multiselect(id,title,items,selectedValues=[]){
 const selected=new Set(selectedValues||[]); const summary=selected.size?`${selected.size} seleccionado${selected.size===1?'':'s'}`:'Todos';
 return `<details class="docdash-filter" data-docdash-filter="${esc(id)}"><summary><span class="docdash-filter-title">${esc(title)}</span><span class="docdash-filter-value">${esc(summary)}</span></summary><div class="docdash-filter-panel">${items.length?items.map(item=>`<label class="docdash-check"><input type="checkbox" data-docdash-filter-group="${esc(id)}" value="${esc(item.value)}" ${selected.has(item.value)?'checked':''}> <span>${esc(item.label)}</span></label>`).join(''):`<p class="docdash-empty-note">Sin opciones</p>`}<div class="docdash-filter-links"><button type="button" class="btn-link" data-action="docdash-select-all" data-docdash-group="${esc(id)}">Todos</button><button type="button" class="btn-link" data-action="docdash-clear-group" data-docdash-group="${esc(id)}">Ninguno</button></div></div></details>`;
}
function renderLog(items=[],expandedIds=new Set()){
 const rows=items.filter(item=>item.entryCount>0);
 const totalRecords=rows.reduce((sum,item)=>sum+item.entryCount,0);
 const groups=rows.map(item=>{
  const opened=expandedIds.has(item.id);
  return `<div class="docdash-log-group"><button class="docdash-log-summary" data-action="docdash-toggle-log" data-docdash-log="${esc(item.id)}" aria-expanded="${opened?'true':'false'}"><div class="docdash-log-main"><span class="docdash-log-code">${esc(item.code)}</span><strong>${esc(item.name)}</strong></div><div class="docdash-log-meta"><span>${n(item.entryCount)} registro${item.entryCount===1?'':'s'}</span><span class="docdash-status-pill docdash-status-${tone[item.status]||'other'}">${esc(item.statusLabel)}</span></div></button>${opened?`<div class="docdash-log-body"><table class="table tracking-table"><thead><tr><th>Fecha</th><th>Actividad / comentario</th><th>Estado</th><th>Responsable</th><th>Equipo validador</th></tr></thead><tbody>${(item.entries||[]).map(entry=>`<tr><td>${esc(shortDate(entry.date))}</td><td>${esc([entry.activity,entry.comments].filter(Boolean).join(' · ')||'—')}</td><td><span class="docdash-status-pill docdash-status-${tone[entry.status]||'other'}">${esc(label(entry.status||'Sin seguimiento'))}</span></td><td>${esc(entry.responsible||'—')}</td><td>${esc((entry.validatorTeams||[]).join(', ')||'—')}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`;
 }).join('');
 return `<section class="panel docdash-panel"><div class="docdash-panel-head"><h3>Bitácora completa</h3><div class="docdash-panel-actions"><span class="docdash-inline-total">${n(items.length)} documentos · ${n(totalRecords)} registros</span><button class="btn btn-light btn-sm" data-action="docdash-expand-all">Expandir todos</button><button class="btn btn-light btn-sm" data-action="docdash-collapse-all">Colapsar todos</button></div></div>${groups||'<p class="docdash-empty-note">No hay documentos con bitácora para los filtros actuales.</p>'}</section>`;
}

function renderPendingTracking(items=[],options={},filters={}){
 const active={query:filters.query||'',states:filters.states||[],teams:filters.teams||[]};
 const rows=filterDocumentTrackingTable(items,active);
 const stateOptions=(options.statuses||[]).map(x=>({value:x.value,label:x.label}));
 const teamOptions=(options.teams||[]).map(t=>({value:t,label:t}));
 const body=rows.map(item=>{
  const entry=item.latest||{};
  const detail=[entry.activity,entry.comments].filter(Boolean).join(' · ')||'Sin anotaciones registradas';
  return `<tr><td class="document-summary-name"><span class="document-summary-code">${esc(item.code||'Sin código')}</span><strong>${esc(item.name)}</strong></td><td><span class="docdash-status-pill docdash-status-${tone[item.status]||'other'}">${esc(label(item.status))}</span></td><td><span class="document-summary-clamp" title="${esc(detail)}">${esc(detail)}</span></td><td>${esc(item.responsible||'Sin responsable')}</td><td>${esc(shortDate(entry.date))}</td><td class="document-summary-count">${n(item.entryCount)}</td><td><button type="button" class="btn btn-light btn-sm" data-action="docdash-open-document" data-docdash-document-id="${esc(item.id)}">Ver ficha</button></td></tr>`;
 }).join('');
 return `<section class="panel docdash-panel document-dashboard-table" aria-label="Seguimiento y pendientes">
 <div class="document-summary-section-head"><div><h3>Seguimiento y pendientes</h3><p>Prioriza observados y pendientes. Abre la ficha para consultar la bitácora completa.</p></div><span>${n(rows.length)} de ${n(items.length)}</span></div>
 <div class="docdash-table-filters">
  <label class="docdash-search-box"><span>Buscar documento o actividad</span><input class="input" id="docdash-table-search" value="${esc(active.query)}" placeholder="Código, documento, acuerdo, responsable…"></label>
  ${multiselect('tableStates','Estado',stateOptions,active.states)}
  ${multiselect('tableTeams','Equipo validador',teamOptions,active.teams)}
  <button type="button" class="btn btn-light btn-sm" data-action="docdash-table-clear">Limpiar filtros</button>
 </div>
 <div class="doc-table-wrap"><table class="document-summary-table"><thead><tr><th>Documento</th><th>Estado actual</th><th>Última actividad / comentario</th><th>Responsable</th><th>Fecha</th><th>Anot.</th><th>Detalle</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="doc-empty">No hay documentos para los filtros seleccionados.</td></tr>'}</tbody></table></div></section>`;
}

export function renderDocumentDashboard({data,loading=false,error='',generatedAt='',filters={},tableFilters={},expandedIds=new Set()}={}) {
 const intro = `<div class="docdash-toolbar"><span class="neon-readonly-indicator">Datos publicados</span><button class="btn btn-light" data-action="document-dashboard-refresh" ${loading?'disabled':''}>${loading?'Actualizando…':'↻ Actualizar'}</button></div>`;
 if (!data) return intro + `<div class="notice ${error?'error':''}" role="status">${esc(loading?'Consultando los datos publicados…':error||'No hay información documental cargada.')}</div>`;
 const activeFilters={documents:filters.documents||[],states:filters.states||[],responsibles:filters.responsibles||[],teams:filters.teams||[],query:filters.query||''};
 const hasItems=Array.isArray(data.items);
 const filteredItems=hasItems?filterDocumentDashboard(data.items,activeFilters):[];
 const summary=hasItems?summarizeDocumentDashboard(filteredItems):{...data,byResponsible:data.byResponsible||{},byTeam:data.byTeam||{},byDocumentEntries:data.byDocumentEntries||{}};
 const visibleStates=topStates(summary);
 const metrics=[
  metric('Documentos registrados',summary.total,'Catálogo activo','total'),
  metric('Con seguimiento',summary.tracked,`${n(summary.events)} anotaciones registradas`,'tracked'),
  metric('Atención prioritaria',summary.needsAction,'Pendientes u observados','pending'),
  metric('Validados',summary.validated,'Estado del último registro','validated'),
  metric('Sin seguimiento',summary.untracked,'Sin anotaciones publicadas','missing')
 ].filter(html=>!html.includes('<strong>0</strong>')||html.includes('Documentos registrados')).join('');
 const stateCards=[stateCard('Total',summary.total,summary.total||1),...visibleStates.map(state=>stateCard(state,summary.byStatus[state],summary.total||1))].join('');
 const documentOptions=(data.available?.documents||[]).map(item=>({value:item.value,label:item.label}));
 const stateOptions=(data.available?.statuses||[]).map(item=>({value:item.value,label:item.label}));
 const responsibleOptions=(data.available?.responsibles||[]).map(value=>({value,label:value}));
 const teamOptions=(data.available?.teams||[]).map(value=>({value,label:value}));
 const distribution = visibleStates.map(state => {
  const count = Math.max(0,Number(summary.byStatus?.[state])||0);
  const percentage = summary.total ? count / summary.total * 100 : 0;
  const css = tone[state] || 'other';
  return `<div class="document-summary-state-row"><span class="document-summary-state-name">${esc(label(state))}</span><span class="document-summary-track"><span class="document-summary-fill document-summary-${css}" style="width:${Math.min(100,percentage).toFixed(2)}%"></span></span><b>${n(count)}</b></div>`;
 }).join('') || '<div class="notice" role="status">No hay estados documentales con valores publicados.</div>'; 
 return `${intro}${error?`<div class="notice error" role="alert">${esc(error)}. Se muestra la última lectura disponible.</div>`:''}
  <div class="document-summary-metrics document-summary-metrics-5">${metrics}</div>
  ${gauge(summary)}
  <div class="docdash-status-cards">${stateCards}</div>
  <section class="panel docdash-panel"><div class="docdash-filters-grid">${multiselect('documents','Documento',documentOptions,activeFilters.documents)}${multiselect('states','Estado actual',stateOptions,activeFilters.states)}${multiselect('responsibles','Responsable',responsibleOptions,activeFilters.responsibles)}${multiselect('teams','Equipo validador',teamOptions,activeFilters.teams)}<label class="docdash-search-box"><span>Buscar</span><input class="input" id="docdash-search" value="${esc(activeFilters.query||'')}" placeholder="Código, documento, actividad o comentario"></label><div class="docdash-filter-actions"><button class="btn btn-light" data-action="docdash-clear">Limpiar filtros</button></div></div></section>
  <section class="panel docdash-panel"><h3>Documentos por estado</h3><div class="document-summary-states">${distribution}</div></section>
  <section class="panel docdash-panel"><h3>Estado Actual por Documento</h3><p>Distribución de los ${n(summary.total)} documentos según su estado más reciente.</p>${donut(summary)}</section>
  <section class="panel docdash-panel"><h3>Documentos por Equipo Validador</h3><p>Según el equipo validador del registro más reciente.</p>${bars(summary.byTeam,{empty:'No hay equipos validadores publicados.'})}</section>
  <section class="panel docdash-panel"><h3>Documentos por Responsable</h3><p>Según el responsable del registro más reciente.</p>${bars(summary.byResponsible,{empty:'No hay responsables publicados.'})}</section>
  <section class="panel docdash-panel"><h3>Registros de Bitácora por Documento</h3><p>Cantidad de reuniones/acciones registradas · clic para filtrar</p>${bars(summary.byDocumentEntries,{empty:'No hay bitácora registrada.',limit:Infinity,clickable:true,orderByCode:true})}</section>
  ${renderPendingTracking(filteredItems,data.available||{},tableFilters)}
  ${renderLog(filteredItems,expandedIds)}`;
}
