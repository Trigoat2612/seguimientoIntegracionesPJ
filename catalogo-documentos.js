/** Catálogo documental (fase 1). Lectura de CatalogoDocumentos, sin escritura ni validaciones inferidas. */
import {readDocumentCode} from './codigo-documento.js';
const clean=value=>String(value??'').replace(/\u0000/g,'').trim();
export const normalizeDocumentText=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const norm=normalizeDocumentText;
const fields={
 documento:['documento','nombre del documento','nombre documento','documento a validar','documento a revisar','titulo','titulo del documento','denominacion','denominacion del documento','entregable','nombre del entregable','descripcion del documento','archivo','nombre de archivo','nombre del archivo'],
 codigo:['codigo','cod documento','cod. documento','cod doc','codigo de documento','codigo documento','id documento','id del documento','identificador','numero documento','nro documento','n documento','nro','numero','n°','nº','item'],
 version:['version','version del documento','version actual','revision','rev','numero de version','n version'],
 tipo:['tipo','tipo documental','tipo de documento','categoria','categoria documental','clasificacion'],
 estado:['estado','estado documental','estado del documento','situacion','situacion del documento','estado de revision','estado de validacion'],
 responsable:['responsable','responsable revision','responsable de revision','revisor','area responsable','area','equipo responsable','responsable del documento'],
 especialidad:['especialidad','especialidad judicial','materia','especialidad procesal'],
 fecha:['fecha','fecha documento','fecha de documento','fecha de emision','fecha de recepcion','fecha de entrega','fecha de registro','fecha version'],
 enlace:['enlace','url','link','ruta','ruta del documento','enlace drive','link de drive','url documento','url del documento','documento url'],
 observaciones:['observacion','observaciones','comentarios','comentario','consideraciones','nota','notas']
};
const letter=n=>{let value=n+1,result='';while(value>0){value--;result=String.fromCharCode(65+value%26)+result;value=Math.floor(value/26);}return result;};
const keyFor=header=>{const s=norm(header).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 if(!s)return null;
 for(const [field,aliases] of Object.entries(fields))if(aliases.some(a=>norm(a).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()===s))return field;
 return null;
};
function findSheet(sheets){return [...(sheets?.entries?.()||[])].find(([name])=>norm(name).replace(/[^a-z0-9]/g,'')==='catalogodocumentos');}
export function inspectDocumentCatalog(sheets){
 const entry=findSheet(sheets);
 if(!entry)return {found:false,sheet:'',rows:0,columns:[],preview:[],availableSheets:[...(sheets?.keys?.()||[])],error:'No se encontró la pestaña CatalogoDocumentos.'};
 const [name,rows]=entry;
 const candidates=[];
 for(let i=0;i<Math.min(rows.length,40);i++){
  const mapped={};for(let j=0;j<(rows[i]?.length||0);j++){
   const key=keyFor(rows[i][j]);if(key&&mapped[key]===undefined)mapped[key]=j;
  }
  if(mapped.documento!==undefined)candidates.push({headerRow:i,mapping:mapped,score:Object.keys(mapped).length});
 }
 candidates.sort((a,b)=>b.score-a.score||a.headerRow-b.headerRow);
 const headerRow=candidates[0]?.headerRow??0;
 const width=Math.min(26,Math.max(5,...rows.slice(0,Math.min(rows.length,35)).map(r=>r?.length||0)));
 const columns=Array.from({length:width},(_,i)=>({index:i,letter:letter(i),header:clean(rows[headerRow]?.[i])}));
 const codeColumn=candidates[0]?.mapping?.codigo;
 const cellMeta=sheets.cellFormats?.get(name);
 const preview=rows.map((row,i)=>({row:i+1,values:Array.from({length:width},(_,c)=>c===codeColumn&&i>headerRow?readDocumentCode(row?.[c],cellMeta?.get(`${i}:${c}`)).value:clean(row?.[c]))})).filter(r=>r.values.some(Boolean)).slice(0,8);
 return {found:true,sheet:name,rows:rows.length,columns,preview,headerRow,headerCandidates:candidates.slice(0,6),error:''};
}
export function parseDocumentCatalog(sheets,override=null){
 const diagnostic=inspectDocumentCatalog(sheets);
 const base={found:diagnostic.found,sheet:diagnostic.sheet,documents:[],mapping:null,headers:[],diagnostic,warnings:[],error:'',readAt:new Date().toISOString()};
 if(!diagnostic.found)return {...base,error:diagnostic.error};
 const [,rows]=findSheet(sheets);
 const candidate=diagnostic.headerCandidates?.[0];
 // El mapeo manual es explícito. Nunca suponemos que la primera columna contiene documentos.
 const headerRow=override?Number(override.headerRow):candidate?.headerRow;
 const mapping=override?Object.fromEntries(Object.keys(fields).map(k=>[k,override[k]])):candidate?.mapping;
 if(!Number.isInteger(headerRow)||headerRow<0||headerRow>=rows.length||!mapping||!Number.isInteger(Number(mapping.documento))){
  return {...base,error:'No se pudo identificar la columna Documento. Usa «Configurar columnas» para indicar la fila de encabezados y la columna que contiene el nombre del documento.'};
 }
 const actualMapping={};
 for(const field of Object.keys(fields)){
  const raw=mapping[field];if(raw!==undefined&&raw!==''&&raw!==null&&Number.isInteger(Number(raw))&&Number(raw)>=0)actualMapping[field]=Number(raw);
 }
 if(actualMapping.documento===undefined)return {...base,error:'La columna Documento es obligatoria.'};
 const headers=Array.from({length:Math.max(rows[headerRow]?.length||0,diagnostic.columns.length)},(_,i)=>clean(rows[headerRow]?.[i])||`Columna ${letter(i)}`);
 const documents=[];
 const formats=sheets.cellFormats?.get(diagnostic.sheet);
 for(let i=headerRow+1;i<rows.length;i++){
  const row=rows[i]||[];
  const nombre=clean(row[actualMapping.documento]);if(!nombre)continue;
  if(/^(total|subtotal|documentos|catalogo de documentos)$/i.test(norm(nombre)))continue;
  const codigoCell=actualMapping.codigo!==undefined
   ?readDocumentCode(row[actualMapping.codigo],formats?.get(`${i}:${actualMapping.codigo}`))
   :readDocumentCode('');
  const data={};for(const field of Object.keys(fields)){
   data[field]=field==='codigo'?codigoCell.value:(actualMapping[field]!==undefined?clean(row[actualMapping[field]]):'');
  }
  const extras=headers.map((header,index)=>({header,index,value:clean(row[index])})).filter(r=>r.value&&!Object.values(actualMapping).includes(r.index));
  const id=`${diagnostic.sheet}:${i+1}`;
  documents.push({...data,id,documentKey:data.codigo||'',row:i+1,documento:nombre,codeAmbiguous:codigoCell.ambiguous,statusLabel:data.estado||'No informado',versionLabel:data.version||'Sin versión informada',extras});
 }
 const warnings=[];
 // El catálogo puede contener códigos numéricos mostrados sin ceros finales.
 // La advertencia global no ayuda durante la revisión. Se conservan los valores
 // disponibles, las alertas de duplicados y el uso obligatorio de códigos únicos.
 const missingCodes=documents.filter(d=>!d.codigo).length;
 if(missingCodes)warnings.push(`${missingCodes} documento(s) no tienen Cod Documento. Completa el código antes de habilitar la bitácora para evitar asociaciones incorrectas.`);
 const codeCounts=new Map();for(const d of documents){if(d.codigo){const k=norm(d.codigo);codeCounts.set(k,(codeCounts.get(k)||0)+1);}}
 const repeatedCodes=[...codeCounts].filter(([,n])=>n>1);
 if(repeatedCodes.length)warnings.push(`${repeatedCodes.length} código(s) de documento están repetidos. Deben corregirse o justificarse antes de asociar incidencias al código.`);
 const seen=new Map();for(const d of documents){const signature=[norm(d.codigo||d.documento),norm(d.version)].join('|');seen.set(signature,(seen.get(signature)||0)+1);}
 const repeated=[...seen.values()].filter(n=>n>1).length;
 if(repeated)warnings.push(`${repeated} identidad(es) de documento y versión aparecen más de una vez; se conservan sus filas.`);
 if(!documents.length)warnings.push('No se encontraron documentos con nombre a partir del encabezado configurado.');
 return {...base,documents,mapping:actualMapping,headers,warnings,headerRow,error:'',readAt:new Date().toISOString()};
}
export function documentCatalogSummary(documents){
 const docs=documents||[],validations=docs.filter(d=>/^validado(?:\b|$)|^validada(?:\b|$)/.test(norm(d.estado))).length;
 const families=new Set(docs.map(d=>norm(d.codigo||d.documento)).filter(Boolean));
 const states=[...new Set(docs.map(d=>d.statusLabel))].sort((a,b)=>a.localeCompare(b,'es'));
 const codes=docs.map(d=>norm(d.codigo)).filter(Boolean);const codeCounts=new Map();for(const code of codes)codeCounts.set(code,(codeCounts.get(code)||0)+1);
 return {records:docs.length,documentos:families.size,codigosUnicos:codeCounts.size,sinCodigo:docs.filter(d=>!d.codigo).length,codigosRepetidos:[...codeCounts.values()].filter(count=>count>1).length,versiones:docs.filter(d=>!!d.version).length,validados:validations,estados:states};
}
export function filterDocumentCatalog(documents,{query='',estado='',tipo='',especialidad='',responsable=''}={}){
 const q=norm(query);
 return (documents||[]).filter(d=>
  (!q||[d.documento,d.codigo,d.version,d.tipo,d.estado,d.responsable,d.especialidad,...d.extras.map(x=>x.value)].some(v=>norm(v).includes(q)))&&
  (!estado||d.statusLabel===estado)&&(!tipo||d.tipo===tipo)&&(!especialidad||d.especialidad===especialidad)&&(!responsable||d.responsable===responsable)
 );
}
