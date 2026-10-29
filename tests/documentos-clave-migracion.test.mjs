import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentCatalog} from '../src/shared/documents/catalogo-documentos.js';
import {makeSheetSnapshot} from '../src/shared/sync/sincronizacion-modelo.js';
import {extractKeyDocuments,compareKeyDocuments,keyDocumentsAsSheets} from '../src/shared/documents/documentos-clave-migracion.js';
const snap=rows=>makeSheetSnapshot(new Map([['CatalogoDocumentos',rows]]),'documentos_clave');
test('Catálogo 4.1, 4.10 y 4.100 conserva tres identificadores únicos',()=>{
 const docs=extractKeyDocuments(snap([['Cod Documento','Nombre Documento'],['4.1','Uno'],['4.10','Diez'],['4.100','Cien']]));
 assert.deepEqual(docs.map(d=>d.code),['4.1','4.10','4.100']);
 assert.deepEqual(docs.map(d=>d.sourceRow),[2,3,4]);
 assert.equal(parseDocumentCatalog(keyDocumentsAsSheets(docs)).documents.length,3);
});
test('No importa filas con nombre o código ausentes ni códigos repetidos',()=>{
 assert.throws(()=>extractKeyDocuments(snap([['Cod Documento','Nombre Documento'],['4.1','Uno'],['4.1','Dos']])),/duplicado|repetido/i);
 assert.throws(()=>extractKeyDocuments(snap([['Cod Documento','Nombre Documento'],['DOC-A','Uno'],['doc-a','Dos']])),/duplicado|repetido/i);
 assert.throws(()=>extractKeyDocuments(snap([['Cod Documento','Nombre Documento'],['4.1','Uno'],['4.2','']])),/obligatorios/);
 assert.throws(()=>extractKeyDocuments(snap([['Cod Documento','Nombre Documento']])),/importables/);
});
test('Cotejo por códigos no confunde cambio de orden, alta, nombre y baja',()=>{
 const old=[{code:'4.1',name:'A'},{code:'4.10',name:'B'}];
 assert.equal(compareKeyDocuments(old.toReversed(),old).identical,true);
 const diff=compareKeyDocuments([{code:'4.10',name:'B2'},{code:'4.100',name:'C'}],old);
 assert.deepEqual({added:diff.added,removed:diff.removed,renamed:diff.renamed,unchanged:diff.unchanged},{added:1,removed:1,renamed:1,unchanged:0});
});
test('SQL de V1.15.1 crea catálogo y auditoría y preserva bitácora',()=>{
 const sql=readFileSync(new URL('../database/migrations/documentos-clave-v1_15_1.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS key_documents/);
 assert.match(sql,/document_code TEXT PRIMARY KEY/);
 assert.match(sql,/key_document_migration_events/);
 assert.match(sql,/module_key='documentos_clave'/);
 assert.match(sql,/module_key<>'documentos_clave'/);
 assert.doesNotMatch(sql,/DROP TABLE/i);
});
test('API exige identidad Google y conserva un retorno explícito a Sheets',()=>{
 const api=readFileSync(new URL('../api/documentos-clave.js',import.meta.url),'utf8');
 assert.match(api,/identifyEditor\(req\)/);
 assert.match(api,/checksum!==batch.checksum/);
 assert.match(api,/legacyReferences/);
 assert.match(api,/reverted_to_google/);
 assert.match(api,/action==='catalog'/);
 assert.match(api,/if\(!active\)/);
});
