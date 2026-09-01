import { shipmentStages } from '../theme';
import { formatDate } from './format';

/**
 * Builds the 7-stage freight timeline shown on the tracking screens.
 *
 * Stage dates are stored under human-readable keys such as
 * `"Received in WarehouseDate"`. One of them is written with inconsistent
 * casing in the web app (`"Alg WarehouseDate"` vs `"Alg warehouseDate"`), so
 * those stages carry an array of candidate keys and the first match wins.
 */
export const buildTimeline = order => {
  const score = Number(order?.shipmentStatusScore) || 0;

  return shipmentStages.map(stage => {
    const keys = Array.isArray(stage.dateField) ? stage.dateField : [stage.dateField];
    const rawDate = keys.map(key => order?.[key]).find(Boolean);

    return {
      score: stage.score,
      label: stage.label,
      date: rawDate ? formatDate(rawDate) : '',
      complete: score >= stage.score,
      current: score === stage.score,
    };
  });
};

export default buildTimeline;
