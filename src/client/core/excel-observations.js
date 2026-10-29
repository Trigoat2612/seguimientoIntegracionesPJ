/** Observaciones importadas y recalculadas en cada carga del Excel.
 * Son inmutables en UI y NO se guardan en localStorage ni en los respaldos manuales.
 * Una nota de atributo se asocia al endpoint que la contiene, mientras que las
 * observaciones de Sistemas pertenecen al componente de esa fila o al sistema
 * completo si la celda Componente está vacía.
 */
import {systemId,endpointId} from './hierarchy.js';
export function extractExcelObservations(model,hierarchy){
 const result=[],dedupe=new Set();
 function push(scope,targetId,text,author,source,field=''){
  if(!text||!targetId)return;
  const dedup=scope+'|'+targetId+'|'+source+'|'+author;
  if(dedupe.has(dedup))return;dedupe.add(dedup);
  result.push({id:'excel:'+dedup,origin:'excel',scope,targetId,text,author,source,field, status:'No informado'});
 }
 for(const s of hierarchy.systems){
  for(const i of s.integrations){
   for(const c of i.components){
    // Fila sin componente: observación genuinamente a nivel sistema.
    const named=Boolean(c.component&&c.component!=='Sin componente');
    const targetId=named?i.id:s.id;
    const level=named?'integration':'system';
    push(level,targetId,c.observationsGTI,'GTI',`Sistemas!N${c.row}`);
    push(level,targetId,c.observationsSoftplan,'SOFTPLAN',`Sistemas!O${c.row}`);
   }
   for(const e of i.endpoints)for(const o of e.excelNotes||[])
    push('endpoint',endpointId(e),o.text,o.author,o.source,o.field);
  }
 }
 for(const r of model.structures){
  // CASILLERO es documentación de columnas, no endpoints: se resume en el sistema.
  if(!r.observation)continue;
  push('system',systemId(r.integration),r.observation,'Nota técnica · CASILLERO',`CASILLERO!L${r.row}`,r.field);
 }
 return result;
}
