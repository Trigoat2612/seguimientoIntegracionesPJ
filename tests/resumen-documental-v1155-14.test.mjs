import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildDocumentDashboard,compareDocumentCodes} from '../src/shared/documents/resumen-documental.js';
import {renderDocumentDashboard} from '../src/client/ui/resumen-documental-ui.js';
import {tabTitles} from '../src/client/ui/navigation-config.js';

const intro='Vista gerencial del Libro de Bitácora de Documentos Claves. El estado por documento corresponde a su registro más reciente; el detalle inferior muestra la bitácora completa.';
const documents=['4.10','4.2','2.3','6.1','4.1'].map((codigo,id)=>({codigo,id:`doc-${id}`,documento:`Documento ${codigo}`}));
const statuses={ '4.10':'Validado', '4.2':'Programado', '2.3':'Pendiente','6.1':'Validado','4.1':'Validado'};
const tracking=documents.map((doc,i)=>({documentCode:doc.codigo,entryCount:i+1,latest:{status:statuses[doc.codigo],responsible:'SOFTPLAN',validatorTeams:['GTI']}}));

test('Título de navegación y única introducción en el encabezado principal',()=>{
 const html=fs.readFileSync(new URL('../src/client/index.html',import.meta.url),'utf8');
 assert.match(html,/> Resumen de documentos claves<\/button>/);
 assert.equal(tabTitles['document-dashboard'][0],'Resumen de documentos claves');
 assert.equal(tabTitles['document-dashboard'][1],intro);
 const output=renderDocumentDashboard({data:buildDocumentDashboard(documents,tracking)});
 assert.doesNotMatch(output,/docdash-hero|docdash-page-head|docdash-header-strip/);
 assert.doesNotMatch(output,/EJE - Documentos Claves/);
 assert.doesNotMatch(output,/<h2>Resumen documental<\/h2>/);
 assert.equal(output.match(/data-action="document-dashboard-refresh"/g)?.length,1);
});

test('Indicadores homogéneos sin huecos y respetando cantidades positivas',()=>{
 const data=buildDocumentDashboard(documents,tracking);
 const output=renderDocumentDashboard({data});
 assert.equal((output.match(/class="document-summary-metric /g)||[]).length,4);
 const css=fs.readFileSync(new URL('../src/client/styles.css',import.meta.url),'utf8');
 assert.match(css,/#view-document-dashboard \.document-summary-metrics-5\{display:flex!important;flex-wrap:wrap/);
 assert.match(css,/\.document-summary-metrics-5>\.document-summary-metric\{flex:1 1 170px/);
 assert.match(css,/min-height:108px/);
 assert.doesNotMatch(css.slice(css.indexOf('/* V1.15.5.14:')),/font-family:Georgia/);
});

test('Orden numérico natural de documentos en filtro, bitácora y gráfica de anotaciones',()=>{
 const data=buildDocumentDashboard(documents,tracking);
 const expected=['2.3','4.1','4.2','4.10','6.1'];
 assert.deepEqual(data.items.map(i=>i.code),expected);
 assert.deepEqual(data.available.documents.map(i=>i.label.split(' — ')[0]),expected);
 assert.equal(compareDocumentCodes('4.2','4.10')<0,true);
 const html=renderDocumentDashboard({data});
 const log=html.slice(html.indexOf('Bitácora completa'));
 const logCodes=[...log.matchAll(/class="docdash-log-code">([^<]+)/g)].map(m=>m[1]);
 assert.deepEqual(logCodes,expected);
 const chart=html.slice(html.indexOf('<h3>Registros de Bitácora por Documento</h3>'),html.indexOf('Bitácora completa'));
 const chartCodes=[...chart.matchAll(/class="document-summary-state-name" title="([0-9.]+) —/g)].map(m=>m[1]);
 assert.deepEqual(chartCodes,expected);
});
