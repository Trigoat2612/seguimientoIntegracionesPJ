import assert from 'node:assert/strict';
import {parseVias,getViaView} from '../vias.js';
import {exportViasPpt} from '../via-ppt-export.js';

const data={entries:[
 {name:'RENIEC',status:'Validada',statusRaw:'Validada',high:true,green:true},
 {name:'SUNARP',status:'En pruebas',statusRaw:'En Pruebas',high:true,green:false},
 {name:'SERNOT',status:'Validada',statusRaw:'Validada',high:false,green:false}
]};
const rows=[['Vía','Etapa','Integración'],
 ['Conflicto de autoridad','Trámite','RENIEC'],
 ['','Recepción','RENIEC'], // aparece en dos etapas, se cuenta una vez
 ['','Trámite','SUNARP'],
 ['','Recepción','SERNOT'],
 ['Vía Ordinaria','Trámite','SUNARP'],
 ['','Registro demanda','RENIEC']];
const parsed=parseVias(new Map([['IntegracionesEtapa',rows]]),data);
assert.equal(parsed.error,'');
const view=getViaView(parsed,'Conflicto de autoridad');
assert.deepEqual(view.stages.map(s=>s.name),['Recepción','Trámite']);
assert.equal(view.total,3,'sin doble conteo de RENIEC entre etapas');
assert.equal(view.ready,2);
assert.equal(view.pending,1);
assert.equal(view.associations,4,'se mantiene detalle por etapa');
const severe=getViaView(parsed,'Conflicto de autoridad','critica');
assert.equal(severe.ready,1);
assert.equal(severe.pending,0);
assert.deepEqual(severe.stages.map(s=>s.name),['Recepción','Trámite']);
assert.deepEqual(getViaView(parsed,'Vía Ordinaria').stages.map(s=>s.name),['Registro demanda','Trámite']);

let deck;
class FakePpt {
 constructor(){deck=this;this.slides=[];this.ShapeType={rect:'rect',ellipse:'ellipse',line:'line'};}
 addSlide(){const slide={nodes:[],addShape(type,opts){this.nodes.push(['shape',type,opts]);},addText(value,opts){this.nodes.push(['text',value,opts]);},addImage(opts){this.nodes.push(['image',opts]);}};this.slides.push(slide);return slide;}
 async writeFile({fileName}){this.lastFile=fileName;}
}
globalThis.window={PptxGenJS:FakePpt};
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['PNG'])});
globalThis.FileReader=class {async readAsDataURL(blob){this.result='data:image/png;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}};
await exportViasPpt([view],'todas');
assert.equal(deck.slides.length,1);
const texts=deck.slides[0].nodes.filter(n=>n[0]==='text').map(n=>String(n[1]));
assert.equal(texts.filter(t=>t==='Integraciones listas').length,1,'indicador de listas único');
assert.equal(texts.filter(t=>t==='Integraciones pendientes').length,1,'indicador de pendientes único');
assert.equal(texts.filter(t=>t==='2').length,1,'total de validadas una sola vez');
assert.equal(texts.filter(t=>t==='1').length,1,'total de pendientes una sola vez');
assert.ok(texts.indexOf('Recepción')<texts.indexOf('Trámite'));
assert.ok(texts.includes('RENIEC')&&texts.includes('SUNARP'));
console.log('Orden Conflicto de autoridad, deduplicación y PowerPoint con dos indicadores: OK');
