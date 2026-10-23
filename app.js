import {parseXlsx} from './xlsx.js';
import {parseDocumentCatalog,inspectDocumentCatalog,documentCatalogSummary,filterDocumentCatalog} from './catalogo-documentos.js';
import {renderIncidentSection} from './bitacora-ui.js';
import {parseTactical,getTacticalSummary,TACTICAL_STATES,TACTICAL_MAX_ROW,TACTICAL_CATEGORIES,tacticalMatchesCategory,tacticalCategoryCounts} from './tactical.js';
import {CATALOGO_FIJO, linkCatalogItem} from './catalogo-fijo.js';
import {buildModel,STAGE_PROGRESS} from './model.js';
import {calculateDevelopment,calculateValidation} from './progress-metrics.js';
import {buildHierarchy,systemId,integrationId,endpointId} from './hierarchy.js';
import {loadObservations,saveObservations,observationTargets,mergeObservationBackup,STATUS,TYPES} from './observations.js';
import {extractExcelObservations} from './excel-observations.js';
import {exportTacticalSummaryPpt} from './ppt-export.js';
import {parseVias,inspectViaSheet,getViaView,getAllViaViews,VIA_SEVERITY_OPTIONS} from './vias.js';
import {parseActividadFlujo,actividadView,ACTIVITY_SEVERITIES} from './actividad-flujo.js';
import {exportViasPpt} from './via-ppt-export.js';
const el=id=>document.getElementById(id);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n||0).toLocaleString('es-PE');
const trim=(v,n=80)=>{const s=String(v??'');return s.length>n?s.slice(0,n-1)+'…':s};
const percent=(num,den)=>den?Math.round(num/den*100)+'%':'—';
const unique=a=>[...new Set(a.filter(Boolean))];
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const statusClass=s=>/Enviado a calidad|No requiere modificaci/i.test(s)?'badge-green':/En desarrollo/i.test(s)?'badge-blue':/Pendiente/i.test(s)?'badge-yellow':/Revisi[oó]n|An[aá]lisis/i.test(s)?'badge-purple':/mixto|sin estado/i.test(s)?'badge-gray':'badge-gray';
const equivalentClass=s=>s==='No existe'?'badge-red':s==='No documentado'?'badge-gray':'badge-green';
const CONFIG_SOURCE=window.DASHBOARD_SOURCE||{};
const DEFAULT_GOOGLE_URL=String(CONFIG_SOURCE.url||'').trim();
const PRIVATE_GOOGLE_SOURCE=String(CONFIG_SOURCE.access||'public').toLowerCase()==='private';
const REFRESH_MINUTES=Math.min(120,Math.max(5,Number(CONFIG_SOURCE.refreshMinutes)||15));
const TACTICAL_GOOGLE_URL=String(window.DASHBOARD_TACTICAL_SOURCE?.url||'').trim();
const DOCUMENTS_GOOGLE_URL=String(window.DASHBOARD_DOCUMENTS_SOURCE?.url||'').trim()||TACTICAL_GOOGLE_URL;
let documentCatalog=null,documentSheets=null,documentOrigin='',documentColumnMapping=null,documentError='',documentBusy=false,documentQuery='',documentStateFilter='',documentTypeFilter='',documentSpecialtyFilter='',documentOwnerFilter='',documentSelectedId='',documentConfigOpen=false;
let incidentDraft={},incidentCode='',incidentItems=[],incidentEvents=[],incidentLoading=false,incidentError='',incidentAuthorized=false,incidentCreateOpen=false,incidentEditingId='',incidentBusy=false,incidentLimited=false;
let documentReview=null,documentReviewHistory=[],documentReviewDraft=null,documentActionFeedback=null;
let viasData=null,viaSelected='',viaSeverity='todas',viaExportBusy=false,viaRawSheets=null,viaColumnMapping=null,viaConfigOpen=false;
let activityFlowData=null,activitySelected='',activitySeverity='todas',flowOpenedSteps=new Set(),flowOpenedActivities=new Set();
let tacticalData=null,tacticalBusy=false,tacticalError='',tacticalOrigin='',tacticalQuery='',tacticalStateFilter='Todos',tacticalCategoryFilter='todas',tacticalOpened=new Set(),tacticalSecondaryOpen=false,tacticalExportBusy=false;
let specialty='todas',catalogSearch='',catalogObserved='todos',catalogAvailability='todos',catalogLinkFilter='todos',catalogExpanded=new Set();
let validationEvidence=calculateValidation(new Map(),CATALOGO_FIJO);
let driveBusy=false;
let hierarchy=null,excelNotes=[],notes=loadObservations(),expandedSystems=new Set(),expandedIntegrations=new Set(),systemFilter='',technicalIntegrationFilter='',technicalFilter='',model=null,activeTab='overview',query='',stateFilter='',equivFilter='',integrationFilter='',page=1,sortMode='endpoints',currentSource='none',currentDriveUrl='',refreshTimer=null,refreshOn=false,accessToken='',googleClient=null,drawerId=null;
const tabTitles={'documents':['Control documental','Catálogo y bitácora de incidencias por documento, con historial y trazabilidad.','Control documental'],'activity-flow':['Flujo de actividades · Laboral','Seguimiento por vía, paso y actividad con integraciones listas y pendientes.','Flujo de actividades'],vias:['Integraciones por vía · Laboral','Etapas procesales, integraciones listas y pendientes, con filtro de severidad.','Integraciones por vía'],tactical:['Resumen táctico · Laboral','Estado situacional filtrable por severidad, ciclo y tipo, con dependencias e hitos.','Resumen táctico'],systems:['Sistemas e integraciones','Desglose desde Sistemas a componentes de integración y endpoints, con observaciones por nivel.','Sistemas'],overview:['Panel de integraciones','Visión consolidada de integraciones, endpoints, equivalencias técnicas y seguimiento.','Resumen ejecutivo'],integrations:['Integraciones por especialidad','Todas las integraciones del Excel técnico o las 36 de Laboral, seleccionables desde el filtro superior.','Integraciones'],endpoints:['Catálogo de endpoints','Equivalencias, atributos y trazabilidad hacia la pestaña y fila de origen.','Endpoints'],technical:['Documentación técnica','Estructuras de datos y procedimientos que no deben contabilizarse como endpoints.','Datos técnicos']};
function alertMsg(msg,type='success'){el('alert-area').innerHTML=`<div class="notice ${type==='error'?'error':type==='success'?'success':''}">${escape(msg)}</div>`;setTimeout(()=>{if(el('alert-area')?.textContent===msg)el('alert-area').innerHTML='';},13000);}
function setLoading(loading,msg='Analizando archivo…'){el('import-status').textContent=loading?msg:'Listo.';el('load-button').disabled=loading;el('drive-public').disabled=loading;el('drive-private').disabled=loading;}
function openImport(){el('import-modal').classList.remove('hidden');}
function closeImport(){el('import-modal').classList.add('hidden');}
function switchTab(tab){activeTab=tab;page=1;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));Object.keys(tabTitles).forEach(t=>el('view-'+t).classList.toggle('hidden',t!==tab));document.querySelector('.specialty-filter-bar')?.classList.toggle('hidden',tab==='tactical'||tab==='vias'||tab==='activity-flow'||tab==='documents');const [title,subtitle,crumb]=tabTitles[tab];el('page-title').textContent=title;el('page-subtitle').textContent=subtitle;el('crumb').textContent=crumb;render();}
async function loadWorkbook(bytes,origin){
 setLoading(true,'Leyendo las hojas y normalizando información…');
 try{const sheets=await parseXlsx(bytes);const d=parseDocumentCatalog(sheets,documentColumnMapping);if(d.found)receiveDocumentCatalog(sheets,origin);const candidate=buildModel(sheets,origin);const newHierarchy=buildHierarchy(candidate);
  if(!candidate.sheetCount||(!candidate.systemsRows&&!candidate.endpoints.length))throw new Error('El Excel no contiene las hojas de seguimiento esperadas.');
  model=candidate;hierarchy=newHierarchy;validationEvidence=calculateValidation(sheets,CATALOGO_FIJO);excelNotes=extractExcelObservations(candidate,newHierarchy);currentSource=origin;page=1;query='';stateFilter='';equivFilter='';integrationFilter='';systemFilter='';technicalIntegrationFilter='';drawerId=null;
  expandedSystems=new Set();expandedIntegrations=new Set();
  const featured=newHierarchy.systems.slice().sort((a,b)=>b.operationCount-a.operationCount)[0];if(featured){expandedSystems.add(featured.id);const first=featured.integrations.find(i=>i.endpoints.length);if(first)expandedIntegrations.add(first.id);}
  technicalFilter='';el('source-pill').textContent=origin.length>38?origin.slice(0,35)+'…':origin;
  el('updated-text').textContent='Actualizado: '+new Date(candidate.importedAt).toLocaleString('es-PE');
  el('sidebar-systems').textContent=number(newHierarchy.systems.length);
  refreshSpecialtyUI();
  el('sidebar-endpoints').textContent=number(candidate.endpoints.length);
  render();closeImport();
  alertMsg(`Archivo procesado: ${candidate.sheetCount} hojas, ${newHierarchy.systems.length} sistemas, ${newHierarchy.integrations.filter(x=>x.matched).length} integraciones técnicas y ${candidate.endpoints.length} rutas/operaciones documentadas.`);
 }catch(err){alertMsg(err.message||'No fue posible procesar el Excel.','error');el('import-status').textContent=err.message||'Error de lectura';throw err;}
 finally{setLoading(false);}
}
async function loadFile(file){if(!file)return;if(!/\.xlsx$/i.test(file.name)){alertMsg('Selecciona un archivo .xlsx. El formato .xls antiguo no se admite.','error');return;}try{await loadWorkbook(await file.arrayBuffer(),'Excel · '+file.name);}catch(err){console.warn('Import:',err.message);}}
function driveId(input){const s=String(input||'').trim();if(/^[A-Za-z0-9_-]{15,160}$/.test(s))return s;let match=s.match(/\/d\/([A-Za-z0-9_-]{15,160})/);if(match)return match[1];match=s.match(/[?&]id=([A-Za-z0-9_-]{15,160})/);if(match)return match[1];throw new Error('Pega un enlace válido de archivo de Google Drive o su ID.');}
async function loadPublicDrive(){
 if(driveBusy)return;driveBusy=true;setLoading(true,'Consultando el libro de Google (todas sus pestañas)…');
 try{
  const url=el('drive-url').value.trim()||DEFAULT_GOOGLE_URL;const id=driveId(url);
  const response=await fetch(`/api/drive?id=${encodeURIComponent(id)}&kind=${url.includes('docs.google.com/spreadsheets/')?'spreadsheet':'file'}`,{cache:'no-store'});
  if(!response.ok){let detail='';try{detail=(await response.json()).error||'';}catch{}throw new Error(detail||`HTTP ${response.status}. El documento puede requerir autenticación.`);}
  await loadWorkbook(await response.arrayBuffer(),'Drive público · '+id.slice(0,10)+'…');
  currentDriveUrl=url;sessionStorage.setItem('drive-url',url);configureRefresh();
 }catch(e){
  el('source-pill').textContent=model?'Drive · sin sincronizar':'Drive · acceso pendiente';
  const msg='No se pudo leer la fuente Google: '+e.message+' Si es privado, autoriza tu cuenta en Fuentes → Google Drive o habilita OAuth según README.';
  alertMsg(msg,'error');el('import-status').textContent=msg;console.warn(msg);
 }finally{driveBusy=false;setLoading(false);}
}

