import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOCUMENT_REVIEW_STATES,validateReviewUpdate} from '../src/shared/documents/documento-revision.js';
import {renderIncidentSection} from '../src/client/ui/bitacora-ui.js';
const document={codigo:'4.10',documento:'Plan de pruebas'};
const base={documentCode:'4.10',documentName:'Plan de pruebas',version:'V1',comment:'Actualización de seguimiento',expectedRevision:0};
test('Catálogo de revisión tiene exactamente los tres estados solicitados',()=>{
 assert.deepEqual(DOCUMENT_REVIEW_STATES,['Validado','En proceso de firma','Programado']);
 for(const status of DOCUMENT_REVIEW_STATES)assert.equal(validateReviewUpdate({...base,status}).status,status);
 for(const status of ['Pendiente de revisión','En revisión','Observado','En subsanación','En verificación'])assert.throws(()=>validateReviewUpdate({...base,status}),/estado documental/);
});
test('Formulario nuevo muestra solo tres opciones y predetermina Programado sin guardar automáticamente',()=>{
 const html=renderIncidentSection({document,authorized:true,canEdit:true});
 const select=html.match(/<select class="select" name="status">([\s\S]*?)<\/select>/)?.[1]||'';
 assert.equal((select.match(/<option/g)||[]).length,3);
 assert.match(select,/<option value="Programado" selected>/);
 assert.doesNotMatch(html,/Pendiente de revisión/);
});
test('Un registro con estado antiguo se presenta para corrección sin añadir una cuarta opción',()=>{
 const html=renderIncidentSection({document,authorized:true,canEdit:true,review:{version:'V2',status:'Observado',revision:1}});
 assert.match(html,/El estado anterior «Observado» ya no está disponible/);
 const select=html.match(/<select class="select" name="status">([\s\S]*?)<\/select>/)?.[1]||'';
 assert.equal((select.match(/<option/g)||[]).length,3);
 assert.match(select,/<option value="Programado" selected>/);
});
test('Lectura sin seguimiento guardado no declara validación ni programación',()=>{
 const html=renderIncidentSection({document,authorized:true,canEdit:false});
 assert.match(html,/Sin estado registrado/);
 assert.doesNotMatch(html,/Revisión:<\/b> Validado/);
});
test('Migración agrega la restricción de tres estados y frena filas anteriores',()=>{
 const sql=fs.readFileSync(new URL('../database/migrations/estados-revision-v1_15_5_3.sql',import.meta.url),'utf8');
 assert.match(sql,/DROP CONSTRAINT IF EXISTS document_reviews_review_status_check/);
 assert.match(sql,/NOT IN \(\s*'Validado'/);
 assert.match(sql,/CHECK \(review_status IN \(\s*'Validado'/);
 assert.match(sql,/RAISE EXCEPTION/);
});
