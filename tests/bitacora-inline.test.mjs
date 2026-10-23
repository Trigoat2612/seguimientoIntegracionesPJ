import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderIncidentSection} from '../bitacora-ui.js';
import {parseDocumentCatalog} from '../catalogo-documentos.js';

const documents=new Map([['CatalogoDocumentos',[
 ['Cod Documento','Nombre Documento'],['2.3','Acuerdo de Alcance funcional'],['4.1','Doc 4.1'],['4.10','Doc 4.10']
]]]);
const parsed=parseDocumentCatalog(documents);
assert.equal(parsed.documents.length,3);
assert.notEqual(parsed.documents[1].codigo,parsed.documents[2].codigo);

const html=renderIncidentSection({document:parsed.documents[0],authorized:false,createOpen:true});
assert.match(html, /id="incident-create-form"/);
assert.match(html, /name="title"/);
assert.match(html, /name="description"/);
assert.match(html, /Autorizar Google/);
assert.match(html, /data-action="incidents-new"/);
assert.match(html, /redactar y preparar el seguimiento/);
assert.match(html, /id="document-review-form"/);
const drafted=renderIncidentSection({document:parsed.documents[0],authorized:false,createOpen:true,draft:{title:'Pendiente de verificación',description:'Revisar apartado 4.10',assignedTo:'GTI',severity:'Alta'}});
assert.match(drafted,/value="Pendiente de verificación"/);
assert.match(drafted,/Revisar apartado 4.10/);
assert.match(drafted,/value="GTI"/);
const authed=renderIncidentSection({document:parsed.documents[0],authorized:true,createOpen:true});
assert.match(authed,/id="incident-create-form"/);
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.match(source,/doc-expanded-row/);
assert.match(source,/documentExpandedDetail\(d,baseOnly\)/);
assert.doesNotMatch(source, /\+detail\+/);
assert.doesNotMatch(source, /if\(doc\.codeAmbiguous\)\{/);
assert.match(source,/if\(!doc\|\|!doc\.codigo\|\|duplicateDocumentCode\(doc\)\)return/);
console.log('Bitácora: apertura junto a la fila, formulario editable y código completo OK');
