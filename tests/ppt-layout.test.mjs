import assert from 'node:assert/strict';
import {buildTacticalSlidePlan,PRESENTATION_STATES,estimateRows} from '../src/client/presentations/ppt-layout.js';
function makeEntry(id,state='Validada',name='Integración',dep='GTI'){
 return {id:`e-${id}`,row:id,name:`${name} ${id}`,dependency:dep,status:state,statusRaw:state,high:true,green:id%2===0,dateAlerts:[]};
}
const source=[...Array.from({length:34},(_,i)=>makeEntry(i+1,'Validada','Integración con nombre largo para probar saltos de línea')), ...Array.from({length:11},(_,i)=>makeEntry(i+35,'Por validar','SERNOT / Expedientes')), ...Array.from({length:7},(_,i)=>makeEntry(i+50,'En pruebas','SUNARP / ASBANC')),...Array.from({length:8},(_,i)=>makeEntry(i+60,'En desarrollo','SINAREJ depósitos'))];
const manual=[{id:'manual-1',name:'Elevación Suprema',dependency:'PJ',statusRaw:'Manual',status:'Sin clasificar'}];
const model={category:{id:'critica',label:'Severidad Crítica'},stateFilter:'Todos',query:'',primary:source,visibleFiltered:source,nonPrioritized:[],manualEntries:manual};
const plan=buildTacticalSlidePlan(model);
assert.equal(plan.pages.length,1,'El resumen táctico debe producir una diapositiva');
const allEntries=Object.values(plan.pages[0].parts).flatMap(cols=>cols.flat()).map(x=>x.entry);
assert.equal(allEntries.length,source.length+manual.length,'No se deben perder integraciones');
assert.equal(new Set(allEntries.map(x=>x.id)).size,allEntries.length,'Sin duplicaciones');
assert.equal(plan.totals.Manual,1);
assert.ok('Manual' in plan.pages[0].parts);
assert.ok(estimateRows('un nombre extraordinariamente largo que ocupa varias líneas',{w:3.01,columns:2,font:8})>=3);
const unknownModel={...model,primary:[],visibleFiltered:[makeEntry(100,'Sin clasificar','Ciclo 2')],manualEntries:manual,category:{id:'ciclo2',label:'Ciclo 2'}};
const unknown=buildTacticalSlidePlan(unknownModel);
assert.equal(unknown.totals['Otros estados'],1);
assert.equal(unknown.totals.Manual,1);
assert.equal(unknown.pages.length,1);
console.log(`Pruebas de lámina única correctas: ${plan.pages.length} diapositiva, ${allEntries.length} entradas sin pérdida.`);
