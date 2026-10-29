/** XLSX reader for standard .xlsx ZIP files, with no external CDN/dependencies.
 * Sheet values only. Deliberately does NOT execute macros/formulas or upload data.
 * Compression support: stored (0), deflate (8), ZIP64 not supported.
 */
const decoder = new TextDecoder('utf-8');
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const arr = element => Array.from(element?.children || []);
const normSheet = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const elements = (element, tag) => Array.from(element?.getElementsByTagNameNS(NS, tag) || []);

function cleanPath(path) { const out=[]; for(const part of path.replace(/^\//,'').split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part);}return out.join('/'); }
async function decompress(method,bytes){
 if(method===0)return bytes;
 if(method!==8)throw new Error(`Compresión ZIP ${method} no admitida`);
 if(typeof DecompressionStream==='undefined')throw new Error('Tu navegador no admite descompresión ZIP moderna. Utiliza Chrome o Edge reciente.');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function openZip(buffer){
 const b = new Uint8Array(buffer), dv = new DataView(buffer); let eocd=-1;
 for(let pos=b.length-22;pos>=Math.max(0,b.length-66000);pos--){if(dv.getUint32(pos,true)===0x06054b50){eocd=pos;break;}}
 if(eocd<0)throw new Error('No parece un archivo .xlsx válido (ZIP no encontrado).');
 const count=dv.getUint16(eocd+10,true),offset=dv.getUint32(eocd+16,true);
 if(count===0xffff||offset===0xffffffff)throw new Error('Los archivos ZIP64 no están soportados.');
 const directory=new Map(); let p=offset;
 for(let i=0;i<count;i++){
  if(dv.getUint32(p,true)!==0x02014b50)throw new Error('Directorio del Excel dañado.');
  const method=dv.getUint16(p+10,true),size=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extraLen=dv.getUint16(p+30,true),commentLen=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true);
  const name=decoder.decode(b.subarray(p+46,p+46+nameLen));directory.set(cleanPath(name),{method,size,local});p+=46+nameLen+extraLen+commentLen;
 }
 const textCache=new Map();
 async function read(name){name=cleanPath(name);if(textCache.has(name))return textCache.get(name);const d=directory.get(name);if(!d)throw new Error(`Parte XLSX no encontrada: ${name}`);
  const p=d.local;if(dv.getUint32(p,true)!==0x04034b50)throw new Error('Contenido ZIP inválido.');
  const start=p+30+dv.getUint16(p+26,true)+dv.getUint16(p+28,true);if(start+d.size>b.length)throw new Error('Archivo ZIP incompleto.');
  const out=await decompress(d.method,b.subarray(start,start+d.size));const txt=decoder.decode(out);textCache.set(name,txt);return txt;
 }
 return {read,exists:name=>directory.has(cleanPath(name))};
}
function xml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('El archivo contiene XML no válido.');return doc;}
function inlineText(el){return Array.from(el.getElementsByTagName('t')).map(e=>e.textContent||'').join('');}
function columnNumber(ref){let n=0;for(const c of ref.replace(/\d/g,'')){let x=c.charCodeAt(0)-64;if(x<1||x>26)break;n=n*26+x;}return n-1;}
function colorToRgb(color,themeColors){
 if(!color)return null;
 const rgb=color.getAttribute('rgb');if(rgb&&/^[0-9a-f]{6,8}$/i.test(rgb))return '#'+rgb.slice(-6).toUpperCase();
 const indexed=color.getAttribute('indexed');
 const colors={3:'#00FF00',10:'#008000',11:'#0000FF',17:'#00FF00',50:'#008000',42:'#00B050'};
 if(indexed!=null)return colors[Number(indexed)]||null;
 const theme=color.getAttribute('theme');return theme!=null?themeColors[Number(theme)]||null:null;
}
function getSheetFormatting(zip,stylesXML,themeXML){
 if(!stylesXML)return {styleEntries:[],fills:[]};
 const doc=xml(stylesXML);
 let themeColors=[];
 if(themeXML){try{const td=xml(themeXML);const scheme=Array.from(td.getElementsByTagName('*')).find(e=>e.localName==='clrScheme');if(scheme){
   const dict={};for(const item of arr(scheme)){const col=arr(item)[0];const hex=col?.getAttribute('lastClr')||col?.getAttribute('val');if(hex)dict[item.localName]='#'+hex.slice(-6).toUpperCase();}
   themeColors=[dict.lt1,dict.dk1,dict.lt2,dict.dk2,dict.accent1,dict.accent2,dict.accent3,dict.accent4,dict.accent5,dict.accent6];
 }}catch{}}
 const top=(name)=>Array.from(doc.documentElement.children).find(e=>e.localName===name);
 const fills=Array.from(top('fills')?.children||[]).filter(e=>e.localName==='fill').map(fill=>{
   const pattern=arr(fill).find(e=>e.localName==='patternFill');if(!pattern||pattern.getAttribute('patternType')==='none')return null;
   const color=arr(pattern).find(e=>e.localName==='fgColor');return colorToRgb(color,themeColors);
 });
 const numFmts={};for(const e of Array.from(top('numFmts')?.children||[])){if(e.localName==='numFmt')numFmts[Number(e.getAttribute('numFmtId'))]=e.getAttribute('formatCode')||'';}
 const xfs=Array.from(top('cellXfs')?.children||[]).filter(e=>e.localName==='xf').map(x=>{
   const fillId=Number(x.getAttribute('fillId')||0),fmtId=Number(x.getAttribute('numFmtId')||0);
   const builtInFormats={1:'0',2:'0.00',3:'#,##0',4:'#,##0.00'};
   const fmt=numFmts[fmtId]||builtInFormats[fmtId]||'';
   const customDate=/(?:y{2,4}|d{1,4})/i.test(fmt.replace(/\\.|"[^"]*"|\[[^\]]*\]/g,''));
   return {fillColor:fills[fillId]||null,dateStyle:(fmtId>=14&&fmtId<=22)||customDate,formatCode:fmt};
 });
 return {styleEntries:xfs,fills};
}

export async function parseXlsx(buffer){
 if(buffer.byteLength>30*1024*1024)throw new Error('El archivo supera el límite de 30 MB para procesamiento local.');
 const zip=await openZip(buffer);
 const workbook=xml(await zip.read('xl/workbook.xml'));
 const relationshipPath=zip.exists('xl/_rels/workbook.xml.rels')?'xl/_rels/workbook.xml.rels':null;
 if(!relationshipPath)throw new Error('Falta el catálogo de hojas de Excel.');
 const relationships=xml(await zip.read(relationshipPath));const rels=new Map();
 for(const r of Array.from(relationships.getElementsByTagName('Relationship'))){rels.set(r.getAttribute('Id'),r.getAttribute('Target'));}
 let shared=[];
 if(zip.exists('xl/sharedStrings.xml')){
  const ss=xml(await zip.read('xl/sharedStrings.xml'));
  shared=Array.from(ss.getElementsByTagNameNS(NS,'si')).map(inlineText);
 }
 const stylesXML=zip.exists('xl/styles.xml')?await zip.read('xl/styles.xml'):null;
 const themeXML=zip.exists('xl/theme/theme1.xml')?await zip.read('xl/theme/theme1.xml'):null;
 const {styleEntries}=getSheetFormatting(zip,stylesXML,themeXML);
 const result=new Map();const cellFormats=new Map();const sheetConditional=new Map();
 for(const s of elements(workbook,'sheet')){
  const name=s.getAttribute('name');const rel=s.getAttributeNS(RELNS,'id')||s.getAttribute('r:id');const target=rels.get(rel);if(!target)continue;
  const sheetPath=cleanPath(target.startsWith('/')?target:'xl/'+target);
  if(!zip.exists(sheetPath))continue;
  const data=xml(await zip.read(sheetPath));const sheetRows=elements(data,'row');const rows=[];const cellMeta=new Map();sheetConditional.set(name,data.getElementsByTagNameNS(NS,'conditionalFormatting').length>0);
  for(const r of sheetRows){
   const ri=Number(r.getAttribute('r'))-1;if(!Number.isInteger(ri)||ri<0||ri>100000)continue;
   const vals=[];
   for(const c of arr(r)){
    if(c.localName!=='c')continue;
    const idx=columnNumber(c.getAttribute('r')||'');if(idx<0||idx>1000)continue;
    const type=c.getAttribute('t');const val=Array.from(c.children).find(e=>e.localName==='v')?.textContent??'';
    let value=type==='s'?shared[Number(val)]??'':type==='inlineStr'?inlineText(c):type==='b'?(val==='1'?'Sí':'No'):val;
    if(typeof value==='string')value=value.replace(/\u0000/g,'');
    vals[idx]=value;
    if(normSheet(name)==='seguimiento'&&(idx===11||idx===7||idx===8||idx===9)){
      const info=styleEntries[Number(c.getAttribute('s')||0)];if(info)cellMeta.set(`${ri}:${idx}`,info);
    }
    // CatalogoDocumentos: conservar tipo y formato por celda para evitar que
    // un identificador visible 4.10 termine registrado como 4.1.
    if(['catalogodocumentos','bitacoradocumentosclave'].includes(normSheet(name).replace(/[^a-z0-9]/g,''))){
      const style=styleEntries[Number(c.getAttribute('s')||0)]||{};
      cellMeta.set(`${ri}:${idx}`,{...style,numeric:(type==null||type==='n')&&val!==''});
    }
   }
   rows[ri]=vals;
  }
  result.set(name,rows);cellFormats.set(name,cellMeta);
 }
 if(result.size===0)throw new Error('El archivo no tiene hojas legibles.');
 result.cellFormats=cellFormats;result.sheetConditional=sheetConditional;
 return result;
}
