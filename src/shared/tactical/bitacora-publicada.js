/** Excel base más modificaciones expresamente publicadas. No incluye borradores. */
import {tacticalDateAlerts} from './tactical.js';
export function publishedTacticalEntries(rows, publishedBatchId) {
 if (!publishedBatchId) return [];
 const batch = String(publishedBatchId);
 return (rows || [])
  .filter(row => row.is_active === true && String(row.source_batch_id) === batch)
  .map(row => {
   const sourceRow = Number(row.source_row);
   const original = row.entry && typeof row.entry === 'object' ? row.entry : {};
   const history=typeof row.situational_history === 'string' ? row.situational_history : '';
   return {
    ...original,
    id: 'seg-' + sourceRow,
    row: sourceRow,
    name: String(row.integration_name || original.name || ''),
    history,
    dateAlerts:tacticalDateAlerts(original.developmentClose,original.testsClose,original.gsjValidation)
   };
  });
}
