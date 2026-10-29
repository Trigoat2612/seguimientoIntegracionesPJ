import assert from 'node:assert/strict';
import {parseDocumentCatalog, inspectDocumentCatalog, documentCatalogSummary, filterDocumentCatalog} from '../src/shared/documents/catalogo-documentos.js';

function source(rows,name='CatalogoDocumentos'){return new Map([[name,rows]]);}
const rows=[
 [],
 ['Código','Documento','Versión','Estado del documento','Tipo de documento','Responsable','Especialidad','Enlace','Notas internas'],
 ['DOC-001','Arquitectura de integración','V1.0','En revisión','Técnico','GTI','Laboral','https://example.com/documento1','Debe actualizarse'],
 ['DOC-001','Arquitectura de integración','V1.1','Validado','Técnico','GTI','Laboral','','Vigente'],
 ['DOC-002','Diseño funcional','','Observado','Funcional','GSJ','Civil','','Pendiente de atención'],
 ['DOC-002','Diseño funcional','','Observado','Funcional','GSJ','Civil','','Registro duplicado']
];
const book=source(rows);
const d=inspectDocumentCatalog(book);
assert.equal(d.found,true);
assert.equal(d.sheet,'CatalogoDocumentos');
assert.equal(d.headerRow,1);
const parsed=parseDocumentCatalog(book);
assert.equal(parsed.error,'');
assert.equal(parsed.documents.length,4);
assert.equal(parsed.documents[0].row,3);
assert.equal(parsed.documents[0].documento,'Arquitectura de integración');
assert.equal(parsed.documents[0].codigo,'DOC-001');
assert.equal(parsed.documents[0].version,'V1.0');
assert.equal(parsed.documents[0].observaciones,'');
assert.equal(parsed.documents[0].extras[0].header,'Notas internas');
assert.equal(parsed.documents[1].statusLabel,'Validado');
assert.ok(parsed.warnings.some(x=>x.includes('más de una vez')));
const s=documentCatalogSummary(parsed.documents);
assert.equal(s.records,4);
assert.equal(s.documentos,2);
assert.equal(s.versiones,2);
assert.equal(s.validados,1);
assert.equal(filterDocumentCatalog(parsed.documents,{estado:'Validado'}).length,1);
assert.equal(filterDocumentCatalog(parsed.documents,{query:'DOC-002'}).length,2);
assert.equal(filterDocumentCatalog(parsed.documents,{especialidad:'Civil',tipo:'Funcional'}).length,2);
assert.equal(filterDocumentCatalog(parsed.documents,{responsable:'GTI'}).length,2);
// La ausencia de estado no acredita validación.
const noStatus=parseDocumentCatalog(source([['Documento','Versión'],['Guía de pruebas','V1.0']]));
assert.equal(noStatus.documents[0].statusLabel,'No informado');
assert.equal(documentCatalogSummary(noStatus.documents).validados,0);
assert.ok(!noStatus.warnings.some(x=>x.includes('columna Estado')));
assert.ok(!noStatus.warnings.some(x=>x.includes('columna Versión')));
// Encabezado desconocido: requerir asignación explícita, no inferir primera columna.
const unknown=source([['Columna A','Columna B'],['Guía','En revisión']]);
assert.match(parseDocumentCatalog(unknown).error,/No se pudo identificar/);
const manual=parseDocumentCatalog(unknown,{headerRow:0,documento:0,estado:1});
assert.equal(manual.documents[0].documento,'Guía');
assert.equal(manual.documents[0].estado,'En revisión');
// Se puede reconocer el nombre de hoja sin acentos o con ellos.
assert.equal(parseDocumentCatalog(source(rows,'Catálogo Documentos')).documents.length,4);
// Si no hay pestaña, comunicarlo sin inventar registros.
const absent=parseDocumentCatalog(source(rows,'OtraHoja'));
assert.equal(absent.documents.length,0);
assert.match(absent.error,/No se encontró/);
console.log('Catálogo documental: 9 conjuntos de validación OK');

// Esquema real de la fase inicial: solo A = Cod Documento, B = Nombre Documento.
const soloCodigoNombre=source([
 ['Cod Documento','Nombre Documento'],
 ['DOC-001','Plan de pruebas'],
 ['DOC-002','Diseño funcional'],
 ['DOC-003','Especificación de servicios']
]);
const inicial=parseDocumentCatalog(soloCodigoNombre);
assert.equal(inicial.error,'');
assert.deepEqual(inicial.mapping,{codigo:0,documento:1});
assert.equal(inicial.documents.length,3);
assert.equal(inicial.documents[0].codigo,'DOC-001');
assert.equal(inicial.documents[0].documento,'Plan de pruebas');
assert.equal(inicial.documents[0].documentKey,'DOC-001');
assert.equal(inicial.documents[0].statusLabel,'No informado');
assert.equal(inicial.documents[0].versionLabel,'Sin versión informada');
assert.equal(documentCatalogSummary(inicial.documents).codigosUnicos,3);
assert.equal(filterDocumentCatalog(inicial.documents,{query:'DOC-002'})[0].documento,'Diseño funcional');
const codRepetido=parseDocumentCatalog(source([
 ['Cod Documento','Nombre Documento'],
 ['DOC-001','Plan de pruebas'],
 ['DOC-001','Informe final'],
 ['','Documento sin código']
]));
assert.equal(documentCatalogSummary(codRepetido.documents).codigosRepetidos,1);
assert.equal(documentCatalogSummary(codRepetido.documents).sinCodigo,1);
assert.ok(codRepetido.warnings.some(w=>w.includes('repetidos')));
assert.ok(codRepetido.warnings.some(w=>w.includes('no tienen Cod Documento')));
console.log('Esquema A/B Cod Documento y Nombre Documento: OK');
