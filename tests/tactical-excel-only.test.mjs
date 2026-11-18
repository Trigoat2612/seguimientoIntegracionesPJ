import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publishedTacticalEntries} from '../src/shared/tactical/bitacora-publicada.js';
import {parseTacticalHistory,renderTacticalJournalModal} from '../src/client/ui/tactical-journal.js';

const lote='4a80277a-5f19-4594-9454-e3152cbc5a7a';
const rows=[
 {source_row:2,integration_name:'RENIEC',is_active:true,source_batch_id:lote,
  situational_history:'07/10 - Hecho registrado en el Excel.\n15/10 - Segundo hecho del Excel.\n16/10 - Tercer hecho del Excel.',
  entry:{id:'extra',name:'RENIEC',history:'07/10 - Hecho original.\n15/10 - PROPUESTA AJENA AL EXCEL'}},
 {source_row:3,integration_name:'CONADIS',is_active:true,source_batch_id:'lote-desactualizado',
  situational_history:'11/11 - No es del lote actual.',entry:{history:'11/11 - No publicar.'}},
 {source_row:4,integration_name:'SUNAT',is_active:false,source_batch_id:lote,
  situational_history:'11/11 - Inactivo.',entry:{history:'11/11 - No publicar.'}}
];

test('La columna G del lote vigente prevalece sobre textos acumulados y propuestas',()=>{
 const entries=publishedTacticalEntries(rows,lote);
 assert.equal(entries.length,1);
 assert.equal(entries[0].id,'seg-2');
 assert.equal(entries[0].name,'RENIEC');
 assert.equal(entries[0].history,rows[0].situational_history);
 assert.equal(parseTacticalHistory(entries[0].history).length,3);
 assert.doesNotMatch(entries[0].history,/PROPUESTA/);
 assert.deepEqual(publishedTacticalEntries(rows,'otra-publicación'),[]);
});

test('No rellena vacíos desde una bitácora diferente aunque entry incluya historial',()=>{
 const withoutG=[{...rows[0],situational_history:''}];
 assert.equal(publishedTacticalEntries(withoutG,lote)[0].history,'');
 assert.deepEqual(publishedTacticalEntries(rows,null),[]);
});

test('La API limita los registros por lote y proyecta situational_history',()=>{
 const api=fs.readFileSync(new URL('../api/resumen-tactico.js',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 assert.match(api,/source_batch_id=\$\{batchId\}::uuid/);
 assert.match(api,/publishedTacticalEntries\(rows,batchId\)/);
 assert.match(api,/historySource:'excel_publicado_columna_G'/);
 assert.match(app,/historySource!=='excel_publicado_columna_G'/);
 assert.match(app,/const entry=tacticalNeonData\?\.entries\?\.find/);
 assert.match(app,/const published=tacticalNeonData\?\.entries\?\.find/);
 assert.match(app,/Ver bitácora Excel/);
});

test('La vista identifica claramente el Excel y no ofrece propuestas',()=>{
 const html=renderTacticalJournalModal({name:'RENIEC',history:rows[0].situational_history},{
  sourceLabel:'Drive privado · Lista_Integraciones.xlsx',publishedAt:'2026-11-18T00:18:00Z'
 });
 assert.match(html,/Solo anotaciones de la columna G/);
 assert.match(html,/Lista_Integraciones.xlsx/);
 assert.match(html,/17\/11\/26/);
 assert.match(html,/No se incluyen propuestas del actualizador/);
 assert.equal((html.match(/class="tactical-journal-entry"/g)||[]).length,3);
});
