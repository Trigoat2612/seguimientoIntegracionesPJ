/** Compila una publicación estática segura para Vercel sin copiar código del servidor. */
import {copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync} from 'node:fs';
import {join, resolve, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET=join(ROOT,'public');
const clientEntrypoints=['app.js','config.js'];
const staticFiles=['index.html','styles.css','ppt-template-bg.png'];
const dirs=['vendor'];
// Los módulos del navegador tienen imports ES estáticos relativos; los recorremos
// sin copiar indiscriminadamente todos los JS de la raíz (incluye módulos servidor).
const deps=new Set();
function includeModule(path){
 const full=resolve(ROOT,path),normalized=relative(ROOT,full).replace(/\\/g,'/');
 if(normalized.startsWith('../')||normalized.startsWith('/')||normalized.includes('/api/'))throw new Error(`Import no permitido en cliente: ${path}`);
 if(!existsSync(full))throw new Error(`Archivo JavaScript requerido inexistente: ${path}`);
 if(deps.has(normalized))return;
 deps.add(normalized);
 const source=readFileSync(full,'utf8');
 const pattern=/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
 for(const match of source.matchAll(pattern)){
  const spec=match[1];
  const child=resolve(dirname(full),spec);
  const candidate=relative(ROOT,child).replace(/\\/g,'/');
  includeModule(candidate);
 }
}
function validateSource(){
 for(const f of [...staticFiles,...clientEntrypoints])if(!existsSync(join(ROOT,f)))throw new Error(`Falta recurso web: ${f}`);
 for(const d of dirs)if(!existsSync(join(ROOT,d))||!statSync(join(ROOT,d)).isDirectory())throw new Error(`Falta directorio web: ${d}`);
}
validateSource();
clientEntrypoints.forEach(includeModule);
// public es un artefacto generado: se regenera por completo en cada build.
rmSync(TARGET,{recursive:true,force:true});
mkdirSync(TARGET,{recursive:true});
for(const file of [...staticFiles,...deps]){
 const dest=join(TARGET,file);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(ROOT,file),dest);
}
for(const dir of dirs)cpSync(join(ROOT,dir),join(TARGET,dir),{recursive:true});
const required=['index.html','app.js','config.js','styles.css','ppt-template-bg.png','vendor/pptxgen.bundle.js'];
for(const file of required)if(!existsSync(join(TARGET,file)))throw new Error(`Build incompleto: ${file}`);
const forbidden=['bitacora-config-servidor.js','autorizacion-servidor.js','sincronizacion-v1_15_0.sql','package.json','api','tests','.env.local'];
for(const file of forbidden)if(existsSync(join(TARGET,file)))throw new Error(`Archivo privado/no estático encontrado en public: ${file}`);
console.log(`Build generado en public/: ${staticFiles.length+deps.size} archivos principales + ${dirs.join(', ')}/`);
console.log('Los endpoints permanecen en api/* fuera de public/ para Vercel Functions.');
