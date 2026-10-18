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
const {exportTacticalSummaryPpt}=await import('../ppt-export.js');
const e=(id,name,status,dep,green=true)=>({id, name,status,statusRaw:status,dependency:dep,high:true,green,dateAlerts:[]});
const valid=['RENIEC','CONADIS','SUNAT','SINAREJ - Aranceles','MIGRACIONES','SINOE / SINOTEL','MPE - Redireccionamiento'].map((name,i)=>e('v'+i,name,'Validada','GSJ'));
const primary=[...valid,e('p1','ASBANC / Embargos','Por validar','GSJ'),e('p2','SERNOT','Por validar','GTI / SOFTPLAN'),e('t1','Inventario / SIE - Estadístico','En pruebas','Softplan / PJ'),e('d1','SINAREJ - Depósitos / Orden de Pago','En desarrollo','GTI'),e('d2','Sinarej Multas','En desarrollo','Softplan / GTI')];
const manual=e('m1','Elevación de Expedientes Digitalizados a la Corte Suprema','Sin clasificar','Softplan');manual.statusRaw='manual';manual.high=false;
await exportTacticalSummaryPpt({category:{id:'critica',label:'Severidad Crítica'},stateFilter:'Todos',query:'',primary,visibleFiltered:primary,nonPrioritized:[],manualEntries:[manual]});
console.log('PPTX generated for the seven validated entries.');
