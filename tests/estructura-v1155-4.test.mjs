import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {escape,number,percent} from '../src/client/core/formatting.js';
import {tabTitles} from '../src/client/ui/navigation-config.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(root,name),'utf8');

test('La estructura separa navegador, modelos reutilizables, servidor, API y migraciones',()=>{
 const paths=[
  'src/client/app.js','src/client/core/formatting.js','src/client/ui/navigation-config.js',
  'src/client/ui/bitacora-ui.js','src/client/presentations/ppt-export.js',
  'src/shared/documents/documento-revision.js','src/shared/sync/sincronizacion-modelo.js',
  'src/shared/tactical/tactical.js','src/shared/routes/vias.js','src/shared/flow/actividad-flujo.js',
  'src/server/autorizacion-servidor.js','api/incidencias.js','api/sincronizacion.js',
  'database/migrations/estados-revision-v1_15_5_3.sql',
  'docs/ARQUITECTURA.md','scripts/build-static.mjs',
 ];
 paths.forEach(file=>assert.ok(existsSync(join(root,file)),file));
 assert.equal(readdirSync(root).filter(f=>f.endsWith('.js')||f.endsWith('.sql')).length,0);
});

test('La página apunta al código fuente organizado y la navegación sigue igual',()=>{
 const html=read('src/client/index.html');
 for(const uri of ['./src/client/styles.css','./src/client/config.js','./src/client/app.js'])assert.ok(html.includes(uri));
 for(const tab of ['tactical','vias','activity-flow','documents','sync'])assert.ok(html.includes(`data-tab="${tab}"`));
 for(const tab of ['systems','integrations','endpoints','technical','overview'])assert.ok(html.includes(`data-tab="${tab}"`));
 assert.ok(html.includes('En desarrollo'));
 assert.ok(tabTitles.tactical && tabTitles.documents && tabTitles.sync);
});

test('Los PowerPoint conservan rutas de navegador y los recursos están publicados',()=>{
 for(const name of ['ppt-export','via-ppt-export']){
  const code=read(`src/client/presentations/${name}.js`);
  assert.match(code,/\.\/src\/client\/assets\/vendor\/pptxgen\.bundle\.js/);
  assert.match(code,/\.\/src\/client\/assets\/ppt-template-bg\.png/);
 }
 for(const file of ['src/client/assets/vendor/pptxgen.bundle.js','src/client/assets/ppt-template-bg.png'])assert.ok(existsSync(join(root,file))); // salida pública validada por public-build.test.mjs
});

test('La configuración de build aísla servidor, SQL y secretos',()=>{
 const builder=read('scripts/build-static.mjs');
 assert.match(builder,/EXCLUDED_PREFIXES/);
 assert.match(builder,/src\/server\//);
 assert.match(builder,/database\//);
 assert.match(builder,/privatePaths/);
 const app=read('src/client/app.js');
 assert.match(app,/requestSync/);
 assert.match(app,/renderTrackingSection/);
});

test('Las transformaciones de formato no modificaron su lógica',()=>{
 assert.equal(escape('<test> &'), '&lt;test&gt; &amp;');
 assert.equal(number(3500),'3,500');
 assert.equal(percent(7,35),'20%');
});

test('La versión conserva las reglas de revisión documental y protección de escritura',()=>{
 const source=read('src/shared/documents/documento-revision.js');
 for(const status of ['Validado','En proceso de firma','Programado'])assert.ok(source.includes(status));
 const api=read('api/incidencias.js');
 assert.match(api,/identifyEditor/);
 assert.match(api,/validateReviewUpdate/);
});
