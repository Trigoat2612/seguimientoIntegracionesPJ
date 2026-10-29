/**
 * Publica únicamente la interfaz y sus dependencias explícitas.
 * El servidor (api/ y src/server/) y las migraciones nunca se copian a public/.
 */
import {copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync} from 'node:fs';
import {join, resolve, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const TARGET=join(ROOT,'public');
const CLIENT='src/client';
const WEB_ENTRYPOINTS=[`${CLIENT}/app.js`,`${CLIENT}/config.js`];
const STATIC_ASSETS=[`${CLIENT}/styles.css`,`${CLIENT}/assets/ppt-template-bg.png`];
const STATIC_DIRECTORIES=[`${CLIENT}/assets/vendor`];
const EXCLUDED_PREFIXES=['api/','src/server/','database/','tests/','docs/'];
const modules=new Set();

function safePath(request){
 const full=resolve(ROOT,request);
 const normalized=relative(ROOT,full).replace(/\\/g,'/');
 if(!normalized || normalized.startsWith('../') || normalized.startsWith('/') || EXCLUDED_PREFIXES.some(prefix=>normalized.startsWith(prefix))){
  throw new Error(`Dependencia de navegador no permitida: ${request}`);
 }
 if(!existsSync(full) || !statSync(full).isFile())throw new Error(`Falta un recurso del navegador: ${request}`);
 return {full,normalized};
}
function includeModule(request){
 const {full,normalized}=safePath(request);
 if(modules.has(normalized))return;
 modules.add(normalized);
 const code=readFileSync(full,'utf8');
 // Permite imports/exports ES estáticos; prohíbe llegar indirectamente a una API privada.
 const references=/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
 for(const match of code.matchAll(references)){
  const child=resolve(dirname(full),match[1]);
  includeModule(relative(ROOT,child));
 }
}
function copy(path,target=path){
 const {full}=safePath(path);
 const dest=join(TARGET,target);
 mkdirSync(dirname(dest),{recursive:true});
 copyFileSync(full,dest);
}
for(const item of [...WEB_ENTRYPOINTS,...STATIC_ASSETS])safePath(item);
if(!existsSync(join(ROOT,`${CLIENT}/index.html`)))throw new Error('Falta src/client/index.html');
for(const directory of STATIC_DIRECTORIES){
 const folder=join(ROOT,directory);
 if(!existsSync(folder)||!statSync(folder).isDirectory())throw new Error(`Falta directorio estático: ${directory}`);
}
WEB_ENTRYPOINTS.forEach(includeModule);
rmSync(TARGET,{recursive:true,force:true});
mkdirSync(TARGET,{recursive:true});
copyFileSync(join(ROOT,`${CLIENT}/index.html`),join(TARGET,'index.html'));
for(const path of new Set([...modules,...STATIC_ASSETS]))copy(path);
for(const directory of STATIC_DIRECTORIES)cpSync(join(ROOT,directory),join(TARGET,directory),{recursive:true});
const required=['index.html',...WEB_ENTRYPOINTS,...STATIC_ASSETS,`${CLIENT}/assets/vendor/pptxgen.bundle.js`];
for(const f of required)if(!existsSync(join(TARGET,f)))throw new Error(`Build incompleto: public/${f}`);
const privatePaths=['api','src/server','database','tests','docs','.env.local','.env','package.json'];
for(const path of privatePaths)if(existsSync(join(TARGET,path)))throw new Error(`Archivo privado presente en publicación: ${path}`);
console.log(`Build estático correcto: ${modules.size} módulos ES y recursos; /api permanece en Vercel Functions.`);
