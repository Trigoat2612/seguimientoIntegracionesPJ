import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatDocumentPublicationDate} from '../src/client/ui/fecha-publicacion-documental.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Última publicación táctica: fecha en Perú sin tomar hora de consulta',()=>{
 const date=formatDocumentPublicationDate('2026-10-29T03:17:30.730Z');
 assert.match(date,/28\/10\/2026/);
 assert.match(date,/10:17:30/);
 assert.equal(formatDocumentPublicationDate(''),'No registrada');
});
test('La API táctica solo usa eventos de publicación completada y no lotes importados',()=>{
 const api=read('api/resumen-tactico.js');
 const records=api.slice(api.indexOf("if(action==='records'){"),api.indexOf("if(action!=='status')"));
 assert.match(records,/FROM tactical_migration_events WHERE event_type='published'/);
 assert.match(records,/lastDataUpdatedAt:publication\[0\]\?\.lastDataUpdatedAt\|\|null/);
 assert.doesNotMatch(records,/imported_at|lastDataUpdatedAt:new Date/);
});
test('Una misma etiqueta presenta fecha táctica y documental según la pestaña',()=>{
 const app=read('src/client/app.js');
 const html=read('src/client/index.html');
 assert.match(html,/id="updated-text"[^>]*>[\s\S]*?<\/span><span id="updated-data-text"/);
 assert.match(app,/function updateVisiblePublicationDate\(\)/);
 assert.match(app,/activeTab==='tactical'\)updateLabel\.textContent='Última actualización de datos: '\+formatDocumentPublicationDate\(tacticalLastPublishedAt\)/);
 assert.match(app,/activeTab==='document-dashboard'\)updateLabel\.textContent='Última actualización de datos: '\+formatDocumentPublicationDate\(documentDashboardLastPublishedAt\)/);
 assert.match(app,/\['tactical','document-dashboard'\]\.includes\(tab\)/);
 assert.match(app,/tacticalLastPublishedAt=String\(response\.lastDataUpdatedAt\|\|''\)/);
});
