/**
 * The rail/search cache. The web app had three near-identical copies of this
 * and none de-duped concurrent calls, so the six home rails could fire six
 * identical requests on mount.
 */
import { clearCache, fetchOnce, getCache, setCache } from '../src/utils/cache';

beforeEach(() => clearCache());

describe('get/set', () => {
  it('returns a stored value before it expires', () => {
    setCache('k', { a: 1 }, 1000);
    expect(getCache('k')).toEqual({ a: 1 });
  });

  it('misses on an unknown key', () => {
    expect(getCache('nope')).toBeUndefined();
  });

  it('expires entries once the TTL has passed', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    setCache('k', 'value', 5000);
    expect(getCache('k')).toBe('value');

    now.mockReturnValue(5001);
    expect(getCache('k')).toBeUndefined();
    now.mockRestore();
  });
});

describe('fetchOnce', () => {
  it('calls the loader once and caches the result', async () => {
    const loader = jest.fn().mockResolvedValue('products');

    expect(await fetchOnce('rail:bags', 1000, loader)).toBe('products');
    expect(await fetchOnce('rail:bags', 1000, loader)).toBe('products');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('de-dupes concurrent callers into a single request', async () => {
    let resolveLoader;
    const loader = jest.fn(
      () => new Promise(resolve => { resolveLoader = resolve; }),
    );

    const all = Promise.all([
      fetchOnce('rail:shoes', 1000, loader),
      fetchOnce('rail:shoes', 1000, loader),
      fetchOnce('rail:shoes', 1000, loader),
    ]);

    resolveLoader('shared');
    expect(await all).toEqual(['shared', 'shared', 'shared']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure, so a retry can succeed', async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('recovered');

    await expect(fetchOnce('rail:flaky', 1000, loader)).rejects.toThrow('network');
    expect(await fetchOnce('rail:flaky', 1000, loader)).toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('keeps separate keys separate', async () => {
    await fetchOnce('a', 1000, () => Promise.resolve(1));
    await fetchOnce('b', 1000, () => Promise.resolve(2));
    expect(getCache('a')).toBe(1);
    expect(getCache('b')).toBe(2);
  });
});

describe('clearCache', () => {
  it('drops one key or everything', async () => {
    setCache('a', 1, 1000);
    setCache('b', 2, 1000);

    clearCache('a');
    expect(getCache('a')).toBeUndefined();
    expect(getCache('b')).toBe(2);

    clearCache();
    expect(getCache('b')).toBeUndefined();
  });
});
