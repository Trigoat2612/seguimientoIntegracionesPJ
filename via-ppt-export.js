/** Exportación editable por vía, basada en Integracionxvia.pptx. */
const LIB='./vendor/pptxgen.bundle.js';
const BG='./ppt-template-bg.png';
const C={navy:'00244F',red:'7E1E1E',text:'1A1F2B',muted:'4A4E57',green:'2E7D32',blue:'00244F',orange:'C55A11',yellow:'FFC000',border:'D9DCE1',white:'FFFFFF',purple:'7030A0'};
const accents=[C.green,C.blue,C.orange,C.yellow,'7952A1','007E87','B45309','738094'];
let libraryLoading=null,bgLoading=null;
function loadLibrary(){if(window.PptxGenJS)return Promise.resolve(window.PptxGenJS);if(libraryLoading)return libraryLoading;
 libraryLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=LIB;s.onload=()=>window.PptxGenJS?resolve(window.PptxGenJS):reject(new Error('No se cargó PowerPoint.'));s.onerror=()=>reject(new Error('Falta la librería de PowerPoint local.'));document.head.appendChild(s);}).catch(e=>{libraryLoading=null;throw e;});return libraryLoading;}
function background(){if(bgLoading)return bgLoading;bgLoading=fetch(BG).then(async r=>{if(!r.ok)throw new Error('No se pudo cargar el fondo institucional.');const b=await r.blob();return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(b);});}).catch(e=>{bgLoading=null;throw e;});return bgLoading;}
function text(slide,t,x,y,w,h,style={}){slide.addText(String(t??''),{x,y,w,h,margin:0,fontFace:'Calibri',fontSize:9,color:C.text,breakLine:false,valign:'mid',...style});}
function rect(slide,pptx,x,y,w,h,bg=C.white,border=C.border){slide.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:bg},line:{color:border,pt:0.65}});}
function totalCard(slide,pptx,label,total,x,y,w,accent){
 rect(slide,pptx,x,y,w,0.79);
 rect(slide,pptx,x,y,w,0.075,accent,accent);
 text(slide,String(total),x+0.19,y+0.20,0.87,0.40,{fontSize:28,color:accent,bold:true});
 text(slide,label,x+1.12,y+0.25,w-1.31,0.27,{fontSize:16,color:C.text,bold:true});
}
function estimateRows(list){return list.reduce((n,e)=>n+(String(e.name).length>45?2:1),0);}
function drawList(slide,pptx,entries,x,y,w,h,accent,purple){
 if(!entries.length){text(slide,'Sin registros',x+0.10,y,w-0.2,0.18,{fontSize:8,italic:true,color:C.muted});return;}
 // Elegir entre 1 y 2 columnas según el volumen. No se omite ningún registro.
 let cols=entries.length>4?2:1;
 const rows=Math.ceil(entries.length/cols);
 const tallest=Math.max(...Array.from({length:cols},(_,i)=>estimateRows(entries.slice(i*rows,(i+1)*rows))));
 const rowHeight=Math.min(0.205,(h-0.03)/Math.max(tallest,1));
 if(rowHeight<0.095)throw new Error(`La etapa contiene demasiadas integraciones para una diapositiva legible (${entries.length}).`);
 const fsize=Math.max(5.8,Math.min(8.6,8.6*rowHeight/0.194));
 for(let col=0;col<cols;col++){
  let cy=y;const cw=(w-(cols-1)*0.12)/cols;const cx=x+col*(cw+0.12);
  for(const e of entries.slice(col*rows,(col+1)*rows)){
   const wrapped=String(e.name).length>45;
   const lineCount=wrapped?2:1;const ih=rowHeight*lineCount;
   slide.addShape(pptx.ShapeType.ellipse,{x:cx,y:cy+0.045,w:0.062,h:0.062,fill:{color:accent},line:{color:accent,pt:0}});
   text(slide,e.name,cx+0.14,cy,cw-0.15,ih,{fontSize:fsize,color:purple?C.purple:C.text,bold:purple,fit:'shrink',valign:'top'});
   cy+=ih;
  }
 }
}
function stagePanel(slide,pptx,stage,x,y,w,h,accent,purple){
 rect(slide,pptx,x,y,w,h);rect(slide,pptx,x,y,0.05,h,accent,accent);
 const sectionTop=0.12;
 const listArea=Math.max(0.2,h-0.99);
 const readyRows=Math.max(1,Math.ceil(stage.ready.length/(stage.ready.length>4?2:1)));
 const pendingRows=Math.max(1,Math.ceil(stage.pending.length/(stage.pending.length>4?2:1)));
 let ratio=readyRows/(readyRows+pendingRows);
 ratio=Math.max(0.35,Math.min(0.67,ratio));
 const readyH=listArea*ratio,pendingH=listArea-readyH;
 text(slide,'Integraciones Listas',x+0.19,y+sectionTop,w-0.31,0.23,{fontSize:13.7,bold:true});
 slide.addShape(pptx.ShapeType.line,{x:x+0.18,y:y+0.42,w:w-0.3,h:0,line:{color:C.border,pt:0.7}});
 drawList(slide,pptx,stage.ready,x+0.19,y+0.49,w-0.31,readyH,accent,purple);
 const py=y+0.49+readyH+0.07;
 text(slide,'Integraciones Pendientes',x+0.19,py,w-0.31,0.23,{fontSize:13.7,bold:true});
 slide.addShape(pptx.ShapeType.line,{x:x+0.18,y:py+0.25,w:w-0.3,h:0,line:{color:C.border,pt:0.7}});
 drawList(slide,pptx,stage.pending,x+0.19,py+0.33,w-0.31,Math.max(0.12,pendingH-0.25),accent,purple);
}
function slideTitle(slide,via){
 text(slide,'+ EJE –',0.38,0.15,1.42,0.47,{fontSize:28,bold:true,color:C.navy});
 text(slide,via.name,1.82,0.15,7.25,0.47,{fontSize:28,bold:true,color:C.red,fit:'shrink'});
 text(slide,'+ Etapas',0.42,0.73,5.2,0.39,{fontSize:23,bold:true,color:C.navy});
}
function renderSingle(pptx,bg,via,severity){
 const slide=pptx.addSlide();
 slide.background={color:C.white};slide.addImage({data:bg,x:0,y:0,w:13.333333,h:7.5});slideTitle(slide,via);
 const stages=via.stages;const n=stages.length;
 // Dos totales para toda la vía. Nunca se muestran cifras por etapa.
 const countUnique=ready=>new Set(stages.flatMap(st=>st[ready?'ready':'pending'].map(e=>String(e.name||'').trim().toLowerCase()))).size;
 totalCard(slide,pptx,'Integraciones listas',Number.isInteger(via.ready)?via.ready:countUnique(true),0.42,1.15,6.06,C.green);
 totalCard(slide,pptx,'Integraciones pendientes',Number.isInteger(via.pending)?via.pending:countUnique(false),6.64,1.15,6.05,C.orange);
 if(!n){text(slide,'No hay integraciones para este filtro de severidad.',0.45,2.3,11,0.33,{fontSize:16,color:C.muted});return;}
 if(n>8)throw new Error(`La vía «${via.name}» contiene ${n} etapas; supera las 8 que caben en una diapositiva legible.`);
 const rows=n>4?2:1,maxCols=Math.min(4,n),margin=0.42,gap=0.14,width=(12.44-(maxCols-1)*gap)/maxCols;
 const panelY=2.12,panelH=rows===1?3.98:1.92,panelGap=0.18;
 for(let i=0;i<n;i++){
  const row=Math.floor(i/maxCols),col=i%maxCols;
  const px=margin+col*(width+gap),py=panelY+row*(panelH+panelGap),accent=accents[i%accents.length];
  // Cabecera de etapa solo con su nombre; «Listas/Pendientes» en el interior, sin contadores.
  rect(slide,pptx,px,py,width,panelH,C.white);
  rect(slide,pptx,px,py,width,0.07,accent,accent);
  text(slide,stages[i].name,px+0.12,py+0.16,width-0.24,0.28,{fontSize:12.6,bold:true,fit:'shrink',align:'center'});
  const listTop=py+0.52;
  const stage=stages[i];
  // Divisor compartido por todas las etapas de una misma fila del PowerPoint.
  // Nunca depende de cuántas integraciones listas tenga cada etapa: así el
  // encabezado «Integraciones Pendientes» y su separador quedan alineados.
  // En una cuadrícula de dos filas se usa una división proporcional compacta.
  const pendTop=py+(rows===1?2.83:1.17);
  const readyListTop=listTop+0.28;
  const readyListHeight=Math.max(0.13,pendTop-readyListTop-0.12);
  const pendingListTop=pendTop+0.28;
  const pendingListHeight=Math.max(0.12,py+panelH-pendingListTop-0.12);
  text(slide,'Integraciones Listas',px+0.14,listTop,width-0.26,0.23,{fontSize:11.3,bold:true,color:C.green});
  drawList(slide,pptx,stage.ready,px+0.16,readyListTop,width-0.29,readyListHeight,accent,severity==='critica');
  slide.addShape(pptx.ShapeType.line,{x:px+0.14,y:pendTop-0.05,w:width-0.28,h:0,line:{color:C.border,pt:0.7}});
  text(slide,'Integraciones Pendientes',px+0.14,pendTop,width-0.26,0.23,{fontSize:11.3,bold:true,color:C.orange});
  drawList(slide,pptx,stage.pending,px+0.16,pendingListTop,width-0.29,pendingListHeight,accent,severity==='critica');
 }
 text(slide,`Fuente: IntegracionesEtapa y Seguimiento · Severidad: ${severity==='todas'?'Todas':severity} · Vía: ${via.name} · Totales por integración única`,
  0.42,6.51,12.25,0.16,{fontSize:7.2,color:C.muted,fit:'shrink'});
}
export async function exportViasPpt(vias,severity='todas'){
 if(!vias?.length)throw new Error('No hay vías disponibles para exportar.');
 const PptxGenJS=await loadLibrary(),bg=await background();
 const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author='Proyecto EJE No Penal';pptx.subject='Integraciones por vía y etapa';pptx.title='EJE – Integraciones por vía';pptx.lang='es-PE';
 vias.forEach(v=>renderSingle(pptx,bg,v,severity));
 const all=vias.length>1?'Todas_las_vias':vias[0].name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]+/g,'_').slice(0,40);
 const name=`Integraciones_por_via_${all}_${new Date().toISOString().slice(0,10)}.pptx`;
 await pptx.writeFile({fileName:name});return name;
}
