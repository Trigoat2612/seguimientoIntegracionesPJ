import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderSyncView} from '../sincronizacion-ui.js';
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const source = {sheets:new Map(),origin:'Drive privado · Lista_Integraciones.xlsx'};
const state = {modules:[]};

test('Publicar flujo no queda deshabilitado por faltar cotejo o estado en memoria', () => {
 const html = renderSyncView({status:state,available:{flujo_actividades:source},flowMigrationStatus:{latestBatch:{id:'abc'},sourceTacticalReady:true,preview:null}});
 const button = html.match(/<button[^>]*data-action="sync-flow-publish"[^>]*>/)?.[0];
 assert.ok(button,'El botón debe existir');
 assert.doesNotMatch(button,/\sdisabled(?:\s|=|>)/,'Un cotejo inexistente no debe impedir el clic');
 assert.match(html,/Publicar comprueba nuevamente el archivo de Drive/);
});

test('Un clic en Publicar comunica el bloqueo cuando faltan hoja o copia', () => {
 const html = renderSyncView({status:state,available:{},flowMigrationStatus:{latestBatch:null,preview:null}});
 const button = html.match(/<button[^>]*data-action="sync-flow-publish"[^>]*>/)?.[0];
 assert.ok(button);
 assert.doesNotMatch(button,/\sdisabled(?:\s|=|>)/);
 assert.match(html,/Carga primero EtapaActividadIntegracion/);
});

test('Publicar vuelve a consultar Drive, coteja la copia vigente y recién solicita confirmación', () => {
 const begin = app.indexOf('async function flowMigrationAction(action){');
 const end = app.indexOf('async function tacticalMigrationAction(action){', begin);
 assert.ok(begin>=0 && end>begin);
 const code=app.slice(begin,end);
 const refresh=code.indexOf('await loadTacticalPrivate()');
 const preview=code.indexOf("action:'preview',snapshot");
 const parity=code.indexOf('flowParityReport(activityGoogleData,reconstructed)');
 const confirmation=code.indexOf('if(!confirm(`Cotejo satisfactorio:');
 const publishing=code.indexOf("action:'publish',confirm:true,batchId:data.latestBatch.id,snapshot");
 assert.ok(refresh>=0 && preview>refresh && parity>preview && confirmation>parity && publishing>confirmation);
 assert.doesNotMatch(code,/if\(!flowMigrationStatus\?\.preview\?\.canPublish\)/);
 assert.match(code,/Publicación cancelada/);
 assert.match(code,/catch\(e\)\{syncFeedback\.flujo_actividades=\{error:true/);
});

test('Guardar copia actualiza el estado del flujo sin necesidad de consultar manualmente Neon', () => {
 const code=app.slice(app.indexOf('async function syncAction('),app.indexOf('function render(){'));
 assert.match(code,/if\(moduleId==='flujo_actividades'\)/);
 assert.match(code,/flowMigrationStatus=await requestSync\('\/api\/flujo-actividades\?action=status'\)/);
});

test('La API comprueba persistencia antes de confirmar éxito y evita mostrar falso error por refresco', () => {
 const api=readFileSync(new URL('../api/flujo-actividades.js',import.meta.url),'utf8');
 assert.match(api,/const verified=await state\(sql\)/);
 assert.match(api,/const saved=await stored\(sql\)/);
 assert.match(api,/if\(!consistent\)return fail\(res,409/);
 const start=app.indexOf('async function flowMigrationAction(');
 const end=app.indexOf('async function tacticalMigrationAction(',start);
 const code=app.slice(start,end);
 assert.match(code,/Una falla al refrescar el panel NO debe ocultar/);
 assert.match(code,/Comprobando antes de publicar/);
});
