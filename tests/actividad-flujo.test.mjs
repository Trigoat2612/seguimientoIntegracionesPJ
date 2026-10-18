import assert from 'node:assert/strict';
import {parseActividadFlujo,actividadView,ACTIVITY_SEVERITIES,inspectActividadFlujo} from '../actividad-flujo.js';
const seguimiento={entries:[
 {name:'RENIEC',status:'Validada',statusRaw:'Validada',high:true,green:true,dependency:'GSJ'},
 {name:'SERNOT',status:'En pruebas',statusRaw:'En Pruebas',high:true,green:false,dependency:'GTI'},
 {name:'MPE - Redireccionamiento',status:'Validada',statusRaw:'Validada',high:false,green:false},
 {name:'SINAREJ – Depósitos / Orden de Pago',status:'Por validar',statusRaw:'Por validar',high:true,green:true}
]};
const rows=[
 ['Vía','Paso del flujo de la vía','Etapa','Actividad','Integración asociada'],
 ['Ordinaria','Presentación','Registro demanda','Registrar demanda','RENIEC'],
 ['','','','Registrar demanda','SERNOT'],
 ['','','','Revisar anexos',''],
 ['','Calificación','Calificación','Validar escrito','MPE - Redireccionamiento'],
 ['','','','Emitir resolución','SINAREJ – Depósitos'],
 ['','','','Otro proceso','SISTEMA DESCONOCIDO'],
 ['Conflicto de autoridad','Recepción','Recepción','Recibir expediente','RENIEC'],
 ['','Trámite','Trámite','Remitir expediente','SERNOT'],
 ['','','','Recibir expediente','']
];
const sheets=new Map([['Seguimiento',[]],['EtapaActividadIntegracion',rows]]);
const model=parseActividadFlujo(sheets,seguimiento);
assert.equal(model.error,'');
assert.deepEqual(model.vias.map(v=>v.name),['Ordinaria','Conflicto de autoridad']);
assert.deepEqual(model.vias[0].steps.map(s=>s.name),['Presentación','Calificación']);
assert.deepEqual(model.vias[1].steps.map(s=>s.name),['Recepción','Trámite']);
assert.equal(model.vias[0].steps[0].activities.length,2,'repeticiones de actividad deben agruparse');
const reg=model.vias[0].steps[0].activities[0];
assert.equal(reg.integrations.length,2);
assert.equal(reg.noIntegration,false);
assert.equal(model.vias[0].steps[0].activities[1].noIntegration,true,'conservar actividad sin integración');
const ord=actividadView(model,'Ordinaria');
assert.equal(ord.ready,2);
assert.equal(ord.pending,3);
assert.equal(ord.withoutIntegration,1);
const crit=actividadView(model,'Ordinaria','critica');
assert.equal(crit.ready,1);
assert.equal(crit.pending,1);
assert.equal(crit.activities,5,'los filtros no ocultan actividades del flujo');
const alta=actividadView(model,'Ordinaria','alta');
assert.equal(alta.ready,0);
assert.equal(alta.pending,1);
const noPriority=actividadView(model,'Ordinaria','no_priorizadas');
assert.equal(noPriority.ready,1);
assert.equal(noPriority.pending,0);
const unmatched=actividadView(model,'Ordinaria','sin_vinculo');
assert.equal(unmatched.pending,1);
assert.equal(model.unmatched.length,1);
const conflicto=actividadView(model,'Conflicto de autoridad');
assert.equal(conflicto.ready,1);
assert.equal(conflicto.pending,1);
assert.equal(inspectActividadFlujo(new Map()).found,false);
assert.ok(parseActividadFlujo(new Map(),seguimiento).error.includes('No existe'));
assert.equal(ACTIVITY_SEVERITIES.length,5);
// No inferir 'Validada' para una integración sin correspondencia
assert.equal(model.entries.find(x=>x.name==='SISTEMA DESCONOCIDO').ready,false);
assert.equal(model.entries.find(x=>x.name==='SISTEMA DESCONOCIDO').status,'Sin correspondencia');
// Sin encabezados: usar A-E desde la primera fila
const noHeader=parseActividadFlujo(new Map([['EtapaActividadIntegracion',[['Vía Ordinaria','Registro','Calificación','Registrar','RENIEC']]]]),seguimiento);
assert.equal(noHeader.vias.length,1);
console.log('Flujo de actividades A-E, estados, filtros y actividades sin integración: OK');
