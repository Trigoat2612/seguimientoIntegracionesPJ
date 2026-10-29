/** IntegracionesEtapa: interpretación conservadora y diagnóstico de estructura.
 * La fuente técnica es Seguimiento; nunca se infiere una conformidad ausente.
 */
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cell=v=>String(v??'').trim();
const STAGE_ORDER=['Registro demanda','Calificación','Trámite','Ejecución'];
const STAGE_SYNONYMS=[['Registro demanda','registro de demanda','presentacion de demanda','admisión de demanda'],['Calificación','calificacion de demanda','calificacion'],['Trámite','tramite','tramitacion'],['Ejecución','ejecucion','ejecucion de sentencia']];
const words={via:['via','via procesal','tipo de via','tipo via','tipo de proceso','via del proceso','via judicial','procedimiento','proceso judicial'],etapa:['etapa','etapa procesal','fase','fase procesal','etapas','etapa del proceso'],integracion:['integracion','integraciones','nombre integracion','nombre de integracion','integraciones por via','aplicativo','aplicativos','sistema','servicio','nombre del sistema'],estado:['estado','estado integracion','estado de integracion','situacion','estatus'],severidad:['severidad','criticidad','prioridad']};
function headerKey(v){const s=norm(v);if(!s)return null;for(const [key,names] of Object.entries(words))if(names.some(n=>s===n||s.startsWith(n+' ')||s.endsWith(' '+n)))return key;return null;}
const canonicalStage=s=>{const n=norm(s);return STAGE_SYNONYMS.find(g=>g.some(x=>norm(x)===n))?.[0]||null;};
const isStageName=s=>!!canonicalStage(s);
// La vía Conflicto de autoridad comienza por Recepción y continúa con Trámite.
// Se aplica solo a esa vía, sin alterar el orden de las demás.
const sortStagesForVia=(viaName,a,b)=>{
 if(norm(viaName).includes('conflicto de autoridad')){
  const priority=s=>norm(s).startsWith('recepcion')?0:norm(s).startsWith('tramite')?1:2;
  const diff=priority(a)-priority(b);
  if(diff)return diff;
 }
 const ai=STAGE_ORDER.findIndex(x=>norm(x)===norm(a)),bi=STAGE_ORDER.findIndex(x=>norm(x)===norm(b));
 return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b,'es');
};
const matchKey=v=>norm(v).replace(/\b(de|del|el|la|los|las|para|y)\b/g,'').replace(/\s+/g,' ').trim();
const FIXED_ALIASES={'expedientes judiciales exjuq':'expedientes judiciales exjuq','sinarej depositos':'sinarej depositos orden pago','sinarej depositos orden pago':'sinarej depositos orden pago','asbanc embargos':'asbanc embargos','cejsuperior':'cej superior','sinarej multas':'sinarej multas','mpe redireccionamiento':'mpe redireccionamiento'};
const canonicalName=n=>FIXED_ALIASES[matchKey(n)]||matchKey(n);
function lookupSeguimiento(tactical){const map=new Map();for(const e of tactical?.entries||[]){const key=canonicalName(e.name);if(!map.has(key))map.set(key,e);}return map;}
const colLabel=i=>{let x=i+1,s='';while(x){x--;s=String.fromCharCode(65+x%26)+s;x=Math.floor(x/26);}return s;};
const headerName=(s)=>norm(s).replace(/\b(integraciones|integracion|interoperabilidad)\b/g,'').trim();
const maybeVia=s=>/\bvia\b/.test(norm(s))&&norm(s).length<95;
export const VIA_SEVERITY_OPTIONS=Object.freeze([{id:'todas',label:'Todas las severidades'},{id:'critica',label:'Severidad Crítica'},{id:'alta',label:'Severidad Alta'},{id:'no_priorizadas',label:'No priorizadas'}]);
export function matchesViaSeverity(e,severity='todas'){switch(severity){case 'critica':return !!e.high&&!!e.green;case 'alta':return !!e.high&&!e.green;case 'no_priorizadas':return !!e.matched&&!e.high;default:return true;}}
function isTruthyFlag(v){const s=norm(v);return !!s&&!['no','0','n','na','no aplica','falso','false','sin aplica','-'].includes(s);}
function sheetFind(sheets){return [...(sheets?.entries?.()||[])].find(([k])=>norm(k).replace(/\s+/g,'')==='integracionesetapa');}
/** Diagnóstico utilizable desde la UI, sin enviar el Excel fuera del navegador. */
export function inspectViaSheet(sheets){
 const entry=sheetFind(sheets);
 if(!entry)return {found:false,sourceSheet:'',rows:0,columns:[],preview:[],headerCandidates:[],headerRow:0,error:'No se encontró la hoja IntegracionesEtapa',availableSheets:[...(sheets?.keys?.()||[])]};
 const [name,rows]=entry,limit=Math.min(70,rows.length);
 const cols=[];for(let i=0;i<limit;i++)for(let c=0;c<(rows[i]?.length||0);c++)if(cell(rows[i][c])&&!cols.includes(c))cols.push(c);
 cols.sort((a,b)=>a-b);
 const filtered=rows.map((row,i)=>({row:i+1,cells:(row||[]).flatMap((v,c)=>cell(v)?[{column:colLabel(c),index:c,value:cell(v)}]:[])})).filter(r=>r.cells.length);
 const candidates=[];
 for(let i=0;i<limit;i++){
  const row=rows[i]||[],heads={},stages=[];
  for(let j=0;j<row.length;j++){const k=headerKey(row[j]);if(k&&heads[k]===undefined)heads[k]=j;const stage=canonicalStage(row[j]);if(stage)stages.push({name:stage,index:j});}
  let mode=null;
  if(heads.integracion!==undefined&&heads.etapa!==undefined&&(heads.via!==undefined))mode='lista';
  else if(heads.integracion!==undefined&&stages.length&&heads.via!==undefined)mode='matriz';
  else if(heads.integracion!==undefined&&heads.etapa!==undefined)mode='lista_sin_via';
  else if(heads.integracion!==undefined&&stages.length)mode='matriz_sin_via';
  if(mode)candidates.push({row:i,heads,stages,mode,score:Object.keys(heads).length*10+stages.length});
 }
 candidates.sort((a,b)=>b.score-a.score||a.row-b.row);
 return {found:true,sourceSheet:name,rows:rows.length,columns:cols.map(i=>({index:i,label:colLabel(i)})),preview:filtered.slice(0,9),headerCandidates:candidates.slice(0,5),headerRow:candidates[0]?.row??Math.max(0,(filtered[0]?.row||1)-1),error:''};
}
function inferMapping(diagnostic,options={}){
 if(options.mode&&options.mode!=='auto')return {...options,headerRow:Math.max(0,Number(options.headerRow||1)-1)};
 const head=diagnostic.headerCandidates[0];
 if(!head)return null;
 if(head.mode==='lista'||head.mode==='matriz')return {mode:head.mode,headerRow:head.row,viaCol:head.heads.via,integrationCol:head.heads.integracion,stageCol:head.heads.etapa,stageCols:head.stages,estadoCol:head.heads.estado};
 return null;
}
export function parseVias(sheets,tactical,options={}){
 const d=inspectViaSheet(sheets);
 const basic={vias:[],entries:[],warnings:[],error:'',sourceSheet:d.sourceSheet||null,readAt:new Date().toISOString(),unmatched:[],diagnostic:d,headerRow:null,mode:null};
 if(!d.found)return {...basic,error:d.error,warnings:[`Hojas recibidas: ${d.availableSheets?.join(', ')||'ninguna'}.`]};
 const [sheetName,rows]=sheetFind(sheets);
 const mapping=inferMapping(d,options);
 if(!mapping){const samples=d.preview.map(r=>`fila ${r.row}: ${r.cells.map(c=>`${c.column}=${c.value.slice(0,45)}`).join(' · ')}`).slice(0,4);
  return {...basic,error:'Encabezados de IntegracionesEtapa no reconocidos. Usa «Configurar columnas» para indicar Vía, Etapa e Integración.',warnings:['El Excel fue descargado y la hoja existe, pero los encabezados no coinciden con el formato previsto.',...samples]};}
 const mode=mapping.mode;const start=Math.max(0,(mapping.headerRow??0)+1);
 const statusMap=lookupSeguimiento(tactical),entries=[],warnings=[],unmatched=new Set(),seen=new Set();
 const asCol=v=>v==null||v===''?NaN:Number(v);
 const viaCol=asCol(mapping.viaCol),intCol=asCol(mapping.integrationCol),stageCol=asCol(mapping.stageCol);
 const validCol=n=>Number.isInteger(n)&&n>=0;
 if(!validCol(intCol))return {...basic,error:'Debes seleccionar la columna Integración.'};
 if(mode==='lista'&&!validCol(stageCol)&&!cell(mapping.fixedStage))return {...basic,error:'Debes seleccionar una columna Etapa o indicar una etapa fija.'};
 if(mode!=='secciones'&&mode!=='vias_columnas'&&!validCol(viaCol)&&!cell(mapping.fixedVia))return {...basic,error:'Debes seleccionar una columna Vía o indicar una vía fija.'};
 const add=(value,via,stage,rowIndex,statusRaw='')=>{
  const name=cell(value),v=cell(via),st=canonicalStage(stage)||cell(stage);
  if(!name||!v||!st)return;
  if(/^(total(es)?|subtotal|integraciones?|nombre integracion|nombre de integracion)$/i.test(norm(name)))return;
  const key=[norm(v),norm(st),norm(name)].join('|');if(seen.has(key))return;seen.add(key);
  const tracker=statusMap.get(canonicalName(name))||null;
  if(!tracker)unmatched.add(name);
  const stateRaw=norm(statusRaw),status=tracker?.status||(stateRaw.startsWith('validada')||stateRaw.startsWith('validado')?'Validada':'Sin estado documentado');
  const ready=status==='Validada';entries.push({id:`via-${rowIndex+1}-${entries.length}`,via:v,stage:st,name,row:rowIndex+1,ready,status,statusRaw:tracker?.statusRaw||statusRaw||'',dependency:tracker?.dependency||'',high:!!tracker?.high,green:!!tracker?.green,severity:tracker?(tracker.high?(tracker.green?'Crítica':'Alta'):'No priorizada'):'Sin correspondencia',matched:!!tracker});
 };
 let lastVia=cell(mapping.fixedVia),lastStage=cell(mapping.fixedStage),sectionVia='',sectionStage='';
 if(mode==='secciones'){const header=rows[start-1]||[];const heading=header.find(x=>maybeVia(x));if(heading)sectionVia=cell(heading);}
 for(let i=start;i<rows.length;i++){
  const row=rows[i]||[];
  if(mode==='secciones'){
   const values=row.map((v,c)=>({c,v:cell(v)})).filter(x=>x.v);if(!values.length)continue;
   if(values.length===1&&maybeVia(values[0].v)){sectionVia=values[0].v;sectionStage='';continue;}
   if(values.length===1&&isStageName(values[0].v)){sectionStage=canonicalStage(values[0].v);continue;}
   const v=cell(mapping.fixedVia)||sectionVia,stage=cell(mapping.fixedStage)||sectionStage;
   add(row[intCol],v,stage,i);continue;
  }
  const via=validCol(viaCol)?cell(row[viaCol]):'';if(via)lastVia=via;
  if(mode==='lista'){
   const stage=validCol(stageCol)?cell(row[stageCol]):'';if(stage)lastStage=stage;
   add(row[intCol],lastVia,lastStage,i,validCol(mapping.estadoCol)?cell(row[mapping.estadoCol]):'');
  }else if(mode==='matriz'){
   const stageCols=(mapping.stageCols||[]).map(x=>({index:Number(x.index),name:cell(x.name)}));
   for(const st of stageCols)if(st.name&&isTruthyFlag(row[st.index]))add(row[intCol],lastVia,st.name,i,validCol(mapping.estadoCol)?cell(row[mapping.estadoCol]):'');
  }else if(mode==='vias_columnas'){
   // Cada encabezado de columna identifica una vía y la celda contiene el nombre de la etapa.
   const viaCols=(mapping.viaCols||[]).map(x=>({index:Number(x.index),name:cell(x.name)}));
   for(const vcol of viaCols){const st=cell(row[vcol.index]);if(st&&norm(st)!=='x'&&norm(st)!=='si'&&norm(st)!=='1')add(row[intCol],vcol.name,st,i);}
  }
 }
 const viaMap=new Map();for(const ent of entries){
  if(!viaMap.has(ent.via))viaMap.set(ent.via,{name:ent.via,stages:new Map(),ready:0,pending:0});
  const via=viaMap.get(ent.via);if(!via.stages.has(ent.stage))via.stages.set(ent.stage,{name:ent.stage,entries:[],ready:0,pending:0});
  const stage=via.stages.get(ent.stage);stage.entries.push(ent);stage[ent.ready?'ready':'pending']++;via[ent.ready?'ready':'pending']++;
 }
 const vias=[...viaMap.values()].map(v=>({...v,stages:[...v.stages.values()].sort((a,b)=>sortStagesForVia(v.name,a.name,b.name))}));
 if(unmatched.size)warnings.push(`${unmatched.size} integración(es) no se vinculan con Seguimiento; permanecen pendientes y sin severidad asignada.`);
 if(!entries.length)warnings.push('La hoja existe y se aplicó el mapeo, pero no se encontraron asociaciones vía–etapa–integración. Revisa las primeras filas y el tipo de distribución.');
 if(mode==='matriz')warnings.push('Se interpretó IntegracionesEtapa como matriz de etapas; las columnas con nombre de etapa actúan como indicadores de asociación.');
 return {...basic,vias,entries,warnings,error:entries.length?'':'No se encontraron asociaciones legibles con el mapeo actual.',sourceSheet:sheetName,headerRow:start,mode,unmatched:[...unmatched]};
}
export function getViaView(data,viaName,severity='todas'){
 const via=data?.vias.find(v=>v.name===viaName)||null;if(!via)return null;
 const stages=via.stages.map(s=>{const entries=s.entries.filter(e=>matchesViaSeverity(e,severity));return {name:s.name,entries,ready:entries.filter(e=>e.ready),pending:entries.filter(e=>!e.ready)};});
 // Para el resumen de la vía, una integración cuenta una vez aunque aparezca en varias etapas.
 const byIntegration=new Map();
 for(const stage of stages)for(const e of stage.entries){
  const key=canonicalName(e.name);
  if(!byIntegration.has(key))byIntegration.set(key,!!e.ready);
  else if(!e.ready)byIntegration.set(key,false); // criterio conservador ante inconsistencias
 }
 const ready=[...byIntegration.values()].filter(Boolean).length;
 return {name:via.name,stages,total:byIntegration.size,associations:stages.reduce((n,s)=>n+s.entries.length,0),ready,pending:byIntegration.size-ready};
}
export function getAllViaViews(data,severity='todas'){return(data?.vias||[]).map(v=>getViaView(data,v.name,severity));}
