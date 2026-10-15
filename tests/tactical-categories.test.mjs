import assert from 'node:assert/strict';
import {parseTactical,tacticalMatchesCategory,tacticalCategoryCounts,TACTICAL_CATEGORIES,TACTICAL_MAX_ROW} from '../tactical.js';

const rows=Array.from({length:40},()=>[]);
rows[0][1]='Integración'; rows[0][3]='Estado'; rows[0][11]='Criticidad';
function add(row,name,state,crit){rows[row-1][1]=name;rows[row-1][3]=state;rows[row-1][11]=crit;}
add(2,'Crítica verde','Validada','Alta');
add(3,'Alta normal','En pruebas',' Alta ');
add(4,'Ciclo segundo','Ciclo 2','Media');
add(5,'Ciclo segundo tercero','Ciclo 2/3','');
add(6,'Funcionalidad','Funcionalidad para Ciclo 1','');
add(7,'Manual','  MANUAL  ','');
add(8,'No aplica','No Aplica Integración','');
add(9,'Normal','Por validar','Media');
add(36,'Última fila','Manual','');
add(37,'Fila excluida','Ciclo 2','Alta');
const sheets=new Map([['Seguimiento',rows]]);
sheets.cellFormats=new Map([['Seguimiento',new Map([['1:11',{fillColor:'#00B050'}]])]]);
const data=parseTactical(sheets);
assert.equal(TACTICAL_MAX_ROW,36);
assert.equal(data.entries.length,9);
assert.equal(data.entries.some(e=>e.name==='Fila excluida'),false);
const counts=tacticalCategoryCounts(data.entries);
assert.deepEqual(counts,{todas:9,critica:1,alta:1,ciclo2:1,ciclo23:1,funcionalidad1:1,manual:2,noaplica:1});
for(const [id,name] of Object.entries({critica:'Crítica verde',alta:'Alta normal',ciclo2:'Ciclo segundo',ciclo23:'Ciclo segundo tercero',funcionalidad1:'Funcionalidad',noaplica:'No aplica'})){
 const selected=data.entries.filter(e=>tacticalMatchesCategory(e,id));
 assert.deepEqual(selected.map(e=>e.name),[name],`filtro ${id}`);
}
assert.deepEqual(data.entries.filter(e=>tacticalMatchesCategory(e,'manual')).map(e=>e.name),['Manual','Última fila']);
assert.equal(TACTICAL_CATEGORIES.filter(e=>e.id==='manual').length,1,'Manual figura una sola vez');
assert.equal(data.entries[0].green,true);
assert.equal(data.entries[0].high,true);
assert.equal(data.entries[1].green,false);
assert.equal(tacticalMatchesCategory(data.entries[0],'alta'),false,'no repetir críticas en altas');
assert.equal(tacticalMatchesCategory(data.entries[2],'ciclo23'),false,'no incluir Ciclo 2 en Ciclo 2/3');
assert.equal(tacticalMatchesCategory(data.entries[3],'ciclo2'),false,'no incluir Ciclo 2/3 en Ciclo 2');
assert.equal(tacticalMatchesCategory(data.entries[4],'noaplica'),false);
// La severidad se define por L, no por D: ambas clasificaciones se evalúan independientemente.
const both={statusRaw:'Ciclo 2',high:true,green:true};
assert.equal(tacticalMatchesCategory(both,'ciclo2'),true);
assert.equal(tacticalMatchesCategory(both,'critica'),true);
// Ante la ausencia de relleno exportado, no se inventa la severidad Crítica.
const withoutStyles=parseTactical(new Map([['Seguimiento',rows]]));
assert.equal(tacticalCategoryCounts(withoutStyles.entries).critica,0);
assert.equal(tacticalCategoryCounts(withoutStyles.entries).alta,2);
console.log('Pruebas tácticas V1.9.2: 8 categorías, límites, verde, exclusividad y estados correctos');
