import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderIncidentSection} from '../bitacora-ui.js';

const doc={codigo:'4.10',documento:'Documento 4.10'};
const items=[{id:'inc-1',title:'Incidencia A',status:'Abierta',severity:'Media',revision:1,description:'Texto A',createdAt:'2026-10-23T00:00:00Z'},
 {id:'inc-2',title:'Incidencia B',status:'En atención',severity:'Alta',revision:2,description:'Texto B',createdAt:'2026-10-23T00:00:00Z'}];

test('Registro de incidencia muestra confirmación junto al registro creado',()=>{
 const html=renderIncidentSection({document:doc,items,authorized:true,feedback:{scope:'incident',incidentId:'inc-2',type:'success',message:'Incidencia registrada.'}});
 assert.equal((html.match(/data-document-feedback="incident"/g)||[]).length,1);
 assert.match(html,/<article class="doc-incident">[\s\S]*?Incidencia B[\s\S]*?Incidencia registrada\./);
 assert.match(html,/role="status"/);
 const a=html.indexOf('Incidencia A');const b=html.indexOf('Incidencia B');const f=html.indexOf('Incidencia registrada.');
 assert.ok(a<b && b<f);
});

test('Confirmación de revisión aparece junto al formulario documental',()=>{
 const html=renderIncidentSection({document:doc,items,authorized:true,feedback:{scope:'review',type:'success',message:'Seguimiento guardado.'}});
 assert.match(html,/id="document-review-form"[\s\S]*?Seguimiento guardado\.[\s\S]*?<\/form>/);
 assert.equal((html.match(/data-document-feedback="review"/g)||[]).length,1);
});

test('Error de nueva incidencia aparece en el formulario en lugar de la cabecera',()=>{
 const html=renderIncidentSection({document:doc,authorized:true,createOpen:true,feedback:{scope:'create',type:'error',message:'No se pudo guardar.'}});
 assert.match(html,/id="incident-create-form"[\s\S]*?No se pudo guardar\.[\s\S]*?<\/form>/);
 assert.match(html,/role="alert"/);
});

test('La lógica del guardado no envía avisos a la cabecera global',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const methods=source.slice(source.indexOf('async function saveDocumentReview('),source.indexOf('function documentExpandedDetail('));
 assert.doesNotMatch(methods,/alertMsg\(/);
 assert.match(methods,/documentActionFeedback=/);
 assert.match(methods,/focusDocumentActionFeedback\(\)/);
 assert.match(source,/scrollIntoView\(\{block:'nearest'/);
});
