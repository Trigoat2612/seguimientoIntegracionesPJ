/** PowerPoint editable con medidas y paleta de Diapo_Resumen(1).pptx. */
import {buildTacticalSlidePlan,PRESENTATION_STATES,packOverflowItems} from './ppt-layout.js';
import {entityPresentation,integrationWithEntity} from './ppt-entities.js';
const LIBRARY='./src/client/assets/vendor/pptxgen.bundle.js';
const TEMPLATE_BG='./src/client/assets/ppt-template-bg.png';
export const PPT_COLORS=Object.freeze({green:'2E7D32',blue:'00244F',red:'C00000',yellow:'FFC000',titleRed:'7E1E1E',text:'1A1F2B',muted:'4A4E57',gray:'A5A5A5',purple:'7030A0',border:'D9DCE1',white:'FFFFFF'});
const C=PPT_COLORS;

const norm=v=>String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function splitNonPrioritizedGroups(entries){
 const items=(entries||[]).map(it=>it?.entry||it).filter(Boolean);
 const groups={
  'Ciclo 2':items.filter(e=>norm(e.statusRaw)==='ciclo 2'),
  'Ciclo 2/3':items.filter(e=>/^ciclo 2\s*\/\s*3$/.test(norm(e.statusRaw))),
  'Funcionalidad nativa del sistema':items.filter(e=>norm(e.statusRaw)==='funcionalidad para ciclo 1'),
  'No aplica integración':items.filter(e=>norm(e.statusRaw)==='no aplica integracion')
 };
 const used=new Set(Object.values(groups).flat().map(e=>String(e.id||e.name)));
 groups['Otros estados']=items.filter(e=>!used.has(String(e.id||e.name)));
 return groups;
}
function compactColumns(entries,cols=2,rowH=0.15){
 const list=(entries||[]).map(entry=>({entry,height:rowH}));
 const columns=Array.from({length:cols},()=>[]);
 if(!list.length)return columns;
 const perCol=Math.ceil(list.length/cols);
 list.forEach((item,i)=>{columns[Math.min(cols-1,Math.floor(i/perCol))].push(item);});
 return columns;
}
function miniGroupPanel(slide,pptx,pos,title,count,entries,color){
 rect(slide,pptx,pos.x,pos.y,pos.w,pos.h,C.white,C.border,0.7);
 rect(slide,pptx,pos.x,pos.y,0.045,pos.h,color,color,0);
 addText(slide,title,pos.x+0.14,pos.y+0.06,pos.w-0.62,0.16,{fontSize:9.4,bold:true,fit:'shrink'});
 addText(slide,String(count),pos.x+pos.w-0.34,pos.y+0.04,0.22,0.18,{fontSize:12,bold:true,align:'right',color});
 if(!(entries||[]).length){
  addText(slide,'Sin registros',pos.x+0.14,pos.y+0.27,pos.w-0.28,0.14,{fontSize:7.8,italic:true,color:C.muted});
  return;
 }
 const desiredCols=(entries||[]).length>3?2:1;
 const cols=compactColumns(entries,desiredCols,0.11), left=pos.x+0.14, gap=0.10, available=pos.w-0.28-(desiredCols-1)*gap, colW=available/desiredCols;
 for(const [ci,items] of cols.entries()){
  let cy=pos.y+0.24;
  for(const it of items){
   item(slide,pptx,it,left+ci*(colW+gap),cy,colW,{bulletColor:color,font:6.8,perIntegrationEntity:false,purple:false});
   cy+=it.height;
  }
 }
}
function renderNonPrioritizedExtras(slide,pptx,page){
 const groups=splitNonPrioritizedGroups(page.parts['Otros estados'].flat());
 const area={x:0.424,y:4.368,w:12.390,h:1.875};
 rect(slide,pptx,area.x,area.y,area.w,area.h,C.white,C.border,0.7);
 addText(slide,'Clasificaciones adicionales',area.x+0.16,area.y+0.08,3.6,0.18,{fontSize:12.5,bold:true});
 const cards=[
  {title:'Ciclo 2', entries:groups['Ciclo 2'], color:C.blue, x:area.x+0.16, y:area.y+0.34, w:6.00, h:0.62},
  {title:'Ciclo 2/3', entries:groups['Ciclo 2/3'], color:C.blue, x:area.x+6.28, y:area.y+0.34, w:5.95, h:0.62},
  {title:'Funcionalidad nativa del sistema', entries:groups['Funcionalidad nativa del sistema'], color:C.gray, x:area.x+0.16, y:area.y+1.03, w:6.00, h:0.62},
  {title:'No aplica integración', entries:groups['No aplica integración'], color:C.gray, x:area.x+6.28, y:area.y+1.03, w:5.95, h:0.62}
 ];
 cards.forEach(c=>miniGroupPanel(slide,pptx,c,c.title,(c.entries||[]).length,c.entries,c.color));
 if((groups['Otros estados']||[]).length){
  addText(slide,`Otros estados: ${groups['Otros estados'].length}`,area.x+9.55,area.y+0.08,2.5,0.16,{fontSize:8.2,color:C.muted,align:'right'});
 }
}

