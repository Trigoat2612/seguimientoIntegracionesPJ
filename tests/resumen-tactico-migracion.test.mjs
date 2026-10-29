import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tacticalStylesFromSheets,extractTacticalEntries,compareTacticalEntries,tacticalParityReport,rehydrateTacticalFromNeon} from '../resumen-tactico-migracion.js';
import {makeSheetSnapshot} from '../sincronizacion-modelo.js';
import {parseTactical,tacticalCategoryCounts} from '../tactical.js';
import {renderSyncView} from '../sincronizacion-ui.js';
function fixture(){
 const rows=[['','Integración','','Estado','Dependencia','','Estado situacional','Cierre desarrollo','Cierre pruebas','Validación GSJ','','Criticidad','Consideraciones']];
 rows.push(['','SINAREJ - Depósitos','','Por validar','GTI','','Pruebas\n'+('x'.repeat(4589)),'01/11/2026','Por informar','Revisión con GSJ','','Alta','Sin novedad']);
 rows.push(['','CEJ - Superior','','Validado','GSJ','','Validado','','','','','Alta','']);
 rows.push(['','EDICTOS','','En pruebas','Softplan','','En proceso','','','','','Manual','']);
 while(rows.length<36)rows.push([]);
 rows.push(['','Extra no priorizado','','Validado','','','','','','','','Alta','']);
 const sheets=new Map([['Seguimiento',rows]]);
 sheets.cellFormats=new Map([['Seguimiento',new Map([['1:11',{fillColor:'#00B050'}],['2:11',{fillColor:'#FFFFFF'}]])]]);
 sheets.sheetConditional=new Map([['Seguimiento',false]]);
 return sheets;
}
test('Conserva G extensa, alertas y solo las filas 1–36',()=>{
 const sheets=fixture(),styles=tacticalStylesFromSheets(sheets),snap=makeSheetSnapshot(sheets,'resumen_tactico');
 assert.equal(styles.fills.length,2);
 const data=extractTacticalEntries(snap,styles);
 assert.equal(data.entries.length,3);
 assert.equal(data.excludedWithName,1);
 assert.equal(data.entries[0].history.length,4597);
 assert.ok(data.entries[0].history.includes('\n'));
 assert.equal(data.entries[0].dateAlerts.length,2);
 assert.equal(data.entries[0].green,true);
 assert.equal(data.entries[1].green,false);
 assert.equal(tacticalCategoryCounts(data.entries).critica,1);
 assert.equal(tacticalCategoryCounts(data.entries).alta,1);
});
test('El servidor reconstruye exactamente el mismo modelo que Google Sheets',()=>{
 const sheets=fixture(),expected=parseTactical(sheets),actual=extractTacticalEntries(makeSheetSnapshot(sheets,'resumen_tactico'),tacticalStylesFromSheets(sheets));
 const report=tacticalParityReport(expected,actual);
 assert.equal(report.equal,true,JSON.stringify(report));
 assert.equal(compareTacticalEntries(actual.entries,expected.entries).identical,true);
 const fromDb=rehydrateTacticalFromNeon(actual.entries);
 assert.equal(tacticalParityReport(expected,fromDb).equal,true);
});
test('Detecta cambios de bitácora y relleno por fila sin fusionar nombres repetidos',()=>{
 const sheets=fixture(),data=extractTacticalEntries(makeSheetSnapshot(sheets,'resumen_tactico'),tacticalStylesFromSheets(sheets));
 const modified=data.entries.map(e=>({...e}));modified[1].history='Otro contenido';modified[0].green=false;
 const change=compareTacticalEntries(modified,data.entries);
 assert.equal(change.changed,2);assert.equal(change.added,0);assert.equal(change.removed,0);
 const dup=data.entries.concat({...data.entries[0],row:5,id:'seg-5'});
 assert.equal(compareTacticalEntries(dup,data.entries).added,1);
});
test('Rechaza rellenos adulterados o repetidos, pero no los formatos ausentes legítimos',()=>{
 const snap=makeSheetSnapshot(fixture(),'resumen_tactico');
 assert.throws(()=>extractTacticalEntries(snap,{fills:[{row:2,color:'red'}],hasConditional:false}),/inválido/);
 assert.throws(()=>extractTacticalEntries(snap,{fills:[{row:2,color:'#00B050'},{row:2,color:'#00B050'}],hasConditional:false}),/repetido/);
 assert.equal(extractTacticalEntries(snap,{fills:[],hasConditional:true}).entries.length,3);
});
test('No se altera el estado de otros módulos en la migración SQL',()=>{
 const sql=fs.readFileSync(new URL('../resumen-tactico-v1_15_2.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS tactical_tracking/i);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS tactical_migration_events/i);
 assert.match(sql,/module_key IN \('documentos_clave','resumen_tactico'\)/);
 assert.match(sql,/module_key IN \('integraciones_via','flujo_actividades'\)/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE/i);
});
test('V1.15.5 mantiene cotejo y publicación solo desde Sincronización de datos',()=>{
 const html=renderSyncView({available:{resumen_tactico:{origin:'Drive privado · Táctico'}},tacticalMigrationStatus:{activeSource:'neon',latestBatch:{id:'abc'},activeCount:35}});
 for(const action of ['sync-tactical-preview','sync-tactical-publish','open-sync-source'])assert.ok(html.includes(`data-action="${action}"`));
 assert.doesNotMatch(html,/data-action="sync-tactical-rollback"/);
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/loadPublishedNeonDashboard/);
 assert.match(app,/tacticalParityReport/);
 assert.match(app,/async function refreshTacticalCurrent\(\)\{return changeTacticalReadSource\('neon'\);\}/);
});
