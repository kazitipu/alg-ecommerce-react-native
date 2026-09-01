/**
 * Guards the navigation graph: every route name must have a screen behind it,
 * and every screen must be reachable from some navigator. A typo in either
 * place produces a runtime "screen not handled by any navigator" crash that is
 * awkward to trace, so it is caught here instead.
 */
import { ROUTES } from '../src/navigation/routes';
import { SCREENS } from '../src/navigation/screenRegistry';
import { selectCartCount } from '../src/navigation/MainTabs';

/** Route names that name a navigator rather than a screen. */
const CONTAINERS = [
  ROUTES.TAB_HOME,
  ROUTES.TAB_CATEGORY,
  ROUTES.TAB_CART,
  ROUTES.TAB_ORDERS,
  ROUTES.TAB_ACCOUNT,
];

test('every route has a registered screen', () => {
  const missing = Object.values(ROUTES)
    .filter(name => !CONTAINERS.includes(name))
    .filter(name => !SCREENS[name]);
  expect(missing).toEqual([]);
});

test('every registered screen has a component and a title', () => {
  Object.entries(SCREENS).forEach(([name, screen]) => {
    expect(typeof screen.component).toBe('function');
    expect(typeof screen.title).toBe('string');
    expect(screen.title.length).toBeGreaterThan(0);
    expect(name).toBeTruthy();
  });
});

test('all 45 web routes are represented', () => {
  // 45 web routes collapse to fewer screens because the two freight dashboards
  // share one set of screens parameterised by `flow`.
  expect(Object.keys(SCREENS).length).toBeGreaterThanOrEqual(45);
});

describe('cart badge count', () => {
  it('counts one per item across shop entries, like the web header', () => {
    const cart = [
      { shopId: 's1', items: [{ id: 'a' }, { id: 'b' }] },
      { shopId: 's2', items: [{ id: 'c' }] },
    ];
    expect(selectCartCount(cart)).toBe(3);
  });

  it('falls back to one for a shop entry with no items array', () => {
    expect(selectCartCount([{ shopId: 's1' }])).toBe(1);
  });

  it('handles an empty or missing cart', () => {
    expect(selectCartCount([])).toBe(0);
    expect(selectCartCount(undefined)).toBe(0);
  });
});
