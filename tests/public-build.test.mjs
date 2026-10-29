import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('El build de Vercel crea public/ utilizable sin publicar módulos del servidor',()=>{
 execFileSync(process.execPath,['scripts/build-static.mjs'],{cwd:root,stdio:'pipe'});
 for(const file of ['index.html','src/client/app.js','src/client/config.js','src/client/styles.css','src/client/core/xlsx.js','src/client/ui/sincronizacion-ui.js','src/shared/documents/documentos-clave-migracion.js','src/client/assets/vendor/pptxgen.bundle.js','src/client/assets/ppt-template-bg.png']){
  assert.equal(existsSync(join(root,'public',file)),true,`Falta public/${file}`);
 }
 for(const secret of ['api/incidencias.js','api/sincronizacion.js','api/documentos-clave.js','database','src/server','tests','.env.local']){
  assert.equal(existsSync(join(root,'public',secret)),false,`El build expone ${secret}`);
 }
 const config=JSON.parse(readFileSync(join(root,'vercel.json'),'utf8'));
 assert.equal(config.outputDirectory,'public');
 assert.equal(config.buildCommand,'npm run build');
});
