import { DEFAULTS } from '../constants/config';

/** "Tk 1,250" — thousands separated, no decimals, matching the web app. */
export const formatPrice = (amount, symbol = DEFAULTS.currencySymbol) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${symbol} 0`;
  return `${symbol} ${Math.round(value).toLocaleString('en-US')}`;
};

/** Converts a CNY figure to BDT using the `Currency/taka` rate. */
export const toTaka = (cny, taka) => {
  const rate = parseFloat(taka);
  const value = parseFloat(cny);
  if (!Number.isFinite(rate) || !Number.isFinite(value)) return 0;
  return Math.round(value * rate);
};

/** Firestore stores dates as Timestamps, millisecond numbers, or ISO strings. */
export const toDate = value => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = value => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Trims a long product title to a single readable line. */
export const truncate = (text, length = 60) => {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
};

/** 1688 image URLs accept a size suffix; smaller ones keep grids fast. */
export const resizedImage = (url, size = 300) => {
  if (!url) return url;
  return url.includes('.jpg') || url.includes('.png')
    ? `${url}_${size}x${size}.jpg`
    : url;
};
