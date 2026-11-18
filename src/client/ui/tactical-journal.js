/**
 * Lectura de la columna G del Resumen táctico. Sin escrituras en Neon.
 * No atribuir vigencia actual a las menciones históricas de pendientes.
 */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const heading = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*[-–—]\s*(.*)$/;
const brief = (value,max=160) => value.length > max ? value.slice(0,max).trimEnd() + '…' : value;

function sections(raw){
 const parts = raw.split(/\s*\|\s*(?=(?:Acuerdo|Pendiente)\s*:)/i);
 const detail=[],agreements=[],pendings=[];
 for(const part of parts){
  if(/^\s*Acuerdo\s*:/i.test(part))agreements.push(clean(part.replace(/^\s*Acuerdo\s*:/i,'')));
  else if(/^\s*Pendiente\s*:/i.test(part))pendings.push(clean(part.replace(/^\s*Pendiente\s*:/i,'')));
  else if(clean(part))detail.push(clean(part));
 }
 return {detail:detail.join(' | '),agreements,pendings};
}

export function parseTacticalHistory(raw=''){
 const source=String(raw ?? '').replace(/\r\n?/g,'\n');
 if(!source.trim())return [];
 const groups=[];let current=null;
 for(const line of source.split('\n')){
  if(!line.trim())continue;
  const m=line.trimStart().match(heading);
  if(m){
   if(current)groups.push(current);
   const day=Number(m[1]),month=Number(m[2]);
   const valid=day>=1&&day<=31&&month>=1&&month<=12;
   const date=valid?m[1].padStart(2,'0')+'/'+m[2].padStart(2,'0')+(m[3]?'/'+m[3]:''):'Sin fecha';
   const dateSort=valid?(Number(m[3]||'2026')*10000+month*100+day):0;
   current={date,dateSort,lines:[line.trim()]};
  }else if(current)current.lines.push(line.trim());
  else current={date:'Sin fecha',dateSort:0,lines:[line.trim()]};
 }
 if(current)groups.push(current);
 return groups.map((g,index)=>{
  const rawRecord=g.lines.join('\n');
  const body=g.date==='Sin fecha'?rawRecord:g.lines.map((line,i)=>i===0?line.replace(heading,'$4'):line).join('\n');
  const parsed=sections(body);
  return {...parsed,index,date:g.date,dateSort:g.dateSort,raw:rawRecord,
   hasPending:parsed.pendings.some(Boolean)};
 }).sort((a,b)=>b.dateSort-a.dateSort||b.index-a.index);
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
   (record.hasPending?'<span class="tactical-journal-pending-chip">Pendiente citado</span>':'')+
  '</summary><div class="tactical-journal-entry-body">'+
   '<section><strong>Hecho registrado</strong><p>'+esc(record.detail||'Sin hecho detallado')+'</p></section>'+
   record.agreements.filter(Boolean).map(s=>'<section class="tactical-journal-agreement"><strong>Acuerdo</strong><p>'+esc(s)+'</p></section>').join('')+
   record.pendings.filter(Boolean).map(s=>'<section class="tactical-journal-pending"><strong>Pendiente consignado</strong><p>'+esc(s)+'</p></section>').join('')+
   '<small>Registro histórico: su situación actual requiere cotejo con sesiones posteriores.</small>'+
  '</div></details>').join('')+'</div>';
}

export function renderTacticalJournalModal(entry){
 const history=String(entry?.history ?? ''),records=parseTacticalHistory(history);
 return '<div id="tactical-journal-modal" class="tactical-journal-overlay" data-tactical-journal-overlay>'+
 '<div class="tactical-journal-scrim" data-tactical-journal-scrim></div>'+
 '<section class="tactical-journal-panel" role="dialog" aria-modal="true" aria-labelledby="tactical-journal-title" tabindex="-1">'+
  '<header class="tactical-journal-header"><div><span class="tactical-journal-eyebrow">SEGUIMIENTO DE INTEGRACIONES · LABORAL</span>'+
   '<h2 id="tactical-journal-title">Historial de '+esc(entry?.name||'Integración')+'</h2>'+
   '<p>Registros de la columna G, ordenados por fecha y con detalles desplegables.</p></div>'+
   '<button type="button" class="btn btn-light" data-action="tactical-journal-close" aria-label="Cerrar historial">✕ Cerrar</button></header>'+
  '<div class="tactical-journal-tools">'+
   '<label class="tactical-journal-search-label" for="tactical-journal-search">Buscar en la bitácora'+
    '<input type="search" id="tactical-journal-search" class="input" placeholder="Buscar incidencia, fecha, acuerdo o responsable…" autocomplete="off"></label>'+
   '<label class="tactical-journal-only-pending"><input type="checkbox" id="tactical-journal-only-pending"> Solo menciones de pendientes</label>'+
   '<button type="button" class="btn btn-light" data-action="tactical-journal-copy" '+(history?'':'disabled')+'>Copiar columna G</button>'+
  '</div><div class="tactical-journal-meta"><span id="tactical-journal-count">'+records.length+' anotación(es)</span>'+
   '<span>Origen: estado situacional del Resumen táctico</span></div>'+
  '<div id="tactical-journal-entries" class="tactical-journal-scroll" aria-live="polite">'+
   (records.length?renderTacticalJournalEntries(records):'<div class="tactical-journal-empty">Esta integración no tiene anotaciones en la columna G.</div>')+
  '</div><footer class="tactical-journal-footnote">Una mención de «Pendiente» no acredita que permanezca abierto. La vista es de consulta y no modifica la fuente.</footer>'+
 '</section></div>';
}
