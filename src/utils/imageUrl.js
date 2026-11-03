/**
 * Smaller product images.
 *
 * 1688 / Taobao pictures are served by Alibaba's CDN (alicdn.com) at full
 * size — often 1200–1300 px and ~500 KB — even where the app shows them as a
 * small card. The CDN resizes on request when `_<w>x<h>.jpg` is appended, so
 * thumbnails ask for that instead: a 400 px tile is ~70 KB, about 7× less to
 * download and decode, which is most of what made long lists stutter.
 */

/** Sizes the CDN is known to serve. */
export const IMAGE_SIZES = { thumb: 200, tile: 400, large: 800 };

const RESIZABLE_HOST = /^https?:\/\/[^/]*(alicdn\.com|tbcdn\.cn|taobaocdn\.com)\//i;
const ALREADY_SIZED = /_\d+x\d+(q\d+)?\.(jpe?g|png|webp)$/i;
const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;

/** The CDN URL for `url` at `size` px, or `url` unchanged when it can't be resized. */
export const sizedImage = (url, size = IMAGE_SIZES.tile) => {
  const value = typeof url === 'string' ? url.trim().replace(/^\/\//, 'https://') : '';
  if (!value) return value;
  const [path, query = ''] = value.split('?');
  if (!RESIZABLE_HOST.test(path) || ALREADY_SIZED.test(path) || !IMAGE_FILE.test(path)) return value;
  return `${path}_${size}x${size}.jpg${query ? `?${query}` : ''}`;
};

export const thumbImage = url => sizedImage(url, IMAGE_SIZES.thumb);
export const tileImage = url => sizedImage(url, IMAGE_SIZES.tile);
export const largeImage = url => sizedImage(url, IMAGE_SIZES.large);

export default sizedImage;
