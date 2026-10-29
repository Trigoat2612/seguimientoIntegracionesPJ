/** Fuente única: campo dependency del modelo táctico = columna E de Seguimiento.
 * Se conserva el contenido de cada celda (solo se retiran espacios exteriores).
 * Nunca se infiere una entidad a partir del estado, nombre o especialidad. */
export function entityFromColumnE(entry){
  return String(entry?.dependency ?? '').trim();
}
/** Si TODAS las filas visibles tienen exactamente el mismo valor E, puede aparecer
 * una única leyenda Entidad. Si difieren o hay celdas vacías, cada fila muestra
 * su propio E y se evita una leyenda de cabecera inventada o combinada. */
export function entityPresentation(columns){
  const entries=(columns||[]).flat().map(item=>item?.entry).filter(Boolean);
  const values=entries.map(entityFromColumnE);
  const single=values.length>0&&values.every(v=>v!==''&&v===values[0]);
  return {header:single?values[0]:'',perIntegration:values.length>0&&!single};
}
export function integrationWithEntity(entry,displayEntity){
  const name=String(entry?.name??'').replace(/[\r\n]+/g,' ').trim()||'Sin nombre';
  const entity=entityFromColumnE(entry);
  return displayEntity&&entity?`${name} · Entidad: ${entity}`:name;
}
