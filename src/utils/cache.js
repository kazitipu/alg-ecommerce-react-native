/**
 * In-memory TTL cache with request de-duplication.
 *
 * The web app had three near-identical copies of this (`mainCache.js`,
 * `collection3Cache.js`, `product-listing-cache.js`), none of which de-duped
 * concurrent calls — so six home rails mounting at once could fire six
 * identical requests. Here an in-flight promise is shared.
 *
 * Deliberately not persisted: it is a per-session memo, and stale prices or
 * stock should never outlive the session.
 */
const entries = new Map();
const inFlight = new Map();

export const getCache = key => {
  const entry = entries.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    entries.delete(key);
    return undefined;
  }
  return entry.value;
};

export const setCache = (key, value, ttlMs) => {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

/**
 * Returns the cached value, the in-flight request, or starts a new one.
 * A rejected request is not cached, so a retry can succeed.
 */
export const fetchOnce = async (key, ttlMs, loader) => {
  const cached = getCache(key);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = loader()
    .then(value => {
      setCache(key, value, ttlMs);
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
};

export const clearCache = key => {
  if (key === undefined) {
    entries.clear();
    inFlight.clear();
    return;
  }
  entries.delete(key);
  inFlight.delete(key);
};

export default { getCache, setCache, fetchOnce, clearCache };
