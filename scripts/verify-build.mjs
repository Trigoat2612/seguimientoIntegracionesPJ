import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const modules=['app.js','sincronizacion-modelo.js','sincronizacion-ui.js','api/sincronizacion.js','api/incidencias.js','api/sesion.js','autorizacion-servidor.js','api/drive.js','api/documentos-clave.js','documentos-clave-migracion.js','api/resumen-tactico.js','resumen-tactico-migracion.js','api/integraciones-via.js','integraciones-via-migracion.js','api/flujo-actividades.js','flujo-actividades-migracion.js'];
for(const path of modules){
 if(!existsSync(path))throw new Error(`Falta ${path}`);
 execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
 console.log(`OK: ${path}`);
}
const html=readFileSync('index.html','utf8');
if(!html.includes('id="view-sync"')||!html.includes('src="./app.js"'))throw new Error('Falta montar la pantalla de sincronización.');
if(!existsSync('sincronizacion-v1_15_0.sql'))throw new Error('Falta migración SQL V1.15.0.');
if(!existsSync('documentos-clave-v1_15_1.sql'))throw new Error('Falta migración SQL V1.15.1.');
if(!existsSync('resumen-tactico-v1_15_2.sql'))throw new Error('Falta migración SQL V1.15.2.');
if(!existsSync('integraciones-via-v1_15_3.sql'))throw new Error('Falta migración SQL V1.15.3.');
if(!existsSync('flujo-actividades-v1_15_4.sql'))throw new Error('Falta migración SQL V1.15.4.');
console.log('Verificación de fuentes OK: el siguiente paso generará public/; API en api/*.');
