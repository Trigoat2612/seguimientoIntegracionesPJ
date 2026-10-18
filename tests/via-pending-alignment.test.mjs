import assert from 'node:assert/strict';
import {exportViasPpt} from '../via-ppt-export.js';

let deck;
class FakePpt {
  constructor(){deck=this;this.slides=[];this.ShapeType={rect:'rect',ellipse:'ellipse',line:'line'};}
  addSlide(){
    const slide={nodes:[],addShape(type,opts){this.nodes.push({type:'shape',kind:type,...opts});},addText(value,opts){this.nodes.push({type:'text',value,...opts});},addImage(opts){this.nodes.push({type:'image',...opts});}};
    this.slides.push(slide);return slide;
  }
  async writeFile({fileName}){this.lastFile=fileName;}
}
globalThis.window={PptxGenJS:FakePpt};
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['PNG'])});
globalThis.FileReader=class{async readAsDataURL(blob){this.result='data:image/png;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}};
const list=(prefix,n,ready)=>Array.from({length:n},(_,i)=>({name:`${prefix} ${i+1}`,ready}));

// Different numbers of ready and pending integrations must never shift the pending heading.
const stages=[
  {name:'Registro demanda',ready:list('A',6,true),pending:[]},
  {name:'Calificación',ready:list('B',4,true),pending:list('C',1,false)},
  {name:'Trámite',ready:list('D',4,true),pending:list('E',3,false)},
  {name:'Ejecución',ready:list('F',4,true),pending:list('G',4,false)}
];
await exportViasPpt([{name:'Ordinaria',stages}],'critica');
assert.equal(deck.slides.length,1);
const slide=deck.slides[0];
const pending=slide.nodes.filter(n=>n.type==='text'&&n.value==='Integraciones Pendientes');
assert.equal(pending.length,4);
assert.ok(pending.every(n=>Math.abs(n.y-pending[0].y)<1e-9),'Los cuatro títulos Pendientes deben estar a la misma altura.');
const separator=slide.nodes.filter(n=>n.type==='shape'&&n.kind==='line'&&Math.abs(n.y-(pending[0].y-0.05))<1e-9);
assert.equal(separator.length,4,'También deben alinearse las cuatro líneas divisorias.');
assert.ok(slide.nodes.some(n=>n.type==='text'&&n.value==='Integraciones pendientes'),'El indicador global sigue presente.');

// In two-row layouts, align pending headings within each row of panels.
const sixStages=['Registro demanda','Calificación','Trámite','Ejecución','Apelación','Casación'].map((name,i)=>({name,ready:list(`R${i}`,1,true),pending:list(`P${i}`,1,false)}));
await exportViasPpt([{name:'Otra vía',stages:sixStages}],'alta');
const sixPending=deck.slides[0].nodes.filter(n=>n.type==='text'&&n.value==='Integraciones Pendientes');
assert.equal(sixPending.length,6);
assert.ok(sixPending.slice(0,4).every(n=>Math.abs(n.y-sixPending[0].y)<1e-9));
assert.ok(sixPending.slice(4).every(n=>Math.abs(n.y-sixPending[4].y)<1e-9));
console.log('Alineación horizontal de Pendientes en una y dos filas: OK');
