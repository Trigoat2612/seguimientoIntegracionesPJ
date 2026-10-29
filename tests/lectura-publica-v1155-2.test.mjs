import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('src/client/app.js'),html=read('src/client/index.html'),notes=read('src/client/ui/bitacora-ui.js');

test('Los cuatro módulos ofrecen solo sus acciones GET publicadas sin validación de identidad',()=>{
 for(const [file,action] of [['resumen-tactico','records'],['integraciones-via','records'],['flujo-actividades','records'],['documentos-clave','catalog']]){
  const src=read(`api/${file}.js`);
  assert.ok(src.includes(`const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='${action}'`));
  assert.match(src,/const actor=publicRead\?'consulta':await identifyEditor\(req\)/);
  assert.doesNotMatch(src,/identifyViewer\(req\)/);
 }
});

test('Las escrituras documentales, publicaciones y la sincronización exigen editor',()=>{
 for(const module of ['incidencias','sincronizacion','resumen-tactico','integraciones-via','flujo-actividades','documentos-clave']){
  assert.match(read(`api/${module}.js`),/identifyEditor\(req\)/);
 }
 assert.match(read('api/incidencias.js'),/req.method==='GET'\?\{email:'',canEdit:false\}:\{email:await identifyEditor\(req\)/);
});

test('La carga inicial no invoca OAuth ni descarga hojas de cálculo',()=>{
 const start=app.slice(app.indexOf('async function loadPublishedNeonDashboard(){'),app.indexOf('function neonLoadPlaceholder('));
 assert.doesNotMatch(start,/authorizeGoogle|\/api\/sesion|loadTacticalPrivate|loadPrivateDrive|Google Sheets/);
 for(const name of ['changeTacticalReadSource','changeViaReadSource','changeActivityReadSource','changeDocumentReadSource'])assert.ok(start.includes(name+"('neon')"));
 assert.match(app,/queueMicrotask\(\(\)=>loadPublishedNeonDashboard\(\)\)/);
});

test('Las GET operativas no envían Bearer y la administración sí exige token',()=>{
 const src=app.slice(app.indexOf('async function requestSync('),app.indexOf('async function refreshSyncStatus('));
 assert.match(src,/const publicRead=/);
 assert.match(src,/if\(!publicRead&&!accessToken\)await authorizeGoogle\(\)/);
 assert.match(src,/\.\.\.\(!publicRead\?\{Authorization:`Bearer \$\{accessToken\}`\}:\{\}\)/);
 assert.match(app,/async function authorizeSynchronization\(\)/);
});

test('Consulta de bitácora sin identidad y autenticación al editar',()=>{
 assert.match(app,/const isRead=!options.method\|\|options.method==='GET'/);
 assert.match(app,/if\(!isRead&&!accessToken\)await authorizeEditor\(\)/);
 assert.match(app,/incidentAuthorized=true;incidentCanEdit=!!sessionCanEdit/);
 assert.match(notes,/Iniciar sesión para editar/);
 assert.doesNotMatch(notes,/la bitácora se registra en Neon|El catálogo activo se consulta desde Neon/i);
});

test('Sincronización es única puerta de importación y autorización administrativa',()=>{
 const section=app.slice(app.indexOf('function renderSync(){'),app.indexOf('async function requestSync('));
 assert.match(section,/if\(!sessionCanEdit\)/);
 assert.match(section,/data-action="sync-auth"/);
 assert.doesNotMatch(app.slice(app.indexOf('function switchTab('),app.indexOf('async function loadWorkbook(')),/tab==='sync'&&!sessionCanEdit/);
});

test('Vistas limpias de etiquetas técnicas y sin panel de fuente del flujo',()=>{
 const flow=app.slice(app.indexOf('function renderActivityFlow(){'),app.indexOf('const tacticalLong='));
 assert.doesNotMatch(flow,/Fuente del Flujo de actividades|Fuente activa: Neon|columna E|desde Neon/);
 assert.match(flow,/Datos publicados/);
 assert.match(flow,/Recargar vista/);
 const tactical=app.slice(app.indexOf('function renderTactical(){'),app.indexOf('function groups(){'));
 assert.doesNotMatch(tactical,/Fuente: Neon|en Seguimiento|columna D|columna L|filas 1–/);
 const docs=app.slice(app.indexOf('function renderDocumentCatalog(){'),app.indexOf('function documentCatalogDiagnosticsPlaceholder(){'));
 assert.doesNotMatch(docs,/Catálogo desde Neon|Recargar catálogo desde Neon|Origen: Neon/);
 assert.match(docs,/Datos publicados/);
 assert.doesNotMatch(html,/Fuente principal Neon|Neon · sesión requerida|Iniciar sesión · Neon/);
});

test('Se conserva el cotejo en sincronización pero no bloquea la lectura publicada',()=>{
 for(const [a,b] of [['async function changeActivityReadSource','async function refreshActivityCurrent'],['async function changeViaReadSource','async function refreshViaCurrent'],['async function changeTacticalReadSource','async function refreshTacticalCurrent']]){
  const section=app.slice(app.indexOf(a),app.indexOf(b));
  assert.doesNotMatch(section,/ParityReport/);
 }
 assert.match(app,/flowParityReport/);
 assert.match(app,/viaParityReport/);
 assert.match(app,/tacticalParityReport/);
});
