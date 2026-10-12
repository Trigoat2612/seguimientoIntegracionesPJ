import assert from 'node:assert/strict';
import {parseTactical, tacticalDateAlerts, getTacticalSummary, TACTICAL_MAX_ROW} from '../tactical.js';

// Prueba autónoma, sin leer documentos privados ni solicitar OAuth.
assert.equal(TACTICAL_MAX_ROW,36);
const rows=Array.from({length:40},()=>[]);
rows[0][1]='Integración'; rows[0][3]='Estado'; rows[0][11]='Criticidad';
rows[1][1]='RENIEC'; rows[1][3]='Validado'; rows[1][7]='Por informar'; rows[1][8]='15/10/2026'; rows[1][11]='Alta';
rows[35][1]='CEJ'; rows[35][3]='En Pruebas'; rows[35][7]='Revisión con GTI'; rows[35][8]='POR INFORMAR'; rows[35][9]='REVISIÓN CON GSJ'; rows[35][11]='Media';
rows[36][1]='FUERA DE RANGO'; rows[36][3]='Validado'; rows[36][11]='Alta';
const data=parseTactical(new Map([['Seguimiento',rows]]));
assert.deepEqual(data.entries.map(e=>e.row),[2,36], 'fila 36 incluida, fila 37 excluida');
assert.equal(data.entries[0].dateAlerts.length,1);
assert.equal(data.entries[1].dateAlerts.length,3);
assert.equal(getTacticalSummary(data).dateAlertCount,2);
assert.equal(getTacticalSummary(data).high.length,1);
assert.equal(tacticalDateAlerts('Revisión con SOFTPLAN','','').length,1);
assert.equal(tacticalDateAlerts('Por Informar','','').length,1);
assert.equal(tacticalDateAlerts('10/10/2026','11/10/2026','12/10/2026').length,0);
assert.equal(tacticalDateAlerts('Informe recibido','','').length,0);
console.log('Pruebas tácticas V1.9.1: correctas');
