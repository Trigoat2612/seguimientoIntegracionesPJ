import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identifyViewer,identifyEditor} from '../src/server/autorizacion-servidor.js';
import session from '../api/sesion.js';

const app=readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
const root=new URL('../',import.meta.url);
const api=name=>readFileSync(new URL(`../api/${name}.js`,import.meta.url),'utf8');
const req={headers:{authorization:'Bearer '+ 'a'.repeat(30)}};
const old={env:{...process.env},fetch:globalThis.fetch};
function stub(email='lector@pj.gob.pe',aud='cliente-test',scope='openid email'){
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('tokeninfo')?{aud,scope}:{email,email_verified:true}});
}
async function withMock(callback){
 process.env.GOOGLE_OAUTH_CLIENT_ID='cliente-test';
 process.env.DOCUMENT_EDITOR_EMAILS='admin@pj.gob.pe';
 process.env.DASHBOARD_VIEWER_EMAILS='lector@pj.gob.pe';
 try{await callback();}finally{
  globalThis.fetch=old.fetch;
  for(const key of ['GOOGLE_OAUTH_CLIENT_ID','DOCUMENT_EDITOR_EMAILS','DASHBOARD_VIEWER_EMAILS']){
   if(old.env[key]===undefined)delete process.env[key];else process.env[key]=old.env[key];
  }
 }
}
test('Token de identidad válido permite lectura sin Drive, no publicación',async()=>withMock(async()=>{
 stub();const profile=await identifyViewer(req);
 assert.deepEqual(profile,{email:'lector@pj.gob.pe',canEdit:false,role:'lector'});
 await assert.rejects(()=>identifyEditor(req),e=>e.status===403);
}));
test('Editor conserva todas las operaciones y sesión informa su rol',async()=>withMock(async()=>{
 stub('admin@pj.gob.pe');
 assert.equal(await identifyEditor(req),'admin@pj.gob.pe');
 const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.payload=v;return this;}};
 await session({...req,method:'GET'},res);
 assert.equal(res.statusCode,200);assert.equal(res.payload.canEdit,true);
 assert.equal(res.payload.driveRequired,false);assert.equal(res.payload.role,'editor');
}));
test('Lector no registrado y token de otro cliente son rechazados',async()=>withMock(async()=>{
 stub('intruso@pj.gob.pe');await assert.rejects(()=>identifyViewer(req),e=>e.status===403);
 stub('lector@pj.gob.pe','otro-cliente');await assert.rejects(()=>identifyViewer(req),e=>e.status===403);
 stub('lector@pj.gob.pe','cliente-test','https://www.googleapis.com/auth/drive.readonly');
 await assert.rejects(()=>identifyViewer(req),e=>e.status===403);
}));
test('Falta de identidad se rechaza; no hay lecturas públicas de Neon',async()=>withMock(async()=>{
 stub();await assert.rejects(()=>identifyViewer({headers:{}}),e=>e.status===401);
}));
test('GET público de cuatro módulos sin identidad; otras operaciones conservan autorización de editor',()=>{
 for(const [name,action] of [['documentos-clave','catalog'],['resumen-tactico','records'],['integraciones-via','records'],['flujo-actividades','records']]){
  const source=api(name);
  assert.ok(source.includes(`const publicRead=req.method==='GET'&&String(req.query?.action||'status')==='${action}'`));
  assert.match(source,/publicRead\?'consulta':await identifyEditor\(req\)/);
  assert.doesNotMatch(source,/identifyViewer\(req\)/);
 }
 assert.match(api('sincronizacion'),/identifyEditor\(req\)/);
 assert.match(api('incidencias'),/req.method==='GET'\?\{email:'',canEdit:false\}:\{email:await identifyEditor\(req\)/);
});
test('Separación efectiva de tokens: inicio no solicita Drive y Drive nunca se envía a API',()=>{
 const login=app.slice(app.indexOf('async function authorizeGoogle('),app.indexOf('async function authorizeDrive('));
 const drive=app.slice(app.indexOf('async function authorizeDrive('),app.indexOf('async function loadPrivateDrive('));
 const read=app.slice(app.indexOf('async function requestSync('),app.indexOf('async function refreshSyncStatus('));
 assert.match(login,/scope:'openid email'/);
 assert.doesNotMatch(login,/drive.readonly/);
 assert.match(drive,/scope:'https:\/\/www.googleapis.com\/auth\/drive.readonly'/);
 assert.match(drive,/driveToken/);
 assert.doesNotMatch(drive,/accessToken\s*=/);
 assert.match(read,/Authorization:`Bearer \$\{accessToken\}`/);
 assert.doesNotMatch(read,/driveToken/);
 assert.match(app,/sessionCanEdit=!!session.canEdit/);
});
test('Bitácora muestra formularios a editores y modo lectura a lectores',async()=>{
 const {renderIncidentSection}=await import('../src/client/ui/bitacora-ui.js');
 const document={codigo:'4.10',documento:'Pruebas'};
 const editor=renderIncidentSection({document,authorized:true,canEdit:true,items:[]});
 const lector=renderIncidentSection({document,authorized:true,canEdit:false,items:[]});
 assert.match(editor,/id="document-review-form"/);
 assert.match(editor,/data-action="incidents-new"/);
 assert.doesNotMatch(lector,/id="document-review-form"|data-action="incidents-new"/);
 assert.match(lector,/Solo los editores pueden modificar/);
});
