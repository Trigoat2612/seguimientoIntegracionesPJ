import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatDocumentPublicationDate} from '../src/client/ui/fecha-publicacion-documental.js';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('Fecha de última publicación documental: hora peruana y sin fecha inventada',()=>{
 const result=formatDocumentPublicationDate('2026-10-29T20:42:56.608Z');
 assert.match(result,/29\/10\/2026/);
 assert.match(result,/3:42:56/);
 assert.equal(formatDocumentPublicationDate(null),'No registrada');
 assert.equal(formatDocumentPublicationDate('fecha inválida'),'No registrada');
});

test('La API consulta publicaciones reales, no la importación de copias ni la hora de la visita',()=>{
 const api=read('../api/seguimiento-documental.js');
 assert.match(api,/FROM document_tracking_import_events WHERE rows_added>0/);
 assert.match(api,/FROM document_tracking_entries WHERE origin='manual'/);
 assert.match(api,/FROM key_document_migration_events WHERE event_type='published'/);
 assert.match(api,/lastDataUpdatedAt:publication\[0\]\?\.lastDataUpdatedAt\|\|null/);
 assert.doesNotMatch(api,/lastDataUpdatedAt:new Date\(\)/);
});

test('La fecha de publicación aparece justo bajo Última consulta y solo en la pestaña documental',()=>{
 const app=read('../src/client/app.js');
 const html=read('../src/client/index.html');
 assert.match(html,/id="updated-text"[^>]*>[\s\S]*?<\/span><span id="updated-data-text"/);
 assert.match(app,/tab!=='document-dashboard'/);
 assert.match(app,/documentDashboardLastPublishedAt=String\(response\.lastDataUpdatedAt\|\|''\)/);
 assert.match(app,/formatDocumentPublicationDate\(documentDashboardLastPublishedAt\)/);
 assert.match(app,/Última actualización de datos: /);
});
