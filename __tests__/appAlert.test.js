import { alertLook, appAlert, setAlertListener } from '../src/utils/appAlert';

describe('app alert', () => {
  afterEach(() => setAlertListener(null));

  it('queues alerts raised before the host is mounted, then delivers them', () => {
    appAlert('', 'First');
    const seen = [];
    setAlertListener(request => seen.push(request));
    appAlert('Title', 'Second', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive' }]);
    expect(seen.map(r => r.message)).toEqual(['First', 'Second']);
    expect(seen[0].buttons).toEqual([{ text: 'OK' }]);
  });

  it('looks red for destructive actions, informational otherwise', () => {
    expect(alertLook([{ text: 'Remove', style: 'destructive' }]).tone).toBe('danger');
    expect(alertLook([{ text: 'OK' }]).tone).toBe('info');
  });
});