function googleScript(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2)return resolve();const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el servicio de autenticación de Google.'));document.head.appendChild(script);});}
async function authorizeGoogle(){const clientId=window.DASHBOARD_GOOGLE_CLIENT_ID;if(!clientId)throw new Error('Para leer Drive privado configura el ID de cliente OAuth en config.js.');await googleScript();accessToken=await new Promise((resolve,reject)=>{const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'openid email https://www.googleapis.com/auth/drive.readonly',callback:result=>result.error?reject(new Error(result.error)):resolve(result.access_token)});googleClient=client;client.requestAccessToken({prompt:'consent'});});return accessToken;}
async function loadPrivateDrive({background=false}={}){
 if(driveBusy)return;driveBusy=true;
 try{
  const url=el('drive-url').value.trim()||DEFAULT_GOOGLE_URL,id=driveId(url);
  setLoading(true,'Leyendo Drive con cuenta autorizada…');
  if(!accessToken){if(background)throw new Error('La autorización caducó. Pulsa Fuentes → Autorizar y leer privado.');await authorizeGoogle();}
  const headers={Authorization:`Bearer ${accessToken}`};
  const metaResp=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType`,{headers,cache:'no-store'});
  if(!metaResp.ok){if(metaResp.status===401)accessToken='';throw new Error(`Drive API (${metaResp.status}): archivo inaccesible o permisos insuficientes.`);}
  const info=await metaResp.json();let endpoint;
  if(info.mimeType==='application/vnd.google-apps.spreadsheet')endpoint=`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  else if(info.mimeType==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')endpoint=`https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
  else throw new Error('El recurso no es una hoja Google Sheets ni un .xlsx válido.');
  const response=await fetch(endpoint,{headers,cache:'no-store'});
  if(!response.ok){if(response.status===401)accessToken='';throw new Error(`No se pudo descargar el libro: HTTP ${response.status}.`);}
  await loadWorkbook(await response.arrayBuffer(),'Drive privado · '+trim(info.name,30));
  currentDriveUrl=url;sessionStorage.setItem('drive-url',url);configureRefresh();
  await loadTacticalPrivate({background:true});
 }catch(err){
  const msg='Drive privado: '+err.message;el('import-status').textContent=msg;alertMsg(msg,'error');
  el('source-pill').textContent=model?'Drive · sin sincronizar':'Drive · acceso pendiente';
 }finally{driveBusy=false;setLoading(false);}
}
function configureRefresh(){
 refreshOn=el('auto-refresh').checked;
 if(refreshTimer)clearInterval(refreshTimer);refreshTimer=null;
 if(refreshOn&&currentDriveUrl&&currentSource.startsWith('Drive'))refreshTimer=setInterval(()=>{
  if(driveBusy||document.visibilityState==='hidden')return;
  el('drive-url').value=currentDriveUrl;
  if(currentSource.startsWith('Drive privado'))loadPrivateDrive({background:true});else loadPublicDrive();
 },REFRESH_MINUTES*60*1000);
}
function refreshGoogle(){
 el('drive-url').value=currentDriveUrl||DEFAULT_GOOGLE_URL;
 // Para el documento privado nunca utilizar /api/drive anonimo, tampoco al pulsar Actualizar.
 // Una accion explicita del usuario puede solicitar el consentimiento OAuth de nuevo.
 if(PRIVATE_GOOGLE_SOURCE||currentSource.startsWith('Drive privado'))return loadPrivateDrive();
 return loadPublicDrive();
}

async function loadTacticalWorkbook(bytes,origin){
 const sheets=await parseXlsx(bytes);
 const foundDocumentCatalog=parseDocumentCatalog(sheets,documentColumnMapping);
 if(foundDocumentCatalog.found||!documentCatalog?.found)receiveDocumentCatalog(sheets,origin);
 const next=parseTactical(sheets);
 // Ambas pestañas pertenecen al mismo Excel privado. La falta de una no bloquea la otra.
 const mapped=parseVias(sheets,next,viaColumnMapping||{});
 const newActivity=parseActividadFlujo(sheets,next);
 tacticalData=next;viaRawSheets=sheets;viasData=mapped;activityFlowData=newActivity;tacticalError='';tacticalOrigin=origin;
 if(!newActivity.vias.some(v=>v.name===activitySelected))activitySelected=newActivity.vias[0]?.name||'';
 flowOpenedSteps=new Set();flowOpenedActivities=new Set();
 if(newActivity.vias[0]?.steps[0])flowOpenedSteps.add((newActivity.vias.find(v=>v.name===activitySelected)||newActivity.vias[0]).steps[0].id);
 if(mapped.error)viaConfigOpen=true;
 if(!mapped.vias.some(v=>v.name===viaSelected))viaSelected=mapped.vias[0]?.name||'';
 render();return next;
}
function receiveDocumentCatalog(sheets,origin){
 const result=parseDocumentCatalog(sheets,documentColumnMapping);
 documentCatalog=result;documentSheets=sheets;documentOrigin=origin;
 if(result.mapping && !Object.keys(result.mapping).some(k=>!['codigo','documento'].includes(k))){documentStateFilter='';documentTypeFilter='';documentSpecialtyFilter='';documentOwnerFilter='';}
 documentError=result.error||'';
 if(!result.documents.some(d=>d.id===documentSelectedId))documentSelectedId='';
 return result;
}
async function loadDocumentFile(file){
 if(!file)return;
 if(!/\.xlsx$/i.test(file.name)){documentError='Selecciona un respaldo documental .xlsx.';renderDocumentCatalog();return;}
 documentBusy=true;renderDocumentCatalog();
 try{receiveDocumentCatalog(await parseXlsx(await file.arrayBuffer()),'Archivo local · '+file.name);}
 catch(e){documentError=e.message||'No fue posible leer el Excel documental.';}
 finally{documentBusy=false;renderDocumentCatalog();}
}
async function loadDocumentsPrivate(){
 if(documentBusy||tacticalBusy)return;
 // Cuando CatalogoDocumentos está en el mismo libro, se reutiliza una sola descarga.
 if(!DOCUMENTS_GOOGLE_URL||DOCUMENTS_GOOGLE_URL===TACTICAL_GOOGLE_URL){
  if(!TACTICAL_GOOGLE_URL){documentError='No está configurada una URL de Google Sheets para CatalogoDocumentos.';renderDocumentCatalog();return;}
  return loadTacticalPrivate();
 }
 documentBusy=true;documentError='';renderDocumentCatalog();
 try{
  if(!accessToken)await authorizeGoogle();
  const id=driveId(DOCUMENTS_GOOGLE_URL),headers={Authorization:`Bearer ${accessToken}`};
  const response=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType`,{headers,cache:'no-store'});
  if(!response.ok){if(response.status===401)accessToken='';throw new Error(`El catálogo documental no es accesible (${response.status}).`);}
  const info=await response.json();
  const source=info.mimeType==='application/vnd.google-apps.spreadsheet'
    ?`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`
    :info.mimeType==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ?`https://www.googleapis.com/drive/v3/files/${id}?alt=media`:null;
  if(!source)throw new Error('La fuente documental no es un Google Sheets ni un .xlsx válido.');
  const download=await fetch(source,{headers,cache:'no-store'});
  if(!download.ok){if(download.status===401)accessToken='';throw new Error(`Descarga documental fallida (${download.status}).`);}
  receiveDocumentCatalog(await parseXlsx(await download.arrayBuffer()),'Drive privado · '+trim(info.name,55));
 }catch(e){documentError=e.message||'No fue posible actualizar el catálogo documental.';alertMsg(documentError,'error');}
 finally{documentBusy=false;renderDocumentCatalog();}
}
const documentSafeUrl=value=>{try{const u=new URL(String(value||'').trim());return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
function documentCatalogDiagnostics(){
 const diag=documentCatalog?.diagnostic;
 if(!diag?.found)return `<div class="doc-diagnostic panel"><h3>Diagnóstico de la hoja</h3><p>No se encontró la pestaña <b>CatalogoDocumentos</b>. Hojas detectadas: ${escape((diag?.availableSheets||[]).join(', ')||'Ninguna')}.</p><p>Verifica que hayas añadido la pestaña en el mismo archivo del Resumen táctico, o configura <code>DASHBOARD_DOCUMENTS_SOURCE.url</code> si está en otro libro.</p></div>`;
 const headerRowNumber=(documentColumnMapping?.headerRow??diag.headerRow)+1;
 const fields=[['documento','Nombre Documento (B) *'],['codigo','Cod Documento (A)'],['version','Versión'],['tipo','Tipo'],['estado','Estado'],['responsable','Responsable'],['especialidad','Especialidad'],['fecha','Fecha'],['enlace','Enlace'],['observaciones','Observaciones']];
 const opts=(key)=>`<option value="">${key==='documento'?'Selecciona una columna':'No asociar'}</option>`+diag.columns.map(col=>`<option value="${col.index}" ${(documentCatalog?.mapping?.[key]===col.index)?'selected':''}>${col.letter}${col.header?' · '+escape(trim(col.header,38)):''}</option>`).join('');
 const preview=(diag.preview||[]).map(row=>`<tr><th>${row.row}</th>${diag.columns.map((col,idx)=>`<td>${escape(trim(row.values[idx],85))}</td>`).join('')}</tr>`).join('');
 return `<div class="doc-diagnostic panel"><div class="doc-diagnostic-head"><h3>Diagnóstico y correspondencia de columnas</h3><span>${escape(diag.sheet)} · ${diag.rows} filas</span></div><p>Para tu hoja actual: <b>A = Cod Documento</b> y <b>B = Nombre Documento</b>. El nombre es obligatorio. Este ajuste no altera Google Sheets.</p><form id="document-mapping-form" class="doc-mapping"><label>Fila de encabezados<input class="input" type="number" min="1" max="${diag.rows}" name="headerRow" value="${headerRowNumber}" required></label>${fields.map(([key,label])=>`<label>${label}<select class="select" name="${key}" ${key==='documento'?'required':''}>${opts(key)}</select></label>`).join('')}</form><div class="button-row"><button class="btn btn-primary btn-sm" data-action="docs-map-apply">Aplicar correspondencias</button><button class="btn btn-light btn-sm" data-action="docs-map-auto">Reconocer automáticamente</button></div><div class="doc-table-wrap"><table class="doc-preview"><thead><tr><th>Fila</th>${diag.columns.map(c=>`<th>${c.letter}</th>`).join('')}</tr></thead><tbody>${preview}</tbody></table></div></div>`;
}
function activeDocument(){return documentCatalog?.documents.find(d=>d.id===documentSelectedId)||null;}
function focusDocumentActionFeedback(){
 // Solo desplaza lo mínimo para hacer visible el aviso junto al registro editado.
 // Nunca apunta al aviso global ni al encabezado de Control documental.
 const notice=el('view-documents')?.querySelector('[data-document-feedback]');
 if(notice)notice.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
}
function duplicateDocumentCode(doc){return !!doc?.codigo&&(documentCatalog?.documents||[]).filter(d=>norm(d.codigo)===norm(doc.codigo)).length>1;}
async function incidentRequest(path,options={}){
 if(!accessToken)throw new Error('Autoriza tu cuenta de Google para utilizar la bitácora.');
 const response=await fetch(path,{...options,cache:'no-store',headers:{Authorization:`Bearer ${accessToken}`,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok){if(response.status===401){accessToken='';incidentAuthorized=false;}throw new Error(data.error||`Error HTTP ${response.status}.`);}
 return data;
}
async function loadIncidentsForDocument(doc){
 if(!doc||!doc.codigo||duplicateDocumentCode(doc))return;
 const code=String(doc.codigo).trim().toLocaleUpperCase('es');
 incidentCode=code;incidentItems=[];incidentEvents=[];incidentError='';incidentLimited=false;documentReview=null;documentReviewHistory=[];
 if(!accessToken){incidentAuthorized=false;renderDocumentCatalog();return;}
 incidentLoading=true;renderDocumentCatalog();
 try{
  const result=await incidentRequest(`/api/incidencias?documento=${encodeURIComponent(code)}`);
  if(incidentCode!==code)return;
  incidentItems=result.items||[];incidentEvents=result.events||[];incidentLimited=!!result.limited;incidentAuthorized=true;
  documentReview=result.review||null;documentReviewHistory=result.reviewHistory||[];
 }catch(err){if(incidentCode===code){incidentError=err.message;incidentAuthorized=false;}}
 finally{if(incidentCode===code){incidentLoading=false;renderDocumentCatalog();}}
}
async function authorizeIncidents(){
 try{if(!accessToken)await authorizeGoogle();const doc=activeDocument();if(doc)await loadIncidentsForDocument(doc);}
 catch(err){incidentError=err.message;incidentAuthorized=false;renderDocumentCatalog();}
}
async function saveDocumentReview(form){
 const doc=activeDocument();if(!doc?.codigo)return;
 if(duplicateDocumentCode(doc)){incidentError='El código documental está duplicado. Corrige el catálogo antes de actualizar el seguimiento.';documentActionFeedback={scope:'review',type:'error',message:incidentError};renderDocumentCatalog();focusDocumentActionFeedback();return;}
 const fields=Object.fromEntries(new FormData(form).entries());
 documentReviewDraft={...fields};
 incidentBusy=true;incidentError='';documentActionFeedback=null;
 const submitButton=form.querySelector('[type=submit]');if(submitButton)submitButton.disabled=true;
 try{
  if(!accessToken)await authorizeGoogle();
  await incidentRequest('/api/incidencias',{
   method:'PATCH',body:JSON.stringify({action:'document-review',documentCode:doc.codigo,documentName:doc.documento,
    version:fields.version,status:fields.status,comment:fields.comment,expectedRevision:documentReview?.revision||0})
  });
  documentReviewDraft=null;
  documentActionFeedback={scope:'review',type:'success',message:'Versión y estado documental guardados en Neon con auditoría.'};
  await loadIncidentsForDocument(doc);
 }catch(e){
  incidentError=e.message;
  documentActionFeedback={scope:'review',type:'error',message:'No se pudo guardar el seguimiento documental: '+e.message};
 }finally{
  incidentBusy=false;if(submitButton?.isConnected)submitButton.disabled=false;
  renderDocumentCatalog();focusDocumentActionFeedback();
 }
}
async function saveIncident(form,kind){
 const doc=activeDocument();if(!doc?.codigo)return;
 const updating=kind==='update',commentOnly=kind==='comment',id=commentOnly?form.dataset.incidentComment:updating?form.dataset.incidentUpdate:'';
 const scope=(updating||commentOnly)?'incident':'create';
 if(duplicateDocumentCode(doc)){
  incidentError='El código documental se encuentra duplicado. Corrige la fuente antes de registrar incidencias.';
  documentActionFeedback={scope,incidentId:id,type:'error',message:incidentError};
  renderDocumentCatalog();focusDocumentActionFeedback();return;
 }
 const values=Object.fromEntries(new FormData(form).entries());
 const payload=commentOnly?{...values,id,expectedRevision:Number(form.dataset.revision),action:'comment'}:updating?{...values,id,expectedRevision:Number(form.dataset.revision),action:'update'}:{...values,documentCode:doc.codigo,documentName:doc.documento};
 incidentBusy=true;incidentError='';documentActionFeedback=null;
 const submitButton=form.querySelector('[type=submit]');if(submitButton)submitButton.disabled=true;
 try{
  if(!accessToken)await authorizeGoogle();
  const result=await incidentRequest((updating||commentOnly)?`/api/incidencias?id=${encodeURIComponent(id)}`:'/api/incidencias',{method:(updating||commentOnly)?'PATCH':'POST',body:JSON.stringify(payload)});
  const savedId=result.item?.id||id;
  incidentCreateOpen=false;incidentEditingId='';incidentDraft={};
  documentActionFeedback={scope:'incident',incidentId:savedId,type:'success',message:commentOnly?'Comentario incorporado al historial.':updating?'Atención registrada con auditoría.':'Incidencia registrada.'};
  await loadIncidentsForDocument(doc);
 }catch(e){
  incidentError=e.message;
  documentActionFeedback={scope,incidentId:id,type:'error',message:'Bitácora: '+e.message};
 }finally{
  incidentBusy=false;if(submitButton?.isConnected)submitButton.disabled=false;
  renderDocumentCatalog();focusDocumentActionFeedback();
 }
}
function documentExpandedDetail(selected,baseOnly){
 const fields=baseOnly
  ? [['Cod Documento',selected.codigo],['Nombre Documento',selected.documento]]
  : [['Código',selected.codigo],['Versión',selected.versionLabel],['Tipo',selected.tipo],['Estado registrado',selected.statusLabel],['Responsable',selected.responsable],['Especialidad',selected.especialidad],['Fecha',selected.fecha]];
 const extra=selected.extras?.length
  ? `<details class="doc-extra"><summary>Otros atributos del Excel (${selected.extras.length})</summary><div class="doc-detail-grid">${selected.extras.map(e=>`<div><b>${escape(e.header)}</b><span>${escape(e.value)}</span></div>`).join('')}</div></details>`:'';
 const incidents=duplicateDocumentCode(selected)
  ? '<div class="notice error">Este código se repite en CatalogoDocumentos. Corrige el duplicado para evitar que dos documentos compartan la misma bitácora.</div>'
  : renderIncidentSection({
     document:selected,
     items:incidentCode===String(selected.codigo).trim().toLocaleUpperCase('es')?incidentItems:[],
     events:incidentEvents,
     loading:incidentLoading,
     error:incidentError,
     authorized:incidentAuthorized,
     createOpen:incidentCreateOpen,
     editingId:incidentEditingId,
     limited:incidentLimited,
     busy:incidentBusy,
     draft:incidentDraft,review:documentReview,reviewHistory:documentReviewHistory,reviewDraft:documentReviewDraft,feedback:documentActionFeedback
    });
 return `<div class="doc-detail doc-detail-inline" aria-label="Ficha y bitácora documental de ${escape(selected.documento)}">
 <div class="doc-detail-head"><div><div class="eyebrow">FICHA DOCUMENTAL · FILA ${selected.row}</div><h3>${escape(selected.documento)}</h3></div><button class="btn btn-light btn-sm" data-action="docs-close-detail">Cerrar ficha</button></div>
 <div class="doc-detail-grid">${fields.map(([k,v])=>`<div><b>${k}</b><span>${escape(v||'No informado')}</span></div>`).join('')}</div>
 ${selected.observaciones?`<div class="doc-observations"><b>Observaciones de origen</b><p>${escape(selected.observaciones)}</p></div>`:''}
 ${extra}
 ${documentSafeUrl(selected.enlace)?`<a class="doc-open-link" href="${escape(documentSafeUrl(selected.enlace))}" target="_blank" rel="noopener noreferrer">Abrir documento de origen ↗</a>`:''}
 ${incidents}</div>`;
}
function renderDocumentCatalog(){
 const view=el('view-documents');if(!view)return;
 // Mantener anclada la fila expandida aunque se regenere el HTML tras la petición API.
 const expandedBefore=view.querySelector('.doc-expanded-row');
 const expandedIdBefore=expandedBefore?.dataset.expandedDoc;
 const topBefore=expandedBefore?.getBoundingClientRect().top;
 const docs=documentCatalog?.documents||[];
 const summary=documentCatalogSummary(docs);
 const baseOnly=!!documentCatalog?.mapping && !Object.keys(documentCatalog.mapping).some(k=>!['codigo','documento'].includes(k));
 const list=filterDocumentCatalog(docs,{query:documentQuery,estado:documentStateFilter,tipo:documentTypeFilter,especialidad:documentSpecialtyFilter,responsable:documentOwnerFilter});
 const opt=(field,selected)=>`<option value="">Todos</option>`+[...new Set(docs.map(d=>field==='estado'?d.statusLabel:d[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${escape(v)}" ${v===selected?'selected':''}>${escape(v)}</option>`).join('');
 const badges=summary.estados.map(st=>`<span class="doc-state-total">${escape(st)} <b>${docs.filter(d=>d.statusLabel===st).length}</b></span>`).join('');
 const report=baseOnly?[['Documentos registrados',summary.records],['Códigos únicos',summary.codigosUnicos],['Sin código',summary.sinCodigo],['Códigos repetidos',summary.codigosRepetidos]]:[['Registros documentales',summary.records],['Documentos únicos',summary.documentos],['Con versión informada',summary.versiones],['Validados en la fuente',summary.validados]];
 const header=`<section class="panel doc-intro"><div><div class="eyebrow">GESTIÓN DOCUMENTAL · ETAPAS 1 Y 2</div><h2>Catálogo documental</h2><p>${baseOnly?'Inventario de documentos basado en Cod Documento (A) y Nombre Documento (B).':'Inventario de documentos y atributos de CatalogoDocumentos.'} El catálogo se consulta desde Excel; las incidencias se registran en una base de datos independiente.</p><small>${documentOrigin?'Origen: '+escape(documentOrigin)+' · ':''}${documentCatalog?.readAt?'Lectura: '+new Date(documentCatalog.readAt).toLocaleString('es-PE'): 'Sin lectura registrada'}</small></div><div class="doc-intro-actions"><button class="btn btn-light" data-action="docs-refresh" ${documentBusy||tacticalBusy?'disabled':''}>${documentBusy||tacticalBusy?'Leyendo…':'↻ Actualizar documentos'}</button><label class="btn btn-light" for="document-local-file">Importar .xlsx</label><input type="file" id="document-local-file" accept=".xlsx" hidden></div></section>`;
 if(!documentCatalog?.found){view.innerHTML=header+(documentError?`<div class="notice error">${escape(documentError)}</div>`:'')+documentCatalogDiagnosticsPlaceholder();return;}
 const toolbar=`<section class="panel doc-filters ${baseOnly?'doc-filters-simple':''}"><label class="doc-search-label">Buscar<input class="input" id="document-search" placeholder="${baseOnly?'Buscar por código o nombre…':'Nombre, código, versión, responsable…'}" value="${escape(documentQuery)}"></label>${baseOnly?'':`<label>Estado<select class="select" id="document-status">${opt('estado',documentStateFilter)}</select></label><label>Tipo<select class="select" id="document-type">${opt('tipo',documentTypeFilter)}</select></label><label>Especialidad<select class="select" id="document-specialty">${opt('especialidad',documentSpecialtyFilter)}</select></label><label>Responsable<select class="select" id="document-owner">${opt('responsable',documentOwnerFilter)}</select></label>`}<button class="btn btn-light btn-sm" data-action="docs-clear">Limpiar filtros</button></section>`;
 const selected=list.find(d=>d.id===documentSelectedId)||null;
 const tableRows=list.map(d=>{
  const expanded=selected?.id===d.id;
  const label=expanded?'Ocultar ficha ↑':'Examinar →';
  const toggle=`<button class="btn btn-light btn-sm" data-document-select="${escape(d.id)}" aria-expanded="${expanded}" aria-label="${expanded?'Cerrar':'Abrir'} ficha de ${escape(d.documento)}">${label}</button>`;
  const row=baseOnly
   ? `<tr class="${expanded?'doc-current-row':''}"><td>${escape(d.codigo||'Sin código')}</td><td class="doc-name-cell"><b>${escape(d.documento)}</b><small>Fila ${d.row}</small></td><td>${toggle}</td></tr>`
   : `<tr class="${expanded?'doc-current-row':''}"><td class="doc-name-cell"><b>${escape(d.documento)}</b><small>Fila ${d.row}</small></td><td>${escape(d.codigo||'—')}</td><td>${escape(d.versionLabel)}</td><td>${escape(d.tipo||'—')}</td><td>${escape(d.responsable||'—')}</td><td><span class="doc-status-tag ${/^validado(?:\b|$)|^validada(?:\b|$)/.test(norm(d.estado))?'doc-validated':''}">${escape(d.statusLabel)}</span></td><td>${toggle}</td></tr>`;
  return row+(expanded?`<tr class="doc-expanded-row" data-expanded-doc="${escape(d.id)}"><td colspan="${baseOnly?3:7}">${documentExpandedDetail(d,baseOnly)}</td></tr>`:'');
 }).join('');
 view.innerHTML=header+(documentError?`<div class="notice error">${escape(documentError)}</div>`:'')+(documentCatalog.warnings||[]).map(w=>`<div class="scope-notice">${escape(w)}</div>`).join('')+`<div class="doc-kpis">${report.map(([label,n])=>`<div class="doc-kpi"><span>${label}</span><strong>${number(n)}</strong></div>`).join('')}</div>${baseOnly?'':`<div class="doc-status-breakdown">${badges}</div>`}`+toolbar+`<section class="panel doc-register"><div class="doc-register-heading"><h3>Inventario de documentos</h3><span>Mostrando ${list.length} de ${docs.length}</span><button class="btn btn-light btn-sm" data-action="docs-config">${documentConfigOpen?'Ocultar configuración':'Configurar columnas'}</button></div><div class="doc-table-wrap"><table class="${baseOnly?'doc-simple-table':''}"><thead><tr>${baseOnly?'<th>Cod Documento</th><th>Nombre Documento</th><th>Detalle</th>':'<th>Documento</th><th>Código</th><th>Versión</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th>Detalle</th>'}</tr></thead><tbody>${tableRows||`<tr><td colspan="${baseOnly?3:7}" class="doc-empty">No hay documentos para los filtros actuales.</td></tr>`}</tbody></table></div></section>`+(documentConfigOpen||documentCatalog.error?documentCatalogDiagnostics():'')+`<p class="doc-footnote">Fuente: ${escape(documentCatalog.sheet)} · ${baseOnly?'Columna A: Cod Documento · Columna B: Nombre Documento. Versión y estado se gestionan en Neon.':'Los atributos corresponden a las celdas de origen; este módulo no emite aprobaciones.'}</p>`;
 if(expandedIdBefore && expandedIdBefore===documentSelectedId && Number.isFinite(topBefore)){
  const expandedAfter=view.querySelector('.doc-expanded-row');
  if(expandedAfter?.dataset.expandedDoc===expandedIdBefore){
   const distance=expandedAfter.getBoundingClientRect().top-topBefore;
   if(Math.abs(distance)>1)window.scrollBy({top:distance,behavior:'instant'});
  }
 }
}
function documentCatalogDiagnosticsPlaceholder(){return `<section class="panel doc-placeholder"><h3>Sin catálogo documental cargado</h3><p>${escape(documentError||'Presiona «Actualizar documentos» para leer CatalogoDocumentos. Si aún no existe en ese libro, se mostrará un diagnóstico con las hojas encontradas.')}</p>${documentCatalog?.diagnostic?.availableSheets?.length?`<p>Hojas encontradas: ${escape(documentCatalog.diagnostic.availableSheets.join(', '))}</p>`:''}<p>Se utiliza por defecto el libro privado del Resumen táctico. Para otra fuente, configura <code>DASHBOARD_DOCUMENTS_SOURCE.url</code> en <code>config.js</code>.</p></section>`;}
function applyDocumentMapping(){
 if(!documentSheets)return;
 const form=el('document-mapping-form');if(!form)return;
 const fd=new FormData(form),col=fd.get('documento');
 if(col==null||col===''){alertMsg('Selecciona la columna Documento.','error');return;}
 documentColumnMapping={headerRow:Math.max(0,Number(fd.get('headerRow'))-1)};
 for(const field of ['documento','codigo','version','tipo','estado','responsable','especialidad','fecha','enlace','observaciones']){
  const v=fd.get(field);if(v!=null&&v!=='')documentColumnMapping[field]=Number(v);
 }
 receiveDocumentCatalog(documentSheets,documentOrigin||'Documento cargado');documentConfigOpen=!!documentError;renderDocumentCatalog();
}

async function loadTacticalFile(file){
 if(!file)return;
 if(!/\.xlsx$/i.test(file.name)){tacticalError='Selecciona un archivo táctico .xlsx.';render();return;}
 tacticalBusy=true;tacticalError='';render();
 try{await loadTacticalWorkbook(await file.arrayBuffer(),'Archivo local · '+file.name);}catch(e){tacticalError=e.message;render();}
 finally{tacticalBusy=false;render();}
}
async function loadTacticalPrivate({background=false}={}){
 if(tacticalBusy)return false;
 tacticalBusy=true;tacticalError='';render();
 try{
  if(!TACTICAL_GOOGLE_URL)throw new Error('Falta la URL de la fuente táctica en config.js.');
  if(!accessToken){if(background)throw new Error('Autoriza Google para acceder al resumen táctico.');await authorizeGoogle();}
  const id=driveId(TACTICAL_GOOGLE_URL),headers={Authorization:`Bearer ${accessToken}`};
  const metadata=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType`,{headers,cache:'no-store'});
  if(!metadata.ok){if(metadata.status===401)accessToken='';throw new Error(`No se pudo leer el documento táctico (${metadata.status}). Revisa permisos de Drive.`);}
  const info=await metadata.json();
  let url='';
  if(info.mimeType==='application/vnd.google-apps.spreadsheet')url=`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  else if(info.mimeType==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')url=`https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
  else throw new Error('La fuente táctica debe ser un Google Sheets o archivo Excel .xlsx.');
  const response=await fetch(url,{headers,cache:'no-store'});
  if(!response.ok){if(response.status===401)accessToken='';throw new Error(`Descarga del seguimiento táctico fallida (${response.status}).`);}
  await loadTacticalWorkbook(await response.arrayBuffer(),'Drive privado · '+trim(info.name,45));
  return true;
 }catch(e){tacticalError=e.message||'No fue posible leer el seguimiento táctico.';render();if(!background)alertMsg('Resumen táctico: '+tacticalError,'error');return false;}
 finally{tacticalBusy=false;render();}
}

/** Nueva vista de la hoja EtapaActividadIntegracion (A–E). */
function renderActivityFlow(){
 const view=el('view-activity-flow');if(!view)return;
 const formatStepLabel=(raw)=>{
  const source=String(raw??'').trim();
  const m=source.match(/\d+/);
  return m?String(Number(m[0])):source||'—';
 };
 const uniqueStageLabels=(step)=>[...new Set((step.activities||[]).map(a=>String(a.stage||'').trim()).filter(Boolean))];
 if(!activityFlowData?.vias?.length){
  const message=activityFlowData?.error||tacticalError||'Aún no se han leído los datos de EtapaActividadIntegracion.';
  const detail=activityFlowData?.diagnostic;
  view.innerHTML=`<section class="panel flow-placeholder"><div class="eyebrow">GESTIÓN POR VÍA Y PASO</div><h2>Flujo de actividades</h2><div class="notice ${activityFlowData?.error?'error':''}" role="status">${escape(message)}</div><p>Se requieren las columnas A: Vía, B: Paso, C: Etapa, D: Actividad y E: Integración (opcional). Los estados provienen de la hoja Seguimiento del mismo documento privado.</p>${detail?.found?`<p>Hoja localizada: <b>${escape(detail.name)}</b>, ${detail.rows} filas. Comprueba que existan pasos y actividades.</p>`:''}<button class="btn btn-primary" data-action="activity-refresh" ${tacticalBusy?'disabled':''}>${tacticalBusy?'Leyendo…':'↻ Actualizar desde Google'}</button></section>`;
  return;
 }
 const selected=activityFlowData.vias.find(v=>v.name===activitySelected)?activitySelected:activityFlowData.vias[0].name;
 const filtered=actividadView(activityFlowData,selected,activitySeverity);
 const chooser=`<section class="panel flow-controls"><label>Vía<select class="select" id="flow-via">${activityFlowData.vias.map(v=>`<option value="${escape(v.name)}" ${v.name===selected?'selected':''}>${escape(v.name)}</option>`).join('')}</select></label><label>Severidad de integración<select class="select" id="flow-severity">${ACTIVITY_SEVERITIES.map(s=>`<option value="${s.id}" ${s.id===activitySeverity?'selected':''}>${escape(s.label)}</option>`).join('')}</select></label><div class="flow-control-buttons"><button class="btn btn-light btn-sm" data-action="flow-expand">Expandir pasos</button><button class="btn btn-light btn-sm" data-action="flow-collapse">Contraer todo</button></div></section>`;
 const integrationList=(records,type)=>records.length?`<ul class="flow-integration-list flow-integration-list-${type}">${records.map(rec=>`<li class="flow-integration ${!rec.matched?'flow-unmatched':''}"><div><b>${escape(rec.name)}</b><span>${escape(rec.status)} · ${escape(rec.severity)}${rec.dependency?' · '+escape(rec.dependency):''}</span></div></li>`).join('')}</ul>`:`<p class="flow-no-records">Ninguna con este filtro.</p>`;
 const steps=filtered.steps.map((step)=>{
  const expanded=flowOpenedSteps.has(step.id);
  const stepStages=uniqueStageLabels(step);
  const stepLabel=formatStepLabel(step.name);
  const stepStageChips=stepStages.length?`<div class="flow-step-stages">${stepStages.map(stage=>`<span class="flow-stage-chip">${escape(stage)}</span>`).join('')}</div>`:'';
  const activities=expanded?step.activities.map(a=>{
   const aopen=flowOpenedActivities.has(a.id);
   const ready=a.integrations.filter(x=>x.ready),pending=a.integrations.filter(x=>!x.ready);
   return `<article class="flow-activity"><button class="flow-activity-head" data-flow-activity="${escape(a.id)}" aria-expanded="${aopen}"><span><b>${escape(a.name)}</b><span class="flow-stage">${escape(a.stage)}</span>${a.noIntegration?'<span class="flow-no-link">Sin integración asociada</span>':''}</span><span class="flow-chevron">${aopen?'▾':'▸'}</span></button>${aopen?`<div class="flow-activity-detail">${a.noIntegration?'<div class="flow-no-integration">Esta actividad no tiene una integración asociada en la columna E. No se contabiliza como pendiente.</div>':`<div class="flow-lists flow-lists-stacked"><section><h4 class="flow-list-ready">Integraciones listas</h4>${integrationList(ready,'ready')}</section><section><h4 class="flow-list-pending">Integraciones pendientes</h4>${integrationList(pending,'pending')}</section></div>`}</div>`:''}</article>`;
  }).join(''):'';
  return `<article class="flow-step ${expanded?'flow-step-open':''}"><button class="flow-step-head" data-flow-step="${escape(step.id)}" aria-expanded="${expanded}"><span class="flow-step-number">${escape(stepLabel)}</span><span class="flow-step-copy"><b>Paso N.° ${escape(stepLabel)}</b><small>${step.activities.length} actividad${step.activities.length===1?'':'es'} · ${escape(selected)}</small>${stepStageChips}</span><span class="flow-chevron">${expanded?'▾':'▸'}</span></button>${expanded?`<div class="flow-step-body">${activities||'<p class="flow-no-records">Sin actividades.</p>'}</div>`:''}</article>`;
 }).join('');
 const warnings=activityFlowData.warnings?.length?`<details class="flow-warnings"><summary>Observaciones de vinculación (${activityFlowData.warnings.length})</summary><div>${activityFlowData.warnings.map(w=>`<p>${escape(w)}</p>`).join('')}</div></details>`:'';
 view.innerHTML=`<section class="panel flow-intro"><div><div class="eyebrow">ETAPA ACTIVIDAD INTEGRACIÓN · LABORAL</div><h2>Recorrido por pasos del flujo</h2><p>Explora una vía, despliega un paso y después una actividad para consultar sus integraciones. Se conserva el orden de los pasos del Excel.</p></div><button class="btn btn-light" data-action="activity-refresh" ${tacticalBusy?'disabled':''}>↻ Actualizar actividades</button></section>${chooser}<p class="flow-explanation">La severidad solo filtra integraciones: los pasos y las actividades se mantienen visibles. Actividades sin integración: ${filtered.withoutIntegration}.</p><div class="flow-track">${steps}</div>${warnings}<p class="flow-footnote">Fuente: EtapaActividadIntegracion (A–E) y Seguimiento (estado y criticidad). Un registro sin coincidencia en Seguimiento se presenta pendiente y sin conformidad acreditada.</p>`;
}

const tacticalLong=(s)=>escape(s||'No registrado').replace(/\r?\n/g,'<br>');

const viaNorm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function viaList(entries,ready){
 if(!entries.length)return `<div class="via-list-empty">Sin integraciones ${ready?'validadas':'pendientes'} para este filtro.</div>`;
 return `<ul class="via-item-list">${entries.map(e=>`<li class="via-item ${e.matched?'':'via-unlinked'}"><span>${escape(e.name)}</span><span class="via-item-meta">${escape(e.status)} · ${escape(e.severity)}${!e.matched?' · Sin vincular con Seguimiento':''}</span></li>`).join('')}</ul>`;
}
function viaColumnOptions(diag,selected,emptyLabel='(No seleccionar)'){
 return `<option value="">${escape(emptyLabel)}</option>`+(diag.columns||[]).map(c=>`<option value="${c.index}" ${String(selected)===String(c.index)?'selected':''}>${escape(c.label)} · ${escape(diag.preview.find(r=>r.row===(diag.headerRow+1))?.cells.find(x=>x.index===c.index)?.value||'sin encabezado')}</option>`).join('');
}
function viaDiagnostics(diag,rawError,expanded){
 if(!diag)return '';
 const defaults=diag.headerCandidates?.[0]?.heads||{};
 const selected=viaColumnMapping||{};
 const viaCol=selected.viaCol??defaults.via??'',stageCol=selected.stageCol??defaults.etapa??'',integrationCol=selected.integrationCol??defaults.integracion??'';
 const rowValue=(selected.headerRow??((diag.headerRow??0)+1));
 const mode=selected.mode||'lista';
 const header=`<div class="via-diagnostic-summary"><b>${escape(diag.sourceSheet||'IntegracionesEtapa')}</b><span>${diag.found?'Hoja localizada':'Hoja no encontrada'} · ${diag.rows||0} filas · ${(diag.columns||[]).length} columnas con datos</span></div>`;
 const preview=diag.found?`<div class="via-diagnostic-preview"><div class="via-diagnostic-title">Vista previa de las primeras filas con datos</div><div class="via-preview-scroll"><table><thead><tr><th>Fila</th><th>Celdas detectadas</th></tr></thead><tbody>${(diag.preview||[]).slice(0,8).map(r=>`<tr><td>${r.row}</td><td>${r.cells.slice(0,12).map(c=>`<span class="via-cell"><b>${escape(c.column)}</b>: ${escape(c.value.slice(0,100))}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div></div>`:'';
 const form=diag.found?`<form id="via-column-form" class="via-column-form"><div class="via-config-grid"><label>Tipo de distribución<select class="select" name="mode"><option value="lista" ${mode==='lista'?'selected':''}>Filas: Vía · Etapa · Integración</option><option value="matriz" ${mode==='matriz'?'selected':''}>Matriz: etapas como columnas</option><option value="vias_columnas" ${mode==='vias_columnas'?'selected':''}>Vías como columnas, etapa en cada celda</option><option value="secciones" ${mode==='secciones'?'selected':''}>Secciones por vía y etapa</option></select></label><label>Fila de encabezados<input class="input" name="headerRow" type="number" min="1" max="${Math.max(1,diag.rows)}" value="${Number(rowValue)||1}" required></label><label>Columna Integración<select name="integrationCol" class="select">${viaColumnOptions(diag,integrationCol,'Selecciona la columna')}</select></label><label>Columna Vía<select name="viaCol" class="select">${viaColumnOptions(diag,viaCol,'Vía fija o encabezado de sección')}</select></label><label>Columna Etapa<select name="stageCol" class="select">${viaColumnOptions(diag,stageCol,'Etapa fija o matriz')}</select></label><label>Vía fija (si no existe columna)<input class="input" name="fixedVia" placeholder="Ej. Vía Ordinaria" value="${escape(selected.fixedVia||'')}"></label><label>Etapa fija (opcional)<input class="input" name="fixedStage" placeholder="Ej. Calificación" value="${escape(selected.fixedStage||'')}"></label></div><p class="via-helper">Las letras corresponden a las columnas reales del Excel. Los valores se interpretan localmente y no se envían a otro servicio. Si una matriz contiene las etapas como encabezados, selecciona «Matriz».</p><div class="button-row"><button type="submit" class="btn btn-primary">Aplicar correspondencias</button><button class="btn btn-light" type="button" data-action="via-mapping-auto">Volver a detección automática</button></div></form>`:'';
 return `<section class="panel via-diagnostic"><button class="via-diagnostic-toggle" data-action="via-config-toggle" aria-expanded="${expanded}"><span><strong>Diagnóstico de la hoja y configuración</strong>${header}</span><span>${expanded?'Ocultar ▴':'Ver columnas ▾'}</span></button>${expanded?`${rawError?`<div class="notice error">${escape(rawError)}</div>`:''}${preview}${form}`:''}</section>`;
}
function applyViaMapping(form){
 if(!viaRawSheets||!tacticalData){alertMsg('Primero carga el documento táctico.','error');return;}
 const data=new FormData(form),mode=String(data.get('mode')||'lista'),headerRow=Number(data.get('headerRow')||1),diag=inspectViaSheet(viaRawSheets);
 const col=k=>data.get(k)===''?null:Number(data.get(k));
 viaColumnMapping={mode,headerRow,integrationCol:col('integrationCol'),viaCol:col('viaCol'),stageCol:col('stageCol'),fixedVia:String(data.get('fixedVia')||'').trim(),fixedStage:String(data.get('fixedStage')||'').trim()};
 if(mode==='matriz'){
  const [_,rows]=[...viaRawSheets.entries()].find(([k])=>k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').includes('integracionesetapa'))||[null,[]];
  const header=rows[headerRow-1]||[];
  const canonical=['Registro demanda','Calificación','Trámite','Ejecución'];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  viaColumnMapping.stageCols=header.flatMap((v,i)=>{const value=norm(v);const name=canonical.find(a=>norm(a)===value||value.startsWith(norm(a)+' '));return name?[{name,index:i}]:[];});
 }
 if(mode==='vias_columnas'){
  const entry=[...viaRawSheets.entries()].find(([k])=>k.replace(/[^a-z0-9]/gi,'').toLowerCase()==='integracionesetapa');
  const header=entry?.[1]?.[headerRow-1]||[];
  viaColumnMapping.viaCols=header.flatMap((v,i)=>/\bv[ií]a\b/i.test(String(v))?[{name:String(v).trim(),index:i}]:[]);
 }
 viasData=parseVias(viaRawSheets,tacticalData,viaColumnMapping);
 if(!viasData.vias.some(v=>v.name===viaSelected))viaSelected=viasData.vias[0]?.name||'';
 viaConfigOpen=!!viasData.error;renderVias();
 if(viasData.error)alertMsg(viasData.error,'error');else alertMsg(`IntegracionesEtapa: ${viasData.vias.length} vías, ${viasData.entries.length} asociaciones detectadas.`);
}
function renderVias(){
 const view=el('view-vias');if(!view)return;
 if(!viasData?.vias?.length){
  const msg=viasData?.error||tacticalError||'Todavía no se cargó IntegracionesEtapa desde la fuente táctica.';
  const diag=viasData?.diagnostic||inspectViaSheet(viaRawSheets);
  view.innerHTML=`<section class="panel via-empty-panel"><div class="eyebrow">INTEGRACIONES POR VÍA · LABORAL</div><h2>Distribución por etapa procesal</h2><div class="notice error" role="alert"><b>No se pueden mostrar las integraciones:</b> ${escape(msg)}</div><p>${diag?.found?'Se recibió el documento y se localizó IntegracionesEtapa, pero su estructura no coincide con el formato reconocido.':'Se requiere leer la hoja IntegracionesEtapa del documento táctico privado.'}</p><div class="button-row"><button class="btn btn-primary" data-action="vias-refresh" ${tacticalBusy?'disabled':''}>${tacticalBusy?'Leyendo Google…':'↻ Actualizar desde Google'}</button><button class="btn btn-light" data-action="via-config-toggle" ${!diag?.found?'disabled':''}>${viaConfigOpen?'Ocultar diagnóstico':'Examinar columnas'}</button></div></section>${viaConfigOpen?viaDiagnostics(diag,msg,true):''}`;return;
 }
 const selected=viaSelected||viasData.vias[0].name;
 const viewModel=getViaView(viasData,selected,viaSeverity);
 const severityOptions=VIA_SEVERITY_OPTIONS.map(o=>`<option value="${o.id}" ${viaSeverity===o.id?'selected':''}>${escape(o.label)}</option>`).join('');
 const stages=viewModel?.stages||[];
 const compact=stages.map((st,i)=>`<article class="via-stage-card" style="--via-accent:${['#2e7d32','#00244f','#c55a11','#ffc000','#7952a1','#007e87'][i%6]}"><header class="via-stage-header"><h3>${escape(st.name)}</h3></header><div class="via-stage-content"><section><div class="via-stage-heading"><strong>Integraciones listas</strong></div>${viaList(st.ready,true)}</section><section><div class="via-stage-heading via-pending-title"><strong>Integraciones pendientes</strong></div>${viaList(st.pending,false)}</section></div></article>`).join('');
 const emptyNotices=(viasData.warnings||[]).map(w=>`<div class="via-warning">${escape(w)}</div>`).join('');
 view.innerHTML=`<section class="panel via-heading"><div><div class="eyebrow">INTEGRACIONES POR VÍA · LABORAL</div><h2>Vías y etapas</h2><p>${viasData.vias.length} vías y ${viasData.entries.length} asociaciones vía–etapa–integración. Estado y criticidad contrastados con Seguimiento.</p></div><div class="via-actions"><button class="btn btn-light" data-action="vias-refresh" ${tacticalBusy?'disabled':''}>↻ Actualizar vías</button><button class="btn btn-primary" data-action="vias-export-one" ${viaExportBusy?'disabled':''}>${viaExportBusy?'Generando…':'⤓ Diapositiva de esta vía'}</button><button class="btn btn-light" data-action="vias-export-all" ${viaExportBusy?'disabled':''}>⤓ PPT todas las vías</button></div></section><div class="panel via-controls"><label>Vía<select class="select" id="via-filter">${viasData.vias.map(v=>`<option value="${escape(v.name)}" ${v.name===selected?'selected':''}>${escape(v.name)}</option>`).join('')}</select></label><label>Severidad<select class="select" id="via-severity">${severityOptions}</select></label></div><div class="via-totals" aria-label="Resumen total de integraciones por vía"><div class="via-total via-total-ready"><span>Integraciones listas</span><strong>${viewModel.ready}</strong></div><div class="via-total via-total-pending"><span>Integraciones pendientes</span><strong>${viewModel.pending}</strong></div></div><p class="via-total-explanation">Se cuentan integraciones únicas de la vía para el filtro seleccionado. Una integración presente en varias etapas se cuenta una sola vez; el detalle permanece distribuido por etapa.</p>${emptyNotices}${viaDiagnostics(viasData.diagnostic,'',viaConfigOpen)}<div class="via-grid">${compact}</div><p class="via-footnote">«Lista» significa Validada en Seguimiento. Los demás estados se presentan como pendientes; los registros sin correspondencia se identifican expresamente. La severidad Crítica equivale a criticidad Alta con fondo verde, y Alta a criticidad Alta sin fondo verde. Los datos no representan conformidades adicionales.</p>`;
}
async function exportViaSlides(all){
 if(!viasData?.vias?.length){alertMsg('Primero carga la hoja IntegracionesEtapa.','error');return;}
 const views=all?getAllViaViews(viasData,viaSeverity):[getViaView(viasData,viaSelected||viasData.vias[0].name,viaSeverity)];
 viaExportBusy=true;renderVias();
 try{await exportViasPpt(views,viaSeverity);alertMsg(all?'Presentación generada: una diapositiva por vía.':'Diapositiva de la vía generada.');}
 catch(e){alertMsg(e.message||'No fue posible generar PowerPoint.','error');}
 finally{viaExportBusy=false;renderVias();}
}


function getTacticalExportModel(){
 if(!tacticalData)return null;
 const category=TACTICAL_CATEGORIES.find(c=>c.id===tacticalCategoryFilter)||TACTICAL_CATEGORIES[0];
 const categoryEntries=tacticalData.entries.filter(e=>tacticalMatchesCategory(e,category.id));
 const visibleCategory=categoryEntries.filter(matchesTacticalText);
 const visibleFiltered=visibleCategory.filter(matchesTacticalState);
 const primaryBase=category.id==='todas'?categoryEntries.filter(e=>e.high):categoryEntries;
 const primary=primaryBase.filter(matchesTacticalText).filter(matchesTacticalState);
 const nonPrioritized=(category.id==='todas'?tacticalData.entries.filter(e=>!e.high):[]).filter(matchesTacticalText).filter(matchesTacticalState);
 const sourceForUnknown=category.id==='todas'?primary:visibleFiltered;
 const unknown=sourceForUnknown.filter(e=>!TACTICAL_STATES.includes(e.status));
 const alertCount=(category.id==='todas'?primary:visibleFiltered).filter(e=>e.dateAlerts?.length).length;
 return {category,stateFilter:tacticalStateFilter,query:tacticalQuery,primary,nonPrioritized,visibleFiltered,unknown,alertCount,readAt:tacticalData.readAt,origin:tacticalOrigin,manualEntries:tacticalData.entries.filter(e=>String(e.statusRaw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='manual')};
}
async function exportTacticalPpt(){
 const model=getTacticalExportModel();
 if(!model){alertMsg('Primero carga el resumen táctico para generar la diapositiva.','error');return;}
 tacticalExportBusy=true;renderTactical();
 try{await exportTacticalSummaryPpt(model);alertMsg('Se generó la diapositiva resumen en PowerPoint.');}
 catch(e){alertMsg(e.message||'No fue posible generar la diapositiva resumen.','error');}
 finally{tacticalExportBusy=false;renderTactical();}
}
function tacticalDetail(entry){
 const alerts=entry.dateAlerts||[];
 const alertFields=new Set(alerts.map(a=>a.field));
 const pair=(name,value)=>`<div class="tactical-detail-field ${alertFields.has(name)?'tactical-date-field-alert':''}"><b>${escape(name)}</b><p>${tacticalLong(value)}</p></div>`;
 return `<div class="tactical-detail">
 ${alerts.length?`<div class="tactical-date-notice" role="alert"><strong>⚠ Fecha pendiente de definición</strong><span>Revisar ${escape(alerts.map(a=>a.field).join(', '))}: contiene «Por informar» o «Revisión con…».</span></div>`:''}
 <div class="tactical-detail-grid">
 ${pair('Dependencia',entry.dependency)}
 ${pair('Cierre desarrollo',entry.developmentClose)}
 ${pair('Cierre pruebas SOFTPLAN / GTI',entry.testsClose)}
 ${pair('Validación GSJ',entry.gsjValidation)}
 </div><div class="tactical-detail-wide">${pair('Estado situacional / hitos',entry.history)}${pair('Consideraciones',entry.considerations)}</div>
 <div class="tactical-source-reference">Fuente: ${escape(entry.sheet)} · fila ${entry.row} · Criticidad: ${escape(entry.criticality||'No registrada')}${entry.green?' · Resaltada en verde en la fuente':''}</div></div>`;
}
function tacticalIntegrationRow(entry){
 const expanded=tacticalOpened.has(entry.id),dateAlert=!!entry.dateAlerts?.length;
 const severity=entry.high?(entry.green?'<span class="tactical-severity tactical-severity-critical">Crítica</span>':'<span class="tactical-severity tactical-severity-high">Alta</span>'):'';
 return `<div class="tactical-item ${entry.green?'tactical-item-green':''} ${dateAlert?'tactical-item-date-alert':''}">
 <button class="tactical-item-button" data-tactical-toggle="${escape(entry.id)}" aria-expanded="${expanded}" title="Consultar el estado situacional y fechas"><span class="tactical-item-title">${escape(entry.name)}</span><span class="tactical-severity-row">${severity}</span>${entry.green?'<span class="tactical-flag" title="La criticidad tiene relleno verde en Excel">◆ Destacada en origen</span>':''}${dateAlert?`<span class="tactical-date-flag" title="Fecha pendiente: ${escape(entry.dateAlerts.map(a=>a.field).join(', '))}">⚠ Fecha por confirmar</span>`:''}<span class="tactical-item-meta">${escape(entry.dependency||'Dependencia no indicada')}</span><span class="tactical-chevron">${expanded?'▾':'▸'}</span></button>
 ${expanded?tacticalDetail(entry):''}</div>`;
}
const matchesTacticalText=entry=>!tacticalQuery||norm([entry.name,entry.dependency,entry.history,entry.considerations,entry.statusRaw].join(' ')).includes(norm(tacticalQuery));
const matchesTacticalState=entry=>tacticalStateFilter==='Todos'||tacticalStateFilter===entry.status;
function tacticalCard(state,items){
 const klass=({'Validada':'validated','Por validar':'to-validate','En pruebas':'testing','En desarrollo':'developing'})[state]||'unspecified';
 const filtered=items.filter(e=>e.status===state&&matchesTacticalState(e)&&matchesTacticalText(e));
 const allCount=items.filter(e=>e.status===state).length;
 return `<article class="tactical-status-panel tactical-${klass}"><div class="tactical-status-panel-heading"><h3>${escape(state)}</h3><strong>${allCount}</strong></div><div class="tactical-item-list">${filtered.map(tacticalIntegrationRow).join('')||'<div class="tactical-empty">Sin integraciones para este filtro.</div>'}</div></article>`;
}
function tacticalSecondaryBucket(entry){
 const value=norm(entry.statusRaw||'').replace(/\s+/g,' ');
 if(/^ciclo 2\s*\/\s*3$/.test(value))return 'Ciclo 2/3';
 if(value==='ciclo 2')return 'Ciclo 2';
 if(value==='funcionalidad para ciclo 1')return 'Funcionalidad nativa del sistema';
 if(value==='manual')return 'Manual';
 if(value==='no aplica integracion')return 'No aplica integración';
 return 'Otras clasificaciones';
}
function tacticalSecondaryStateGroup(state,items){
 const klass=({'Validada':'validated','Por validar':'to-validate','En pruebas':'testing','En desarrollo':'developing'})[state]||'unspecified';
 const filtered=items.filter(e=>e.status===state&&matchesTacticalState(e)&&matchesTacticalText(e));
 const allCount=items.filter(e=>e.status===state).length;
 return `<article class="tactical-secondary-group tactical-${klass}"><div class="tactical-secondary-group-heading"><h4>${escape(state)}</h4><strong>${allCount}</strong></div><div class="tactical-secondary-group-list">${filtered.map(tacticalIntegrationRow).join('')||'<div class="tactical-empty">Sin integraciones para este estado con el filtro actual.</div>'}</div></article>`;
}
function tacticalSecondaryBucketGroup(label,items){
 const filtered=items.filter(e=>tacticalSecondaryBucket(e)===label&&matchesTacticalState(e)&&matchesTacticalText(e));
 const allCount=items.filter(e=>tacticalSecondaryBucket(e)===label).length;
 return `<article class="tactical-secondary-group tactical-unspecified"><div class="tactical-secondary-group-heading"><h4>${escape(label)}</h4><strong>${allCount}</strong></div><div class="tactical-secondary-group-list">${filtered.map(tacticalIntegrationRow).join('')||'<div class="tactical-empty">Sin integraciones para este grupo con el filtro actual.</div>'}</div></article>`;
}
function renderTactical(){
 const view=el('view-tactical');if(!view)return;
 if(!tacticalData){view.innerHTML=`<div class="tactical-intro panel"><div><div class="eyebrow">SEGUIMIENTO TÁCTICO · LABORAL</div><h2>Integraciones por clasificación</h2><p>Fuente privada independiente: hoja «Seguimiento» del documento táctico de Google Drive.</p></div><button class="btn btn-primary" data-action="tactical-refresh" ${tacticalBusy?'disabled':''}>${tacticalBusy?'Consultando Google…':'↻ Actualizar resumen táctico'}</button></div>${tacticalError?`<div class="notice error">${escape(tacticalError)}</div>`:''}<div class="tactical-placeholder">La información táctica todavía no se ha cargado. Autoriza una cuenta con acceso al segundo documento y actualiza esta pestaña. La fuente técnica del tablero permanece independiente.</div>`;return;}
 const summary=getTacticalSummary(tacticalData), counts=tacticalCategoryCounts(tacticalData.entries);
 const coverageNotice=summary.all!==CATALOGO_FIJO.length?`<div class="notice"><strong>Control de cobertura:</strong> Seguimiento contiene ${summary.all} registros y el catálogo fijo de Laboral contiene ${CATALOGO_FIJO.length}. Revisar posibles diferencias, duplicados o integraciones adicionales; no se eliminan automáticamente.</div>`:'';
 const category=TACTICAL_CATEGORIES.find(c=>c.id===tacticalCategoryFilter)||TACTICAL_CATEGORIES[0];
 const categoryEntries=tacticalData.entries.filter(e=>tacticalMatchesCategory(e,category.id));
 const visible=categoryEntries.filter(e=>matchesTacticalState(e)&&matchesTacticalText(e));
 const search=`<div class="tactical-search"><input class="input" id="tactical-search" placeholder="Buscar integración o dependencia…" value="${escape(tacticalQuery)}"><button class="btn btn-light btn-sm" data-action="tactical-clear" title="Limpiar búsqueda, estado y categoría">Limpiar filtros</button></div>`;
 const filterToolbar=`<div class="tactical-filter-bar panel"><div class="tactical-filter-field"><label for="tactical-category-filter">Clasificar integraciones</label><select id="tactical-category-filter" class="input" aria-label="Filtrar integraciones por severidad, ciclo o tipo">${TACTICAL_CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===category.id?'selected':''}>${escape(c.label)} (${counts[c.id]})</option>`).join('')}</select></div><div class="tactical-filter-summary"><strong>${counts[category.id]} registros</strong><span> de ${summary.all} en Seguimiento</span></div></div><p class="tactical-filter-explanation">${category.id==='critica'?'Crítica: criticidad «Alta» en L y relleno verde en esa celda.':category.id==='alta'?'Alta: criticidad «Alta» en L, sin relleno verde. Las críticas se muestran en el filtro independiente.':category.id==='todas'?'Crítica = «Alta» con celda L verde; Alta = «Alta» sin celda verde. Los filtros de ciclo y tipo se basan en el valor de la columna D.':`Categoría «${escape(category.label)}»: coincidencia con el valor de estado/tipo de la columna D.`} La clasificación proviene del Excel, filas 1–${TACTICAL_MAX_ROW}.</p>`;
 // En «Todas», conservar el tablero de prioridad original; para severidades, conservar las columnas por estado.
 const statusMode=['todas','critica','alta'].includes(category.id);
 const primary=statusMode?(category.id==='todas'?summary.high:categoryEntries):[];
 const kpiCounts=Object.fromEntries(TACTICAL_STATES.map(st=>[st,primary.filter(e=>e.status===st).length]));
 const cards=TACTICAL_STATES.map(state=>{const cls=({'Validada':'validated','Por validar':'to-validate','En pruebas':'testing','En desarrollo':'developing'})[state];return `<button class="tactical-kpi tactical-${cls} ${tacticalStateFilter===state?'tactical-kpi-active':''}" data-tactical-status="${escape(state)}" aria-pressed="${tacticalStateFilter===state}"><span class="tactical-kpi-number">${kpiCounts[state]}</span><span><strong>${escape(state)}</strong><small>${category.id==='todas'?'Criticidad Alta / Crítica':escape(category.label)}</small></span></button>`;}).join('');
 const mainTitle=category.id==='todas'?'Integraciones priorizadas · Crítica y Alta':category.label;
 const unknown=primary.filter(e=>e.status==='Sin clasificar'&&matchesTacticalState(e)&&matchesTacticalText(e));
 const primaryOtherBucketOrder=['Manual','Ciclo 2','Ciclo 2/3','Funcionalidad nativa del sistema','No aplica integración','Otras clasificaciones'];
 const groupedUnknown=primaryOtherBucketOrder.map(label=>({label,items:unknown.filter(e=>tacticalSecondaryBucket(e)===label)})).filter(group=>group.items.length);
 const statusContent=`<div class="tactical-kpis">${cards}</div><section class="tactical-main"><div class="tactical-section-title"><div><h2>${escape(mainTitle)}</h2><p>Selecciona una integración para revisar sus dependencias, fechas, hitos y consideraciones.</p></div>${search}</div><div class="tactical-columns">${TACTICAL_STATES.filter(st=>tacticalStateFilter==='Todos'||tacticalStateFilter===st).map(st=>tacticalCard(st,primary)).join('')}</div>${groupedUnknown.map(group=>`<div class="tactical-uncategorized"><div class="tactical-uncategorized-head"><h3>${escape(group.label)}</h3><div class="tactical-header-total"><span>Total</span><strong>${group.items.length}</strong></div></div>${group.items.map(tacticalIntegrationRow).join('')}</div>`).join('')}<p class="tactical-mini-note">${primary.filter(e=>matchesTacticalState(e)&&matchesTacticalText(e)).length} registro(s) priorizado(s) visible(s). <strong class="tactical-date-count">${primary.filter(e=>e.dateAlerts?.length).length} con alertas de fechas</strong>.</p></section>`;
 // Para Ciclo 2, 2/3, Manual y otros tipos no existe KPI de los cuatro estados: listar directamente.
 const categoryContent=`<section class="tactical-main"><div class="tactical-section-title"><div><h2>${escape(category.label)}</h2><p>${visible.length} de ${categoryEntries.length} integraciones visibles. Su estado de origen se conserva sin reinterpretarlo.</p></div>${search}</div><div class="tactical-category-grid">${visible.map(e=>`<article class="tactical-category-card"><div class="tactical-category-card-top"><span class="tactical-raw-state">${escape(e.statusRaw||'Sin estado')}</span><span class="tactical-category-ref">Fila ${e.row}</span></div>${tacticalIntegrationRow(e)}</article>`).join('')||'<div class="tactical-empty tactical-category-empty">No hay integraciones para los filtros seleccionados.</div>'}</div></section>`;
 const otherVisible=summary.other.filter(e=>matchesTacticalState(e)&&matchesTacticalText(e));
 const secondaryGroups=TACTICAL_STATES.filter(st=>summary.otherCounts[st]>0).map(st=>tacticalSecondaryStateGroup(st,summary.other)).join('');
 const otherBucketOrder=['Ciclo 2','Ciclo 2/3','Funcionalidad nativa del sistema','Manual','No aplica integración','Otras clasificaciones'];
 const nonStateEntries=summary.other.filter(e=>e.status==='Sin clasificar');
 const otherBucketCounts=Object.fromEntries(otherBucketOrder.map(label=>[label,nonStateEntries.filter(e=>tacticalSecondaryBucket(e)===label).length]));
 const secondaryBuckets=otherBucketOrder.filter(label=>otherBucketCounts[label]>0).map(label=>tacticalSecondaryBucketGroup(label,nonStateEntries)).join('');
 const secondary=category.id==='todas'?`<section class="panel tactical-secondary"><button class="tactical-secondary-header" data-action="tactical-secondary" aria-expanded="${tacticalSecondaryOpen}"><span class="tactical-secondary-header-main"><span class="eyebrow">VISTA SECUNDARIA</span><strong>Integraciones no priorizadas</strong><small>Criticidad diferente de Alta o no informada · ${summary.other.length} registros</small></span><span class="tactical-secondary-header-side"><span class="tactical-header-total"><span>Total</span><strong>${summary.other.length}</strong></span><span class="tactical-secondary-chevron">${tacticalSecondaryOpen?'▾':'▸'}</span></span></button>${tacticalSecondaryOpen?`<div class="tactical-secondary-body"><div class="tactical-secondary-counts">${TACTICAL_STATES.map(st=>`<span>${escape(st)}: <b>${summary.otherCounts[st]}</b></span>`).join('')}${otherBucketOrder.filter(label=>otherBucketCounts[label]>0).map(label=>`<span>${escape(label)}: <b>${otherBucketCounts[label]}</b></span>`).join('')}</div><div class="tactical-secondary-groups">${secondaryGroups}${secondaryBuckets}</div>${!otherVisible.length?'<p class="tactical-empty">No hay registros con el filtro seleccionado.</p>':''}</div>`:''}</section>`:'';
 view.innerHTML=`<section class="tactical-intro panel"><div><div class="eyebrow">ESPECIALIDAD LABORAL · SEGUIMIENTO TÁCTICO</div><h2>Status integraciones</h2><p>${summary.all} registros en Seguimiento · ${counts.critica} Críticas · ${counts.alta} Altas · ${summary.other.length} no priorizadas por severidad</p></div><div class="tactical-intro-actions"><span class="tactical-origin">${escape(tacticalOrigin)} · ${new Date(tacticalData.readAt).toLocaleString('es-PE')}</span><div class="button-row"><button class="btn btn-light btn-sm" data-action="tactical-refresh" ${tacticalBusy?'disabled':''}>${tacticalBusy?'Actualizando…':'↻ Actualizar táctico'}</button><button class="btn btn-primary btn-sm" data-action="tactical-export" ${(tacticalBusy||tacticalExportBusy)?'disabled':''}>${tacticalExportBusy?'Generando diapositiva…':'⤓ Generar diapositiva resumen'}</button></div></div></section>${tacticalError?`<div class="notice error">${escape(tacticalError)}. Se muestran los últimos datos de la sesión actual.</div>`:''}${coverageNotice}${filterToolbar}${statusMode?statusContent:categoryContent}${secondary}${tacticalData.warnings.length?`<div class="scope-notice"><b>Verificación de origen:</b> ${tacticalData.warnings.map(escape).join(' · ')}</div>`:''}<div class="tactical-footer">Fuente: Google Drive privado → hoja ${escape(tacticalData.sourceSheet)}, filas 1–${TACTICAL_MAX_ROW} inclusive. B: Integración · D: Estado o clasificación · E: Dependencia · G: Hitos · H/I/J: Fechas o textos · L: Criticidad y relleno verde · M: Consideraciones. <b>Crítica y Alta son filtros excluyentes; los filtros de ciclo y tipo usan D y pueden coincidir con una integración de Alta.</b> Puedes generar una diapositiva resumen en formato PowerPoint con el filtro táctico actualmente visible. Si el verde procede solo de formato condicional y no se exporta como relleno directo, podría no detectarse.</div>`;
}

function groups(){return model?.integrations||[];}
function linkedLaboralSystems(){
 if(!hierarchy)return [];
 const ids=new Set(CATALOGO_FIJO.map(item=>linkCatalogItem(item,hierarchy.systems).system?.id).filter(Boolean));
 return hierarchy.systems.filter(s=>ids.has(s.id));
}
function visibleSystems(){return specialty==='laboral'?linkedLaboralSystems():hierarchy?.systems||[];}
function visibleSystemIds(){return new Set(visibleSystems().map(s=>s.id));}
function visibleGroups(){return specialty==='laboral'?groups().filter(g=>visibleSystemIds().has(systemId(g.name))):groups();}
function visibleEndpoints(){return specialty==='laboral'?(model?.endpoints||[]).filter(e=>visibleSystemIds().has(e.systemId)):(model?.endpoints||[]);}
function aggregateStages(systems){
 const components=systems.flatMap(s=>s.components||[]);
 const evaluated=components.filter(c=>Object.hasOwn(STAGE_PROGRESS,c.status));
 const progress=evaluated.length?Math.round(evaluated.reduce((sum,c)=>sum+STAGE_PROGRESS[c.status],0)/evaluated.length):null;
 const statuses=new Map();for(const c of components)statuses.set(c.status,(statuses.get(c.status)||0)+1);
 return {progress,coverage:evaluated.length,total:components.length,statuses};
}
function refreshSpecialtyUI(){
 const select=el('specialty-filter');if(select)select.value=specialty;
 el('sidebar-systems').textContent=hierarchy?number(visibleSystems().length):'—';
 el('sidebar-integrations').textContent=specialty==='laboral'?number(CATALOGO_FIJO.length):model?number(model.integrations.length):'—';
 el('sidebar-endpoints').textContent=hierarchy?number(visibleEndpoints().length):'—';
 const tag=el('specialty-summary');if(tag)tag.textContent=specialty==='laboral'?'Laboral · 36 integraciones':'Todas · sin filtro de especialidad';
}
function scopeNotice(){return `<div class="scope-notice">${specialty==='laboral'?`<b>Especialidad Laboral:</b> 36 registros del catálogo fijo (Sheet2). Sus componentes y endpoints se cruzan con el Excel técnico. Un registro sin endpoint documentado no significa que carezca de servicio.`:`<b>Vista general:</b> todas las integraciones contenidas en el Excel técnico de SOFTPLAN. Las 36 de Laboral siguen disponibles en el filtro superior.`}</div>`;}
function specialtyProgress(){
 const systems=linkedLaboralSystems(),dev=calculateDevelopment(systems,STAGE_PROGRESS),validation=validationEvidence;
 const linked=CATALOGO_FIJO.filter(item=>!!linkCatalogItem(item,hierarchy?.systems).system).length;
 const value=dev.value===null?'N/D':dev.value+'%';
 const validationValue=validation.value===null?'N/D':validation.value+'%';
 // El cálculo de cada fila usa el valor numérico del porcentaje: 20 para 20 %, 55 para 55 %, etc.
 // De ese modo los encabezados A, B y C corresponden literalmente a la fórmula visible.
 const breakdownRows=dev.breakdown.map(r=>`<tr><td>${escape(r.state)}</td><td class="num">${r.count}</td><td class="num">${r.weight}%</td><td class="num"><span class="calculation-operation">${r.count} × ${r.weight} = </span><strong>${number(r.points)}</strong></td></tr>`).join('');
 const componentSum=dev.breakdown.map(r=>r.count).join(' + ');
 const pointsSum=dev.breakdown.map(r=>number(r.points)).join(' + ');
 const calculation=dev.exact===null?'No calculable: no hay componentes con un estado reconocido.':`${number(dev.points)} ÷ ${dev.evaluated} = ${dev.exact.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}% → <strong>${dev.value}%</strong> (redondeado al entero más próximo)`;
 const validationFormula=validation.readable?`${validation.complete} integraciones con pruebas aprobadas y conformidad acreditada ÷ ${validation.total} del catálogo × 100 = <strong>${validation.value}%</strong>`:'N/D: el Excel técnico no contiene una hoja «Validaciones» con evidencias formales de pruebas y conformidad.';
 const evidenceRows=validation.entries.map(r=>`<tr><td>${escape(r.name)}</td><td>${r.testVerified?'Sí':'No acreditada'}</td><td>${r.approved?'Sí':'No acreditada'}</td><td>${r.accredited?'<strong>Acreditada</strong>':'Pendiente de evidencia'}</td><td>${escape(r.source||'Sin registro')}</td></tr>`).join('');
 return `<section class="panel specialty-progress" aria-label="Indicadores de progreso de Laboral">
  <div class="metrics-heading"><div><span class="eyebrow">ESPECIALIDAD · LABORAL</span><h2>Seguimiento de desarrollo y validación</h2><p>36 integraciones del catálogo fijo · ${linked} vinculadas a ${systems.length} sistemas técnicos únicos</p></div><span class="metrics-source">Fuente de desarrollo: hoja Sistemas</span></div>
  <div class="specialty-progress-grid">
   <article class="metric-card metric-development"><div class="metric-title">01 · Avance estimado de desarrollo</div><div class="metric-number">${value}</div><p>Promedio de etapas de los componentes técnicos.</p><div class="specialty-progress-track" role="progressbar" aria-label="Avance estimado de desarrollo" aria-valuemin="0" aria-valuemax="100" ${dev.value===null?'':`aria-valuenow="${dev.value}"`}><div class="specialty-progress-fill" style="width:${dev.value??0}%"></div></div><div class="metric-foot">${dev.evaluated}/${dev.total} componentes evaluables · ${dev.unclassified} sin estado evaluable</div></article>
   <article class="metric-card metric-validation"><div class="metric-title">02 · Validación con conformidad documentada</div><div class="metric-number ${validation.value===null?'metric-unknown':''}">${validationValue}</div><p>${validation.readable?'Porcentaje de integraciones con pruebas aprobadas y conformidad respaldada.':'Sin evidencia estructurada suficiente para calcular un porcentaje.'}</p><div class="specialty-progress-track validation-track" role="progressbar" aria-label="Validación con evidencia" aria-valuemin="0" aria-valuemax="100" ${validation.value===null?'':`aria-valuenow="${validation.value}"`}><div class="specialty-validation-fill" style="width:${validation.value??0}%"></div></div><div class="metric-foot">${validation.complete}/${validation.total} integraciones acreditadas en la fuente · ${validation.readable?validation.withTest+' con pruebas sustentadas':'sin registro formal de validación'}</div></article>
  </div>
  <div class="specialty-progress-metrics"><span>${number(visibleEndpoints().length)} endpoints/operaciones documentados</span><span>${CATALOGO_FIJO.length-linked} integraciones sin vínculo técnico</span></div>
  <details class="calculation-legend"><summary><span>¿Cómo se calculan estos indicadores?</span><span class="legend-hint">Ver fórmula, ponderaciones y fuentes</span></summary>
   <div class="calculation-legend-body"><section><h3>1. Desarrollo estimado · Detalle verificable</h3><p>Se toma cada componente de «Sistemas» vinculado a Laboral <strong>una sola vez</strong>, incluso cuando dos integraciones comparten un sistema (PIDE: CONADIS y SUNAT). A cada etapa se asigna un valor referencial.</p>
    <p class="calculation-instructions"><strong>Cómo leer la tabla:</strong> (A) es la cantidad de componentes con ese estado; (B) es el avance estimado que el tablero asigna a esa etapa; (C) es el aporte calculado al multiplicar A por el valor numérico de B (por ejemplo, 20 para 20 %).</p>
    <div class="table-wrap"><table class="table calculation-table"><thead><tr><th>Estado del componente</th><th class="num">N.º de componentes (A)</th><th class="num">Avance asignado (B)</th><th class="num">Aporte (C = A × B)</th></tr></thead><tbody>${breakdownRows}<tr class="calculation-total"><td><strong>Total con estado evaluable</strong></td><td class="num"><strong>${dev.evaluated}</strong></td><td class="num muted">No aplica</td><td class="num"><strong>${number(dev.points)}</strong></td></tr></tbody></table></div>
    <p class="calculation-equation"><strong>Fórmula del avance estimado (%):</strong> Total de «Aporte (C)» ÷ Total de «N.º de componentes (A)».</p>
    <div class="calculation-steps" aria-label="Explicación del cálculo en tres pasos">
      <div class="calculation-step"><span class="calculation-step-number">1</span><div><strong>Sumar los aportes (columna C)</strong><div class="calculation-step-math">${pointsSum} = <strong>${number(dev.points)}</strong> puntos acumulados</div></div></div>
      <div class="calculation-step"><span class="calculation-step-number">2</span><div><strong>Sumar los componentes (columna A)</strong><div class="calculation-step-math">${componentSum} = <strong>${dev.evaluated}</strong> componentes con estado evaluable</div></div></div>
      <div class="calculation-step"><span class="calculation-step-number">3</span><div><strong>Dividir el paso 1 entre el paso 2 y redondear</strong><div class="calculation-step-math">${calculation}</div></div></div>
    </div>
    <p class="calculation-caveat">${dev.unclassified} componentes sin estado evaluable quedan fuera del promedio; no se convierten automáticamente en 0 %. Es una <strong>estimación del tablero</strong>, no una medición certificada por SOFTPLAN o GTI.</p></section>
   <section><h3>2. Validación documentada · Regla de acreditación</h3><p>Una integración cuenta como acreditada únicamente si tiene <strong>pruebas aprobadas, referencia de evidencia de pruebas, conformidad otorgada y referencia de conformidad</strong>. Las cuatro condiciones deben cumplirse. «Enviado a calidad», enlaces de análisis o disponibilidad de ambientes <strong>no bastan</strong>.</p>
    <p class="calculation-equation"><strong>Fórmula:</strong> integraciones acreditadas ÷ 36 integraciones de Laboral × 100.</p><p class="calculation-result">${validationFormula}</p>
    ${validation.readable?`<p class="calculation-caveat">Fuente: «${escape(validation.sourceName)}». Registros reconocidos: ${validation.rowsRead}. ${validation.warnings.length?escape(validation.warnings.slice(0,2).join(' · ')):''}</p><details class="validation-breakdown"><summary>Consultar verificación individual de las 36 integraciones</summary><div class="table-wrap"><table class="table calculation-table"><thead><tr><th>Integración</th><th>Pruebas</th><th>Conformidad</th><th>Resultado</th><th>Fila</th></tr></thead><tbody>${evidenceRows}</tbody></table></div></details>`:`<p class="calculation-caveat">Para habilitar esta métrica, añade al mismo Excel privado una hoja opcional <strong>«Validaciones»</strong> con las columnas «Integración», «Resultado de pruebas», «Evidencia de pruebas», «Conformidad» y «Evidencia de conformidad». Registra los nombres exactos del catálogo Laboral. No se requiere modificar el catálogo fijo.</p>`}
   </section><p class="calculation-disclaimer">Ambos indicadores se recalculan al cargar o actualizar la fuente de Google. <strong>El avance de desarrollo no acredita implementación ni puesta en producción.</strong></p></div></details>
 </section>`;
}

function filteredGroups(){return visibleGroups().filter(i=>{
 if(stateFilter&&!i.statusCounts[stateFilter])return false;
 if(query&&!([i.name,...i.components.map(c=>c.component),...i.endpoints.map(e=>e.path)].join(' ').toLowerCase().includes(query.toLowerCase())))return false;
 return true;
 });}
function filteredEndpoints(){return visibleEndpoints().filter(e=>{
 if(integrationFilter&&norm(e.integration)!==norm(integrationFilter))return false;
 if(systemFilter&&e.systemId!==systemFilter)return false;
 if(technicalIntegrationFilter&&e.technicalIntegrationId!==technicalIntegrationFilter)return false;
 if(stateFilter&&norm(e.sourceStatus)!==norm(stateFilter)&&!model.integrations.some(i=>norm(i.name)===norm(e.integration)&&i.statusCounts[stateFilter]))return false;
 if(equivFilter&&e.equivalenceType!==equivFilter)return false;
 if(query&&!([e.path,e.integration,e.component,e.equivalent,...e.legacyMethods].join(' ').toLowerCase().includes(query.toLowerCase())))return false;
 return true;
 });}
function kpi(title,value,desc,icon){return `<article class="kpi"><div class="kpi-top"><span class="kpi-title">${escape(title)}</span><span class="kpi-ico">${icon}</span></div><div class="kpi-value">${number(value)}</div><div class="kpi-desc">${escape(desc)}</div></article>`;}
function empty(inner='Cargando la fuente de Google… Si requiere autenticación, selecciona Fuentes → Google Drive → Autorizar y leer privado.'){return `<div class="empty"><div><div class="empty-glyph">▤</div><h3>Sin información cargada</h3><p>${escape(inner)}</p><button class="btn btn-primary" data-action="open-import">↥ &nbsp; Importar Excel</button></div></div>`;}
function breakdownBadges(i){return `<div class="status-breakdown">${(i.statusSegments||[]).length?(i.statusSegments.map(x=>`<span class="badge ${statusClass(x.status)}" title="${escape(x.count+' componentes: '+x.status)}">${x.count} ${escape(x.status)}</span>`).join('')):'<span class="badge badge-gray">Sin estado registrado</span>'}</div>`;}
function progressCell(i){if(i.progress==null)return '<span class="muted">N/D</span><span class="col-secondary">Sin estados evaluables</span>';
 const title=`Estimación por etapas de Sistemas: ${i.progressCoverage}/${i.progressTotal} componentes con etapa reconocida. No equivale a conformidad.`;
 return `<div class="progress-cell" title="${escape(title)}"><strong>${i.progress}% <small>estimado</small></strong><div class="progress-track"><div class="progress-fill" style="width:${i.progress}%"></div></div>${i.progressCoverage<i.progressTotal?`<span class="col-secondary">${i.progressCoverage}/${i.progressTotal} componentes evaluables</span>`:''}</div>`;}
function statusBadge(s){return `<span class="badge ${statusClass(s)}">${escape(s)}</span>`;}
function eqBadge(e){return `<span class="badge ${equivalentClass(e)}">${escape(e)}</span>`;}
function simplePanel(title,sub,body){return `<section class="panel"><div class="panel-header"><h2>${escape(title)}</h2><span>${escape(sub)}</span></div>${body}</section>`;}
function renderOverview(){const view=el('view-overview');
 if(!model){
  if(specialty==='laboral'){view.innerHTML=`${specialtyProgress()}${simplePanel('Catálogo Laboral disponible',CATALOGO_FIJO.length+' integraciones del catálogo fijo',`<div class="dynamics-notice">El catálogo permanece disponible sin Google Drive. Para mostrar progreso técnico, endpoints y observaciones de GTI/SOFTPLAN, autoriza el Excel privado.</div><button class="btn btn-primary" data-action="tab-integrations">Ver integraciones de Laboral →</button>`)}${simplePanel('Conectar seguimiento técnico','',empty())}`;return;}
  view.innerHTML=`${simplePanel('Conectar fuente técnica','Todas las integraciones se leen del Excel privado',`<div class="dynamics-notice">Al autorizar Google verás el total original del Excel SOFTPLAN. Usa el filtro de Especialidad para mostrar las 36 de Laboral, que ya están guardadas en el proyecto.</div>${empty()}`)}`;return;
 }
 const systems=visibleSystems(),endpoints=visibleEndpoints(),groupsForScope=visibleGroups();
 const metrics=aggregateStages(systems),countComp=metrics.total;
 const routed=endpoints.filter(e=>e.kind==='Ruta API').length;
 const noEq=endpoints.filter(e=>e.equivalenceType==='missing').length;
 const unknown=endpoints.filter(e=>e.equivalenceType==='unknown').length;
 const attrs=endpoints.reduce((sum,e)=>sum+e.attributeTotal,0);
 const colors={'Enviado a calidad':'#41a689','En desarrollo':'#5298cd','Pendiente':'#e3ad4b','No requiere modificación':'#80c4a9','En análisis':'#a692df','En revisión':'#c09ade','Sin estado':'#a8b5c4'};
 const statusLines=[...metrics.statuses.entries()].sort((a,b)=>b[1]-a[1]).map(([label,n])=>`<div class="state-row"><div class="state-name">${escape(label)}</div><div class="track"><div class="track-fill" style="width:${percent(n,countComp)};background:${colors[label]||'#9caaba'}"></div></div><div class="state-n">${n}</div></div>`).join('');
 const cover=groupsForScope.filter(i=>i.endpoints.length).slice().sort((a,b)=>b.operations-a.operations).slice(0,6).map(i=>`<div class="coverage-line"><span class="coverage-icon">⌘</span><div class="coverage-body"><div class="coverage-name">${escape(i.name)}</div><div class="coverage-sub">${i.routed} rutas · ${i.operations-i.routed} operaciones sin ruta · ${i.attributeTotal} atributos</div></div><span class="coverage-count">${i.operations}</span></div>`).join('')||'<p class="summary-text">Sin detalle disponible</p>';
 const top=groupsForScope.slice(0,8);
 const totalIntegrations=specialty==='laboral'?CATALOGO_FIJO.length:groupsForScope.length;
 const subtitle=specialty==='laboral'?`${systems.length} sistemas técnicos únicos vinculados`:`${systems.length} sistemas del Excel técnico`;
 view.innerHTML=`${scopeNotice()}<div class="kpi-grid">${kpi(specialty==='laboral'?'Integraciones Laboral':'Total de integraciones',totalIntegrations,subtitle,'▤')}${kpi('Rutas API documentadas',routed,`${endpoints.length-routed} operaciones/métodos adicionales`,'⌘')}${kpi('Atributos documentados',attrs,'Incluye nombres inferidos de esquemas','▥')}${kpi('Sin equivalencia confirmada',noEq,`${unknown} sin mapeo documentado`,'!')}</div>
 ${specialty==='laboral'?specialtyProgress():''}
 <div class="content-grid">${simplePanel('Estado de los componentes',`Sistemas · ${countComp} componentes`,statusLines+`<div class="legend-note">Etapas registradas de ${countComp} componentes. «Enviado a calidad» no significa aprobado, probado ni implementado en producción.</div>`)}${simplePanel('Mayor detalle de endpoints','Rutas + operaciones',`<div class="coverage-list">${cover}</div>`)}</div>
 <section class="panel data-panel"><div class="panel-header"><h2>Integraciones registradas ${specialty==='laboral'?'· Laboral':'· Excel técnico'}</h2><button class="link-button" data-action="tab-integrations">Ver listado completo →</button></div><div class="table-wrap"><table class="table"><thead><tr><th>INTEGRACIÓN</th><th>COMPONENTES</th><th>OPERACIONES</th><th>ATRIBUTOS</th><th>ESTADO POR COMPONENTE</th><th>AVANCE*</th><th>DETALLE</th></tr></thead><tbody>${top.map(i=>`<tr><td><span class="title-cell">${escape(i.name)}</span><span class="sub-cell">${i.sources.length} referencias en el Excel</span></td><td>${i.componentCount}</td><td><b>${i.operations}</b> <span class="col-secondary">${i.routed} rutas</span></td><td>${i.attributeTotal}</td><td>${breakdownBadges(i)}${i.components.length?`<button class="detail-button components-link" data-components="${escape(i.name)}">Ver componentes →</button>`:''}</td><td>${progressCell(i)}</td><td><button class="detail-button" data-integration="${escape(i.name)}">Examinar →</button></td></tr>`).join('')}</tbody></table></div><div class="table-footnote"><b>* Avance referencial (no certificado).</b> Promedio de las etapas por componente de «Sistemas»: pendiente 0 %, análisis 20 %, revisión 35 %, desarrollo 55 %, enviado a calidad 80 % y sin modificación requerida 100 %. No equivale a conformidad, pruebas ni despliegue. Los componentes sin estado se excluyen.</div></section>`;
}
function filterTools(includeIntegration=false){const st=uniqueStatuses(),inOptions=includeIntegration?`<select id="system-filter" class="select"><option value="">Todos los sistemas</option>${visibleSystems().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(i=>`<option value="${escape(i.id)}" ${systemFilter===i.id?'selected':''}>${escape(i.name)}</option>`).join('')}</select><select id="technical-integration-filter" class="select"><option value="">Todas las integraciones técnicas</option>${(hierarchy?.integrations||[]).filter(i=>visibleSystemIds().has(i.systemId)&&(!systemFilter||i.systemId===systemFilter)).map(i=>`<option value="${escape(i.id)}" ${technicalIntegrationFilter===i.id?'selected':''}>${escape(i.name)} · ${escape(i.system)}</option>`).join('')}</select>`:'';
 const eqOptions=includeIntegration?`<select class="select" id="equiv-filter"><option value="">Todas las equivalencias</option><option value="mapped" ${equivFilter==='mapped'?'selected':''}>Documentada</option><option value="missing" ${equivFilter==='missing'?'selected':''}>No existe</option><option value="unknown" ${equivFilter==='unknown'?'selected':''}>No documentada</option></select>`:'';
 return `<div class="toolbar"><input id="search-filter" class="input search" placeholder="Buscar integración o endpoint…" value="${escape(query)}" aria-label="Buscar"><select id="status-filter" class="select"><option value="">Todos los estados</option>${st.map(st=>`<option value="${escape(st)}" ${st===stateFilter?'selected':''}>${escape(st)}</option>`).join('')}</select>${inOptions}${eqOptions}<button class="btn btn-light btn-sm" data-action="clear-filters">Limpiar</button></div>`;
}
function uniqueStatuses(){return [...new Set((model?.integrations||[]).flatMap(i=>i.components.map(c=>c.status)))].sort((a,b)=>a.localeCompare(b,'es'));}
function pagination(total,onPage){if(total<=onPage)return'';const pages=Math.ceil(total/onPage);page=Math.min(Math.max(1,page),pages);return `<div class="pagination"><span>Página ${page} de ${pages} · ${number(total)} registros</span><div><button data-page="prev" ${page<=1?'disabled':''}>← Anterior</button> <button data-page="next" ${page>=pages?'disabled':''}>Siguiente →</button></div></div>`;}
function renderLegacyIntegrations(){const v=el('view-integrations');if(!model){v.innerHTML=empty();return;}const list=filteredGroups();const count=12;page=Math.max(1,Math.min(page,Math.ceil(list.length/count)||1));const subset=list.slice((page-1)*count,page*count);
 v.innerHTML=`<div class="actionline"><h2>Integraciones del Excel técnico <span class="muted">(${number(list.length)} de ${number(groups().length)})</span></h2><div class="toolbar"><button class="btn btn-light btn-sm" data-export="integrations">↓ Exportar CSV</button></div></div><div class="panel data-panel"><div class="panel-header">${filterTools()}</div><div class="table-wrap"><table class="table"><thead><tr><th>INTEGRACIÓN</th><th>COMPONENTES</th><th>RUTAS API</th><th>OTRAS OPERACIONES</th><th>ATRIBUTOS</th><th>EQUIVALENCIA NO ACREDITADA</th><th>DEPENDENCIAS BD</th><th>ESTADO POR COMPONENTE</th><th>AVANCE*</th><th></th></tr></thead><tbody>${subset.map(i=>`<tr><td><span class="title-cell">${escape(i.name)}</span><span class="sub-cell">${i.hasDetail?'Con información de endpoints':'Sin hoja de endpoints vinculada'}</span></td><td>${i.componentCount}</td><td><b>${i.routed}</b></td><td>${i.operations-i.routed}</td><td>${i.attributeTotal}</td><td>${i.undocumented}</td><td>${i.dbDependencies}</td><td>${breakdownBadges(i)}${i.components.length?`<button class="detail-button components-link" data-components="${escape(i.name)}">Ver componentes →</button>`:''}</td><td>${progressCell(i)}</td><td><button class="detail-button" data-integration="${escape(i.name)}">Consultar →</button></td></tr>`).join('')||'<tr><td colspan="10">No hay coincidencias.</td></tr>'}</tbody></table></div>${pagination(list.length,count)}</div><div class="dynamics-notice">* Avance orientativo por componentes, no conformidad verificada. Etapas: pendiente 0 %, análisis 20 %, revisión 35 %, desarrollo 55 %, enviado a calidad 80 %, no requiere modificación 100 %. Un valor <b>0</b> en rutas identificadas significa que el Excel no aporta rutas verificables para esa integración, no que el sistema no tenga endpoints.</div>`;
}
function renderEndpoints(){const v=el('view-endpoints');if(!model){v.innerHTML=empty();return;}const list=filteredEndpoints();const count=15;page=Math.max(1,Math.min(page,Math.ceil(list.length/count)||1));const subset=list.slice((page-1)*count,page*count);
 v.innerHTML=`<div class="actionline"><h2>Endpoints y operaciones <span class="muted">(${number(list.length)})</span></h2><div class="toolbar"><button class="btn btn-light btn-sm" data-export="attributes">↓ Atributos CSV</button><button class="btn btn-light btn-sm" data-export="endpoints">↓ Endpoints CSV</button></div></div><div class="panel data-panel"><div class="panel-header">${filterTools(true)}</div><div class="table-wrap"><table class="table"><thead><tr><th>INTEGRACIÓN / COMPONENTE</th><th>ENDPOINT U OPERACIÓN</th><th>EQUIVALENTE / MAPEO</th><th>ATRIBUTOS</th><th>ESTADO EN SISTEMAS</th><th>OBSERVACIONES</th><th>DETALLE</th></tr></thead><tbody>${subset.map(e=>`<tr><td><span class="title-cell">${escape(e.integration)}</span><span class="sub-cell">${escape(trim(e.component,42))}</span><span class="col-secondary">${escape((hierarchy?.integrations||[]).find(i=>i.id===e.technicalIntegrationId)?.name||'Sin vínculo técnico')}</span></td><td><b class="title-cell">${escape(trim(e.path,47))}</b><span class="col-secondary">${escape(e.kind)}</span></td><td>${eqBadge(e.equivalent)}${e.equivalenceType==='mapped'?`<span class="col-secondary ellipsis" title="${escape(e.equivalent)}">${escape(trim(e.equivalent,60))}</span>`:''}</td><td>${e.attributeTotal}${e.attrConflicts?` <span class="col-secondary">${e.attrConflicts} observados</span>`:''}</td><td>${statusBadge(e.sourceStatus)}</td><td>${noteChip(endpointId(e))}</td><td><button class="detail-button" data-endpoint="${escape(e.id)}">Ver ficha →</button></td></tr>`).join('')||'<tr><td colspan="7">No se encontraron endpoints.</td></tr>'}</tbody></table></div>${pagination(list.length,count)}</div><div class="dynamics-notice">La equivalencia documentada describe el mapeo que figura en el Excel; no acredita que los servicios se comporten igual ni que las pruebas hayan concluido.</div>`;
}
function renderTechnical(){const v=el('view-technical');if(!model){v.innerHTML=empty();return;}
 const showCasillero=specialty==='todas'||visibleSystems().some(s=>norm(s.name)==='casillero digital');
 const structures=showCasillero?model.structures:[];
 const tables=unique(structures.map(x=>x.table));
 const allowed=new Set(visibleSystems().map(s=>norm(s.name)));
 const scopeProcedures=model.procedures.filter(p=>specialty==='todas'||allowed.has(norm(p.integration)));
 const spCount=scopeProcedures.filter(x=>x.procedure).length,sqlCount=scopeProcedures.filter(x=>x.hasQuery).length;
 const options=unique(scopeProcedures.map(x=>x.integration)).sort((a,b)=>a.localeCompare(b,'es'));
 if(technicalFilter&&!options.includes(technicalFilter))technicalFilter='';
 const procedures=scopeProcedures.filter(p=>!technicalFilter||p.integration===technicalFilter);
 const groups=unique(procedures.map(x=>x.integration));
 const header=`<div class="tech-info"><div class="panel"><span>Tablas documentadas</span><strong>${tables.length}</strong><span>CASILLERO · estructuras BD</span></div><div class="panel"><span>Operaciones con SP</span><strong>${spCount}</strong><span>Nombre de procedimiento registrado</span></div><div class="panel"><span>Operaciones con SQL</span><strong>${sqlCount}</strong><span>Incluye registros que también tienen SP</span></div></div>`;
 const tableRows=tables.map(t=>{const rec=structures.filter(x=>x.table===t);return `<tr><td class="title-cell">${escape(t)}</td><td>${rec.length}</td><td>${escape(unique(rec.map(x=>x.targetTable)).join(', ')||'No informado')}</td><td>CASILLERO!${rec[0].row}–${rec[rec.length-1].row}</td></tr>`;}).join('');
 const procRows=procedures.map(p=>`<tr><td><span class="title-cell">${escape(p.integration)}</span><span class="col-secondary">${escape(p.application)}</span></td><td>${escape(p.action)}</td><td>${escape(p.database||'No indicada')}</td><td>${escape(p.procedure||'Sin SP nombrado')}</td><td>${escape(p.kind)}</td><td>${escape(p.sheet)}!${p.row}</td></tr>`).join('');
 const procFilter=`<div class="toolbar"><label for="technical-filter" class="helper">Integración:</label><select id="technical-filter" class="select"><option value="">Todas las integraciones</option>${options.map(name=>`<option value="${escape(name)}" ${technicalFilter===name?'selected':''}>${escape(name)}</option>`).join('')}</select></div>`;
 v.innerHTML=`${header}<div class="dynamics-notice">La hoja <b>STORED PROCEDURES</b> documenta dependencias de base de datos asociadas a integraciones; <b>no son endpoints HTTP</b>. El tablero registra nombres y existencia de SQL, pero no expone el contenido de consultas.</div><div style="height:18px"></div>${simplePanel('Dependencias de BD · STORED PROCEDURES',`${procedures.length} de ${scopeProcedures.length} registros · ${groups.length} integraciones`,`${procFilter}<div class="table-wrap"><table class="table"><thead><tr><th>INTEGRACIÓN / APLICACIÓN</th><th>OPERACIÓN / ACCIÓN</th><th>BASE DE DATOS</th><th>PROCEDIMIENTO</th><th>TIPO</th><th>FUENTE</th></tr></thead><tbody>${procRows||'<tr><td colspan="6">No hay procedimientos o consultas para este filtro.</td></tr>'}</tbody></table></div>`)}<div style="height:18px"></div>${simplePanel('Estructuras de datos · CASILLERO',`${tables.length} tablas · ${structures.length} campos`,`<div class="table-wrap"><table class="table"><thead><tr><th>TABLA DE ORIGEN</th><th>COLUMNAS</th><th>TABLA EQUIVALENTE</th><th>REFERENCIA EXCEL</th></tr></thead><tbody>${tableRows||'<tr><td colspan="4">Sin tablas identificadas.</td></tr>'}</tbody></table></div>`)}`;
}

// V1.2: jerarquía verificada y anotaciones locales persistentes
const linkedSystems=()=>hierarchy?.systems||[];
const directNotes=id=>notes.filter(n=>n.targetId===id);
const noteCount=id=>directNotes(id).length;
const directExcelNotes=id=>excelNotes.filter(n=>n.targetId===id);
const excelCount=id=>directExcelNotes(id).length;
const noteOpen=id=>directNotes(id).filter(n=>n.status!=='Resuelta').length;
function descendantIds(node){
 if(node.integrations)return [node.id,...node.integrations.flatMap(i=>descendantIds(i))];
 if(node.endpoints)return [node.id,...node.endpoints.map(e=>endpointId(e))];
 return [endpointId(node)];
}
function observationLabel(node){const ids=descendantIds(node);const total=notes.filter(n=>ids.includes(n.targetId));const opened=total.filter(n=>n.status!=='Resuelta').length;const direct=noteCount(node.id||endpointId(node));return `${direct} propias · ${opened} abiertas en nivel y descendientes`;}
function noteChip(id){
 const manual=noteOpen(id),rows=directExcelNotes(id);
 const gti=rows.filter(n=>n.author==='GTI').length;
 const softplan=rows.filter(n=>n.author==='SOFTPLAN').length;
 const other=rows.length-gti-softplan;
 const labels=[gti?`${gti} GTI`:'',softplan?`${softplan} SOFTPLAN`:'',other?`${other} Excel`:''].filter(Boolean);
 return `<span class="note-chip ${manual?'note-chip-open':''}">${labels.join(' · ')||'0 Excel'} · ${manual} seguimiento</span>`;
}
function excelObservationCards(rows,max=250){const shown=rows.slice(0,max);return `<div class="excel-note-list">${shown.map(n=>`<article class="observation-item excel-note"><div class="observation-meta"><span class="badge badge-blue">Excel · ${escape(n.author)}</span><span class="excel-source">${escape(n.source)}</span>${n.field?`<span class="badge badge-gray">Atributo: ${escape(n.field)}</span>`:''}</div><div class="observation-text">${escape(n.text)}</div></article>`).join('')}</div>${rows.length>max?`<p class="helper">Se muestran ${max} de ${rows.length} comentarios. Consulta la hoja y las celdas indicadas para el resto.</p>`:''}`;}
/** Muestra la observación real del Excel bajo el nivel que le corresponde.
 * No confundir con el seguimiento manual, que puede editarse en el panel lateral. */
function inlineExcelFeedback(id,level=''){const rows=directExcelNotes(id);if(!rows.length)return '';
 const max=8,visible=rows.slice(0,max);
 return `<section class="tree-excel-feedback" aria-label="Observaciones importadas del Excel ${escape(level)}"><div class="tree-feedback-heading"><strong>Observaciones del Excel${level?' · '+escape(level):''}</strong><span>${rows.length} registro${rows.length===1?'':'s'} · solo lectura</span></div><div class="tree-feedback-cards">${visible.map(n=>`<div class="tree-feedback-card"><div class="tree-feedback-card-head"><span class="feedback-author ${n.author==='GTI'?'feedback-gti':n.author==='SOFTPLAN'?'feedback-softplan':''}">${escape(n.author)}</span><span class="excel-source">${escape(n.source)}</span>${n.field?`<span class="feedback-field">Atributo: ${escape(n.field)}</span>`:''}</div><div class="tree-feedback-text">${escape(n.text)}</div></div>`).join('')}</div>${rows.length>max?`<button class="detail-button" data-observe="${escape(id)}">Ver las ${rows.length} observaciones en detalle →</button>`:''}</section>`;
}
function treeStatus(counts){const entries=Object.entries(counts||{}).filter(([,n])=>n>0);return entries.length?`<div class="status-breakdown">${entries.map(([status,n])=>`<span class="badge ${statusClass(status)}">${n} ${escape(status)}</span>`).join('')}</div>`:'<span class="muted">Sin estado en Sistemas</span>';}
function renderSystems(){const v=el('view-systems');if(!model){v.innerHTML=empty();return;}
 const set=observationTargets(hierarchy), orphan=notes.filter(n=>!set.has(n.targetId)).length;
 const all=visibleSystems().slice().sort((a,b)=>b.operationCount-a.operationCount||a.name.localeCompare(b.name,'es'));
 const filtered=all.filter(s=>!query||[s.name,...s.integrations.map(i=>i.name),...s.endpoints.map(e=>e.path)].join(' ').toLowerCase().includes(query.toLowerCase()));
 const rows=filtered.map(s=>{
  const opened=expandedSystems.has(s.id), sNotes=noteChip(s.id), systemFeedback=inlineExcelFeedback(s.id,'sistema'), totalOpen=notes.filter(n=>descendantIds(s).includes(n.targetId)&&n.status!=='Resuelta').length, totalExcel=excelNotes.filter(n=>descendantIds(s).includes(n.targetId)).length;
  const header=`<div class="tree-system"><button class="tree-toggle" data-system-expand="${escape(s.id)}" aria-expanded="${opened}"><span class="chevron">${opened?'▾':'▸'}</span><span class="tree-title">${escape(s.name)}</span></button><span class="tree-metric">${s.integrations.filter(i=>i.matched).length} integraciones</span><span class="tree-metric">${s.operationCount} operaciones (${s.routes} rutas)</span><span>${s.progress==null?'<span class="muted">N/D</span>':`<strong>${s.progress}%</strong> <small>etapa</small>`}</span><span class="tree-feedback">${sNotes}<small>${totalExcel} del Excel en el árbol · ${totalOpen} seguimientos abiertos</small></span><button class="btn btn-light btn-sm" data-observe="${escape(s.id)}">Ver / añadir seguimiento</button></div>`;
  if(!opened)return header;
  const children=s.integrations.map(i=>{
   const open=expandedIntegrations.has(i.id),unmapped=!i.matched, integrationFeedback=inlineExcelFeedback(i.id,'integración');
   return `<div class="tree-integration"><div class="tree-integration-head"><button class="tree-toggle" data-tech-expand="${escape(i.id)}" aria-expanded="${open}"><span class="chevron">${open?'▾':'▸'}</span><span class="tree-title">${escape(i.name)}</span>${unmapped?'<span class="badge badge-yellow">Revisar asociación</span>':''}</button><span class="tree-metric">${i.endpoints.length} operaciones · ${i.routes} rutas</span><span class="tree-stage">${treeStatus(i.statusCounts)}</span><span>${i.progress==null?'N/D':i.progress+'%'} <small>etapa</small></span><span>${noteChip(i.id)}</span><button class="btn btn-light btn-sm" data-observe="${escape(i.id)}">Ver / añadir seguimiento</button></div>${integrationFeedback}
   ${open?`<div class="tree-endpoints">${i.endpoints.length?i.endpoints.map(e=>`<div class="tree-endpoint"><div><span class="endpoint-method">${escape(e.kind)}</span><button class="endpoint-name" data-endpoint="${escape(e.id)}">${escape(e.path)}</button><small>${escape(e.equivalent)} · ${e.attributeTotal} atributos</small></div><span>${statusBadge(e.sourceStatus)}</span><span>${noteChip(endpointId(e))}</span><div class="tree-actions"><button class="btn btn-light btn-sm" data-endpoint="${escape(e.id)}">Ficha</button><button class="btn btn-light btn-sm" data-observe="${escape(endpointId(e))}">${excelCount(endpointId(e))?'Ver comentarios':'Añadir seguimiento'}</button></div></div>`).join(''):`<div class="tree-empty">No se han identificado endpoints asociados a este componente en las hojas de detalle.</div>`}
    ${unmapped?'<div class="tree-hint">Estos endpoints pertenecen al sistema, pero no tienen correspondencia verificable con un componente de «Sistemas».</div>':''}</div>`:''}</div>`;
  }).join('');return header+systemFeedback+`<div class="tree-children">${children||'<div class="tree-empty">El sistema no tiene componentes registrados.</div>'}</div>`;
 }).join('');
 v.innerHTML=`<div class="actionline"><h2>Desglose jerárquico <span class="muted">(${filtered.length} sistemas)</span></h2><div class="toolbar"><button class="btn btn-light btn-sm" data-export="observations">↓ Observaciones Excel CSV</button><button class="btn btn-light btn-sm" data-action="export-notes">↓ Respaldar seguimiento JSON</button><button class="btn btn-light btn-sm" data-action="import-notes">↑ Importar observaciones JSON</button></div></div>
 <div class="hierarchy-summary"><div><strong>${visibleSystems().length}</strong><span>Sistemas</span></div><div><strong>${hierarchy.integrations.filter(i=>i.matched&&visibleSystemIds().has(i.systemId)).length}</strong><span>Integraciones técnicas registradas</span></div><div><strong>${visibleEndpoints().length}</strong><span>Endpoints / operaciones</span></div><div><strong>${visibleSystems().reduce((sum,s)=>sum+s.unassigned,0)}</strong><span>Pendientes de asociación</span></div><div><strong>${excelNotes.filter(n=>visibleSystems().some(s=>descendantIds(s).includes(n.targetId))).length}</strong><span>Observaciones extraídas del Excel</span></div><div><strong>${notes.filter(n=>n.status!=='Resuelta'&&visibleSystems().some(s=>descendantIds(s).includes(n.targetId))).length}</strong><span>Seguimientos manuales abiertos</span></div></div>
 <div class="dynamics-notice"><b>Origen:</b> Sistema = columna F de «Sistemas»; integración técnica = Componente, columna G; endpoint = operación/ruta en hojas de detalle. No se presupone correspondencia para registros sin asociación. <b>Observaciones Excel:</b> se actualizan automáticamente al recargar la fuente y se muestran con procedencia GTI, SOFTPLAN o su hoja y celda. Son de solo lectura. <b>Seguimiento adicional:</b> se almacena en este navegador y no altera el Excel. ${orphan?`Hay ${orphan} observación(es) de elementos que no aparecen en esta versión del Excel, conservadas en el respaldo.`:''}</div>
 <section class="panel hierarchy-panel"><div class="panel-header"><h2>Árbol de seguimiento</h2><input id="search-filter" class="input search" placeholder="Buscar sistema, integración o endpoint…" value="${escape(query)}" aria-label="Buscar en el árbol"></div><div class="tree-list">${rows||'<div class="tree-empty">No hay sistemas que coincidan con la búsqueda.</div>'}</div></section>`;
}
function documentCell(raw){const value=String(raw||'').trim();
 if(/^https:\/\/drive\.google\.com\//i.test(value)||/^https:\/\/docs\.google\.com\//i.test(value))return `<a href="${escape(value)}" target="_blank" rel="noopener noreferrer" class="catalog-doclink">Abrir documento ↗</a>`;
 return escape(value||'No registrado');}
function availabilityCategory(value){const s=norm(value);if(/^\d{2}\/\d{2}\/\d{4}/.test(s))return 'fecha';if(s.includes('por definir'))return 'por-definir';if(s.includes('no informado'))return 'no-informado';return 'otro';}
function renderLaboralCatalog(){
 const v=el('view-integrations');
 const pairs=CATALOGO_FIJO.map(item=>({item,link:linkCatalogItem(item,hierarchy?.systems)}));
 const filtered=pairs.filter(({item,link})=>{
  if(catalogSearch&&!norm([item.nombre,item.disponibilidad,item.observacion,item.evaluacion,item.solicitud,item.datosPrueba,item.ambientes].join(' ')).includes(norm(catalogSearch)))return false;
  if(catalogObserved==='con'&&!item.observacion)return false;
  if(catalogObserved==='sin'&&item.observacion)return false;
  if(catalogAvailability!=='todos'&&availabilityCategory(item.disponibilidad)!==catalogAvailability)return false;
  if(catalogLinkFilter==='vinculadas'&&!link.system)return false;
  if(catalogLinkFilter==='sin-vincular'&&link.system)return false;
  return true;
 });
 const matched=pairs.filter(p=>!!p.link.system).length;
 const noteTotal=CATALOGO_FIJO.filter(i=>i.observacion).length;
 const viewSummary=`<div class="catalog-summary"><div><strong>${CATALOGO_FIJO.length}</strong><span>Integraciones del catálogo</span></div><div><strong>${noteTotal}</strong><span>Con observación en Sheet2</span></div><div><strong>${model?matched:'—'}</strong><span>Vinculadas al Excel técnico</span></div><div><strong>${model?CATALOGO_FIJO.length-matched:'—'}</strong><span>Sin asociación acreditada</span></div></div>`;
 const table=filtered.map(({item,link})=>{
  const open=catalogExpanded.has(item.numero), system=link.system;
  const note=!!item.observacion;
  const tech=system?`${system.integrations.filter(i=>i.matched).length} componentes · ${system.operationCount} operaciones (${system.routes} rutas)`:model?'No vinculado':'Sin sincronizar';
  const status=system?treeStatus(system.statusCounts):`<span class="muted">${model?'Sin asociación':'Pendiente Drive'}</span>`;
  const progress=system?progressCell(system):'<span class="muted">N/D</span>';
  const cols=`<tr class="catalog-main"><td><span class="catalog-id">${item.numero}</span></td><td><strong class="title-cell">${escape(item.nombre)}</strong><span class="col-secondary">${escape(item.fuente)}</span></td><td>${escape(item.disponibilidad||'No informado')}</td><td>${note?'<span class="badge badge-yellow">Con observación</span>':'<span class="badge badge-gray">Sin observación</span>'}</td><td><span class="catalog-metric">${tech}</span>${system?`<span class="col-secondary">${escape(link.reason)}${link.shared?' · Agrupación compartida PIDE':''}</span>`:''}</td><td>${status}</td><td>${progress}</td><td><button class="btn btn-light btn-sm" data-catalog-expand="${item.numero}" aria-expanded="${open}">${open?'Ocultar':'Ver detalle'} ${open?'▴':'▾'}</button></td></tr>`;
  if(!open)return cols;
  const details=`<tr class="catalog-detail-row"><td colspan="8"><div class="catalog-detail"><div class="catalog-detail-main"><h3>Observación del catálogo fijo</h3><p class="catalog-observation">${note?escape(item.observacion):'No hay observación registrada en Sheet2.'}</p><span class="helper">${escape(item.fuente)} · Información de referencia congelada</span></div><div class="catalog-detail-docs"><h3>Documentación y requisitos de Sheet2</h3><dl><dt>Evaluación de integraciones</dt><dd>${documentCell(item.evaluacion)}</dd><dt>Solicitud de usuario</dt><dd>${documentCell(item.solicitud)}</dd><dt>Datos de prueba (no mock)</dt><dd>${documentCell(item.datosPrueba)}</dd><dt>Ambientes para integración</dt><dd>${documentCell(item.ambientes)}</dd></dl></div><div class="catalog-tech-info"><h3>Relación con seguimiento técnico</h3><p>${escape(link.reason)}${system?` · ${escape(system.name)}`:''}. ${system?'El estado y el avance se obtienen del Excel Google, no del catálogo fijo.':'No se asignan endpoints ni estados por similitud de nombre.'}</p>${system?`<div class="catalog-tech-actions"><button class="btn btn-light btn-sm" data-catalog-system="${escape(system.id)}">Ver sistema y observaciones GTI/SOFTPLAN →</button><button class="btn btn-light btn-sm" data-catalog-endpoints="${escape(system.id)}">Ver endpoints asociados →</button></div>`:'<span class="helper">El registro se mantiene visible aunque no tenga correspondencia técnica.</span>'}</div></div></td></tr>`;
  return cols+details;
 }).join('');
 v.innerHTML=`${specialtyProgress()}<div class="actionline"><h2>Catálogo Laboral <span class="muted">(${filtered.length} de ${CATALOGO_FIJO.length})</span></h2><span class="badge badge-green">Catálogo fijo · Sheet2</span></div>${viewSummary}
 <div class="dynamics-notice"><b>Fuente fija:</b> Lista_Integraciones.xlsx → Sheet2 (36 registros). Se distribuye con el código y <b>no se modifica al actualizar Google</b>. La información de estados, endpoints y observaciones GTI/SOFTPLAN procede exclusivamente del Excel privado SOFTPLAN, cuando se ha cargado. Las equivalencias explícitas de nombres son indicativas y revisables.</div>
 <section class="panel data-panel"><div class="panel-header"><div class="catalog-filters"><input id="catalog-search" class="input search" placeholder="Buscar integración, disponibilidad u observación…" aria-label="Buscar catálogo" value="${escape(catalogSearch)}"><select id="catalog-observation-filter" class="select"><option value="todos" ${catalogObserved==='todos'?'selected':''}>Todas las observaciones</option><option value="con" ${catalogObserved==='con'?'selected':''}>Con observación</option><option value="sin" ${catalogObserved==='sin'?'selected':''}>Sin observación</option></select><select id="catalog-availability-filter" class="select"><option value="todos" ${catalogAvailability==='todos'?'selected':''}>Toda disponibilidad</option><option value="fecha" ${catalogAvailability==='fecha'?'selected':''}>Con fecha</option><option value="por-definir" ${catalogAvailability==='por-definir'?'selected':''}>Por definir</option><option value="no-informado" ${catalogAvailability==='no-informado'?'selected':''}>No informado</option><option value="otro" ${catalogAvailability==='otro'?'selected':''}>Otros estados</option></select><select id="catalog-link-filter" class="select"><option value="todos" ${catalogLinkFilter==='todos'?'selected':''}>Todas las asociaciones</option><option value="vinculadas" ${catalogLinkFilter==='vinculadas'?'selected':''}>Vinculadas al Excel técnico</option><option value="sin-vincular" ${catalogLinkFilter==='sin-vincular'?'selected':''}>Sin vínculo acreditado</option></select><button class="btn btn-light btn-sm" data-action="clear-catalog">Limpiar</button></div></div>
 <div class="table-wrap"><table class="table catalog-table"><thead><tr><th>N°</th><th>INTEGRACIÓN FIJA</th><th>DISPONIBILIDAD EN PRUEBAS</th><th>OBSERVACIÓN</th><th>COMPONENTES Y ENDPOINTS</th><th>ESTADO TÉCNICO</th><th>AVANCE*</th><th>DETALLE</th></tr></thead><tbody>${table||'<tr><td colspan="8">No hay integraciones que coincidan con esos filtros.</td></tr>'}</tbody></table></div></section><p class="helper">* Avance estimado por etapas del Excel «Sistemas»; no significa conformidad ni disponibilidad real. Si CONADIS y SUNAT se vinculan a PIDE, se muestran como dos filas distintas del catálogo.</p>`;
}


function renderIntegrations(){
 if(specialty==='laboral')return renderLaboralCatalog();
 return renderLegacyIntegrations();
}

function resolveTarget(targetId){if(!hierarchy)return null;
 for(const s of hierarchy.systems){if(s.id===targetId)return {scope:'system',name:s.name,context:'Sistema',node:s};for(const i of s.integrations){if(i.id===targetId)return {scope:'integration',name:i.name,context:`Sistema: ${s.name}`,node:i};for(const e of i.endpoints){if(endpointId(e)===targetId)return {scope:'endpoint',name:e.path,context:`${s.name} / ${i.name}`,node:e};}}}return null;
}
function fmtDate(date){const t=new Date(date);return Number.isNaN(t.getTime())?'Fecha no disponible':t.toLocaleString('es-PE');}
let noteTarget='';
function openObservationDrawer(id){const target=resolveTarget(id);if(!target){alertMsg('No se encontró el elemento asociado a la observación.','error');return;}
 noteTarget=id;drawerId=null;const own=directNotes(id).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const ownExcel=directExcelNotes(id);
 const descendants=target.scope==='endpoint'?[]:excelNotes.filter(n=>n.targetId!==id&&descendantIds(target.node).includes(n.targetId));
 const history=own.map(n=>`<article class="observation-item"><div class="observation-meta"><span class="badge ${n.status==='Resuelta'?'badge-green':n.status==='En seguimiento'?'badge-blue':'badge-yellow'}">${escape(n.status)}</span><span class="badge badge-gray">${escape(n.category||'Otra')}</span><span>${escape(fmtDate(n.createdAt))}</span></div><div class="observation-text">${escape(n.text)}</div><div class="observation-foot"><span>${escape(n.author||'Sin responsable indicado')}</span><div><button class="detail-button" data-note-status="${escape(n.id)}">${n.status==='Resuelta'?'Reabrir':n.status==='En seguimiento'?'Resolver':'Pasar a seguimiento'}</button><button class="detail-button note-delete" data-note-delete="${escape(n.id)}">Eliminar</button></div></div></article>`).join('');
 const inherited=`<section class="detail-section"><h3>Observaciones del Excel · ${ownExcel.length} en este nivel</h3><p class="helper">Lectura automática, sin edición. Referencia exacta de hoja y celda. El Excel no define necesariamente un estado para cada comentario.</p>${ownExcel.length?excelObservationCards(ownExcel):'<p class="note">No se registran observaciones directas en este nivel.</p>'}</section>${descendants.length?`<section class="detail-section"><details class="excel-descendants"><summary><b>${descendants.length} observaciones adicionales de niveles inferiores</b> · desplegar</summary>${excelObservationCards(descendants,350)}</details></section>`:''}`;
 let author='';try{author=localStorage.getItem('pj_integraciones_ultimo_autor')||'';}catch{}
 el('drawer-content').innerHTML=`<div class="drawer-inner"><div class="drawer-top"><div><div class="eyebrow">RETROALIMENTACIÓN · ${escape(target.scope.toUpperCase())}</div><h2>${escape(target.name)}</h2><p class="drawer-meta">${escape(target.context)}</p></div><button class="icon-button" data-action="close-drawer">✕</button></div><div class="notice"><b>Dos orígenes:</b> las observaciones documentadas por GTI, SOFTPLAN y las hojas de integración se leen del Excel y se actualizan al cargarlo. El seguimiento manual se guarda solo en este navegador; no modifica el Excel.</div>${inherited}<section class="detail-section"><h3>Añadir seguimiento manual</h3><form id="observation-form" class="observation-form"><label>Responsable / autor<input class="input" name="author" maxlength="120" value="${escape(author)}" placeholder="Opcional"></label><label>Clasificación<select class="select" name="category">${TYPES.map(t=>`<option value="${escape(t)}">${escape(t)}</option>`).join('')}</select></label><label>Estado<select class="select" name="status">${STATUS.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></label><label class="full">Descripción de la observación<textarea class="input" name="text" rows="4" maxlength="2500" required placeholder="Describe la brecha, evidencia, acuerdo o acción pendiente..."></textarea></label><button class="btn btn-primary" type="submit">Guardar observación</button></form></section><section class="detail-section"><h3>Seguimiento manual (${own.length})</h3>${history||'<p class="note">No se han registrado observaciones en este nivel.</p>'}</section></div>`;
 el('drawer-backdrop').classList.remove('hidden');el('details-drawer').classList.remove('hidden');
}
function saveNoteState(next){try{saveObservations(next);notes=next;return true;}catch{alertMsg('No se pudieron guardar observaciones en este navegador. Descarga un respaldo JSON y comprueba el espacio disponible.','error');return false;}}
function createNote(form){if(!noteTarget)return;const text=String(form.get('text')||'').trim();if(!text||text.length>2500){alertMsg('La observación debe incluir una descripción de hasta 2500 caracteres.','error');return;}
 const author=String(form.get('author')||'').trim().slice(0,120);const now=new Date().toISOString();const target=resolveTarget(noteTarget);if(!target)return;
 const n={id:crypto.randomUUID(),scope:target.scope,targetId:noteTarget,text,author,category:TYPES.includes(form.get('category'))?form.get('category'):'Otra',status:STATUS.includes(form.get('status'))?form.get('status'):'Abierta',createdAt:now,updatedAt:now};
 if(saveNoteState([...notes,n])){try{localStorage.setItem('pj_integraciones_ultimo_autor',author);}catch{}render();openObservationDrawer(noteTarget);alertMsg('Observación guardada localmente. Exporta un respaldo JSON para compartirla con otros responsables.');}
}
function toggleNote(id){const n=notes.find(x=>x.id===id);if(!n)return;const status=n.status==='Abierta'?'En seguimiento':n.status==='En seguimiento'?'Resuelta':'Abierta';const next=notes.map(x=>x.id===id?{...x,status,updatedAt:new Date().toISOString()}:x);if(saveNoteState(next)){render();openObservationDrawer(noteTarget);}}
function removeNote(id){if(!confirm('¿Eliminar esta observación local? No podrás recuperarla sin un respaldo.'))return;const next=notes.filter(n=>n.id!==id);if(saveNoteState(next)){render();openObservationDrawer(noteTarget);}}
function exportNotes(){const payload={schema:'pj-observaciones-v2',exportedAt:new Date().toISOString(),source:currentSource,observations:notes};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='observaciones_integraciones_PJ.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
async function importNotes(file){try{if(file.size>4*1024*1024)throw new Error('El respaldo supera el límite de 4 MB.');const json=JSON.parse(await file.text());const next=mergeObservationBackup(notes,json);if(saveNoteState(next)){render();alertMsg(`Respaldo importado: ${next.length} observaciones disponibles. Se conservaron registros preexistentes.`);}}catch(e){alertMsg('No se pudo importar el respaldo: '+e.message,'error');}}

function render(){refreshSpecialtyUI();if(activeTab==='tactical')renderTactical();if(activeTab==='vias')renderVias();if(activeTab==='activity-flow')renderActivityFlow();if(activeTab==='documents')renderDocumentCatalog();if(activeTab==='systems')renderSystems();if(activeTab==='overview')renderOverview();if(activeTab==='integrations')renderIntegrations();if(activeTab==='endpoints')renderEndpoints();if(activeTab==='technical')renderTechnical();}
function inspectIntegration(name){integrationFilter=name;systemFilter='';technicalIntegrationFilter='';query='';stateFilter='';equivFilter='';switchTab('endpoints');const ids=(model?.endpoints||[]).filter(e=>norm(e.integration)===norm(name));if(!ids.length)alertMsg(`${name}: no tiene endpoints/operaciones documentados en las hojas de detalle.`, 'error');}
function showComponents(name){const i=groups().find(x=>norm(x.name)===norm(name));if(!i)return;
 const rows=i.components.map(c=>`<tr><td><strong>${escape(c.component)}</strong><span class="col-secondary">${escape(c.componentType||'Tipo no indicado')}</span></td><td>${statusBadge(c.status)}<span class="col-secondary">${escape(c.rawStatus||'Sin estado')}</span></td><td>${escape(c.owner||'No indicado')}</td><td>${escape(c.attention||'No indicado')}</td><td>${escape(c.dependency||'No indicada')}</td><td>${escape(c.glpi||'—')}</td><td>${c.observationsGTI?`<span class="col-secondary">${escape(trim(c.observationsGTI,160))}</span><span class="col-secondary">Sistemas!N${c.row}</span>`:'—'}</td><td>${c.observationsSoftplan?`<span class="col-secondary">${escape(trim(c.observationsSoftplan,160))}</span><span class="col-secondary">Sistemas!O${c.row}</span>`:'—'}</td><td>Sistemas!${c.row}</td></tr>`).join('');
 el('drawer-content').innerHTML=`<div class="drawer-inner"><div class="drawer-top"><div><div class="eyebrow">HOJA SISTEMAS · SEGUIMIENTO</div><h2>${escape(i.name)}</h2><div class="drawer-meta">${i.components.length} registros de componentes · ${i.endpoints.length} endpoints/operaciones vinculadas</div></div><button class="icon-button" data-action="close-drawer">✕</button></div><div class="detail-grid"><div class="detail-stat"><span>Etapas registradas</span><strong>${escape(i.status)}</strong></div><div class="detail-stat"><span>Avance estimado</span><strong>${i.progress==null?'N/D':i.progress+' %'}</strong></div></div><div class="notice">Este avance es un promedio referencial de etapas de adecuación, no porcentaje de pruebas superadas. Los datos están vinculados a la hoja Sistemas por número de fila.</div><section class="detail-section"><h3>Componentes y responsables</h3>${rows?`<div class="table-wrap"><table class="table"><thead><tr><th>COMPONENTE</th><th>ESTADO</th><th>ENCARGADO</th><th>ATENDERÁ</th><th>DEPENDENCIA</th><th>GLPI</th><th>OBS. GTI</th><th>OBS. SOFTPLAN</th><th>REFERENCIA</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="note">La hoja Sistemas no registra componentes para esta integración; por eso el avance figura N/D.</p>'}</section></div>`;
 el('details-drawer').classList.remove('hidden');el('drawer-backdrop').classList.remove('hidden');
}
function showDrawer(id){const e=model?.endpoints.find(x=>x.id===id);if(!e)return;drawerId=id;const attrs=e.attributes;const aRows=attrs.slice(0,350).map(a=>`<tr><td><strong>${escape(a.field)}</strong><span class="col-secondary">${escape(a.type)}</span></td><td><span class="attr-direction">${escape(a.direction||'—')}</span></td><td>${escape(a.api||a.legacy||'—')}</td><td>${escape(trim(a.match||'No evaluado',55))}${a.note?`<span class="col-secondary" title="${escape(a.note)}">${escape(trim(a.note,70))}</span>`:''}</td></tr>`).join('');
 el('drawer-content').innerHTML=`<div class="drawer-inner"><div class="drawer-top"><div><div class="eyebrow">FICHA TÉCNICA · ENDPOINT</div><h2>${escape(e.path)}</h2><div class="drawer-meta">${escape(e.integration)} · ${escape(e.component)}<br>${escape(e.kind)}</div></div><button class="icon-button" data-action="close-drawer">✕</button></div>
 <div class="detail-grid"><div class="detail-stat"><span>Estado del seguimiento</span><strong>${escape(e.sourceStatus)}</strong></div><div class="detail-stat"><span>Equivalencia reportada</span><strong>${escape(e.equivalent)}</strong></div><div class="detail-stat"><span>Atributos extraídos</span><strong>${e.attributeTotal} <span class="muted">(${e.attrConflicts} observaciones)</span></strong></div><div class="detail-stat"><span>Apariciones en el archivo</span><strong>${e.occurrences}</strong></div></div>
 <div class="notice">El estado proviene de ${escape(e.statusOrigin)}. Los atributos inferidos de esquemas deben confirmarse con los contratos API.</div>
 ${e.legacyMethods.length?`<section class="detail-section"><h3>Método(s) legado(s)</h3>${e.legacyMethods.map(x=>`<p class="note">${escape(x)}</p>`).join('')}</section>`:''}
 <section class="detail-section"><h3>Equivalencia del endpoint</h3><p class="note">${escape(e.equivalent)}${e.equivalentList.length>1?`<br>Otras equivalencias registradas: ${escape(e.equivalentList.join(' · '))}`:''}</p></section>
 <section class="detail-section"><h3>Resumen de atributos <span class="muted">(${attrs.length})</span></h3>${aRows?`<div class="table-wrap"><table class="attributes-table"><colgroup><col style="width:27%"><col style="width:10%"><col style="width:28%"><col style="width:35%"></colgroup><thead><tr><th>ATRIBUTO / TIPO</th><th>IN/OUT</th><th>EQUIVALENCIA</th><th>ESTADO / OBSERVACIÓN</th></tr></thead><tbody>${aRows}</tbody></table>${attrs.length>350?`<p class="helper">Mostrando los primeros 350 atributos.</p>`:''}</div>`:'<div class="note">El Excel no contiene un desglose verificable de atributos para esta operación.</div>'}</section>
 ${directExcelNotes(endpointId(e)).length?`<section class="detail-section"><h3>Observaciones importadas del Excel (${excelCount(endpointId(e))})</h3>${excelObservationCards(directExcelNotes(endpointId(e)),20)}</section>`:''}
 <section class="detail-section"><h3>Retroalimentación del endpoint</h3><button class="btn btn-primary btn-sm" data-observe="${escape(endpointId(e))}">Revisar ${excelCount(endpointId(e))} del Excel y ${noteCount(endpointId(e))} de seguimiento</button></section><section class="detail-section"><h3>Trazabilidad al documento</h3>${e.sources.slice(0,25).map(s=>`<span class="badge badge-gray" style="margin:0 5px 6px 0">${escape(s)}</span>`).join('')}${e.sources.length>25?`<p class="helper">Y ${e.sources.length-25} referencias adicionales en el archivo original.</p>`:''}</section></div>`;
 el('details-drawer').classList.remove('hidden');el('drawer-backdrop').classList.remove('hidden');}
function closeDrawer(){el('details-drawer').classList.add('hidden');el('drawer-backdrop').classList.add('hidden');drawerId=null;}
function csvEscape(s){let value=String(s??'');if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';}
function exportCSV(type){if(!model)return;let header,rows,name;
 if(type==='observations'){
 header=['Nivel','Sistema','Integración técnica','Endpoint / operación','Origen / responsable','Atributo','Referencia Excel','Observación'];
 rows=excelNotes.filter(n=>visibleSystems().some(s=>descendantIds(s).includes(n.targetId))).map(n=>{const t=resolveTarget(n.targetId);const scope=t?.scope||n.scope;const e=scope==='endpoint'?t.node:null;const i=scope==='integration'?t.node:e?(hierarchy?.integrations||[]).find(c=>c.id===e.technicalIntegrationId):null;const sys=scope==='system'?t.node.name:i?.system||e?.integration||'';return [scope,sys,i?.name||'',e?.path||'',n.author,n.field,n.source,n.text];});name='observaciones_excel_pj.csv';
 }else if(type==='integrations'){
 header=['Sistema','Integracion tecnica / componente','Asociacion','Estado por componente','Avance referencial (%)','Componentes evaluados','Total componentes','Rutas API','Operaciones sin ruta','Atributos','Observaciones Excel','Seguimiento abierto'];rows=(hierarchy?.integrations||[]).filter(i=>visibleSystemIds().has(i.systemId)).map(i=>[i.system,i.name,i.matched?'Vinculada por Sistemas':'Pendiente de asociación',Object.entries(i.statusCounts).map(([k,v])=>k+': '+v).join(' / '),i.progress??'N/D',i.progressCoverage,i.progressTotal,i.routes,i.endpoints.length-i.routes,i.attributes,excelCount(i.id),noteOpen(i.id)]);name='integraciones_tecnicas.csv';
 }else if(type==='attributes'){
 header=['Integracion','Componente','Endpoint u operacion','Atributo','Direccion','Tipo','Campo legado','Campo API','Evaluacion','Observacion','Referencia'];rows=visibleEndpoints().flatMap(e=>e.attributes.map(a=>[e.integration,e.component,e.path,a.field,a.direction,a.type,a.legacy,a.api,a.match,a.note,a.source]));name='integraciones_atributos.csv';
 }else{
 header=['Sistema','Integracion tecnica','Componente fuente','Endpoint u operacion','Clasificacion','Equivalente','Estado','Fuente del estado','Atributos','Conflictos','Observaciones Excel','Seguimiento abierto','Referencia Excel'];rows=visibleEndpoints().map(e=>[e.integration,(hierarchy?.integrations||[]).find(i=>i.id===e.technicalIntegrationId)?.name||'Pendiente de asociación',e.component,e.path,e.kind,e.equivalent,e.sourceStatus,e.statusOrigin,e.attributeTotal,e.attrConflicts,excelCount(endpointId(e)),noteOpen(endpointId(e)),e.sources.join('; ')]);name='integraciones_endpoints.csv';
 }
 const csv='\ufeff'+[header,...rows].map(r=>r.map(csvEscape).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>switchTab(n.dataset.tab)));
 el('load-button').addEventListener('click',openImport);el('refresh-now').addEventListener('click',refreshGoogle);el('close-import').addEventListener('click',closeImport);
 el('import-modal').addEventListener('click',e=>{if(e.target===el('import-modal'))closeImport();});
 el('file-input').addEventListener('change',e=>{loadFile(e.target.files?.[0]);e.target.value='';});
 const drop=el('drop-zone');['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragging');}));['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragging');}));drop.addEventListener('drop',e=>loadFile(e.dataTransfer?.files?.[0]));
 document.querySelectorAll('.source-tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.source-tab').forEach(b=>b.classList.toggle('active',b===t));el('pane-file').classList.toggle('hidden',t.dataset.source!=='file');el('pane-drive').classList.toggle('hidden',t.dataset.source!=='drive');}));
 el('drive-public').addEventListener('click',loadPublicDrive);el('tactical-private').addEventListener('click',()=>loadTacticalPrivate());el('tactical-file').addEventListener('change',e=>{loadTacticalFile(e.target.files?.[0]);e.target.value='';});el('drive-private').addEventListener('click',loadPrivateDrive);el('auto-refresh').addEventListener('change',configureRefresh);
 el('drive-url').value=DEFAULT_GOOGLE_URL||sessionStorage.getItem('drive-url')||'';currentDriveUrl=el('drive-url').value;el('auto-refresh').checked=!!DEFAULT_GOOGLE_URL;
 if(PRIVATE_GOOGLE_SOURCE){
  // Seleccionar Google Drive como pestaña inicial y mantener acceso anonimo fuera del flujo.
  const tab=document.querySelector('.source-tab[data-source="drive"]');if(tab)tab.click();
  el('drive-public').classList.add('hidden');
  el('source-pill').textContent='Drive privado · falta autorizacion';
  el('import-status').textContent='Documento privado: pulsa «Autorizar y leer privado» para iniciar sesion con Google.';
  el('drive-info').textContent='Fuente privada configurada. No se enviaran solicitudes anonimas a /api/drive. El acceso requiere tu cuenta autorizada y su consentimiento OAuth.';
 }
 refreshSpecialtyUI();
 el('drawer-backdrop').addEventListener('click',closeDrawer);
 document.body.addEventListener('click',e=>{
  const a=e.target.closest('[data-action]');if(a){const type=a.dataset.action;if(type==='open-import')openImport();else if(type==='incidents-refresh')loadIncidentsForDocument(activeDocument());else if(type==='incidents-auth')authorizeIncidents();else if(type==='incidents-new'){incidentCreateOpen=!incidentCreateOpen;incidentEditingId='';documentActionFeedback=null;renderDocumentCatalog();if(incidentCreateOpen)el('incident-create-form')?.querySelector('[name=title]')?.focus({preventScroll:true});}else if(type==='incident-edit'){incidentEditingId=incidentEditingId===a.dataset.incidentId?'':a.dataset.incidentId;incidentCreateOpen=false;documentActionFeedback=null;renderDocumentCatalog();}else if(type==='docs-refresh')loadDocumentsPrivate();else if(type==='docs-clear'){documentQuery='';documentStateFilter='';documentTypeFilter='';documentSpecialtyFilter='';documentOwnerFilter='';renderDocumentCatalog();}else if(type==='docs-close-detail'){documentSelectedId='';incidentCode='';incidentError='';documentActionFeedback=null;incidentCreateOpen=false;incidentDraft={};documentReviewDraft=null;documentReview=null;documentReviewHistory=[];incidentEditingId='';renderDocumentCatalog();}else if(type==='docs-config'){documentConfigOpen=!documentConfigOpen;renderDocumentCatalog();}else if(type==='docs-map-apply')applyDocumentMapping();else if(type==='docs-map-auto'){documentColumnMapping=null;if(documentSheets)receiveDocumentCatalog(documentSheets,documentOrigin);documentConfigOpen=!!documentError;renderDocumentCatalog();}else if(type==='tab-integrations')switchTab('integrations');else if(type==='tactical-refresh')loadTacticalPrivate();else if(type==='vias-refresh')loadTacticalPrivate();else if(type==='activity-refresh')loadTacticalPrivate();else if(type==='flow-expand'){const v=activityFlowData?.vias.find(v=>v.name===activitySelected);if(v)flowOpenedSteps=new Set(v.steps.map(s=>s.id));renderActivityFlow();}else if(type==='flow-collapse'){flowOpenedSteps=new Set();flowOpenedActivities=new Set();renderActivityFlow();}else if(type==='via-config-toggle'){viaConfigOpen=!viaConfigOpen;renderVias();}else if(type==='via-mapping-auto'){viaColumnMapping=null;viasData=viaRawSheets?parseVias(viaRawSheets,tacticalData):null;viaConfigOpen=!!viasData?.error;renderVias();}else if(type==='vias-export-one')exportViaSlides(false);else if(type==='vias-export-all')exportViaSlides(true);else if(type==='tactical-export')exportTacticalPpt();else if(type==='tactical-secondary'){tacticalSecondaryOpen=!tacticalSecondaryOpen;renderTactical();}else if(type==='tactical-clear'){tacticalStateFilter='Todos';tacticalCategoryFilter='todas';tacticalQuery='';renderTactical();}else if(type==='clear-catalog'){catalogSearch='';catalogObserved='todos';catalogAvailability='todos';catalogLinkFilter='todos';render();}else if(type==='tab-systems')switchTab('systems');else if(type==='clear-filters'){query='';stateFilter='';equivFilter='';integrationFilter='';systemFilter='';technicalIntegrationFilter='';page=1;render();}else if(type==='close-drawer')closeDrawer();else if(type==='export-notes')exportNotes();else if(type==='import-notes')el('notes-import').click();return;}
  const docSelect=e.target.closest('[data-document-select]');if(docSelect){const nextId=docSelect.dataset.documentSelect;const wasOpen=nextId===documentSelectedId;documentSelectedId=wasOpen?'':nextId;documentActionFeedback=null;incidentCreateOpen=!wasOpen;incidentDraft={};documentReviewDraft=null;documentReview=null;documentReviewHistory=[];incidentEditingId='';incidentAuthorized=false;incidentCode='';renderDocumentCatalog();if(!wasOpen)loadIncidentsForDocument(activeDocument());return;}
  const fstep=e.target.closest('[data-flow-step]');if(fstep){const id=fstep.dataset.flowStep;flowOpenedSteps.has(id)?flowOpenedSteps.delete(id):flowOpenedSteps.add(id);renderActivityFlow();return;}
  const fact=e.target.closest('[data-flow-activity]');if(fact){const id=fact.dataset.flowActivity;flowOpenedActivities.has(id)?flowOpenedActivities.delete(id):flowOpenedActivities.add(id);renderActivityFlow();return;}
  const tk=e.target.closest('[data-tactical-status]');if(tk){tacticalStateFilter=tacticalStateFilter===tk.dataset.tacticalStatus?'Todos':tk.dataset.tacticalStatus;renderTactical();return;}
  const tr=e.target.closest('[data-tactical-toggle]');if(tr){const id=tr.dataset.tacticalToggle;tacticalOpened.has(id)?tacticalOpened.delete(id):tacticalOpened.add(id);renderTactical();return;}
  const catalogRow=e.target.closest('[data-catalog-expand]');if(catalogRow){const n=Number(catalogRow.dataset.catalogExpand);catalogExpanded.has(n)?catalogExpanded.delete(n):catalogExpanded.add(n);render();return;}
  const catalogSystem=e.target.closest('[data-catalog-system]');if(catalogSystem){const id=catalogSystem.dataset.catalogSystem;expandedSystems.add(id);query='';switchTab('systems');return;}
  const catalogEndpoints=e.target.closest('[data-catalog-endpoints]');if(catalogEndpoints){systemFilter=catalogEndpoints.dataset.catalogEndpoints;technicalIntegrationFilter='';integrationFilter='';query='';stateFilter='';equivFilter='';switchTab('endpoints');return;}
  const sys=e.target.closest('[data-system-expand]');if(sys){const id=sys.dataset.systemExpand;expandedSystems.has(id)?expandedSystems.delete(id):expandedSystems.add(id);render();return;}
  const ing=e.target.closest('[data-tech-expand]');if(ing){const id=ing.dataset.techExpand;expandedIntegrations.has(id)?expandedIntegrations.delete(id):expandedIntegrations.add(id);render();return;}
  const navigate=e.target.closest('[data-tech-endpoints]');if(navigate){systemFilter=navigate.dataset.targetSystem;technicalIntegrationFilter=navigate.dataset.techEndpoints;integrationFilter='';query='';stateFilter='';equivFilter='';switchTab('endpoints');return;}
  const observe=e.target.closest('[data-observe]');if(observe){openObservationDrawer(observe.dataset.observe);return;}
  const statusBtn=e.target.closest('[data-note-status]');if(statusBtn){toggleNote(statusBtn.dataset.noteStatus);return;}
  const deleteBtn=e.target.closest('[data-note-delete]');if(deleteBtn){removeNote(deleteBtn.dataset.noteDelete);return;}
  const i=e.target.closest('[data-integration]');if(i){inspectIntegration(i.dataset.integration);return;}
  const tech=e.target.closest('[data-technical]');if(tech){technicalFilter=tech.dataset.technical;switchTab('technical');return;}
  const comp=e.target.closest('[data-components]');if(comp){showComponents(comp.dataset.components);return;}
  const ep=e.target.closest('[data-endpoint]');if(ep){showDrawer(ep.dataset.endpoint);return;}
  const ex=e.target.closest('[data-export]');if(ex){exportCSV(ex.dataset.export);return;}
  const p=e.target.closest('[data-page]');if(p){page+=p.dataset.page==='next'?1:-1;render();return;}
 });
 document.body.addEventListener('input',e=>{if(e.target.closest?.('#document-review-form')){documentReviewDraft=Object.fromEntries(new FormData(e.target.form).entries());return;}if(e.target.closest?.('#incident-create-form')){incidentDraft=Object.fromEntries(new FormData(e.target.form).entries());return;}if(e.target.id==='document-search'){documentQuery=e.target.value;const pos=e.target.selectionStart;renderDocumentCatalog();const next=el('document-search');if(next){next.focus();next.setSelectionRange(pos,pos);}return;} if(e.target.id==='tactical-search'){tacticalQuery=e.target.value;const position=e.target.selectionStart;renderTactical();const input=el('tactical-search');input?.focus();try{input?.setSelectionRange(position,position);}catch{}return;}if(e.target.id==='catalog-search'){catalogSearch=e.target.value;const position=e.target.selectionStart;render();const target=el('catalog-search');target?.focus();try{target?.setSelectionRange(position,position);}catch{}return;}if(e.target.id==='search-filter'){query=e.target.value;page=1;const start=e.target.selectionStart;render();const next=el('search-filter');next?.focus();try{next?.setSelectionRange(start,start);}catch{}}});
 document.body.addEventListener('submit',e=>{if(e.target?.id==='via-column-form'){e.preventDefault();applyViaMapping(e.target);}else if(e.target?.id==='document-review-form'){e.preventDefault();saveDocumentReview(e.target);}else if(e.target?.id==='incident-create-form'){e.preventDefault();saveIncident(e.target,'create');}else if(e.target?.matches('[data-incident-update]')){e.preventDefault();saveIncident(e.target,'update');}else if(e.target?.matches('[data-incident-comment]')){e.preventDefault();saveIncident(e.target,'comment');}});
 document.body.addEventListener('change',e=>{if(e.target.closest?.('#document-review-form')){documentReviewDraft=Object.fromEntries(new FormData(e.target.form).entries());return;}if(e.target.closest?.('#incident-create-form')){incidentDraft=Object.fromEntries(new FormData(e.target.form).entries());return;}if(e.target.id==='document-local-file'){loadDocumentFile(e.target.files?.[0]);e.target.value='';return;}if(e.target.id==='document-status'){documentStateFilter=e.target.value;renderDocumentCatalog();return;}if(e.target.id==='document-type'){documentTypeFilter=e.target.value;renderDocumentCatalog();return;}if(e.target.id==='document-specialty'){documentSpecialtyFilter=e.target.value;renderDocumentCatalog();return;}if(e.target.id==='document-owner'){documentOwnerFilter=e.target.value;renderDocumentCatalog();return;}if(e.target.id==='flow-via'){activitySelected=e.target.value;flowOpenedSteps=new Set();flowOpenedActivities=new Set();renderActivityFlow();return;}if(e.target.id==='flow-severity'){activitySeverity=e.target.value;renderActivityFlow();return;}if(e.target.id==='via-filter'){viaSelected=e.target.value;renderVias();return;}if(e.target.id==='via-severity'){viaSeverity=e.target.value;renderVias();return;}if(e.target.id==='tactical-category-filter'){tacticalCategoryFilter=e.target.value;tacticalStateFilter='Todos';tacticalOpened=new Set();renderTactical();return;}if(e.target.id==='specialty-filter'){specialty=e.target.value==='laboral'?'laboral':'todas';page=1;query='';stateFilter='';equivFilter='';integrationFilter='';systemFilter='';technicalIntegrationFilter='';technicalFilter='';catalogSearch='';catalogObserved='todos';catalogAvailability='todos';catalogLinkFilter='todos';closeDrawer();refreshSpecialtyUI();render();return;}if(e.target.id==='catalog-observation-filter'){catalogObserved=e.target.value;render();return;}if(e.target.id==='catalog-availability-filter'){catalogAvailability=e.target.value;render();return;}if(e.target.id==='catalog-link-filter'){catalogLinkFilter=e.target.value;render();return;}if(e.target.id==='status-filter'){stateFilter=e.target.value;page=1;render();}if(e.target.id==='equiv-filter'){equivFilter=e.target.value;page=1;render();}if(e.target.id==='integration-filter'){integrationFilter=e.target.value;page=1;render();}if(e.target.id==='system-filter'){systemFilter=e.target.value;integrationFilter='';technicalIntegrationFilter='';page=1;render();}if(e.target.id==='technical-integration-filter'){technicalIntegrationFilter=e.target.value;integrationFilter='';page=1;render();}if(e.target.id==='technical-filter'){technicalFilter=e.target.value;render();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeImport();}});
 render();
 if(DEFAULT_GOOGLE_URL&&!PRIVATE_GOOGLE_SOURCE&&CONFIG_SOURCE.autoLoad!==false)queueMicrotask(()=>loadPublicDrive());
}
init();
