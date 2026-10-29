import assert from 'node:assert/strict';
import {parseVias,inspectViaSheet,getViaView} from '../src/shared/routes/vias.js';
const tracked={entries:[
  {name:'RENIEC',status:'Validada',statusRaw:'Validada',dependency:'GSJ',high:true,green:true},
  {name:'SUNARP',status:'En pruebas',statusRaw:'En Pruebas',dependency:'GTI',high:true,green:false}
]};
// Caso realista: encabezados no reconocidos; UI muestra filas y el usuario asigna columnas.
const book=new Map([['IntegracionesEtapa',[
  ['N.°','Nombre de aplicativo','Proceso jurisdiccional','Fase del proceso'],
  ['1','RENIEC','Vía Ordinaria','Registro demanda'],
  ['2','SUNARP','','Calificación']
]]]);
const inspected=inspectViaSheet(book);
assert.equal(inspected.found,true);
assert.equal(inspected.sourceSheet,'IntegracionesEtapa');
assert.equal(inspected.columns.length,4);
assert.ok(inspected.preview[0].cells.some(c=>c.column==='B'&&c.value==='Nombre de aplicativo'));
const auto=parseVias(book,tracked);
assert.ok(auto.error.includes('Encabezados'));
assert.equal(auto.diagnostic.preview.length,3);
const corrected=parseVias(book,tracked,{mode:'lista',headerRow:1,integrationCol:1,viaCol:2,stageCol:3});
assert.equal(corrected.error,'');
assert.equal(corrected.vias.length,1);
const ord=getViaView(corrected,'Vía Ordinaria');
assert.equal(ord.total,2);assert.equal(ord.ready,1);assert.equal(ord.pending,1);
// Casos de matriz por etapas y de vías en columnas.
const matrix=new Map([['IntegracionesEtapa',[
  ['Vía','Integración','Registro demanda','Calificación'],
  ['Ordinaria','RENIEC','X',''],
  ['','SUNARP','','1']
]]]);
assert.equal(parseVias(matrix,tracked).entries.length,2);
const viaColumn=new Map([['IntegracionesEtapa',[
  ['Integración','Vía Ordinaria','Vía Abreviada'],
  ['RENIEC','Registro demanda',''],
  ['SUNARP','','Ejecución']
]]]);
const vc=parseVias(viaColumn,tracked,{mode:'vias_columnas',headerRow:1,integrationCol:0,viaCols:[{name:'Vía Ordinaria',index:1},{name:'Vía Abreviada',index:2}]});
assert.equal(vc.vias.length,2);assert.equal(vc.entries.length,2);
const section=new Map([['IntegracionesEtapa',[
  ['Vía Ordinaria'],['Registro demanda'],['RENIEC'],['Calificación'],['SUNARP']
]]]);
const sec=parseVias(section,tracked,{mode:'secciones',headerRow:0,integrationCol:0});
assert.equal(sec.entries.length,2);
assert.equal(sec.vias[0].stages.length,2);
const empty=parseVias(new Map([['IntegracionesEtapa',[['Vía','Etapa','Integración'],['','','']]]]),tracked);
assert.ok(empty.error);assert.ok(empty.warnings[0].includes('no se encontraron'));
console.log('Diagnóstico, mapeo manual y estructuras alternativas: correctos.');
