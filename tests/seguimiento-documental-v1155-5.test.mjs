import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeTrackingDate,parseTrackingSnapshot,TRACKING_STATUSES,VALIDATOR_TEAMS,validateTrackingCreate} from '../src/shared/documents/seguimiento-documental.js';
import {renderTrackingSection} from '../src/client/ui/seguimiento-documental-ui.js';
import {makeSheetSnapshot,validateSheetSnapshot} from '../src/shared/sync/sincronizacion-modelo.js';
const rows=[['Nro','Codigo de Documento','Fecha','Estado','Actividad','Comentarios','Responsable','Equipo Validador','Etapa'],[1,'4.10','46316','PENDIENTE','Presentación','','SOFTPLAN','GTI, PEJENP',''],[2,'4.1','','OBSERVADO','Falta firma','','SOFTPLAN','DP LABORAL, TRANSVERSALES',''],[3,'4.10','2026-10-28','VALIDADO','Aprobación','Listo','PEJENP','TODOS LOS DP','Cierre']];
test('Importa columnas B:I, conserva códigos, fechas Excel, varios equipos y filas sin fecha',()=>{
 const p=parseTrackingSnapshot(rows);
 assert.deepEqual(p.errors,[]);assert.equal(p.entries.length,3);assert.equal(p.entries[0].documentCode,'4.10');
 assert.equal(p.entries[0].date,'2026-10-21');assert.deepEqual(p.entries[0].validatorTeams,['GTI','PEJENP']);
 assert.equal(p.entries[1].date,'');assert.equal(p.entries[1].status,'Observado');
 assert.ok(p.warnings.some(x=>x.includes('histórico')));
});
test('Solo cinco estados nuevos en el formulario; estado histórico no se puede seleccionar',()=>{
 assert.deepEqual(TRACKING_STATUSES,['Pendiente','Programado','En proceso de firma','Entregado','Validado']);
 assert.deepEqual(VALIDATOR_TEAMS,['DP LABORAL','TRANSVERSALES','TODOS LOS DP','GTI','PEJENP']);
 assert.throws(()=>validateTrackingCreate({documentCode:'4.1',status:'Observado',activity:'Acta'}),/estado de seguimiento/);
 const html=renderTrackingSection({document:{codigo:'4.10'},canEdit:true,entries:parseTrackingSnapshot(rows).entries});
 for(const state of TRACKING_STATUSES)assert.match(html,new RegExp('<option value="'+state+'"'));
 assert.doesNotMatch(html,/Registrar nueva incidencia|Incidencias<|Críticas sin cerrar|incident-create-form/);
 assert.match(html,/Seguimiento del documento 4.10|Seguimiento del documento/);
});
test('La fuente tiene encabezado B:I y valida no inventar fechas',()=>{
 const sheets=new Map([['bitacoraDocumentosClave',rows]]);
 const snapshot=makeSheetSnapshot(sheets,'bitacora_documentos_clave');
 assert.equal(validateSheetSnapshot(snapshot).valid,true);
 assert.equal(normalizeTrackingDate(''), '');
 assert.throws(()=>normalizeTrackingDate('31/02/2026'),/Fecha no reconocida/);
});
test('API protege escritura pero permite lectura pública y dispone de publicaciones idempotentes',()=>{
 const api=fs.readFileSync(new URL('../api/seguimiento-documental.js',import.meta.url),'utf8');
 assert.match(api,/if\(req.method==='GET'\)/);assert.match(api,/const actor=await identifyEditor\(req\)/);
 assert.match(api,/ON CONFLICT\(source_key\) DO NOTHING/);
 assert.match(api,/action!=='publish'/);
 const app=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 assert.match(app,/renderTrackingSection/);assert.match(app,/sync-tracking-publish/);
 assert.match(app,/document-tracking-form/);
});
