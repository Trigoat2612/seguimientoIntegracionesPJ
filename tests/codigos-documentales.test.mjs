import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDocumentCode} from '../src/shared/documents/codigo-documento.js';
import {parseDocumentCatalog,documentCatalogSummary,filterDocumentCatalog} from '../src/shared/documents/catalogo-documentos.js';
import {normalizedDocumentCode,validateIncidentCreate} from '../src/shared/documents/bitacora-validacion.js';

const makeSheet=(rows,formatByCell={})=>{
 const sheets=new Map([['CatalogoDocumentos',rows]]);
 sheets.cellFormats=new Map([['CatalogoDocumentos',new Map(Object.entries(formatByCell))]]);
 return sheets;
};

test('Los códigos ingresados como texto conservan los ceros y los puntos',()=>{
 for(const code of ['4.1','4.10','4.100','04.10','4.01','4.11']){
  assert.equal(readDocumentCode(code).value,code);
  assert.equal(normalizedDocumentCode(code),code);
 }
});

test('La celda numérica con formato 0.00 se lee como 4.10, no como 4.1',()=>{
 assert.deepEqual(readDocumentCode('4.1',{numeric:true,formatCode:'0.00'}),{
  value:'4.10',numeric:true,ambiguous:false,recovered:true
 });
 assert.equal(readDocumentCode('4.1',{numeric:true,formatCode:'0.0'}).value,'4.1');
 assert.equal(readDocumentCode('4.1',{numeric:true,formatCode:'0.000'}).value,'4.100');
 assert.equal(readDocumentCode('4.1',{numeric:true,formatCode:'General'}).value,'4.1');
 assert.equal(readDocumentCode('4.1',{numeric:true,formatCode:'General'}).ambiguous,true);
});

test('Catálogo con 4.1 y 4.10 se mantiene separado; búsqueda y deduplicación por código completo',()=>{
 const sheets=makeSheet([
  ['Cod Documento','Nombre Documento'],
  ['4.1','Documento 4.1'],
  ['4.10','Documento 4.10'],
  ['4.100','Documento 4.100']
 ]);
 const r=parseDocumentCatalog(sheets);
 assert.equal(r.error,'');
 assert.deepEqual(r.documents.map(x=>x.codigo),['4.1','4.10','4.100']);
 assert.equal(documentCatalogSummary(r.documents).codigosRepetidos,0);
 assert.equal(documentCatalogSummary(r.documents).codigosUnicos,3);
 assert.equal(filterDocumentCatalog(r.documents,{query:'4.10'}).length,2); // 4.10 también coincide como subcadena de 4.100
});

test('Los metadatos de número Excel permiten distinguir 4.1 de 4.10',()=>{
 const sheets=makeSheet([
  ['Cod Documento','Nombre Documento'],
  ['4.1','A'],
  ['4.1','B']
 ],{'1:0':{numeric:true,formatCode:'0.0'},'2:0':{numeric:true,formatCode:'0.00'}});
 const r=parseDocumentCatalog(sheets);
 assert.deepEqual(r.documents.map(x=>x.codigo),['4.1','4.10']);
 assert.equal(documentCatalogSummary(r.documents).codigosRepetidos,0);
});

test('Códigos numéricos sin formato no generan advertencias generales, conservan indicador de ambigüedad',()=>{
 const sheets=makeSheet([
  ['Cod Documento','Nombre Documento'],
  ['4.1','Documento con identificador incierto']
 ],{'1:0':{numeric:true,formatCode:'General'}});
 const r=parseDocumentCatalog(sheets);
 assert.equal(r.documents[0].codeAmbiguous,true);
 assert.doesNotMatch(r.warnings.join(' '),/4\.10/);
});

test('Validación de incidencias no redondea ni trunca los códigos',()=>{
 const base={documentName:'Nombre',title:'Incidencia',description:'Detalle',severity:'Media'};
 const a=validateIncidentCreate({...base,documentCode:'4.1'});
 const b=validateIncidentCreate({...base,documentCode:'4.10'});
 assert.equal(a.documentCode,'4.1');assert.equal(b.documentCode,'4.10');
 assert.notEqual(a.documentCode,b.documentCode);
});

test('La API rechaza un código enviado como número decimal',()=>{
 const base={documentName:'Nombre',title:'Incidencia',description:'Detalle',severity:'Media'};
 assert.throws(()=>validateIncidentCreate({...base,documentCode:4.1}),/como texto/);
});
