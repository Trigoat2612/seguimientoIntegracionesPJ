/** Verificación de estructura antes de construir. */
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const sourceModules=[
 'src/client/app.js','src/client/ui/sincronizacion-ui.js',
 'src/shared/sync/sincronizacion-modelo.js',
 'src/server/autorizacion-servidor.js',
 'api/sincronizacion.js','api/incidencias.js','api/sesion.js','api/drive.js',
 'api/documentos-clave.js','api/resumen-tactico.js',
 'api/integraciones-via.js','api/flujo-actividades.js',
 'src/shared/documents/documentos-clave-migracion.js',
 'src/shared/tactical/resumen-tactico-migracion.js',
 'src/shared/routes/integraciones-via-migracion.js',
 'src/shared/flow/flujo-actividades-migracion.js'
];
for(const file of sourceModules){
 if(!existsSync(file))throw new Error(`No existe ${file}`);
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
}
const html=readFileSync('src/client/index.html','utf8');
if(!html.includes('id="view-sync"')||!html.includes('src="./src/client/app.js"'))throw new Error('Faltan el módulo de sincronización o el punto de entrada al dashboard.');
const requiredMigrations=['sincronizacion-v1_15_0.sql','documentos-clave-v1_15_1.sql','resumen-tactico-v1_15_2.sql','integraciones-via-v1_15_3.sql','flujo-actividades-v1_15_4.sql','estados-revision-v1_15_5_3.sql'];
for(const name of requiredMigrations)if(!existsSync(`database/migrations/${name}`))throw new Error(`Falta migración: ${name}`);
console.log(`Verificación estructural: ${sourceModules.length} módulos, ${requiredMigrations.length} migraciones y HTML correctos.`);
