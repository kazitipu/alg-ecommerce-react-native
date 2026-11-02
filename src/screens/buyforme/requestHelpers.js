/**
 * Pure helpers behind the "Request a product" form's conveniences: guessing
 * the store from a pasted link, the store and country look, description
 * templates and the progress shown in the send bar.
 */

/** Domain fragments that identify a store from the web form's list. */
const STORE_DOMAINS = [
  [/(^|\.)(taobao|tmall)\.com$/, 'Taobao'],
  [/(^|\.)(1688|alibaba)\.com$/, 'Alibaba'],
  [/(^|\.)aliexpress\.(com|us|ru)$/, 'AliExpress'],
  [/(^|\.)amazon\.in$/, 'Amazon (India)'],
  [/(^|\.)amazon\.ae$/, 'Amazon (UAE)'],
  [/(^|\.)amazon\.com$/, 'Amazon (USA)'],
  [/(^|\.)flipkart\.com$/, 'Flipkart'],
  [/(^|\.)walmart\.com$/, 'Walmart'],
  [/(^|\.)ebay\.[a-z.]+$/, 'eBay'],
  [/(^|\.)(pinduoduo|yangkeduo)\.com$/, 'Pingduoduo'],
  [/(^|\.)noon\.com$/, 'Noon'],
  [/(^|\.)myntra\.com$/, 'Myntra'],
  [/(^|\.)jlcpcb\.com$/, 'JLCPCB'],
  [/(^|\.)bestbuy\.com$/, 'Best Buy'],
  [/(^|\.)gearbest\.com$/, 'Gearbest'],
];

/** Where each store usually ships from, to pre-pick the origin country. */
const STORE_COUNTRY = {
  Taobao: 'china',
  'Taobao (Direct)': 'china',
  Alibaba: 'china',
  AliExpress: 'china',
  Pingduoduo: 'china',
  JLCPCB: 'china',
  Gearbest: 'china',
  'Amazon (India)': 'india',
  Flipkart: 'india',
  Myntra: 'india',
  'Amazon (USA)': 'usa',
  Walmart: 'usa',
  'Best Buy': 'usa',
};

/** The first link in pasted text (share sheets often add a title around it). */
export const extractUrl = text => {
  const match = String(text ?? '').match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : '';
};

/** The store a product link belongs to, or '' when it isn't obvious. */
export const storeFromUrl = url => {
  const link = extractUrl(url) || String(url ?? '').trim();
  if (!link) return '';
  let host = '';
  try {
    host = link.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0].split(':')[0].toLowerCase();
  } catch (error) {
    return '';
  }
  const found = STORE_DOMAINS.find(([pattern]) => pattern.test(host));
  return found ? found[1] : '';
};

/** The usual origin country for a store, or ''. */
export const countryForStore = store => STORE_COUNTRY[store] || '';

/** The stores most customers use, shown first. */
export const POPULAR_STORES = ['Taobao', 'Alibaba', 'AliExpress', 'Pingduoduo', 'Amazon (USA)'];

/** Two-letter badge for a store chip ("Amazon (USA)" → "AM"). */
export const storeInitials = store => {
  const letters = String(store ?? '').replace(/[^A-Za-z]/g, '');
  return letters.slice(0, 2).toUpperCase();
};

export const COUNTRY_FLAGS = {
  china: '🇨🇳',
  uk: '🇬🇧',
  usa: '🇺🇸',
  hongkong: '🇭🇰',
  thailand: '🇹🇭',
  india: '🇮🇳',
};

/** The description's quick templates. */
export const VARIANT_TEMPLATES = ['Color: ', 'Size: ', 'Pcs: ', 'Model: '];

/** Adds a template on its own line, unless the description already has it. */
export const appendTemplate = (text, template) => {
  const current = String(text ?? '');
  const label = template.trim();
  if (current.toLowerCase().includes(label.toLowerCase())) return current;
  if (!current.trim()) return template;
  return `${current.replace(/\s+$/, '')}\n${template}`;
};

export const QUANTITY_PRESETS = [1, 5, 10, 50, 100];

/** The web's required fields, for the send bar's progress. */
export const REQUIRED_FIELDS = ['store', 'country', 'productType', 'productQuantity', 'productVariant'];

export const requiredProgress = form => {
  const done = REQUIRED_FIELDS.filter(key =>
    key === 'productQuantity' ? parseInt(form?.[key], 10) > 0 : String(form?.[key] ?? '').trim(),
  ).length;
  return { done, total: REQUIRED_FIELDS.length };
};
