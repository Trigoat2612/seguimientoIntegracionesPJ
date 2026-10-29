import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeSheetSnapshot,validateSheetSnapshot,compareSheetRows,locateSheet,SYNC_MODULES,syncColumnLimit,snapshotByteLength,MAX_SNAPSHOT_BYTES} from '../src/shared/sync/sincronizacion-modelo.js';
import {renderSyncView,syncSourceFor,prepareSyncAction} from '../src/client/ui/sincronizacion-ui.js';
function example(){
 const m=new Map([
  ['CatalogoDocumentos', [['Cod Documento','Nombre Documento'],['4.1','Documento A'],['4.10','Documento B']]],
  ['Seguimiento', [['A','Integración','C','Estado'],['','SERNOT','','Por validar']]],
  ['IntegracionesEtapa',[['Vía','Etapa','Integración'],['Ordinaria','Trámite','SERNOT']]],
  ['EtapaActividadIntegracion',[['Vía','Paso','Etapa','Actividad','Integración'],['Ordinaria','1','Trámite','Presentación','SERNOT']]],
  ['bitacoraDocumentosClave',[['Nro','Codigo de Documento','Fecha','Estado','Actividad','Comentarios','Responsable','Equipo Validador','Etapa'],['1','4.10','46316','PENDIENTE','Presentación','','SOFTPLAN','GTI, PEJENP','']]]
 ]);
 return m;
}
test('Las cinco fuentes quedan identificadas sin alterar su hoja de origen',()=>{
 const sheets=example();assert.equal(SYNC_MODULES.length,5);
 for(const m of SYNC_MODULES){const snap=makeSheetSnapshot(sheets,m.id);assert.equal(snap.sourceSheet,m.sheet);assert.equal(validateSheetSnapshot(snap).valid,true);}
 assert.equal(locateSheet(sheets,'invalid'),null);
});
test('Los documentos 4.1 y 4.10 conservan identidades separadas',()=>{
 const snap=makeSheetSnapshot(example(),'documentos_clave');assert.equal(snap.rows[1][0],'4.1');assert.equal(snap.rows[2][0],'4.10');
 assert.equal(validateSheetSnapshot(snap).valid,true);
});
test('El formato numérico explícito permite leer 4.10 pero no inventa ceros con General',()=>{
 const sheets=new Map([['CatalogoDocumentos',[['Cod Documento','Nombre Documento'],[4.1,'Documento A'],[4.1,'Documento B']]]]);
 const meta=new Map([['1:0',{formatCode:'0.0',numeric:true}],['2:0',{formatCode:'0.00',numeric:true}]]);
 sheets.cellFormats=new Map([['CatalogoDocumentos',meta]]);
 const snap=makeSheetSnapshot(sheets,'documentos_clave');assert.equal(snap.rows[1][0],'4.1');assert.equal(snap.rows[2][0],'4.10');
 assert.equal(validateSheetSnapshot(snap).valid,true);
});
test('No se importan códigos duplicados ni faltantes',()=>{
 const data=makeSheetSnapshot(example(),'documentos_clave');data.rows[2][0]='4.1';
 assert.equal(validateSheetSnapshot(data).valid,false);assert.match(validateSheetSnapshot(data).errors.join(' '),/duplicados/);
 data.rows[2][0]='';assert.equal(validateSheetSnapshot(data).valid,false);
});
test('Comparación detecta altas bajas cambios, e importación idéntica',()=>{
 const prev=[['A'],['B'],['C']];const curr=[['A'],['D']];
 assert.deepEqual({...compareSheetRows(curr,prev),samples:[]},{added:0,removed:1,changed:1,unchanged:1,identical:false,samples:[]});
 assert.equal(compareSheetRows(prev,prev).identical,true);
 assert.equal(compareSheetRows([['A'],['B']],[]).added,2);
});
test('Límites y fuentes inválidas se rechazan',()=>{
 const input=makeSheetSnapshot(example(),'resumen_tactico');input.rows[0][0]='X'.repeat(syncColumnLimit('resumen_tactico',0)+1);
 assert.equal(validateSheetSnapshot(input).valid,false);
 assert.equal(validateSheetSnapshot({...input,sourceSheet:'Inventado'}).valid,false);
});
test('Documentos Clave conserva su fuente separada cuando existe',()=>{
 const tactical=example(),documents=new Map([['CatalogoDocumentos',[['Cod Documento','Nombre Documento']]]]);
 const ctx={tacticalSheets:tactical,documentSheets:documents,tacticalOrigin:'Táctico',documentOrigin:'Documentos'};
 assert.equal(syncSourceFor('documentos_clave',ctx).origin,'Documentos');
 assert.equal(syncSourceFor('resumen_tactico',ctx).origin,'Táctico');
 const result=prepareSyncAction('integraciones_via',syncSourceFor('integraciones_via',ctx));assert.equal(result.validation.valid,true);
});
test('V1.15.5 reserva importación a Sincronización y muestra lectura Neon',()=>{
 const html=renderSyncView({status:{modules:[]},available:{}});
 assert.match(html,/Guardar copia en Neon/);assert.match(html,/Cargar fuente para sincronización/);
 assert.match(html,/Obligatoria para los cuatro módulos/);
 assert.match(html,/Publicar en Neon/);
 assert.doesNotMatch(html,/data-action="sync-promote"/);
});
test('Esquema SQL declara fuentes fijadas y copias auditables, sin alterar incidencias',()=>{
 const sql=fs.readFileSync(new URL('../database/migrations/sincronizacion-v1_15_0.sql',import.meta.url),'utf8');
 assert.match(sql,/active_source\s+TEXT[^\n]+CHECK \(active_source = 'google_sheets'\)/);
 assert.match(sql,/migration_batches/);assert.match(sql,/migration_batch_rows/);assert.match(sql,/migration_audit_events/);
 assert.doesNotMatch(sql,/DROP TABLE/i);
});

