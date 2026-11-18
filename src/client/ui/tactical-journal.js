/**
 * Historial de lectura exclusiva de la columna G de la publicación Excel.
 * El encabezado puede contener una fecha, fechas vinculadas o un intervalo.
 * No crear incidencias ni inferir que un pendiente histórico continúa abierto.
 */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const heading = /^(\d{1,2}\/\d{1,2}(?:\/\d{4})?(?:\s*(?:y|al|a|hasta|,|[-–—])\s*\d{1,2}\/\d{1,2}(?:\/\d{4})?)*)\s*[-–—]\s*(.*)$/i;
const dates = /\d{1,2}\/\d{1,2}(?:\/\d{4})?/g;
const agreementTag = /^\s*Acuerdo(?:s|\s+del\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?)?\s*:/i;
const pendingTag = /^\s*Pendientes?\s*:/i;
const brief = (value,max=160) => value.length > max ? value.slice(0,max).trimEnd() + '…' : value;

/** El orden considera la última fecha real de un intervalo, sin modificar el rótulo original. */
function sortDate(label){
 let max=0;for(const date of label.match(dates)||[]){
  const [day,month,year]=date.split('/').map(Number);
  const effectiveYear=year||2026; // año de la matriz, no se añade a las fechas mostradas
  const actual=new Date(Date.UTC(effectiveYear,month-1,day));
  if(actual.getUTCFullYear()!==effectiveYear||actual.getUTCMonth()!==month-1||actual.getUTCDate()!==day)continue;
  max=Math.max(max,effectiveYear*10000+month*100+day);
 }
 return max;
}
function sections(raw){
 const parts=raw.split(/\s*\|\s*(?=(?:Acuerdo(?:s|\s+del\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?)?|Pendientes?)\s*:)/i);
 const detail=[],agreements=[],pendings=[];
 for(const part of parts){
  if(agreementTag.test(part)){
   const match=part.match(/^\s*Acuerdo\s+del\s+(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*:/i);
   const phrase=clean(part.replace(agreementTag,''));
   agreements.push(match?'('+match[1]+') '+phrase:phrase);
  }else if(pendingTag.test(part))pendings.push(clean(part.replace(pendingTag,'')));
  else if(clean(part))detail.push(clean(part));
 }
 return {detail:detail.join(' | '),agreements,pendings};
}
export function parseTacticalHistory(raw=''){
 const source=String(raw??'').replace(/\r\n?/g,'\n');
 if(!source.trim())return [];
 const groups=[];let current=null;
 for(const line of source.split('\n')){
  if(!line.trim())continue;
  const match=line.trimStart().match(heading);
  if(match){
   if(current)groups.push(current);
   const dateLabel=clean(match[1]),dateSort=sortDate(dateLabel);
   current={date:dateSort?dateLabel:'Sin fecha',dateSort,lines:[line.trim()]};
  }else if(current)current.lines.push(line.trim());
  else current={date:'Sin fecha',dateSort:0,lines:[line.trim()]};
 }
 if(current)groups.push(current);
 return groups.map((g,index)=>{
  const rawRecord=g.lines.join('\n');
  const body=g.date==='Sin fecha'?rawRecord:g.lines.map((line,i)=>i===0?line.replace(heading,'$2'):line).join('\n');
  const parsed=sections(body);
  return {...parsed,index,date:g.date,dateSort:g.dateSort,raw:rawRecord,
   hasPending:parsed.pendings.some(Boolean)};
 }).sort((a,b)=>b.dateSort-a.dateSort||b.index-a.index);
}
/** Último acuerdo explícito y datado en G, no último incidente ni una propuesta. */
export function latestTacticalAgreement(raw=''){
 for(const record of parseTacticalHistory(raw)){
  const agreements=record.agreements.filter(Boolean);
  if(agreements.length)return {date:record.date,text:agreements[agreements.length-1],sortKey:record.dateSort};
 }
 return null;
}
export function filterTacticalHistory(records,{query='',pendingOnly=false}={}){
 const needle=normalize(query);
 return records.filter(record=>(!pendingOnly||record.hasPending)&&
  (!needle||normalize(record.date+' '+record.raw).includes(needle)));
}
export function renderTacticalJournalEntries(records){
 if(!records.length)return '<div class="tactical-journal-empty">No se encontraron anotaciones para este filtro.</div>';
 return '<div class="tactical-journal-timeline">'+records.map(record=>
  '<details class="tactical-journal-entry"><summary>'+
   '<span class="tactical-journal-date">'+esc(record.date)+'</span>'+
   '<span class="tactical-journal-summary">'+esc(brief(record.detail||record.raw))+'</span>'+
  '</summary><div class="tactical-journal-entry-body">'+
   '<section><strong>Hecho registrado</strong><p>'+esc(record.detail||'Sin hecho detallado')+'</p></section>'+
   record.agreements.filter(Boolean).map(s=>'<section class="tactical-journal-agreement"><strong>Acuerdo</strong><p>'+esc(s)+'</p></section>').join('')+
   record.pendings.filter(Boolean).map(s=>'<section class="tactical-journal-pending"><strong>Pendiente consignado</strong><p>'+esc(s)+'</p></section>').join('')+
   '<small>Registro histórico: su situación actual requiere cotejo con sesiones posteriores.</small>'+
  '</div></details>').join('')+'</div>';
}
export function renderTacticalJournalModal(entry,{sourceLabel='',publishedAt=''}={}){
 const history=String(entry?.history??''),records=parseTacticalHistory(history);
 return '<div id="tactical-journal-modal" class="tactical-journal-overlay" data-tactical-journal-overlay>'+
 '<div class="tactical-journal-scrim" data-tactical-journal-scrim></div>'+
 '<section class="tactical-journal-panel" role="dialog" aria-modal="true" aria-labelledby="tactical-journal-title" tabindex="-1">'+
  '<header class="tactical-journal-header"><div><span class="tactical-journal-eyebrow">SEGUIMIENTO DE INTEGRACIONES · LABORAL</span>'+
   '<h2 id="tactical-journal-title">Historial de '+esc(entry?.name||'Integración')+'</h2>'+
   '<p>Solo anotaciones de la columna G del Excel publicado. No se incluyen propuestas del actualizador.</p></div>'+
   '<button type="button" class="btn btn-light" data-action="tactical-journal-close" aria-label="Cerrar historial">✕ Cerrar</button></header>'+
  '<div class="tactical-journal-tools">'+
   '<label class="tactical-journal-search-label" for="tactical-journal-search">Buscar en la bitácora'+
    '<input type="search" id="tactical-journal-search" class="input" placeholder="Buscar incidencia, fecha, acuerdo o responsable…" autocomplete="off"></label>'+
   '<label class="tactical-journal-only-pending"><input type="checkbox" id="tactical-journal-only-pending"> Solo pendientes citados en G</label>'+
   '<button type="button" class="btn btn-light" data-action="tactical-journal-copy" '+(history?'':'disabled')+'>Copiar columna G</button>'+
  '</div><div class="tactical-journal-meta"><span id="tactical-journal-count">'+records.length+' anotación(es)</span>'+
   '<span>Fuente: '+esc(sourceLabel||'Excel publicado')+(publishedAt?' · '+esc(new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(new Date(publishedAt))):'')+'</span></div>'+
  '<div id="tactical-journal-entries" class="tactical-journal-scroll" aria-live="polite">'+
   (records.length?renderTacticalJournalEntries(records):'<div class="tactical-journal-empty">Esta integración no tiene anotaciones en la columna G.</div>')+
  '</div><footer class="tactical-journal-footnote">Solo Excel publicado · columna G. El historial no representa el estado vigente de los pendientes ni incorpora propuestas.</footer>'+
 '</section></div>';
}
