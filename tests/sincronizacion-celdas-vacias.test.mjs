import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheetSnapshot,validateSheetSnapshot,compareSheetRows} from '../src/shared/sync/sincronizacion-modelo.js';

function sparseTrackingBook(){
 // El lector XLSX crea arrays dispersos cuando Excel omite <c> en una celda.
 // F2:F5 están sin valor en Seguimiento; G debe conservarse íntegro.
 const rows=[['N°','Sistema a Integrar','Observación','Estado','Dependencia','Habilitacion de ambiente','Estado Situacional']];
 for(let n=1;n<=4;n++){
  const row=[];
  row[0]=String(n);row[1]=['RENIEC','CONADIS','SUNAT','SINAREJ - Aranceles'][n-1];
  row[3]='Validado';row[4]='GSJ';row[6]=`Bitácora línea ${n}\nAcuerdo: GSJ`;
  rows.push(row);
 }
 return new Map([['Seguimiento',rows]]);
}

test('F2:F5 en blanco del Seguimiento no generan null en JSON ni error en validación de origen',()=>{
 const source=makeSheetSnapshot(sparseTrackingBook(),'resumen_tactico');
 for(let r=1;r<=4;r++){
  assert.equal(source.rows[r][5],'');
  assert.equal(source.rows[r][6],`Bitácora línea ${r}\nAcuerdo: GSJ`);
 }
 const transported=JSON.parse(JSON.stringify(source));
 const result=validateSheetSnapshot(transported);
 assert.equal(result.valid,true,result.errors.join(' '));
 assert.ok(transported.rows.every(row=>row.every(v=>typeof v==='string')));
});

test('La API normaliza null de una exportación anterior solo como vacío, sin aceptar valores numéricos o booleanos',()=>{
 const snap=makeSheetSnapshot(sparseTrackingBook(),'resumen_tactico');
 snap.rows[1][5]=null;snap.rows[2][5]=undefined;
 let checked=validateSheetSnapshot(snap);
 assert.equal(checked.valid,true,checked.errors.join(' '));
 assert.equal(checked.rows[1][5],'');
 assert.equal(checked.rows[2][5],'');
 assert.equal(compareSheetRows(checked.rows,makeSheetSnapshot(sparseTrackingBook(),'resumen_tactico').rows).identical,true);
 snap.rows[3][5]=false;snap.rows[4][5]=123;
 checked=validateSheetSnapshot(snap);
 assert.equal(checked.valid,false);
 assert.match(checked.errors.join(' '),/Fila 4, columna 6: el valor debe ser texto/);
 assert.match(checked.errors.join(' '),/Fila 5, columna 6: el valor debe ser texto/);
});

test('Filas vacías y celdas omitidas en cualquier módulo se serializan como cadenas, sin desplazar índices',()=>{
 const docs=[];
 docs[0]=['Cod Documento','Nombre Documento'];
 docs[1]=['4.1','Documento A'];
 docs[2]=['4.10','Documento B'];
 docs[4]=[];
 const source=new Map([['CatalogoDocumentos',docs]]);
 const snap=makeSheetSnapshot(source,'documentos_clave');
 assert.deepEqual(snap.rows[3],[]);
 assert.deepEqual(snap.rows[4],[]);
 assert.deepEqual(snap.rows[2],['4.10','Documento B']);
 assert.equal(validateSheetSnapshot(JSON.parse(JSON.stringify(snap))).valid,true);
});

test('La bitácora documental permite actividades E vacías sin perder comentarios, fecha ni estado',()=>{
 const header=['Nro','Codigo de Documento','Fecha','Estado','Actividad','Comentarios','Responsable','Equipo Validador','Etapa'];
 const row=[];row[0]='43';row[1]='3.5';row[2]='46316';row[3]='Observado';
 // E no existe; F conserva las observaciones del historial.
 row[5]='Comentario histórico sin actividad';row[6]='SOFTPLAN';row[7]='GTI';row[8]='Diseño';
 const snap=makeSheetSnapshot(new Map([['bitacoraDocumentosClave',[header,row]]]),'bitacora_documentos_clave');
 assert.equal(snap.rows[1][4],'');
 assert.equal(snap.rows[1][5],'Comentario histórico sin actividad');
 const transport=JSON.parse(JSON.stringify(snap));
 const checked=validateSheetSnapshot(transport);
 assert.equal(checked.valid,true,checked.errors.join(' '));
 assert.match(checked.warnings.join(' '),/histórico/);
});
