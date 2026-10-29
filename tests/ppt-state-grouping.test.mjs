import assert from 'node:assert/strict';
import {buildTacticalSlidePlan} from '../src/client/presentations/ppt-layout.js';
const e=(id,name,status='Validada',dependency='GSJ')=>({id, name,status,statusRaw:status,dependency,high:true,green:true,dateAlerts:[]});
// Caso reportado en la diapositiva: MPE Redireccionamiento es Validada y
// nunca debe migrar a un cuadro denominado «Otros estados» por falta de espacio.
const validated=['RENIEC','CONADIS','SUNAT','SINAREJ - Aranceles','MIGRACIONES','SINOE / SINOTEL','MPE - Redireccionamiento'].map((n,i)=>e('v'+i,n));
const model={category:{id:'critica',label:'Severidad Crítica'},stateFilter:'Todos',query:'',primary:validated,visibleFiltered:validated,manualEntries:[e('m1','Elevación de Expedientes Digitalizados a la Corte Suprema','Sin clasificar','Softplan')],nonPrioritized:[]};
model.manualEntries[0].statusRaw='manual';
const plan=buildTacticalSlidePlan(model);
assert.equal(plan.pages.length,1);
assert.equal(plan.totals.Validada,7);
assert.deepEqual(plan.pages[0].parts.Validada.flat().map(x=>x.entry.name).sort(),validated.map(v=>v.name).sort());
assert.equal(plan.pages[0].parts.Continuacion.flat().length,0);
assert.equal(plan.pages[0].parts['Otros estados'].flat().length,0);
assert.equal(plan.pages[0].parts.Manual.flat().length,1);
// Una mezcla de distintas entidades en E no debe cambiar el estado ni reclasificar.
const withOtherEntity=validated.map((v,i)=>({...v,dependency:i===6?'GTI / SOFTPLAN':v.dependency}));
const mixed=buildTacticalSlidePlan({...model,primary:withOtherEntity,visibleFiltered:withOtherEntity});
assert.equal(mixed.pages[0].parts.Validada.flat().length,7);
assert.equal(mixed.pages[0].parts['Otros estados'].flat().length,0);
// Solo un estado genuinamente distinto de los cuatro queda en Otros estados.
const unknown=e('s1','SINOJ','Sin clasificar','GTI');unknown.statusRaw='Ciclo 2';
const special=buildTacticalSlidePlan({...model,primary:[...validated,unknown],visibleFiltered:[...validated,unknown]});
assert.deepEqual(special.pages[0].parts['Otros estados'].flat().map(x=>x.entry.name),['SINOJ']);
console.log('Agrupación por estado correcta: Validada no se envía a Otros estados por ajuste visual.');
