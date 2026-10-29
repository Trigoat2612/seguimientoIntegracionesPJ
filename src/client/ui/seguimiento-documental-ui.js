import {TRACKING_STATUSES,VALIDATOR_TEAMS} from '../../shared/documents/seguimiento-documental.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortDate=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'Sin fecha';
export function renderTrackingSection({document,entries=[],loading=false,error='',canEdit=false,busy=false,draft={},feedback=null,limited=false}={}){
 if(!document)return '';
 const notice=feedback?`<div class="notice ${feedback.type==='error'?'error':'success'} doc-inline-feedback" role="${feedback.type==='error'?'alert':'status'}" data-document-feedback="tracking">${esc(feedback.message)}</div>`:'';
 const options=TRACKING_STATUSES.map(s=>`<option value="${esc(s)}" ${s===(draft.status||'Programado')?'selected':''}>${esc(s)}</option>`).join('');
 const teamOptions=VALIDATOR_TEAMS.map(s=>`<label class="tracking-team"><input type="checkbox" name="validatorTeams" value="${esc(s)}" ${(draft.validatorTeams||[]).includes(s)?'checked':''}> ${esc(s)}</label>`).join('');
 const form=canEdit?`<form id="document-tracking-form" class="doc-incident-form">
  <h4>Registrar seguimiento del documento</h4><div class="doc-incident-form-grid">
   <label>Fecha<input class="input" type="date" name="date" value="${esc(draft.date||'')}"></label>
   <label>Estado<select class="select" name="status">${options}</select></label>
   <label class="doc-form-full">Actividad<input class="input" name="activity" required maxlength="2000" value="${esc(draft.activity||'')}" placeholder="Actividad realizada o programada"></label>
   <label class="doc-form-full">Comentarios<textarea class="input" name="comments" rows="3" maxlength="8000" placeholder="Acuerdos, resultados u observaciones">${esc(draft.comments||'')}</textarea></label>
   <label>Responsable<input class="input" name="responsible" maxlength="250" value="${esc(draft.responsible||'')}" placeholder="Responsable o área"></label>
   <label>Etapa<input class="input" name="stage" maxlength="250" value="${esc(draft.stage||'')}" placeholder="Etapa del seguimiento"></label>
   <fieldset class="tracking-teamset doc-form-full"><legend>Equipo validador</legend><div class="tracking-team-options">${teamOptions}</div></fieldset>
  </div><button class="btn btn-primary" type="submit" ${busy?'disabled':''}>Guardar seguimiento</button>${notice}
  </form>`:`<p class="doc-incidents-hint">Puedes consultar el seguimiento sin iniciar sesión. Para registrar una anotación, <button class="btn btn-light btn-sm" data-action="incidents-auth">Iniciar sesión para editar</button>.</p>${notice}`;
 const rows=entries.map(e=>`<tr><td>${esc(shortDate(e.date))}</td><td><span class="tracking-state">${esc(e.status==='Observado'?'Observado (histórico)':e.status)}</span></td><td>${esc(e.activity||'—')}</td><td>${esc(e.comments||'—')}</td><td>${esc(e.responsible||'—')}</td><td>${esc((e.validatorTeams||[]).join(', ')||'—')}</td><td>${esc(e.stage||'—')}</td></tr>`).join('');
 return `<section class="doc-incidents panel tracking-document" aria-label="Seguimiento documental"><div class="doc-incidents-top"><div><div class="eyebrow">BITÁCORA DOCUMENTAL</div><h3>Seguimiento del documento ${esc(document.codigo)}</h3><p>Actividades, acuerdos, responsables y equipos validadores.</p></div><button class="btn btn-light btn-sm" data-action="incidents-refresh" ${busy?'disabled':''}>↻ Recargar seguimiento</button></div>
 ${error?`<div class="notice error" role="alert">${esc(error)}</div>`:''}
 ${loading?'<p class="doc-incidents-hint">Cargando seguimiento…</p>':`<div class="tracking-history"><h4>Historial de seguimiento (${entries.length})</h4>${limited?'<p class="notice">Se alcanzó el límite de resultados; solicita paginación.</p>':''}<div class="table-wrap"><table class="table tracking-table"><thead><tr><th>Fecha</th><th>Estado</th><th>Actividad</th><th>Comentarios</th><th>Responsable</th><th>Equipo validador</th><th>Etapa</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Todavía no hay anotaciones para este documento.</td></tr>'}</tbody></table></div></div>${form}`}</section>`;
}
