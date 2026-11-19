import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publishedTacticalEntries} from '../src/shared/tactical/bitacora-publicada.js';
const text=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('La API pública superpone cambios publicados y conserva fuente original',()=>{
 const api=text('api/resumen-tactico.js');
 assert.match(api,/LEFT JOIN tactical_published_overrides o/);
 assert.match(api,/COALESCE\(o\.dependency,t\.dependency\)/);
 assert.match(api,/COALESCE\(o\.situational_history,t\.situational_history\)/);
 assert.match(api,/t\.entry \|\| jsonb_build_object/);
 assert.match(api,/publishedUpdates/);
 assert.match(api,/lastDataUpdatedAt/);
 assert.doesNotMatch(api,/INSERT INTO tactical_published_overrides/);
});
test('Las fechas editadas recalculan alertas sin alterar historia publicada',()=>{
 const rows=[{source_row:7,integration_name:'EDICTOS',is_active:true,
   source_batch_id:'test-batch',situational_history:'18/11 - Acuerdo publicado.',
   entry:{history:'17/11 - Registro Excel.',developmentClose:'Por informar',testsClose:'12/10/2026',
    gsjValidation:'Por informar',dependency:'Softplan',considerations:'Nueva consideración'}}];
 const e=publishedTacticalEntries(rows,'test-batch')[0];
 assert.equal(e.history,'18/11 - Acuerdo publicado.');
 assert.equal(e.considerations,'Nueva consideración');
 assert.equal(e.dateAlerts.length,2);
});
test('Editor enlazado desde cada tarjeta a una aplicación autenticada',()=>{
 const app=text('src/client/app.js');
 assert.match(app,/Editar campos y publicar en Seguimiento/);
 assert.match(app,/sourceRow/);
 assert.match(app,/actualizar-integraciones\.vercel\.app/);
 assert.match(app,/rel="noopener noreferrer"/);
});