test('Seguimiento G admite bitácoras extensas reales y conserva saltos de línea, sin truncamientos',()=>{
 const snap=makeSheetSnapshot(example(),'resumen_tactico');
 const lengths=[4589,4353,3994,3210,2637];
 snap.rows[1]=Array.from({length:13},()=>'' );
 for(const [i,n] of lengths.entries()){
  const value='\n'+('a'.repeat(n-1));
  if(i===0)snap.rows[1][6]=value;
  else{const row=Array.from({length:13},()=>'' );row[6]=value;snap.rows.push(row);}
 }
 const validation=validateSheetSnapshot(snap);
 assert.equal(validation.valid,true,validation.errors.join('; '));
 assert.equal(validation.rows[1][6].length,4589);
 assert.ok(validation.rows[1][6].startsWith('\n'));
 assert.equal(syncColumnLimit('resumen_tactico',6),120000);
});
test('Las consideraciones tienen un límite propio y se preservan los campos breves',()=>{
 assert.ok(syncColumnLimit('resumen_tactico',12)>syncColumnLimit('resumen_tactico',1));
 assert.ok(syncColumnLimit('resumen_tactico',6)>syncColumnLimit('resumen_tactico',12));
 const data=makeSheetSnapshot(example(),'resumen_tactico');
 data.rows[1]=['','','','','','','','','','','','', 'b'.repeat(23000)];
 assert.equal(validateSheetSnapshot(data).valid,true);
});
test('Valida el tamaño agregado para proteger el límite HTTP sin recortar bitácoras',()=>{
 const rows=[['Bitácora','a'.repeat(MAX_SNAPSHOT_BYTES)]];
 assert.ok(snapshotByteLength(rows)>MAX_SNAPSHOT_BYTES);
 const s={module:'resumen_tactico',sourceSheet:'Seguimiento',rows:[['G','','','','','','a'.repeat(13000)]]};
 assert.equal(validateSheetSnapshot(s).valid,true);
});
test('Comparar, guardar e historial permiten consultar API sin requerir precarga previa de estado',()=>{
 const source=syncSourceFor('resumen_tactico',{tacticalSheets:example(),tacticalOrigin:'Archivo de origen'});
 const html=renderSyncView({status:null,available:{resumen_tactico:source}});
 for(const action of ['sync-compare','sync-stage','sync-history']){
  const tag=html.match(new RegExp('<button[^>]*data-action="'+action+'" data-sync-module="resumen_tactico"[^>]*>'))?.[0]||'';
  assert.ok(tag,'No aparece '+action);
  assert.doesNotMatch(tag,/disabled/,'No debe bloquearse '+action+' si aún no se consultó Neon');
 }
});
