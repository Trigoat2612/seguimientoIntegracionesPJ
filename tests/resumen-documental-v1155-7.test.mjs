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
test('Resumen documental: indicadores, desglose sin ceros y tabla multiselección',()=>{
 const data=buildDocumentDashboard([{codigo:'4.10',documento:'<script>alert(1)</script>',id:'abc'},...docs],records);
 const html=renderDocumentDashboard({data});
 assert.match(html,/>Documentos registrados<\/span><strong>5<\/strong>/);
 assert.match(html,/Documentos por estado/);
 for(const status of ['Pendiente','Programado','Validado','Sin estado']) assert.ok(html.includes(status),`Falta estado ${status}`);
 for(const zeroStatus of ['Observado','En proceso de firma','Entregado']) assert.doesNotMatch(html,new RegExp(zeroStatus),`No debería mostrarse el estado ${zeroStatus} con valor 0`);
 for(const excluded of ['document-dashboard-search','document-dashboard-team','document-dashboard-status','document-dashboard-open','Revisar pendientes del cierre']) assert.doesNotMatch(html,new RegExp(excluded));
 assert.doesNotMatch(html,/<script>/);
 assert.equal(Object.values(data.byStatus).reduce((n,v)=>n+v,0),data.total);
});
test('Estados adicionales quedan en el desglose y no se pierden documentos',()=>{
 const data=buildDocumentDashboard([...docs,{codigo:'5.2',documento:'Otro',id:'d52'}],[...records,{documentCode:'5.2',entryCount:1,latest:{status:'En evaluación'}}]);
 assert.match(renderDocumentDashboard({data}),/En evaluación/);
 assert.equal(Object.values(data.byStatus).reduce((n,v)=>n+v,0),data.total);
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

test('Regresión 1.15.5.9: oculta los estados con cero, incluidos estados adicionales',()=>{
 const data={total:6,byStatus:{Observado:0,Pendiente:1,Programado:0,'En proceso de firma':2,Entregado:0,Validado:2,'Sin seguimiento':1,'En evaluación':0}};
 const html=renderDocumentDashboard({data});
 assert.match(html,/>Documentos registrados<\/span><strong>6<\/strong>/);
 for(const state of ['Pendiente','En proceso de firma','Validado','Sin estado']) assert.ok(html.includes(state),`Estado positivo omitido: ${state}`);
 for(const state of ['Observado','Programado','Entregado','En evaluación']) assert.doesNotMatch(html,new RegExp(`>${state}<`),`Estado cero visible: ${state}`);
 assert.equal((html.match(/class="document-summary-state-row"/g)||[]).length,4);
 assert.equal(Object.values(data.byStatus).reduce((a,b)=>a+b,0),data.total);
});

test('Regresión 1.15.5.9: catálogo vacío no muestra estados de valor cero',()=>{
 const data=buildDocumentDashboard([],[]);
 const html=renderDocumentDashboard({data});
 assert.match(html,/>Documentos registrados<\/span><strong>0<\/strong>/);
 assert.match(html,/No hay estados documentales con valores publicados/);
 assert.doesNotMatch(html,/class="document-summary-state-row"/);
});


test('Regresión 1.15.5.10: solo indicadores KPI con cantidad positiva, además del total',()=>{
 const data={total:5,tracked:4,events:7,needsAction:0,validated:3,untracked:0,byStatus:{Validado:3,Programado:2}};
 const html=renderDocumentDashboard({data});
 assert.match(html,/>Documentos registrados<\/span><strong>5<\/strong>/);
 assert.match(html,/>Con seguimiento<\/span><strong>4<\/strong>/);
 assert.match(html,/>Validados<\/span><strong>3<\/strong>/);
 assert.doesNotMatch(html,/>Atención prioritaria<\/span>/);
 assert.doesNotMatch(html,/>Sin seguimiento<\/span>/);
 assert.equal((html.match(/class="document-summary-metric /g)||[]).length,3);
 assert.equal((html.match(/class="document-summary-state-row"/g)||[]).length,2);
});

test('Regresión 1.15.5.10: restituye los cinco paneles cuando todos tienen valor positivo',()=>{
 const data=buildDocumentDashboard(docs,records);
 const html=renderDocumentDashboard({data});
 for(const name of ['Documentos registrados','Con seguimiento','Atención prioritaria','Validados','Sin seguimiento']){
  assert.match(html,new RegExp(`>${name}<\\/span>`),`Falta panel ${name}`);
 }
 assert.equal((html.match(/class="document-summary-metric /g)||[]).length,5);
 assert.equal((html.match(/class="document-summary-state-row"/g)||[]).length,4);
});

test('Regresión 1.15.5.10: total cero no crea paneles extra ni estados vacíos',()=>{
 const html=renderDocumentDashboard({data:buildDocumentDashboard([],[])});
 assert.equal((html.match(/class="document-summary-metric /g)||[]).length,1);
 assert.match(html,/>Documentos registrados<\/span><strong>0<\/strong>/);
 assert.doesNotMatch(html,/>Con seguimiento<\/span>/);
 assert.doesNotMatch(html,/>Sin seguimiento<\/span>/);
});
