import { normalizeQuantity, stepDown, stepUp } from '../src/utils/quantity';
import { buildTimeline } from '../src/utils/tracking';

/**
 * 1688 products can only be ordered in whole packs (`batch`). The web app
 * snapped to multiples inline in several components; this pins the shared rule.
 */
describe('batch quantity stepping', () => {
  it('steps by one when there is no pack size', () => {
    expect(stepUp(3)).toBe(4);
    expect(stepDown(3)).toBe(2);
    expect(stepUp(0, 1)).toBe(1);
  });

  it('steps by a whole pack', () => {
    expect(stepUp(0, 6)).toBe(6);
    expect(stepUp(6, 6)).toBe(12);
    expect(stepDown(12, 6)).toBe(6);
  });

  it('snaps an off-pack value onto the pack grid', () => {
    // 7 is not a multiple of 6: up goes to 12, down goes to 6.
    expect(stepUp(7, 6)).toBe(12);
    expect(stepDown(7, 6)).toBe(6);
  });

  it('never goes below the floor', () => {
    expect(stepDown(0, 6)).toBe(0);
    expect(stepDown(6, 6, 6)).toBe(6);
  });

  it('rounds typed quantities up to a whole pack', () => {
    expect(normalizeQuantity('7', 6)).toBe(12);
    expect(normalizeQuantity('6', 6)).toBe(6);
    expect(normalizeQuantity('13', 1)).toBe(13);
  });

  it('clamps to available stock and rejects junk', () => {
    expect(normalizeQuantity('500', 6, 100)).toBe(100);
    expect(normalizeQuantity('abc', 6)).toBe(0);
    expect(normalizeQuantity('-4', 1)).toBe(0);
  });
});

/** The 7-stage pipeline is the spine of every tracking view. */
describe('shipment timeline', () => {
  it('marks stages complete up to the current score', () => {
    const stages = buildTimeline({ shipmentStatusScore: 3 });

    expect(stages).toHaveLength(7);
    expect(stages.filter(stage => stage.complete)).toHaveLength(3);
    expect(stages[2].current).toBe(true);
    expect(stages[3].complete).toBe(false);
  });

  it('treats a missing score as nothing completed', () => {
    const stages = buildTimeline({});
    expect(stages.every(stage => !stage.complete)).toBe(true);
  });

  it('reads the ALG warehouse date under either casing', () => {
    const upper = buildTimeline({
      shipmentStatusScore: 6,
      'Alg WarehouseDate': '2026-02-01',
    });
    const lower = buildTimeline({
      shipmentStatusScore: 6,
      'Alg warehouseDate': '2026-02-01',
    });

    expect(upper[5].date).toBe('01 Feb 2026');
    expect(lower[5].date).toBe('01 Feb 2026');
  });

  it('labels the pipeline in order', () => {
    expect(buildTimeline({}).map(stage => stage.label)).toEqual([
      'Pending',
      'Approved',
      'Received in Warehouse',
      'Ready for Fly',
      'Bangladesh Customs',
      'ALG Warehouse',
      'Delivered',
    ]);
  });
});
