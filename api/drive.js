/** Vercel function: DOWNLOAD ALL SHEETS as a single XLSX file.
 * Permitted sources are Google Sheets exports and public Drive XLSX, never arbitrary URLs.
 * Protected documents require client-side OAuth; never expose a server token.
 */
const MAX_BYTES=20*1024*1024;
const ALLOWED_ID=/^[A-Za-z0-9_-]{15,160}$/;
const isZip=b=>b.length>=4&&b[0]===80&&b[1]===75&&((b[2]===3&&b[3]===4)||(b[2]===5&&b[3]===6));
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET')return res.status(405).json({error:'Método no admitido.'});
 const id=String(req.query?.id||''),kind=String(req.query?.kind||'spreadsheet');
 if(!ALLOWED_ID.test(id))return res.status(400).json({error:'ID de Google Drive inválido.'});
 if(!['spreadsheet','file'].includes(kind))return res.status(400).json({error:'Tipo de origen inválido.'});
 const urls=kind==='spreadsheet'
 ? [`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=xlsx`, `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`]
 : [`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=xlsx`];
 let last='La fuente no permite lectura anónima.';
 for(const url of urls){
  try{
   const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'Accept':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
   if(!r.ok){last=`Google respondió HTTP ${r.status}.`;continue;}
   const length=Number(r.headers.get('content-length')||0);
   if(length>MAX_BYTES)return res.status(413).json({error:'El archivo supera los 20 MB.'});
   if(r.headers.get('content-type')?.includes('text/html')){last='Google solicita iniciar sesión o impide exportar el documento.';continue;}
   const data=new Uint8Array(await r.arrayBuffer());
   if(data.length>MAX_BYTES)return res.status(413).json({error:'El archivo supera los 20 MB.'});
   if(!isZip(data)){last='La respuesta de Google no es un .xlsx válido.';continue;}
   res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   return res.status(200).send(Buffer.from(data));
  }catch(err){last=err?.name==='TimeoutError'?'Tiempo de espera agotado al descargar de Google.':'Error de conexión a Google Drive.';}
 }
 return res.status(403).json({error:`${last} Verifica permisos del archivo o configura acceso privado mediante OAuth en el navegador.`});
}
