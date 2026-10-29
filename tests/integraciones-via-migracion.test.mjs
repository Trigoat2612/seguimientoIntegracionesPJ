import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSheetSnapshot} from '../sincronizacion-modelo.js';
import {parseVias,getAllViaViews} from '../vias.js';
import {extractViaEntries,compareViaEntries,viaParityReport,viaPublicationMetadata,rehydrateViasFromNeon} from '../integraciones-via-migracion.js';
const tact={entries:[
 {name:'RENIEC',status:'Validada',statusRaw:'Validado',dependency:'GSJ',high:true,green:true},
 {name:'SUNARP',status:'En pruebas',statusRaw:'En Pruebas',dependency:'GTI',high:true,green:false},
 {name:'REMAJU',status:'Por validar',statusRaw:'Por Validar',dependency:'SOFTPLAN',high:false,green:false}
]};
function data(){const rows=[['Vía Procesal','Etapa','Nombre de Integración'],
 ['Ordinaria','Calificación','RENIEC'],['','Trámite','SUNARP'],['','Trámite','RENIEC'],
 ['Abreviada','Trámite','REMAJU'],['','Ejecución','DESCONOCIDA'],
 ['Conflicto de Autoridad','Trámite','RENIEC'],['','Recepción','REMAJU']];
 return new Map([['IntegracionesEtapa',rows]]);
}
test('Deriva asociaciones desde hoja y Seguimiento preservando relación y no inventando estados',()=>{
 const sheets=data();const actual=extractViaEntries(makeSheetSnapshot(sheets,'integraciones_via'),tact);
 const expected=parseVias(sheets,tact);
 assert.equal(actual.entries.length,expected.entries.length);
 assert.equal(actual.vias.length,3);
 assert.equal(actual.unmatched.length,1);
 assert.equal(actual.entries.find(e=>e.name==='DESCONOCIDA').matched,false);
 assert.equal(viaParityReport(expected,actual).equal,true);
 const conflict=actual.vias.find(v=>v.name==='Conflicto de Autoridad');
 assert.deepEqual(conflict.stages.map(s=>s.name),['Recepción','Trámite']);
});
test('Restaura el mismo modelo para filtros, etapas, totales y PowerPoint',()=>{
 const source=extractViaEntries(makeSheetSnapshot(data(),'integraciones_via'),tact);
 const meta=viaPublicationMetadata(source,{});
 const restored=rehydrateViasFromNeon(source.entries.map(entry=>({entry})),meta);
 const parity=viaParityReport(source,restored);
 assert.equal(parity.equal,true,JSON.stringify(parity));
 for(const severity of ['todas','critica','alta','no_priorizadas']){
  const a=getAllViaViews(source,severity),b=getAllViaViews(restored,severity);
  assert.deepEqual(b,a);
 }
});
test('Detecta diferencias por estado, vía, etapa y cambio de criticidad',()=>{
 const source=extractViaEntries(makeSheetSnapshot(data(),'integraciones_via'),tact);
 const modified=source.entries.map(e=>({...e}));
 modified[0].green=false;modified[1].status='Validada';
 const diff=compareViaEntries(modified,source.entries);
 assert.equal(diff.changed,2);
 assert.equal(viaParityReport(source,{...source,entries:modified,vias:source.vias}).equal,false);
 const removed=source.entries.slice(1);
 assert.equal(compareViaEntries(removed,source.entries).removed,1);
});
test('Misma asociación repetida en una etapa se deduplica; distintas etapas son distintas relaciones',()=>{
 const sheets=new Map([['IntegracionesEtapa',[
  ['Vía','Etapa','Integración'],['Ordinaria','Trámite','RENIEC'],['','Trámite','RENIEC'],['','Ejecución','RENIEC']
 ]]]);
 const model=extractViaEntries(makeSheetSnapshot(sheets,'integraciones_via'),tact);
 assert.equal(model.entries.length,2);
 assert.equal(getAllViaViews(model)[0].total,1);
 assert.equal(getAllViaViews(model)[0].associations,2);
});
test('Migración SQL aditiva y conserva fuentes previas sin habilitar Flujo de actividades',()=>{
 const sql=readFileSync(new URL('../integraciones-via-v1_15_3.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS route_integration_links/i);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS route_published_metadata/i);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS route_migration_events/i);
 assert.match(sql,/module_key='flujo_actividades' AND active_source='google_sheets'/i);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
});
test('La UI conserva cotejo, publicación y PPT con Neon como fuente operativa',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 for(const token of ['sync-via-preview','sync-via-publish','vias-export-all','vias-export-one'])assert.match(app,new RegExp(token));
 assert.doesNotMatch(app,/data-action="vias-source-google"/);
 const ui=readFileSync(new URL('../sincronizacion-ui.js',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/data-action="sync-via-rollback"/);
 const api=readFileSync(new URL('../api/integraciones-via.js',import.meta.url),'utf8');
 assert.match(api,/ctl\.tactical\.published_batch_id/);
 assert.match(api,/verifySnapshot/);
 assert.match(api,/relation_key/);
});
