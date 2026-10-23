import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReviewUpdate,DOCUMENT_REVIEW_STATES} from '../documento-revision.js';
import {environmentReadiness,editorConfigurationError,canShowLocalDiagnostic} from '../bitacora-config-servidor.js';
import {renderIncidentSection} from '../bitacora-ui.js';
import {parseDocumentCatalog} from '../catalogo-documentos.js';
const base={documentCode:'4.10',documentName:'Documento de alcance',version:'V1.2',status:'En revisión',comment:'Se inició revisión',expectedRevision:0};
test('Metadatos conservan el código textual y la versión en Neon',()=>{
 const v=validateReviewUpdate(base);assert.equal(v.documentCode,'4.10');assert.equal(v.version,'V1.2');
 assert.equal(v.expectedRevision,0);assert.equal(DOCUMENT_REVIEW_STATES.includes('Validado'),false);
 assert.throws(()=>validateReviewUpdate({...base,status:'Validado'}),/estado documental/);
 assert.throws(()=>validateReviewUpdate({...base,comment:''}),/motivo/);
 assert.throws(()=>validateReviewUpdate({...base,documentCode:4.10}),/texto/);
});
test('Diagnóstico de API distingue variables presentes y faltantes sin revelar valores',()=>{
 const env={DATABASE_URL:'postgres://SECRET',GOOGLE_OAUTH_CLIENT_ID:'clientid',DOCUMENT_EDITOR_EMAILS:'  '};
 assert.deepEqual(environmentReadiness(env).missing,['DOCUMENT_EDITOR_EMAILS']);
 assert.match(editorConfigurationError(env),/DOCUMENT_EDITOR_EMAILS/);
 assert.doesNotMatch(JSON.stringify(environmentReadiness(env)),/SECRET/);
 assert.equal(canShowLocalDiagnostic({VERCEL_ENV:'development'},'localhost:3000'),true);
 assert.equal(canShowLocalDiagnostic({VERCEL_ENV:'production'},'localhost:3000'),false);
 assert.equal(canShowLocalDiagnostic({VERCEL_ENV:'preview'},'example.vercel.app'),false);
});
test('Formulario de seguimiento registra versión, estado y comentario en Neon',()=>{
 const documents=new Map([['CatalogoDocumentos',[['Cod Documento','Nombre Documento'],['4.10','Documento de alcance']]]]);
 const doc=parseDocumentCatalog(documents).documents[0];
 const html=renderIncidentSection({document:doc,authorized:true,review:{version:'V3',status:'Observado',revision:2,updatedBy:'revisor',updatedAt:'2026-10-22'}});
 assert.match(html,/id="document-review-form"/);assert.match(html,/value="V3"/);
 assert.match(html,/<option value="Observado" selected>/);
 assert.doesNotMatch(html,/columna Estado/);
});
