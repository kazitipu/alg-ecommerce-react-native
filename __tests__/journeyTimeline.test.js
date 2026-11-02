import { stageStates } from '../src/components/JourneyTimeline';
import { buildTimeline } from '../src/utils/tracking';

const states = score => stageStates(buildTimeline({ shipmentStatusScore: score }), score).map(stage => stage.state);

describe('journey timeline colours', () => {
  it('shows finished steps done, the current one in progress (red) and the rest upcoming', () => {
    expect(states(4)).toEqual(['done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('turns every step, Delivered included, into done (green) once delivered', () => {
    expect(states(7)).toEqual(Array(7).fill('done'));
  });

  it('starts at Pending in progress for a new order', () => {
    expect(states(1)[0]).toBe('current');
  });
});
