import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 parseTacticalHistory,filterTacticalHistory,renderTacticalJournalEntries,renderTacticalJournalModal
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
 assert.match(html,/Pendiente en Excel/);
 assert.match(html,/Copiar columna G/);
 assert.doesNotMatch(html,/Guardar|Eliminar|Modificar bitácora/);
});

test('La vista integra botón, filtros, teclado y estilo responsivo',()=>{
 const js=fs.readFileSync(new URL('../src/client/app.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/client/styles.css',import.meta.url),'utf8');
 assert.match(js,/data-action="tactical-journal-open"/);
 assert.match(js,/function openTacticalJournal\(/);
 assert.match(js,/function filterTacticalJournalView\(/);
 assert.match(js,/function closeTacticalJournal\(/);
 assert.match(js,/copyTacticalJournal\(\)/);
 assert.match(js,/e\.key==='Escape'\)\{closeTacticalJournal\(\)/);
 assert.match(css,/\.tactical-journal-overlay/);
 assert.match(css,/@media\(max-width:560px\)/);
 const blank=renderTacticalJournalEntries([]);
 assert.match(blank,/No se encontraron anotaciones/);
});
