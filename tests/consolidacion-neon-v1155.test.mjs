import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sync=readFileSync(new URL('../sincronizacion-ui.js',import.meta.url),'utf8');
const block=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
test('El resumen táctico es la vista inicial, y En desarrollo concentra cinco pestañas',()=>{
 const first=html.match(/<button[^>]+data-tab="([^"]+)"/)?.[1];assert.equal(first,'tactical');
 for(const id of ['overview','systems','integrations','endpoints','technical'])assert.match(html,new RegExp(`<button[^>]*data-tab="${id}"`));
 const start=html.indexOf('<details class="nav-dev"');const end=html.indexOf('</details>',start);
 assert.ok(start>=0&&end>start);
 for(const id of ['overview','systems','integrations','endpoints','technical'])assert.match(html.slice(start,end),new RegExp(`data-tab="${id}"`));
 for(const id of ['tactical','vias','activity-flow','documents','sync'])assert.ok(html.indexOf(`data-tab="${id}"`)<start);
});
test('Inicio lee las cuatro publicaciones sin pedir identidad ni descargar archivos',()=>{
 const start=block('async function loadPublishedNeonDashboard','function neonLoadPlaceholder');
 for(const x of ["changeTacticalReadSource('neon')","changeViaReadSource('neon')","changeActivityReadSource('neon')","changeDocumentReadSource('neon')"])assert.ok(start.includes(x));
 assert.doesNotMatch(start,/loadTacticalPrivate|loadDocumentsPrivate|loadPrivateDrive|loadPublicDrive/);
 assert.match(app,/queueMicrotask\(\(\)=>loadPublishedNeonDashboard\(\)\)/);
 assert.doesNotMatch(html,/id="refresh-now"|id="load-button"/);
});
test('Consultas de los tres módulos operativos solo refrescan desde Neon',()=>{
 for(const x of ['Activity','Via','Tactical'])assert.match(app,new RegExp(`async function refresh${x}Current\\(\\)\\{return change${x}ReadSource\\('neon'\\);\\}`));
 for(const action of ['tactical-source-google','vias-source-google','activity-source-google','docs-source-google'])assert.doesNotMatch(html,new RegExp(action));
});
test('Sincronización conserva importación, cotejo, publicación, sin botones de retroceso a Sheets',()=>{
 assert.match(sync,/data-action="open-sync-source"/);
 for(const action of ['sync-tactical-publish','sync-via-publish','sync-flow-publish','sync-docs-publish'])assert.ok(sync.includes(`data-action="${action}"`));
 assert.doesNotMatch(sync,/data-action="sync-(?:tactical|via|flow|docs)-rollback"/);
});
test('Documentos Clave conserva bitácora y revisión, sin importar hojas en el módulo',()=>{
 assert.match(app,/renderIncidentSection/);assert.match(app,/loadIncidentsForDocument/);assert.match(app,/saveDocumentReview/);assert.match(app,/saveIncident/);
 const catalog=block('function renderDocumentCatalog','function documentCatalogDiagnosticsPlaceholder');
 assert.match(catalog,/data-document-select/);
 assert.doesNotMatch(catalog,/for="document-local-file"|data-action="docs-source-google"/);
});
