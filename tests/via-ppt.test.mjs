import assert from 'node:assert/strict';
import {exportViasPpt} from '../via-ppt-export.js';
let deck;
class FakePpt{
 constructor(){deck=this;this.slides=[];this.ShapeType={rect:'rect',ellipse:'ellipse',line:'line'};}
 addSlide(){const s={nodes:[],addShape(type,opts){this.nodes.push(['shape',type,opts]);},addText(value,opts){this.nodes.push(['text',value,opts]);},addImage(opts){this.nodes.push(['image',opts]);}};this.slides.push(s);return s;}
 async writeFile({fileName}){this.lastFile=fileName;}
}
globalThis.window={PptxGenJS:FakePpt};
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['PNG'])});
globalThis.FileReader=class {async readAsDataURL(blob){const buf=Buffer.from(await blob.arrayBuffer());this.result='data:image/png;base64,'+buf.toString('base64');this.onload();}};
const mk=(name,ready)=>({id:name,name,ready,status:ready?'Validada':'En desarrollo',high:true,green:false});
const stages=[{name:'Registro demanda',ready:['RENIEC','MIGRACIONES','CONADIS','SUNAT','MPE - Redireccionamiento','SINOE / SINOTEL','SINAREJ - Aranceles','SERNOT'].map(n=>mk(n,true)),pending:[mk('SUNARP',false)]},{name:'Calificación',ready:[mk('ASBANC / Embargos',true)],pending:[mk('Depósitos',false)]},{name:'Trámite',ready:[mk('SIE',true)],pending:[]},{name:'Ejecución',ready:[],pending:[mk('REMAJU',false)]}];
await exportViasPpt([{name:'Vía Ordinaria',stages},{name:'Vía Sumarísima',stages}],'alta');
assert.equal(deck.slides.length,2,'una diapositiva por vía');
const names=deck.slides[0].nodes.filter(([type])=>type==='text').map(x=>String(x[1]));
assert.ok(names.includes('RENIEC'));assert.ok(names.includes('SUNARP'));assert.ok(names.includes('Integraciones Listas'));assert.ok(names.includes('Integraciones Pendientes'));assert.ok(names.includes('Vía Ordinaria'));
assert.ok(deck.lastFile.endsWith('.pptx'));
assert.equal(deck.slides[0].nodes.some(x=>x[0]==='image'),true);
console.log('Exportación por vías: dos diapositivas y sin omitir los nombres de prueba.');