const POS={
  cards:[{x:0.424,y:1.010,w:3.000,h:1.050},{x:3.554,y:1.010,w:3.000,h:1.050},{x:6.704,y:1.013,w:3.000,h:1.050},{x:9.804,y:1.007,w:3.000,h:1.050}],
  sections:{
   'Validada':{x:0.418,y:2.207,w:3.010,h:2.038,color:C.green},
   'Por validar':{x:3.554,y:2.220,w:3.010,h:2.023,color:C.blue},
   'En pruebas':{x:6.700,y:2.220,w:3.010,h:2.023,color:C.red},
   'En desarrollo':{x:9.860,y:2.224,w:3.010,h:2.020,color:C.yellow},
   'Otros estados':{x:3.554,y:4.370,w:9.260,h:2.060,color:C.gray}
  },
  manualCard:{x:0.424,y:4.368,w:3.000,h:0.781},
  manualPanel:{x:0.414,y:5.287,w:3.010,h:1.195}
};
let pptxPromise=null,bgPromise=null;
function loadPptx(){
 if(window.PptxGenJS)return Promise.resolve(window.PptxGenJS);
 if(pptxPromise)return pptxPromise;
 pptxPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=LIBRARY;script.async=true;
  script.onload=()=>window.PptxGenJS?resolve(window.PptxGenJS):reject(new Error('No se pudo iniciar el generador de PowerPoint.'));
  script.onerror=()=>reject(new Error('No se pudo cargar la biblioteca local de PowerPoint.'));
  document.head.appendChild(script);
 }).catch(e=>{pptxPromise=null;throw e;});
 return pptxPromise;
}
async function getBg(){
 if(!bgPromise)bgPromise=fetch(TEMPLATE_BG).then(async r=>{
  if(!r.ok)throw new Error('Falta el fondo de la presentación.');
  const blob=await r.blob();
  return new Promise((resolve,reject)=>{
   const file=new FileReader();file.onload=()=>resolve(file.result);file.onerror=reject;file.readAsDataURL(blob);
  });
 }).catch(e=>{bgPromise=null;throw e;});
 return bgPromise;
}
function addText(slide,value,x,y,w,h,extra={}){
 slide.addText(String(value??''),{
  x,y,w,h,fontFace:'Calibri',fontSize:9.2,color:C.text,
  breakLine:false,margin:0,vertAlign:'mid',
  ...extra
 });
}
function rect(slide,pptx,x,y,w,h,fill,line=C.border,pt=0.7){
 slide.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:fill},line:{color:line,pt}});
}
function card(slide,pptx,pos,num,label,color,subtitle=''){
 rect(slide,pptx,pos.x,pos.y,pos.w,pos.h,C.white,C.border,0.7);
 rect(slide,pptx,pos.x,pos.y,pos.w,0.079,color,color,0);
 addText(slide,num,pos.x+0.18,pos.y+0.21,0.80,0.50,{color,fontSize:31,bold:true,align:'left'});
 addText(slide,label,pos.x+1.17,pos.y+0.20,pos.w-1.30,0.26,{fontSize:14,bold:true});
 if(subtitle)addText(slide,subtitle,pos.x+1.17,pos.y+0.54,pos.w-1.35,0.18,{fontSize:8.1,italic:true,color:C.muted});
}
function item(slide,pptx,itemLayout,x,y,w,{bulletColor=C.blue,font=8.5,perIntegrationEntity=false,purple=false}){
 const {entry,height}=itemLayout;
 const alert=(entry.dateAlerts||[]).length>0;
 const color=purple?C.purple:C.text;
 slide.addShape(pptx.ShapeType.ellipse,{
  x:x,y:y+0.020,w:0.060,h:0.060,
  fill:{color:bulletColor},line:{color:bulletColor,pt:0}
 });
 const name=integrationWithEntity(entry,perIntegrationEntity);
 // En paneles mixtos, cada integración identifica exclusivamente su propia celda E.
 addText(slide,name,x+0.13,y,w-0.13,Math.max(0.18,height-0.005),{
  fontSize:font,bold:purple||alert,color,breakLine:false,fit:'shrink',valign:'top'
 });
}
function panel(slide,pptx,pos,title,columns,opts={}){
 const {color,x,y,w,h}=pos;
 const entity=entityPresentation(columns);
 rect(slide,pptx,x,y,w,h,C.white,C.border,0.7);
 rect(slide,pptx,x,y,0.052,h,color,color,0);
 addText(slide,title,x+0.19,y+0.09,w-0.31,0.24,{fontSize:14,bold:true});
 if(entity.header)addText(slide,`Entidad: ${entity.header}`,x+0.19,y+0.43,w-0.32,0.22,{italic:true,fontSize:8.5,color:C.muted,fit:'shrink'});
 slide.addShape(pptx.ShapeType.line,{x:x+0.18,y:y+0.81,w:w-0.31,h:0,line:{color:C.border,pt:0.7}});
 const count=Math.max(1,columns.length),left=x+0.21,gap=0.15,available=w-0.37-(count-1)*gap,colW=available/count;
 for(const [ci,items] of columns.entries()){
  let cy=y+0.91;
  for(const ent of items){
   item(slide,pptx,ent,left+ci*(colW+gap),cy,colW,{bulletColor:color,font:opts.font||8.5,perIntegrationEntity:entity.perIntegration,purple:!!opts.purple});
   cy+=ent.height;
  }
 }
}
function addManual(slide,pptx,part,count,hasData,purple=false){
 const c=POS.manualCard,p=POS.manualPanel;
 card(slide,pptx,c,count,'Manual',C.gray);
 rect(slide,pptx,p.x,p.y,p.w,p.h,C.white,C.border,0.7);
 rect(slide,pptx,p.x,p.y,0.052,p.h,C.gray,C.gray,0);
 addText(slide,'Integraciones en Desarrollo',p.x+0.2,p.y+0.10,p.w-0.29,0.23,{fontSize:13.5,bold:true});
 const entity=entityPresentation(part);
 if(entity.header)addText(slide,'Entidad: '+entity.header,p.x+0.19,p.y+0.43,p.w-0.29,0.17,{fontSize:8.5,italic:true,color:C.muted,fit:'shrink'});
 slide.addShape(pptx.ShapeType.line,{x:p.x+0.18,y:p.y+0.81,w:p.w-0.3,h:0,line:{color:C.border,pt:0.7}});
 let cy=p.y+0.90;
 const entries=part[0]||[];
 if(entries.length){
  for(const e of entries){item(slide,pptx,e,p.x+0.20,cy,p.w-0.37,{bulletColor:C.gray,font:7.8,perIntegrationEntity:entity.perIntegration,purple});cy+=e.height;}
 }else{
  addText(slide,hasData?'Sin registros adicionales':'Sin integraciones manuales',p.x+0.30,cy,p.w-0.47,0.16,{fontSize:8.2,italic:true,color:C.muted});
 }
}
function title(slide,pptx,pageNum,totalPages){
 slide.addText([
  {text:'+ EJE –',options:{color:C.blue,bold:true}},
  {text:' Status Integraciones',options:{color:C.titleRed,bold:true}}
 ],{x:0.383,y:0.164,w:7.64,h:0.57,fontFace:'Calibri',fontSize:28,margin:0,fit:'shrink'});
 if(totalPages>1)addText(slide,`Continuación ${pageNum}/${totalPages}`,10.00,0.55,2.74,0.17,{align:'right',fontSize:8.5,color:C.muted});
}
function addFooter(slide,plan,model,pageIndex){
 const category=model.presentationLabel||model.category?.label||'Todas las integraciones';
 const extra=plan.pages.length>1?` · Lámina ${pageIndex}/${plan.pages.length}`:'';
 const note=`Fuente: Seguimiento (filas 1–36) · ${category}${extra}`;
 addText(slide,note,3.55,6.29,8.8,0.15,{fontSize:7.1,color:C.muted,fit:'shrink'});
}
function renderSlide(pptx,bg,page,plan,meta={}){
 const slide=pptx.addSlide();
 slide.background={color:C.white};
 slide.addImage({data:bg,x:0,y:0,w:13.333333,h:7.5});
 title(slide,pptx,meta.index||page.index,meta.totalPages||page.totalPages);
 const states=['Validada','Por validar','En pruebas','En desarrollo'];
 const purple=plan.model.category?.id==='critica';
 states.forEach((state,i)=>{
  const palette=[C.green,C.blue,C.orange||'C55A11',C.yellow][i];
  card(slide,pptx,POS.cards[i],page.totals[state],state==='Validada'?'Validadas':state,palette,i===0?'Integraciones validadas':'');
 });
 for(const st of states){
  const section=POS.sections[st];
  const captions={'Validada':'Integraciones validadas','Por validar':'Integraciones por validar','En pruebas':'Integraciones en Pruebas','En desarrollo':'Integraciones en Desarrollo'};
  panel(slide,pptx,section,captions[st],page.parts[st],{font:page.fontByState?.[st]||(st==='Validada'?7.8:8.0),purple});
 }
 if(plan.model.category?.id!=='no_priorizadas'){
  addManual(slide,pptx,page.parts.Manual,page.totals.Manual,plan.manualCount>0,purple);
 }
 // Un estado reconocido nunca aparece bajo la etiqueta «Otros estados».
 const continued=page.parts.Continuacion.flat();
 const unclassified=page.parts['Otros estados'].flat();
 if(plan.model.category?.id==='no_priorizadas' && unclassified.length && !continued.length){
  renderNonPrioritizedExtras(slide,pptx,page);
 }else if(continued.length||unclassified.length){
  const title=continued.length
   ? (unclassified.length?'Continuación por estado y estados sin clasificar':'Continuación por estado')
   : 'Estados sin clasificar';
  // La sección inferior se reserva solamente para capacidad insuficiente o un estado
  // distinto de Validada / Por validar / En pruebas / En desarrollo / Manual.
  const extra=packOverflowItems([...continued,...unclassified].map(it=>it.entry));
  panel(slide,pptx,POS.sections['Otros estados'],title,extra.columns,{font:extra.font,purple});
 }
 addFooter(slide,plan,plan.model,meta.index||page.index);
 return slide;
}
function buildSupplementaryNonPrioritizedModel(model){
 const items=Array.isArray(model?.nonPrioritized)?model.nonPrioritized:[];
 return {
  ...model,
  category:{id:'no_priorizadas',label:'Integraciones no priorizadas'},
  presentationLabel:'Integraciones no priorizadas',
  primary:items,
  visibleFiltered:items,
  unknown:items.filter(e=>!PRESENTATION_STATES.includes(e.status)),
  manualEntries:items.filter(e=>String(e?.statusRaw||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase()==='manual')
 };
}
export async function exportTacticalSummaryPpt(model){
 const PptxGenJS=await loadPptx();
 const bg=await getBg();
 const pptx=new PptxGenJS();
 pptx.layout='LAYOUT_WIDE';pptx.author='Proyecto EJE No Penal';pptx.subject='Resumen táctico de integraciones';pptx.title='Status Integraciones';pptx.lang='es-PE';
 const plans=[];
 const primaryPlan=buildTacticalSlidePlan(model);
 plans.push(primaryPlan);
 if(model?.category?.id==='todas' && Array.isArray(model?.nonPrioritized) && model.nonPrioritized.length){
  plans.push(buildTacticalSlidePlan(buildSupplementaryNonPrioritizedModel(model)));
 }
 const totalSlides=plans.reduce((n,plan)=>n+plan.pages.length,0);
 let slideIndex=1;
 for(const plan of plans){
  for(const page of plan.pages){
   renderSlide(pptx,bg,page,plan,{index:slideIndex,totalPages:totalSlides});
   slideIndex++;
  }
 }
 const suffix=model.category?.id&&model.category.id!=='todas'?'_'+model.category.id:'';
 await pptx.writeFile({fileName:`Status_Integraciones${suffix}_${new Date().toISOString().slice(0,10)}.pptx`});
}
