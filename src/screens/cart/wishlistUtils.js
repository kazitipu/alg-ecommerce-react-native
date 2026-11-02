import { toTaka } from '../../utils/format';

const asText = value => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

/** A saved product's picture, whichever field it was stored under. */
export const wishlistImage = product => {
  const candidates = [product?.pictures?.[0], product?.pic_url, product?.picture, product?.image];
  return candidates.find(value => typeof value === 'string' && value) || '';
};

export const wishlistName = product => asText(product?.name) || asText(product?.title) || 'Saved product';

/** Price in taka, as the product card shows it (CNY converted when a rate is known). */
export const wishlistPrice = (product, taka) => {
  const raw = product?.salePrice ?? product?.price;
  const rate = parseFloat(taka);
  if (Number.isFinite(rate) && rate > 0) return toTaka(raw, rate);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};

export const WISHLIST_SORTS = [
  { key: 'recent', label: 'Recently saved' },
  { key: 'low', label: 'Price: low' },
  { key: 'high', label: 'Price: high' },
];

/**
 * Filters by name and orders the list. "Recently saved" is the reverse of the
 * stored order (new saves are appended).
 */
export const arrangeWishlist = (list, { query = '', sort = 'recent', taka } = {}) => {
  const q = String(query || '').trim().toLowerCase();
  const items = (Array.isArray(list) ? list : []).filter(product => product && typeof product === 'object');
  const matched = q ? items.filter(product => wishlistName(product).toLowerCase().includes(q)) : items;
  if (sort === 'low') return [...matched].sort((a, b) => wishlistPrice(a, taka) - wishlistPrice(b, taka));
  if (sort === 'high') return [...matched].sort((a, b) => wishlistPrice(b, taka) - wishlistPrice(a, taka));
  return [...matched].reverse();
};
