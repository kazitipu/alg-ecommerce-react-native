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

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Runs `loader`, retrying a failed attempt (thrown error) up to `retries`
 * more times with a growing pause. The product API fails intermittently, so
 * one bad answer should not end a list.
 */
export const withRetry = async (loader, { retries = 2, delayMs = 700 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
       
      return await loader();
    } catch (error) {
      lastError = error;
       
      if (attempt < retries) await wait(delayMs * (attempt + 1));
    }
  }
  throw lastError;
};
