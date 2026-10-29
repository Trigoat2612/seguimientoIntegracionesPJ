/** Genera dos PPTX (Crítica y Alta) sin navegador, para validar lámina única y colores. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const PptxGenJS=require('pptxgenjs');
globalThis.window={PptxGenJS};
globalThis.fetch=async url=>({ok:true,blob:async()=>new Blob([fs.readFileSync(path.resolve(url))])});
globalThis.FileReader=class{
 readAsDataURL(blob){blob.arrayBuffer().then(arr=>{this.result=`data:image/png;base64,${Buffer.from(arr).toString('base64')}`;this.onload?.();}).catch(e=>this.onerror?.(e));}
};
const {exportTacticalSummaryPpt}=await import('../src/client/presentations/ppt-export.js');
const entry=(id,name,status,dep,high=true,green=false)=>({id:`e${id}`,row:id+1,name,status,statusRaw:status,dependency:dep,high,green,dateAlerts:[]});
const entries=[...Array.from({length:9},(_,i)=>entry(i+1,'Validación e integración de RENIEC/'+(i+1),'Validada','GSJ',true,true)),
 ...Array.from({length:8},(_,i)=>entry(i+10,'Interoperabilidad SUNARP/'+(i+1),'Por validar','GTI',true,true)),
 ...Array.from({length:7},(_,i)=>entry(i+20,'ASBANC Embargos/'+(i+1),'En pruebas','SOFTPLAN',true,true)),
 ...Array.from({length:7},(_,i)=>entry(i+30,'SINAREJ Depósitos/'+(i+1),'En desarrollo','GTI',true,true)),
 entry(40,'Ciclo 2 pendiente','Sin clasificar','PJ',true,true)];
const manual=[entry(45,'Elevación Suprema','Sin clasificar','PJ',false,false),entry(46,'Ingreso manual','Sin clasificar','SGE',false,false)];manual.forEach(e=>e.statusRaw='manual');
for(const category of [{id:'critica',label:'Severidad Crítica'},{id:'alta',label:'Severidad Alta'}]){
 await exportTacticalSummaryPpt({category,primary:entries,visibleFiltered:entries,nonPrioritized:manual,manualEntries:manual,stateFilter:'Todos',query:''});
}
console.log('Smoke export crítico/alta completo');
