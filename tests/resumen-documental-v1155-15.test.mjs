import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildDocumentDashboard,filterDocumentTrackingTable} from '../src/shared/documents/resumen-documental.js';
import {renderDocumentDashboard} from '../src/client/ui/resumen-documental-ui.js';

const documents=['4.10','4.2','3.1','2.3'].map((code,i)=>({id:`doc-${i}`,codigo:code,documento:`Documento ${code}`}));
const records=[
 {documentCode:'4.10',entryCount:2,latest:{status:'Validado',date:'2026-10-25',responsible:'SOFTPLAN',validatorTeams:['GTI','PEJENP'],activity:'Conformidad'}},
 {documentCode:'4.2',entryCount:1,latest:{status:'Pendiente',responsible:'SOFTPLAN',validatorTeams:['GTI'],activity:'Observaciones'}},
 {documentCode:'3.1',entryCount:1,latest:{status:'Programado',responsible:'PEJENP',validatorTeams:['PEJENP'],activity:'Agenda'}},
 {documentCode:'2.3',entryCount:1,latest:{status:'Observado',responsible:'PEJENP',validatorTeams:['ETII'],activity:'Brecha'}}
];
const data=buildDocumentDashboard(documents,records);

test('Selección múltiple usa OR dentro de estados y equipos, AND entre ambos',()=>{
 const items=data.items;
 const filtered=filterDocumentTrackingTable(items,{states:['Validado','Pendiente'],teams:['GTI','ETII']});
 assert.deepEqual(filtered.map(i=>i.code),['4.2','4.10']);
 assert.deepEqual(filterDocumentTrackingTable(items,{states:['Validado','Programado'],teams:['PEJENP']}).map(i=>i.code),['3.1','4.10']);
 assert.deepEqual(filterDocumentTrackingTable(items,{states:['Validado','Pendiente'],teams:['ETII']}),[]);
 assert.deepEqual(filterDocumentTrackingTable(items,{states:[],teams:[]}).map(i=>i.code),['2.3','3.1','4.2','4.10']);
});

test('Se mantienen filtros acumulativos con búsqueda y orden natural de código',()=>{
 assert.deepEqual(filterDocumentTrackingTable(data.items,{states:['Pendiente','Observado'],teams:[],query:'observaciones'}).map(i=>i.code),['4.2']);
 assert.deepEqual(filterDocumentTrackingTable(data.items,{states:['Validado','Pendiente'],teams:['GTI'],query:'sin coincidencia'}),[]);
});

test('La tabla muestra casillas para Estado y Equipo validador, no selectores simples',()=>{
 const html=renderDocumentDashboard({data,tableFilters:{states:['Validado','Pendiente'],teams:['GTI','ETII'],query:''}});
 const section=html.slice(html.indexOf('aria-label="Seguimiento y pendientes"'));
 assert.match(section,/data-docdash-filter="tableStates"/);
 assert.match(section,/data-docdash-filter="tableTeams"/);
 assert.match(section,/data-docdash-filter-group="tableStates" value="Validado" checked/);
 assert.match(section,/data-docdash-filter-group="tableTeams" value="GTI" checked/);
 assert.match(section,/data-docdash-filter-group="tableTeams" value="ETII" checked/);
 assert.match(section,/data-action="docdash-table-clear"/);
 assert.match(section,/data-action="docdash-open-document"/);
 assert.doesNotMatch(section,/<select[^>]*id="document-dashboard-(status|team)"/);
 const filtered=html.slice(html.indexOf('aria-label="Seguimiento y pendientes"'),html.indexOf('Bitácora completa'));
 assert.match(filtered,/2 de 4/);
 assert.match(filtered,/Documento 4.2/);
 assert.match(filtered,/Documento 4.10/);
 assert.doesNotMatch(filtered,/class="document-summary-name"[^>]*>.*Documento 3.1/s);
});

test('La aplicación conecta casillas, búsqueda, limpieza y apertura de ficha',()=>{
 const app=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/client/styles.css',import.meta.url),'utf8');
 assert.match(app,/tableStates/);
 assert.match(app,/tableTeams/);
 assert.match(app,/data-docdash-filter-group/);
 assert.match(app,/docdash-table-clear/);
 assert.match(app,/docdash-table-search/);
 assert.match(app,/docdash-open-document/);
 assert.match(css,/docdash-table-filters/);
});
