/** V1.15.5 · Sincronización única de las fuentes de importación; vistas operativas leen Neon. */
import {SYNC_MODULES,locateSheet,makeSheetSnapshot,validateSheetSnapshot} from '../../shared/sync/sincronizacion-modelo.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v||0).toLocaleString('es-PE');
const date=v=>v?new Date(v).toLocaleString('es-PE'):'Sin importaciones';
export function syncSourceFor(moduleId,{tacticalSheets,documentSheets,tacticalOrigin,documentOrigin}){
 if(moduleId==='documentos_clave'||moduleId==='bitacora_documentos_clave'){
  if(locateSheet(documentSheets,moduleId))return {sheets:documentSheets,origin:documentOrigin||'Catálogo cargado'};
  if(locateSheet(tacticalSheets,moduleId))return {sheets:tacticalSheets,origin:tacticalOrigin||'Libro táctico'};
  return null;
 }
 return locateSheet(tacticalSheets,moduleId)?{sheets:tacticalSheets,origin:tacticalOrigin||'Libro táctico'}:null;
}
export function renderSyncView({status,loading=false,feedback={},available={},docMigrationStatus=null,tacticalMigrationStatus=null,viaMigrationStatus=null,flowMigrationStatus=null,trackingMigrationStatus=null}={}){
 const moduleStates=status?.modules||[];
 const controls=SYNC_MODULES.map(m=>{
  const source=available[m.id];
  const current=moduleStates.find(x=>x.id===m.id);
  const latest=current?.lastBatch;
  const notice=feedback[m.id];
  const ready=!!source;
  const isDocs=m.id==='documentos_clave';
  const docs=docMigrationStatus;
  const isTactical=m.id==='resumen_tactico',tact=tacticalMigrationStatus;
  const isVia=m.id==='integraciones_via',via=viaMigrationStatus;
  const isFlow=m.id==='flujo_actividades',flow=flowMigrationStatus;
  const isTracking=m.id==='bitacora_documentos_clave',tracking=trackingMigrationStatus;
  const tacticalControls=isTactical?`<div class="sync-doc-controls">
   <strong>V1.15.2 · Publicación del Resumen táctico</strong>
   <p>Fuente de lectura: <b>${tact?.activeSource==='neon'?'Neon habilitado':'Google Sheets'}</b> · ${tact?.activeCount??0} integraciones publicadas en Neon.
    ${tact?.latestBatch?`Última copia: ${esc(date(tact.latestBatch.imported_at))}`:'Importa primero la hoja Seguimiento.'}</p>
   <div class="sync-actions">
    <button class="btn btn-light btn-sm" data-action="sync-tactical-preview" ${!tact?.latestBatch||!ready||loading?'disabled':''}>Cotejar Resumen táctico</button>
    <button class="btn btn-primary btn-sm" data-action="sync-tactical-publish" ${!tact?.preview?.canPublish||!ready||loading?'disabled':''}>Publicar Resumen en Neon</button>
   </div>
   <small>Solo filas 1–36. Los historiales extensos de G se preservan. La severidad Crítica exige relleno verde en L. La lectura operativa permanece en Neon.</small>
  </div>`:'';
  const viaControls=isVia?`<div class="sync-doc-controls">
   <strong>V1.15.3 · Publicación de Integraciones por vía</strong>
   <p>Fuente: <b>${via?.activeSource==='neon'?'Neon habilitado':'Google Sheets'}</b> · ${via?.activeCount??0} asociaciones en Neon.
    ${via?.stale?'<b>Atención: el Resumen táctico cambió; vuelve a cotejar las vías.</b>':''}
    ${via?.latestBatch?`Última copia: ${esc(date(via.latestBatch.imported_at))}`:'Importa primero IntegracionesEtapa.'}</p>
   <div class="sync-actions">
    <button class="btn btn-light btn-sm" data-action="sync-via-preview" ${!via?.latestBatch||!ready||loading?'disabled':''}>Cotejar integraciones por vía</button>
    <button class="btn btn-primary btn-sm" data-action="sync-via-publish" ${!via?.preview?.canPublish||!ready||loading?'disabled':''}>Publicar vías en Neon</button>
   </div>
   <small>Conserva el orden de las vías y etapas, las asociaciones únicas, sus estados y los filtros/PPT existentes. Las publicaciones se gestionan exclusivamente aquí.</small>
  </div>`:'';
  const flowControls=isFlow?`<div class="sync-doc-controls">
   <strong>V1.15.4 · Publicación del Flujo de actividades</strong>
   <p>Fuente: <b>${flow?.activeSource==='neon'?'Neon habilitado':'Google Sheets'}</b> · ${flow?.activityCount??0} actividades · ${flow?.linkCount??0} vínculos.
    ${flow?.stale?'<b>Atención: cambió el Resumen táctico, debes cotejar y publicar de nuevo.</b>':''}
    ${flow?.latestBatch?`Última copia: ${esc(date(flow.latestBatch.imported_at))}`:'Importa EtapaActividadIntegracion antes de publicar.'}</p>
   <div class="sync-actions">
    <button class="btn btn-light btn-sm" data-action="sync-flow-preview" ${!flow?.latestBatch||!ready||loading?'disabled':''}>Cotejar Flujo de actividades</button>
    <button class="btn btn-primary btn-sm" data-action="sync-flow-publish" ${loading?'disabled':''} title="Actualiza Drive, coteja y muestra cualquier requisito antes de publicar">Comprobar y publicar flujo en Neon</button>
   </div>
   <small>${!ready?'Carga primero EtapaActividadIntegracion desde Google Drive privado.':!flow?.latestBatch?'Falta guardar una copia preliminar de EtapaActividadIntegracion en Neon.':!flow?.sourceTacticalReady?'Debes mantener publicado el Resumen táctico en Neon.':'Publicar comprueba nuevamente el archivo de Drive, la copia guardada y la equivalencia del flujo antes de solicitar confirmación.'} Respeta las actividades sin integración y los filtros de severidad.</small>
  </div>`:'';
  const docsControls=isDocs?`<div class="sync-doc-controls">
   <strong>V1.15.1 · Publicación controlada de Documentos Clave</strong>
   <p>Catálogo en Neon: <b>${docs?.activeSource==='neon'?'Publicado':'Sin activar'}</b> · ${docs?.activeCount??0} documentos activos.
    ${docs?.latestBatch?`Última copia: ${esc(date(docs.latestBatch.imported_at))}`:'No hay copia guardada.'}</p>
   <div class="sync-actions">
    <button class="btn btn-light btn-sm" data-action="sync-docs-preview" ${!docs?.latestBatch||loading?'disabled':''}>Cotejar catálogo</button>
    <button class="btn btn-primary btn-sm" data-action="sync-docs-publish" ${!docs?.latestBatch||loading||!ready?'disabled':''}>Publicar en Neon</button>
   </div>
   <small>La publicación exige una copia actual idéntica a la última importación. No elimina incidencias ni revisiones.</small>
  </div>`:'';
  const trackingControls=isTracking?`<div class="sync-doc-controls"><strong>Seguimiento documental · hoja B:I</strong><p>${tracking?.total??0} anotaciones registradas. Mantiene el historial; no duplica filas al sincronizar de nuevo.</p><div class="sync-actions"><button class="btn btn-light btn-sm" data-action="sync-tracking-preview" ${!latest||loading?'disabled':''}>Cotejar bitácora</button><button class="btn btn-primary btn-sm" data-action="sync-tracking-publish" ${!latest||loading?'disabled':''}>Publicar bitácora</button></div><small>Los registros importados permanecen como historial, incluso si cambian las filas del origen. Los estados heredados no catalogados se conservan para revisión.</small></div>`:'';
  return `<article class="sync-card" data-sync-module="${m.id}">
    <div class="sync-card-title"><div><h3>${esc(m.label)}</h3><span>${esc(m.sheet)}</span></div><span class="sync-origin">${(isDocs&&docs?.activeSource==='neon')||(isTactical&&tact?.activeSource==='neon')||(isVia&&via?.activeSource==='neon')||(isFlow&&flow?.activeSource==='neon')?'Neon publicado · lectura operativa':'Pendiente de publicación'}</span></div>
    <p>${ready?`Disponible en memoria: <strong>${esc(source.origin)}</strong>`:'Hoja pendiente de cargar desde las fuentes existentes.'}</p>
    <div class="sync-card-meta"><div><span>Última copia Neon</span><strong>${esc(date(latest?.importedAt))}</strong></div><div><span>Filas guardadas</span><strong>${latest?n(latest.rowCount):'—'}</strong></div></div>
    <div class="sync-actions">
     <button class="btn btn-light btn-sm" data-action="sync-validate" data-sync-module="${m.id}" ${!ready||loading?'disabled':''}>Validar</button>
     <button class="btn btn-light btn-sm" data-action="sync-compare" data-sync-module="${m.id}" ${!ready||loading?'disabled':''}>Comparar</button>
     <button class="btn btn-primary btn-sm" data-action="sync-stage" data-sync-module="${m.id}" ${!ready||loading?'disabled':''}>Guardar copia en Neon</button>
     <button class="btn btn-light btn-sm" data-action="sync-history" data-sync-module="${m.id}" ${loading?'disabled':''}>Historial</button>
    </div>
    ${docsControls}${tacticalControls}${viaControls}${flowControls}${trackingControls}
    ${notice?`<div class="sync-feedback ${notice.error?'sync-feedback-error':'sync-feedback-ok'}" role="status"><strong>${esc(notice.title)}</strong><p>${esc(notice.message)}</p>${notice.details?`<div class="sync-details">${esc(notice.details)}</div>`:''}${notice.list?.length?`<ul>${notice.list.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}</div>`:''}
  </article>`;
 }).join('');
 return `<section class="panel sync-heading"><div><div class="eyebrow">CONSOLIDACIÓN · V1.15.5.6</div><h2>Sincronización de datos</h2><p>Único módulo para importar, comparar y publicar actualizaciones desde Google Sheets o Excel hacia Neon. Las demás pestañas son de lectura de datos publicados. Los cuatro módulos operativos leen sus publicaciones desde Neon.</p></div><div class="button-row"><button class="btn btn-primary" data-action="open-sync-source">↥ Cargar fuente para sincronización</button><button class="btn btn-light" data-action="sync-refresh" ${loading?'disabled':''}>↻ Consultar Neon</button></div></section>
 <section class="sync-summary"><div><span>Fuente activa</span><strong>Neon · módulos publicados</strong></div><div><span>Lectura desde Neon</span><strong>Obligatoria para los cuatro módulos</strong></div><div><span>Estado de API</span><strong>${status?'Conectada':'Sin confirmar · Consulta Neon'}</strong></div></section>
 <div class="notice">Primero carga el libro mediante <b>Cargar fuente para sincronización</b>. Después valida, compara e importa las hojas individualmente. Las operaciones en Neon requieren una cuenta autorizada. Las copias son inmutables. Publicar exige confirmación expresa. Las bitácoras y revisiones de Documentos Clave permanecen intactas.</div>
 ${feedback.global?`<div class="notice error" role="alert">${esc(feedback.global.message)}</div>`:''}<section class="sync-grid">${controls}</section>
 <section class="panel sync-rules"><h3>Controles de esta fase</h3><p>Se conservan los códigos documentales como texto, los valores originales y la posición de cada fila. Las importaciones idénticas no se duplican y se registra el usuario que creó cada copia. La comparación se realiza contra la última copia previa en Neon; <b>por sí sola no acredita la igualdad de los modelos publicados</b>.</p></section>`;
}
export function prepareSyncAction(moduleId,source){
 if(!source)throw new Error('Carga primero el Excel o el Google Sheets que contiene esta hoja.');
 const snapshot=makeSheetSnapshot(source.sheets,moduleId);
 const validation=validateSheetSnapshot(snapshot);
 return {snapshot,validation};
}
