/**
 * Turns whatever a customer types into an intent.
 *
 * ALG's core habit is pasting a 1688 or Taobao product URL rather than
 * searching, so the search box has to tell a link from a keyword. The web app
 * used a crude length test (under 35 characters means keyword) plus
 * `window.open`; this keeps the same rules but returns a description the caller
 * navigates with, since React Native has no "open a new tab".
 */

const KEYWORD_MAX_LENGTH = 35;

/** Extracts an offer id from a 1688 link, mobile or desktop form. */
export const get1688ProductId = url => {
  try {
    const parsed = new URL(url);

    // Mobile links carry it as a query parameter.
    const offerId = parsed.searchParams.get('offerId');
    if (offerId) return offerId;

    // Desktop links put it in the path: /offer/123456789.html
    const pathMatch = parsed.pathname.match(/\/(\d+)\.html/);
    if (pathMatch) return pathMatch[1];

    return null;
  } catch (error) {
    return null;
  }
};

/** Taobao and Tmall links carry the item id as `?id=`. */
export const getTaobaoProductId = url => {
  try {
    return new URL(url).searchParams.get('id');
  } catch (error) {
    return null;
  }
};

/**
 * Classifies input as a keyword search or a direct product link.
 *
 * Returns `{ type: 'search', keyword }` or
 * `{ type: 'product', id, source }` where source is `1688` or `taobao`.
 * A link we cannot parse falls back to a keyword search rather than dead-ending.
 */
export const resolveSearchInput = rawInput => {
  const input = (rawInput || '').trim();
  if (!input) return null;

  const looksLikeLink = input.length >= KEYWORD_MAX_LENGTH || /^https?:\/\//i.test(input);
  if (!looksLikeLink) {
    return { type: 'search', keyword: input };
  }

  if (input.includes('1688')) {
    const id = get1688ProductId(input);
    if (id) return { type: 'product', id, source: '1688' };
  } else {
    const id = getTaobaoProductId(input);
    if (id) return { type: 'product', id, source: 'taobao' };
  }

  return { type: 'search', keyword: input };
};

export default { resolveSearchInput, get1688ProductId, getTaobaoProductId };
