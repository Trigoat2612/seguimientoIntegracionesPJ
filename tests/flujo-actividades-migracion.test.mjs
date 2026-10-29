import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSheetSnapshot} from '../src/shared/sync/sincronizacion-modelo.js';
import {parseActividadFlujo,actividadView,ACTIVITY_SEVERITIES} from '../src/shared/flow/actividad-flujo.js';
import {extractFlowEntries,rehydrateFlowFromNeon,flowPublicationMetadata,flowParityReport,compareFlowModels} from '../src/shared/flow/flujo-actividades-migracion.js';
const tact={entries:[
 {name:'RENIEC',status:'Validada',statusRaw:'Validado',high:true,green:true,dependency:'GSJ'},
 {name:'SERNOT',status:'En pruebas',statusRaw:'En Pruebas',high:true,green:false,dependency:'GTI'},
 {name:'REMAJU',status:'Por validar',statusRaw:'Por validar',high:false,green:false,dependency:'SOFTPLAN'}
]};
const rows=[['Vía','Paso del flujo de la vía','Etapa','Actividad','Integración asociada'],
 ['Ordinaria','1','Registro demanda','Registrar demanda','RENIEC'],
 ['','','','Registrar demanda','SERNOT'],
 ['','','','Revisar anexos',''],
 ['','2','Calificación','Validar escrito','REMAJU'],
 ['','','','Confirmar notificación','SISTEMA DESCONOCIDO'],
 ['Conflicto de autoridad','Recepción','Recepción','Recibir expediente','RENIEC'],
 ['','Trámite','Trámite','Remitir expediente',''],
 ['','','','Solicitar pronunciamiento','SERNOT']];
const sheets=()=>new Map([['EtapaActividadIntegracion',rows]]);
const snapshot=()=>makeSheetSnapshot(sheets(),'flujo_actividades');
const fromRecords=model=>rehydrateFlowFromNeon(
 model.activities.map(a=>({activity_key:a.activityKey,activity_position:a.activityPosition,detail:a.detail})),
 model.links.map(l=>({activity_key:l.activityKey,link_position:l.linkPosition,entry:l.entry})),
 flowPublicationMetadata(model));
test('Conserva vías, pasos, actividades, vínculos y actividades sin integración',()=>{
 const expected=parseActividadFlujo(sheets(),tact);
 const model=extractFlowEntries(snapshot(),tact);
 assert.equal(model.vias.length,2);
 assert.equal(model.activities.length,7);
 assert.equal(model.links.length,6);
 assert.equal(model.activities.filter(a=>a.noIntegration).length,2);
 assert.equal(model.unmatched.length,1);
 assert.deepEqual(model.vias,expected.vias);
 assert.ok(model.activities.some(a=>a.activityName==='Revisar anexos'&&a.noIntegration));
 const restored=fromRecords(model);
 const parity=flowParityReport(expected,restored);
 assert.equal(parity.equal,true,parity.errors.join('; '));
 assert.deepEqual(restored.vias,expected.vias);
 assert.equal(restored.entries.length,expected.entries.length);
 for(const sev of ACTIVITY_SEVERITIES){for(const v of expected.vias){
  assert.deepEqual(actividadView(restored,v.name,sev.id),actividadView(expected,v.name,sev.id));
 }}
});
test('Detecta cambio de estado y altas/bajas sin fusionar actividades similares',()=>{
 const before=extractFlowEntries(snapshot(),tact);
 const amended=extractFlowEntries(snapshot(),{entries:tact.entries.map(x=>x.name==='SERNOT'?{...x,status:'Validada'}:x)});
 const diff=compareFlowModels(amended,before);
 assert.ok(diff.changed>=1);
 assert.equal(flowParityReport(before,fromRecords(amended)).equal,false);
 const reduced=structuredClone(before);
 reduced.vias[0].steps[0].activities.pop();
 assert.equal(compareFlowModels(reduced,before).removed,1);
});
test('No marca listas las integraciones sin correspondencia; actividades sin vínculo no son pendientes',()=>{
 const actual=fromRecords(extractFlowEntries(snapshot(),tact));
 const ordinary=actividadView(actual,'Ordinaria');
 assert.equal(ordinary.withoutIntegration,1);
 assert.equal(ordinary.pending,3);
 assert.equal(actual.entries.find(x=>x.name==='SISTEMA DESCONOCIDO').ready,false);
 assert.equal(actual.entries.find(x=>x.name==='SISTEMA DESCONOCIDO').matched,false);
});
test('Detecta enlaces huérfanos y contradicciones de actividades sin integración',()=>{
 const model=extractFlowEntries(snapshot(),tact);
 const a=model.activities.map(x=>({activity_key:x.activityKey,activity_position:x.activityPosition,detail:x.detail}));
 const l=model.links.map(x=>({activity_key:x.activityKey,entry:x.entry}));
 assert.throws(()=>rehydrateFlowFromNeon(a,[...l,{activity_key:'desconocida',entry:l[0].entry}]),/hu[eé]rfanos/);
 const erroneous=a.map(x=>({...x,detail:{...x.detail,noIntegration:true}}));
 assert.throws(()=>rehydrateFlowFromNeon(erroneous,l),/sin integración/);
});
test('No permite publicar sin hoja requerida, ni sin Seguimiento',()=>{
 assert.throws(()=>extractFlowEntries({...snapshot(),module:'integraciones_via'},tact),/Se requiere|hoja debe/);
 assert.throws(()=>extractFlowEntries(snapshot(),{entries:[]}),/Resumen táctico/);
});
test('SQL aditivo, relaciones y auditoría; sin borrar tablas anteriores',()=>{
 const sql=readFileSync(new URL('../database/migrations/flujo-actividades-v1_15_4.sql',import.meta.url),'utf8');
 for(const token of ['activity_flow_activities','activity_flow_links','activity_flow_published_metadata','activity_flow_migration_events','migration_source_controls_allowed_sources_v1154'])assert.match(sql,new RegExp(token));
 assert.match(sql,/no_integration BOOLEAN/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
});
test('V1.15.5 ofrece cotejo en Sincronización y conserva filtros de flujo desde Neon',()=>{
 const app=readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/client/ui/sincronizacion-ui.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/flujo-actividades.js',import.meta.url),'utf8');
 for(const token of ['sync-flow-preview','sync-flow-publish','flow-severity','flow-collapse','flow-expand'])assert.match(app,new RegExp(token));
 assert.doesNotMatch(ui,/data-action="sync-flow-rollback"/);
 assert.doesNotMatch(app,/data-action="activity-source-google"/);
 assert.match(ui,/V1\.15\.4/);
 assert.match(api,/tacticalBatchId|tactical_batch_id/);
 assert.match(api,/verifySnapshot/);
 assert.match(api,/WHERE EXISTS\(SELECT 1 FROM saved_a\)/);
});
