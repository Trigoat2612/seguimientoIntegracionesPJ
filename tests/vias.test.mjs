import assert from 'node:assert/strict';
import {parseVias,getViaView,getAllViaViews,matchesViaSeverity} from '../src/shared/routes/vias.js';
const entries=[
 {name:'RENIEC',status:'Validada',statusRaw:'Validado',dependency:'GSJ',high:true,green:true},
 {name:'SUNARP',status:'En pruebas',statusRaw:'En Pruebas',dependency:'GTI',high:true,green:false},
 {name:'MPE - Redireccionamiento',status:'Validada',statusRaw:'Validada',dependency:'GSJ',high:false,green:false},
 {name:'REMAJU',status:'En desarrollo',statusRaw:'En Desarrollo',dependency:'GTI',high:false,green:false},
 {name:'SINAREJ - Depósitos / Orden de Pago',status:'En desarrollo',statusRaw:'En Desarrollo',dependency:'GTI',high:true,green:true}
];
const head=['Vía Procesal','Etapa','Nombre de Integración'];
const rows=[head,['Vía Ordinaria','Registro demanda','RENIEC'],['','Registro demanda','SUNARP'],['','Calificación','MPE - Redireccionamiento'],['Vía Abreviada','Trámite','REMAJU'],['','Ejecución','SINAREJ - Depósitos / Orden de Pago'],['','Ejecución','SINAREJ - Depósitos / Orden de Pago']];
const result=parseVias(new Map([['IntegracionesEtapa',rows]]),{entries});
assert.equal(result.error,'');assert.equal(result.vias.length,2);assert.equal(result.entries.length,5);
const ordinary=getViaView(result,'Vía Ordinaria');assert.equal(ordinary.ready,2);assert.equal(ordinary.pending,1);
assert.equal(getViaView(result,'Vía Ordinaria','critica').total,1);
assert.equal(getViaView(result,'Vía Ordinaria','alta').total,1);
assert.equal(getViaView(result,'Vía Ordinaria','no_priorizadas').total,1);
assert.equal(getViaView(result,'Vía Abreviada','critica').ready,0);
assert.equal(getAllViaViews(result).length,2);
// Las filas de matrix de etapas se interpretan como asociación, sin perder el estado.
const matrix=[['Vía','Integración','Registro demanda','Calificación','Trámite','Ejecución'],['Vía Ordinaria','RENIEC','X','',0,0],['','SUNARP','Sí','X','',''],['Vía Abreviada','REMAJU','','',1,'']];
const m=parseVias(new Map([['IntegracionesEtapa',matrix]]),{entries});
assert.equal(m.entries.length,4);assert.equal(m.vias.length,2);
assert.ok(m.warnings.some(w=>w.includes('matriz')));
// Si falta Seguimiento, la entidad no se inventa y no se declara validada.
const missing=parseVias(new Map([['IntegracionesEtapa',[head,['Ordinaria','Trámite','DESCONOCIDA']]]]),{entries});
assert.equal(missing.entries[0].ready,false);assert.equal(missing.entries[0].matched,false);
assert.equal(matchesViaSeverity(missing.entries[0],'critica'),false);
// Sin cabeceras no debe inferirse estructura arbitraria.
const bad=parseVias(new Map([['IntegracionesEtapa',[['A','B','C'],['RENIEC','Ordinaria','Trámite']]]]),{entries});
assert.equal(bad.vias.length,0);assert.ok(bad.error.includes('Encabezados'));
console.log('Pruebas de vías, etapas, estados y severidad: correctas.');
