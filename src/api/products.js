import axios from 'axios';

import client from './client';
import { ENDPOINTS, LEGACY_PRODUCT_API } from '../constants/config';
import { fetchOnce, withRetry } from '../utils/cache';

/**
 * Product sourcing. These endpoints proxy 1688/Taobao, so responses come back
 * in the upstream marketplace's shape and are normalised by the
 * `singleProduct` reducer.
 */

export const fetchProduct = async itemId => {
  const { data } = await client.get(`/api/products/${itemId}`);
  return data;
};

/** `framePosition` is the 1-based page number. */
export const searchProducts = async ({ keyword, framePosition = 1, filterByCategory }) => {
  const { data } = await client.get('/api/products/search', {
    params: { keyword, framePosition, filterByCategory },
  });
  return data;
};

/** Reverse image search; `imgId` comes from `uploadSearchImage`. */
export const searchByImage = async ({ imgId, framePosition = 1, filterByCategory }) => {
  const { data } = await client.get('/api/products/search-by-image', {
    params: { imgId, framePosition, filterByCategory },
  });
  return data;
};

export const fetchVendorProducts = async ({ vendorId, framePosition = 1, filterByCategory }) => {
  const { data } = await client.get('/api/products/vendor-products', {
    params: { vendorId, framePosition, filterByCategory },
  });
  return data;
};

export const fetchCategory = async params => {
  const { data } = await client.get('/api/products/category', { params });
  return data;
};

/** China-side freight estimate for a chosen set of SKUs. */
/** How long a courier quote is reused for the same product, quantity and options. */
export const SHIPPING_QUOTE_TTL = 10 * 60 * 1000;

/**
 * The quote comes from 1688 through ALG's server, and 1688 rate-limits it
 * ("APP call frequency limit", usually as an HTTP 500). A single attempt
 * therefore failed at random — showing "included later" for one quantity and
 * a price for the next. Failures are retried with growing pauses, and good
 * quotes are cached so stepping the quantity back and forth asks nothing new.
 */
export const fetchShipping = ({ productId, totalQuantity, skus }) => {
  const skusParam = JSON.stringify(skus);
  return fetchOnce(`shipping:${productId}:${totalQuantity}:${skusParam}`, SHIPPING_QUOTE_TTL, () =>
    withRetry(
      async () => {
        const { data } = await client.get('/api/products/shipping', {
          params: { productId, totalQuantity, skus: skusParam },
        });
        // A rate-limit body can also arrive with a 200; treat it as a failure.
        if (!data?.shippingCost && (data?.error || data?.error_code || data?.message)) {
          throw new Error(data?.message || 'The courier quote did not load.');
        }
        return data;
      },
      { retries: 3, delayMs: 1200 },
    ),
  );
};

/**
 * Picker options for a photo search: the web shrinks the photo to fit
 * 500 × 500 and re-encodes it as JPEG at 70% before uploading, and the
 * server takes it as base64.
 */
export const SEARCH_PHOTO_OPTIONS = {
  mediaType: 'photo',
  selectionLimit: 1,
  includeBase64: true,
  maxWidth: 500,
  maxHeight: 500,
  quality: 0.7,
};

/**
 * Uploads a photo for reverse image search, as the web does: JSON
 * `{ imageBase64 }` (no `data:` prefix). Returns the image id the search
 * endpoint takes (`result.result`), or null.
 */
export const uploadSearchImage = async asset => {
  const imageBase64 = String(asset?.base64 || '').replace(/^data:[^,]*,/, '');
  if (!imageBase64) return null;
  const { data } = await client.post('/api/products/upload-image', { imageBase64 });
  return data?.result?.result || null;
};

/**
 * Legacy detail proxy used by the `/1688/:id` and `/taobao/:id` screens.
 * `route` is either `"1688"` or `"taobao"`.
 */
export const fetchLegacyProduct = async (id, route) => {
  const { data } = await axios.get(`${LEGACY_PRODUCT_API}/${id},${route}`);
  return data;
};

export const ENDPOINT_REFERENCE = ENDPOINTS;
