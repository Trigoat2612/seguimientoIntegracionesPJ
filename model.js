/** Normalize the real, heterogeneous SOFTPLAN workbook. No example values, request bodies,
 * responses, IPs or credentials survive the extraction into the UI model. */
const str=v=>v==null?'':String(v).trim();
const canonical=v=>str(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toUpperCase();
const get=(r,i)=>str(r?.[i]);
const lower=v=>str(v).toLowerCase();
const unique=a=>[...new Set(a.filter(Boolean))];
const sensitive=v=>/\b(pass(word)?|contrase(?:n|ñ)a|secret|token|bearer|credential|apikey)\b/i.test(str(v));
// Observaciones del Excel: texto de celdas explícitas, nunca cuerpos request/response o valores de ejemplo.
function excelComment(v){const t=str(v).replace(/\r\n?/g,'\n').trim();if(!t)return '';return sensitive(t)?'Contenido reservado: revisar la celda en el Excel de origen.':t.slice(0,2400);}
const excelColumn=index=>{let c=index+1,out='';while(c){c--;out=String.fromCharCode(65+c%26)+out;c=Math.floor(c/26);}return out;};
const observationColumns=header=>(header||[]).map((cell,index)=>({index,name:canonical(cell)})).filter(x=>/^(NUEVA )?OBSERVACION(ES)?(?: GTI| SOFTPLAN)?$/.test(x.name));
const fieldValid=v=>v && v.length<=155 && !v.includes('\n') && !sensitive(v);
function safeNote(v){let t=str(v).replace(/[\r\n]+/g,' ').replace(/\s+/g,' ');if(t.length>700)t=t.slice(0,700)+'…';return sensitive(t)?'Observación reservada por contener términos sensibles.':t;}
function nameSystem(v){
 const key=canonical(v);
 const map={ 'CEJ SUPERIOR':'CEJ Superior','CEJ - SUPERIOR':'CEJ Superior','CEJ SUPREMO':'CEJ Supremo','CEJ - SUPREMO':'CEJ Supremo','AGENDA MOVIL SUPREMO':'Agenda Móvil Suprema','GUIA PROGRAMACION DE AUDIENCIAS':'Guía de Programación de Audiencias','AGENDA MOVIL SUPREMA':'Agenda Móvil Suprema','EXPEDIENTES JUDICIALES':'Expedientes Judiciales','PRESIDENCIA TE ATIENDE':'Presidencia Te Atiende','GUIA DE PROGRAMACION DE AUDIENCIAS':'Guía de Programación de Audiencias','ESTADISTICAS DE AUDIENCIAS EN LINEA':'Estadísticas de Audiencias en Línea','SERNOT':'SERNOT','SIGEM':'SIGEM','CASILLERO DIGITAL':'Casillero Digital','MEDIDAS PROTECCION':'Medidas de Protección','SICMEP':'Medidas de Protección','INTEROPERABILIDAD PNP':'Interoperabilidad PNP'};
 if(map[key])return map[key];
 if(key.includes('PROGRAMACION DE AUDIENCIAS')&&key.startsWith('GUI'))return 'Guía de Programación de Audiencias';
 if(key.includes('ESTADISTICAS DE AUDIENCIAS'))return 'Estadísticas de Audiencias en Línea';
 return str(v)||'Sin identificar';
}
// Etapas referenciales de adecuación, NO porcentaje certificado de pruebas.
export const STAGE_PROGRESS={'Pendiente':0,'En análisis':20,'En revisión':35,'En desarrollo':55,'Enviado a calidad':80,'No requiere modificación':100};
const statusLabel=(s,n)=>`${n} ${n===1?s:s.toLowerCase()}`;
function breakdown(counts){return Object.entries(counts).filter(([,n])=>n>0).map(([s,n])=>statusLabel(s,n)).join(' · ')||'Sin estado';}
function statusType(s){const a=canonical(s);if(!a)return 'Sin estado';if(a.includes('ENVIADO A CALIDAD'))return 'Enviado a calidad';if(a.includes('EN DESARROLLO'))return 'En desarrollo';if(a.includes('PENDIENTE'))return 'Pendiente';if(a.includes('NO REQUIERE'))return 'No requiere modificación';if(a.includes('ANALISIS'))return 'En análisis';if(a.includes('REVISION'))return 'En revisión';return str(s);}
function equivalence(value){const v=str(value);if(!v)return 'No documentado';if(/^(no existe|no disponible|no hay|sin equivalente)$/i.test(v))return 'No existe';return v;}
function equivalentFlag(s){return s==='No existe'?'missing':s==='No documentado'?'unknown':'mapped';}
function normalizeRoute(raw){return str(raw).replace(/\s+/g,' ');}
function looksRoute(s){const v=str(s);return v.startsWith('/') || /^api\//i.test(v) || /^expedientes-judiciales\//i.test(v) || /^suprema\//i.test(v) || /\/api\//i.test(v);}
function inferAttributes(input,dir,source,limit=65){
 const text=str(input).slice(0,45000),names=[];
 // Read ONLY property/tag names; intentionally NEVER propagate values from request/response examples.
 const jsonRegex=/(?:["']([A-Za-z_][\w]{0,80})["']|\b([A-Za-z_][\w]{0,80}))\s*:/g;
 let m;while((m=jsonRegex.exec(text))&&names.length<limit*4){let k=m[1]||m[2];if(fieldValid(k)&&!['string','integer','null','boolean','true','false'].includes(k.toLowerCase()))names.push(k);}
 const xmlRegex=/<\/?(?:\w+:)?([A-Za-z_][\w-]{0,80})(?=[\s/>])/g;
 while((m=xmlRegex.exec(text))&&names.length<limit*5){if(fieldValid(m[1])&&!/^(soapenv|envelope|header|body|request|response)$/i.test(m[1]))names.push(m[1]);}
 const declaration=/(?:^|\n|\s)([A-Za-z_][\w]{1,80})\s*:\s*(?:string|integer|int|number|boolean|long|date|float|double)/gi;
 while((m=declaration.exec(text))&&names.length<limit*6){if(fieldValid(m[1]))names.push(m[1]);}
 return unique(names).slice(0,limit).map(field=>({field,direction:dir,type:'No especificado',legacy:'',api:'',match:'Inferido',note:'Nombre extraído del esquema/ejemplo; requiere validación.',source}));
}
function safeAttr(attr){return {field:str(attr.field),direction:str(attr.direction),type:str(attr.type)||'No especificado',legacy:str(attr.legacy),api:str(attr.api),match:str(attr.match),note:safeNote(attr.note),source:str(attr.source)};}
export function buildModel(sheets, origin='Archivo Excel'){
 const systems=[],endpoints=new Map(), structures=[], procedures=[],warnings=[];
 let systemsRows=0;
 function add(integration,component,path,kind,sheet,row,equiv='',note=''){
  integration=nameSystem(integration);component=str(component)||'Sin componente';path=normalizeRoute(path);
  if(!path)return null;
  const key=[canonical(integration),canonical(component),canonical(path)].join('|');let e=endpoints.get(key);
  if(!e){e={id:key,integration,component,path,kind,equivalent:equivalence(equiv),equivalentList:[],legacyMethods:[],sourceStatus:'No informado',statusOrigin:'No documentado',attributes:[],notes:[],excelNotes:[],sources:[],occurrences:0};endpoints.set(key,e);}
  e.occurrences++;
  if(equiv){const eq=equivalence(equiv);if(eq!=='No documentado'){if(e.equivalent==='No documentado'||e.equivalent==='No existe'&&eq!=='No existe')e.equivalent=eq;e.equivalentList=unique([...e.equivalentList,eq]);}}
  if(note&&safeNote(note))e.notes=unique([...e.notes,safeNote(note)]).slice(0,12);
  e.sources=unique([...e.sources,`${sheet}!${row}`]);
  if(kind==='Ruta API')e.kind=kind;
  return e;
 }
 function excelNote(e,raw,sheet,row,index,label,field=''){if(!e)return;const value=excelComment(raw);if(!value)return;const source=`${sheet}!${excelColumn(index)}${row}`;if(e.excelNotes.some(n=>n.source===source))return;e.excelNotes.push({text:value,source,author:label||'Hoja de integración',field:str(field),sheet,row,column:excelColumn(index)});}
 function attr(e,a){if(!e)return;const s=safeAttr(a);if(!fieldValid(s.field))return;const key=[s.field,s.direction,s.legacy,s.api,s.match].join('|');if(!e._seen)e._seen=new Set();if(!e._seen.has(key)){e._seen.add(key);e.attributes.push(s);}}
 function sheetBy(predicate){return [...sheets.entries()].find(([name])=>predicate(canonical(name)));}
 const inventory=sheetBy(name=>name==='SISTEMAS');
 if(inventory){let previous='';for(const [i,r] of inventory[1].entries()){
  if(i===0)continue;const sys=get(r,5),comp=get(r,6),st=get(r,10);if(!sys&&!comp&&!st)continue;
  if(sys)previous=nameSystem(sys);
  let name=nameSystem(sys||previous);
  if(canonical(comp)==='MPE PNP PJ')name='Interoperabilidad PNP';
  if(canonical(comp).startsWith('CONSULTAMEDIDASPROTECCION'))name='Medidas de Protección';
  if(!comp&&!sys)continue;
  systems.push({integration:name,component:comp||'Sin componente',status:statusType(st),rawStatus:st,dependency:get(r,11),flow:get(r,0),componentType:get(r,1),owner:get(r,4),attention:get(r,9),glpi:get(r,12),observationsGTI:excelComment(get(r,13)),observationsSoftplan:excelComment(get(r,14)),sheet:'Sistemas',row:i+1});systemsRows++;
 }} else warnings.push('No se encontró la pestaña Sistemas: los estados oficiales no estarán disponibles.');
 const statusFromSystem=(e)=>{
  const same=systems.filter(s=>canonical(s.integration)===canonical(e.integration));
  const specific=same.find(s=>canonical(s.component)===canonical(e.component));
  const plausible=same.filter(s=>s.component!=='Sin componente');
  const chosen=specific||((new Set(plausible.map(x=>x.status)).size===1)?plausible[0]:null);
  if(chosen){e.sourceStatus=chosen.rawStatus||chosen.status;e.statusOrigin=chosen===specific?'Componente (Sistemas)':'Integración (Sistemas)';}
  else if(same.length>0){const counts={};for(const item of same)counts[item.status]=(counts[item.status]||0)+1;e.sourceStatus=breakdown(counts);e.statusOrigin='Sistemas (varios componentes, sin correspondencia exacta)';}
 };
 // Attribute-matrix sheets (Operation + field + IN/OUT). The same operation repeats across rows.
 for(const [sheet,rows] of sheets.entries()){
  const key=canonical(sheet);
  if(key==='SISTEMAS'||key==='CASILLERO'||key==='STORED PROCEDURES')continue;
  const headerRow=rows.findIndex(r=>canonical(get(r,1))==='OPERACION'&&canonical(get(r,3))==='ATRIBUTO');
  if(headerRow>=0){let lastApp='';const commentCols=observationColumns(rows[headerRow]);let previousEndpoint=null;
   for(let i=headerRow+1;i<rows.length;i++){
    const r=rows[i]||[],op=get(r,1);if(get(r,0))lastApp=get(r,0);
    if(!op||canonical(op)==='OPERACION'){if(!op&&previousEndpoint&&get(r,3))for(const col of commentCols)excelNote(previousEndpoint,get(r,col.index),sheet,i+1,col.index,col.index===6?'Análisis de atributo':'Observación técnica',get(r,3));continue;}
    let integration='Expedientes Judiciales',component=lastApp||sheet;
    if(key.includes('SERNOT'))integration='SERNOT';
    else if(key.includes('GUIA DE PROGRAMACION'))integration='Guía de Programación de Audiencias';
    else if(key.includes('SIGEM'))integration='SIGEM';
    else if(key.includes('EXPEDIENTES')&&/\/?suprema\//i.test(op))integration='CEJ Supremo';
    const rawUrl=key.includes('EXPEDIENTES')?get(r,10):get(r,6);
    const path=op;const type=looksRoute(op)||looksRoute(rawUrl)?'Ruta API':'Operación documentada';
    const eq=rawUrl&& !/^(no existe|sin equivalente)$/i.test(rawUrl)?rawUrl:rawUrl||'';
    const e=add(integration,component,path,type,sheet,i+1,eq,get(r,6)&&key.includes('EXPEDIENTES')?get(r,6):'');
    previousEndpoint=e;for(const col of commentCols)excelNote(e,get(r,col.index),sheet,i+1,col.index,col.index===6&&key.includes('EXPEDIENTES')?'Análisis de atributo':'Observación técnica',get(r,3));
    if(get(r,3))attr(e,{field:get(r,3),direction:get(r,4),type:get(r,2),legacy:get(r,3),api:'',match:get(r,5)||get(r,7),note:get(r,6)||get(r,9),source:`${sheet}!${i+1}`});
   }
   continue;
  }
  // Migration/equivalence matrices, such as CEJ Superior and Stats Audiencias.
  if(key==='CEJ SUPERIOR'||key.includes('ESTADISTICAS DE AUDIENCIAS')){
   const integration=key==='CEJ SUPERIOR'?'CEJ Superior':'Estadísticas de Audiencias en Línea';
   for(let i=1;i<rows.length;i++){
    const r=rows[i]||[],legacy=get(r,0),api=get(r,1),field=get(r,3);
    if(!legacy&&!api&&!field)continue;
    const op=api||legacy;if(!op)continue;
    const e=add(integration, key==='CEJ SUPERIOR'?'cej':'Operaciones legadas',op,api?'Ruta API':'Método legado',sheet,i+1,api||'',get(r,9));
    excelNote(e,get(r,9),sheet,i+1,9,'Observación',field);
    if(legacy&&e)e.legacyMethods=unique([...e.legacyMethods,legacy]);
    if(field)attr(e,{field:field,direction:get(r,2),type:get(r,4),legacy:legacy?`${legacy} :: ${field}`:field,api:get(r,5),match:get(r,7)||'No evaluado',note:get(r,9),source:`${sheet}!${i+1}`});
   }
   continue;
  }
  // Endpoint mapping: example SOAP/REST request/response plus equivalent SAJ.
  const header=rows[0]||[];
  if(canonical(get(header,2)).includes('ENPOINT')||canonical(get(header,2)).includes('ENDPOINT')){
   const integration=key.includes('PRESIDENCIA')?'Presidencia Te Atiende':key.includes('PNP')?'Interoperabilidad PNP':'Medidas de Protección';
   let app='';for(let i=1;i<rows.length;i++){
    const r=rows[i]||[];if(get(r,1))app=get(r,1);const op=get(r,2);if(!op)continue;
    const eq=get(r,5),e=add(integration,app||integration,op,'Ruta API',sheet,i+1,eq,get(r,6));
    excelNote(e,get(r,6),sheet,i+1,6,'Observación');
    const input=inferAttributes(get(r,3),'IN',`${sheet}!${i+1}`),output=inferAttributes(get(r,4),'OUT',`${sheet}!${i+1}`);
    input.concat(output).forEach(a=>attr(e,a));
   }continue;
  }
  // Endpoint catalog, like NFC (SERNOT) and Agenda Móvil Suprema.
  const h=rows[0]||[];
  if(canonical(get(h,1))==='ENDPOINT'){
   const integration=key.includes('SERNOT')?'SERNOT':'Agenda Móvil Suprema';let app='';
   for(let i=1;i<rows.length;i++){
    const r=rows[i]||[];if(get(r,0))app=get(r,0);const path=get(r,1);if(!path)continue;
    const eq=key.includes('SERNOT')?get(r,10):'';
    const e=add(integration,app||integration,path,'Ruta API',sheet,i+1,eq);
    for(const col of observationColumns(rows[0]||[]))excelNote(e,get(r,col.index),sheet,i+1,col.index,col.name);
    const request=key.includes('SERNOT')?[get(r,2),get(r,3),get(r,4)]:[get(r,2),get(r,3)];
    const output=key.includes('SERNOT')?get(r,5):get(r,4);
    request.flatMap(x=>inferAttributes(x,'IN',`${sheet}!${i+1}`)).forEach(a=>attr(e,a));
    inferAttributes(output,'OUT',`${sheet}!${i+1}`).forEach(a=>attr(e,a));
   }continue;
  }
  // SIGEM format happens to use attribute headers despite empty attribute values.
 }
 // Data structure is not an endpoint. Keep it in a technical tab.
 const casillero=sheetBy(k=>k==='CASILLERO');
 if(casillero){let table='';for(let i=1;i<casillero[1].length;i++){
  const r=casillero[1][i]||[];if(get(r,0))table=get(r,0);const col=get(r,1);if(!col)continue;
  structures.push({integration:'Casillero Digital',table,field:col,type:get(r,2),targetTable:get(r,8),nullable:get(r,4),observation:excelComment(get(r,11)),sheet:'CASILLERO',row:i+1});
 }}
 const sp=sheetBy(k=>k==='STORED PROCEDURES'||k==='STORE PROCEDURE'||k==='STORE PROCEDURES');
 if(sp){for(let i=1;i<sp[1].length;i++){
  const r=sp[1][i]||[];if(!get(r,0)&&!get(r,1))continue;
  const application=get(r,0), procedure=get(r,3),hasQuery=Boolean(get(r,4));
  procedures.push({application,integration:nameSystem(application),action:get(r,1),database:get(r,2),procedure,hasQuery,kind:procedure?(hasQuery?'SP y consulta SQL':'Procedimiento almacenado'):(hasQuery?'Consulta SQL':'Operación sin mecanismo indicado'),sheet:sp[0],row:i+1});
 }}
 const ep=[...endpoints.values()].map(e=>{delete e._seen;statusFromSystem(e);e.attributeTotal=e.attributes.length;
  e.attrConflicts=e.attributes.filter(a=>!/^NO EVALUADO/i.test(a.match)&&(/NO EXISTE|CONFLICTO|FALTA|NO COINCIDE|DIFERENT|INCORRECT|❌|⚠/i.test(a.match)||/^NO(?:\s|$)/i.test(a.match))).length;
  e.equivalenceType=equivalentFlag(e.equivalent);return e;});
 const integrations=new Map();
 for(const s of systems){const name=s.integration;if(!integrations.has(name))integrations.set(name,{name,components:[],endpoints:[],statusCounts:{},sources:[]});const obj=integrations.get(name);obj.components.push(s);obj.statusCounts[s.status]=(obj.statusCounts[s.status]||0)+1;obj.sources=unique([...obj.sources,`Sistemas!${s.row}`]);}
 for(const e of ep){if(!integrations.has(e.integration))integrations.set(e.integration,{name:e.integration,components:[],endpoints:[],statusCounts:{},sources:[]});const obj=integrations.get(e.integration);obj.endpoints.push(e);obj.sources=unique([...obj.sources,...e.sources]);}
 for(const p of procedures){if(!integrations.has(p.integration))integrations.set(p.integration,{name:p.integration,components:[],endpoints:[],statusCounts:{},sources:[]});const obj=integrations.get(p.integration);obj.sources=unique([...obj.sources,`${p.sheet}!${p.row}`]);}
 if(structures.length&&!integrations.has('Casillero Digital'))integrations.set('Casillero Digital',{name:'Casillero Digital',components:[],endpoints:[],statusCounts:{},sources:[]});
 const res=[...integrations.values()].map(i=>{
  const states=Object.entries(i.statusCounts).filter(([,n])=>n>0);
  i.status=states.length===0?'Sin estado':states.length===1?states[0][0]:breakdown(i.statusCounts);
  i.statusSegments=states.map(([status,count])=>({status,count}));
  const known=i.components.filter(c=>Object.hasOwn(STAGE_PROGRESS,c.status));
  i.progress=known.length?Math.round(known.reduce((sum,c)=>sum+STAGE_PROGRESS[c.status],0)/known.length):null;
  i.progressCoverage=known.length;
  i.progressTotal=i.components.length;
  i.dbDependencies=procedures.filter(p=>p.integration===i.name).length;
  i.dbProcedures=procedures.filter(p=>p.integration===i.name&&p.procedure).length;
  i.dbQueries=procedures.filter(p=>p.integration===i.name&&p.hasQuery).length;
  i.routed=i.endpoints.filter(e=>e.kind==='Ruta API').length;
  i.operations=i.endpoints.length;
  i.undocumented=i.endpoints.filter(e=>e.equivalenceType!=='mapped').length;
  i.noEquivalent=i.endpoints.filter(e=>e.equivalenceType==='missing').length;
  i.attributeTotal=i.endpoints.reduce((a,e)=>a+e.attributeTotal,0);
  i.conflicts=i.endpoints.reduce((a,e)=>a+e.attrConflicts,0);
  i.hasDetail=i.endpoints.length>0;
  i.componentCount=unique(i.components.map(c=>canonical(c.component))).length;
  return i;
 }).sort((a,b)=>(b.operations-a.operations)||a.name.localeCompare(b.name,'es'));
 return {source:origin,importedAt:new Date().toISOString(),sheetCount:sheets.size,systemsRows,integrations:res,endpoints:ep,structures,procedures,warnings};
}
