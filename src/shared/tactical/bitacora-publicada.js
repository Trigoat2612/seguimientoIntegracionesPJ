/**
 * Contrato del historial público: usar exclusivamente la columna G
 * de la versión de Seguimiento publicada desde el Excel.
 * Jamás mezclar bitácoras operativas, hallazgos ni propuestas en revisión.
 */
export function publishedTacticalEntries(rows, publishedBatchId) {
 if (!publishedBatchId) return [];
 const batch = String(publishedBatchId);
 return (rows || [])
  .filter(row => row.is_active === true && String(row.source_batch_id) === batch)
  .map(row => {
   const sourceRow = Number(row.source_row);
   const original = row.entry && typeof row.entry === 'object' ? row.entry : {};
   return {
    ...original,
    id: 'seg-' + sourceRow,
    row: sourceRow,
    name: String(row.integration_name || original.name || ''),
    // Única fuente admitida: la celda G importada para este lote.
    history: typeof row.situational_history === 'string' ? row.situational_history : ''
   };
  });
}
