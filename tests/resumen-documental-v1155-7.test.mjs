import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildDocumentDashboard,filterDocumentDashboard} from '../src/shared/documents/resumen-documental.js';
import {renderDocumentDashboard} from '../src/client/ui/resumen-documental-ui.js';
const docs=[{codigo:'4.10',documento:'Plan de pruebas',id:'doc-410'},{codigo:'4.1',documento:'Plan de despliegue',id:'doc-41'},{codigo:'3.2',documento:'Diseño',id:'doc-32'},{codigo:'3.6',documento:'Mapa de procesos',id:'doc-36'}];
const records=[
 {documentCode:'4.10',entryCount:3,latest:{status:'Validado',date:'2026-10-23',activity:'Falta actualización de capturas',comments:'Pendiente ajuste',responsible:'SOFTPLAN',validatorTeams:['GTI']}},
 {documentCode:'4.1',entryCount:1,latest:{status:'Programado',date:null,activity:'Revisión',validatorTeams:['PEJENP']}},
 {documentCode:'3.6',entryCount:2,latest:{status:'Pendiente',date:'2026-10-21',activity:'Observaciones de validación',validatorTeams:['GTI','PEJENP']}}
];
test('Indicadores sin hardcodear total y sin confundir 4.1 con 4.10',()=>{
 const r=buildDocumentDashboard(docs,records);
 assert.equal(r.total,4);assert.equal(r.tracked,3);assert.equal(r.events,6);assert.equal(r.needsAction,1);assert.equal(r.validated,1);assert.equal(r.untracked,1);assert.equal(r.closureReview,1);
 assert.equal(r.items.find(x=>x.code==='4.1').entryCount,1);
 assert.equal(r.items.find(x=>x.code==='4.10').entryCount,3);
 assert.equal(r.items.find(x=>x.code==='3.2').status,'Sin seguimiento');
});
test('Filtros por estado, equipo y búsqueda combinados',()=>{
 const {items}=buildDocumentDashboard(docs,records);
 assert.deepEqual(filterDocumentDashboard(items,{status:'Atención prioritaria'}).map(x=>x.code),['3.6']);
 assert.deepEqual(filterDocumentDashboard(items,{team:'GTI',query:'observaciones'}).map(x=>x.code),['3.6']);
 assert.equal(filterDocumentDashboard(items,{status:'Validado'}).length,1);
 assert.equal(filterDocumentDashboard(items,{status:'Con seguimiento'}).length,3);
});
test('Escapa contenido de usuario y permite abrir cada ficha desde la vista',()=>{
 const {items,...s}=buildDocumentDashboard([{codigo:'4.10',documento:'<script>alert(1)</script>',id:'abc'}],records);
 const html=renderDocumentDashboard({data:{...s,items},source:'Neon'});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/data-document-dashboard-open="abc"/);
 assert.match(html,/Revisar pendientes del cierre/);
 assert.match(html,/document-dashboard-search/);
});
test('La app enlaza navegación, lectura pública Neon y actualización tras guardar',()=>{
 const app=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 const api=fs.readFileSync(new URL('../api/seguimiento-documental.js',import.meta.url),'utf8');
 const shell=fs.readFileSync(new URL('../src/client/index.html',import.meta.url),'utf8');
 assert.match(shell,/data-tab="document-dashboard"/);
 assert.match(shell,/id="view-document-dashboard"/);
 assert.match(app,/action=dashboard/);
 assert.match(app,/documentDashboardRows=null/);
 assert.match(api,/req\.query\?\.action==='dashboard'/);
 assert.match(api,/WHERE d\.is_active=true/);
 assert.match(api,/ORDER BY t\.created_at DESC,t\.source_row DESC NULLS LAST/);
});
