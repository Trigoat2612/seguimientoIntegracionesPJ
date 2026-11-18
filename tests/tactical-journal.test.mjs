import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 parseTacticalHistory,latestTacticalAgreement,filterTacticalHistory,renderTacticalJournalEntries,renderTacticalJournalModal
} from '../src/client/ui/tactical-journal.js';

const content=[
 '07/10 - Se informó que la integración tenía una validación previa.',
 '15/10 - Se encontró una discrepancia técnica. | Acuerdo: GTI: Revisar el origen. | Pendiente: Softplan: Verificar la respuesta.',
 'Este texto continúa la anotación del 15/10.',
 '16/10 - Se confirmó el escenario sin incidencia.',
 '15/10 - Se aclaró que la consulta pertenece a otra integración.'
].join('\n');

test('Ordena fechas en forma descendente y conserva una nota continuada',()=>{
 const entries=parseTacticalHistory(content);
 assert.equal(entries.length,4);
 assert.deepEqual(entries.map(x=>x.date),['16/10','15/10','15/10','07/10']);
 assert.match(entries[2].raw,/continúa la anotación/);
 assert.match(entries[2].pendings[0],/continúa la anotación/);
 assert.equal(entries[2].agreements.length,1);
 assert.equal(entries[2].pendings.length,1);
 assert.equal(entries[0].hasPending,false);
});

test('El filtro diferencia pendientes explícitos de frases históricas',()=>{
 const entries=parseTacticalHistory(content);
 assert.equal(filterTacticalHistory(entries,{pendingOnly:true}).length,1);
 assert.equal(filterTacticalHistory(entries,{query:'técnica'}).length,1);
 assert.equal(filterTacticalHistory(entries,{query:'tecnica',pendingOnly:true}).length,1);
 assert.equal(filterTacticalHistory(entries,{query:'sin coincidencias'}).length,0);
});

test('Conserva registros no estructurados sin descartar anotaciones',()=>{
 const entries=parseTacticalHistory('Nota introductoria\n10/11/2026 - Texto uno\nlínea adicional\n11/11/2026 - Texto dos');
 assert.equal(entries.length,3);
 assert.equal(entries[0].date,'11/11/2026');
 assert.equal(entries[1].date,'10/11/2026');
 assert.match(entries[1].raw,/línea adicional/);
 assert.equal(entries[2].date,'Sin fecha');
 assert.equal(parseTacticalHistory('').length,0);
});

test('Escapa HTML del origen y no habilita ediciones del historial',()=>{
 const history='15/11 - <script>alert(1)</script> | Acuerdo: Equipo: <b>revisar</b> | Pendiente: GTI: Validar.';
 const entry={name:'Integración <X>',history};
 const html=renderTacticalJournalModal(entry);
 assert.match(html,/Historial de Integración &lt;X&gt;/);
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<b>revisar<\/b>/);
 assert.doesNotMatch(html,/Pendiente en Excel/);
 assert.match(html,/Pendiente consignado/);
 assert.match(html,/Copiar columna G/);
 assert.doesNotMatch(html,/Guardar|Eliminar|Modificar bitácora/);
});

test('La vista integra botón, filtros, teclado y estilo responsivo',()=>{
 const js=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/client/styles.css',import.meta.url),'utf8');
 assert.match(js,/data-action="tactical-journal-open"/);
 assert.match(js,/function openTacticalJournal\(/);
 assert.match(js,/Último acuerdo registrado/);
 assert.match(js,/function filterTacticalJournalView\(/);
 assert.match(js,/function closeTacticalJournal\(/);
 assert.match(js,/copyTacticalJournal\(\)/);
 assert.match(js,/e\.key==='Escape'\)\{closeTacticalJournal\(\)/);
 assert.match(css,/\.tactical-journal-overlay/);
 assert.match(css,/@media\(max-width:560px\)/);
 const blank=renderTacticalJournalEntries([]);
 assert.match(blank,/No se encontraron anotaciones/);
});


test('Reconoce fechas combinadas e intervalos sin mezclar registros ni perder texto',()=>{
 const input=[
  '07/10 - Prueba inicial. | Acuerdo: GTI: Revisar conectividad.',
  '09/10 y 12/10 - Se delimitó la reasignación. | Acuerdo: Softplan: Completar documentación.',
  '14/10 y 15/10 - La inserción exigía un expediente. | Acuerdo: Softplan: Ajustar asociación.',
  '19/10 al 21/10 - Se revisaron notificaciones. | Acuerdo del 20/10: Softplan: Separar las guías.',
  '22/10 - Se ejecutó otra prueba, sin nuevo acuerdo.'
 ].join('\n');
 const notes=parseTacticalHistory(input);
 assert.equal(notes.length,5);
 assert.deepEqual(notes.map(n=>n.date),['22/10','19/10 al 21/10','14/10 y 15/10','09/10 y 12/10','07/10']);
 assert.match(notes[1].agreements[0],/Separar las guías/);
 assert.match(notes[2].agreements[0],/Ajustar asociación/);
 assert.match(notes[3].raw,/09\/10 y 12\/10/);
 assert.equal(notes.filter(x=>x.date==='Sin fecha').length,0);
 const latest=latestTacticalAgreement(input);
 assert.equal(latest.date,'19/10 al 21/10');
 assert.match(latest.text,/^\(20\/10\)/);
 assert.match(latest.text,/Separar las guías/);
 assert.equal(filterTacticalHistory(notes,{query:'14/10 y 15/10'}).length,1);
});
test('El último acuerdo ignora hechos sin acuerdo y evita inventar resoluciones',()=>{
 assert.equal(latestTacticalAgreement('20/10 - Un hecho sin acuerdo.'),null);
 const input='09/10 - Se revisó el servicio. | Acuerdo: GTI: Verificar.\n14/10 - Sesión posterior sin acuerdo nuevo.';
 assert.equal(latestTacticalAgreement(input).date,'09/10');
 assert.equal(latestTacticalAgreement(input).text,'GTI: Verificar.');
 assert.match(renderTacticalJournalEntries(parseTacticalHistory(input)),/tactical-journal-entry/);
 assert.doesNotMatch(renderTacticalJournalEntries(parseTacticalHistory(input)),/tactical-journal-pending-chip/);
});
