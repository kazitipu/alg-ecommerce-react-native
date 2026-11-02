/**
 * Conveniences on the "Request a product" form.
 */
import {
  appendTemplate,
  countryForStore,
  extractUrl,
  requiredProgress,
  storeFromUrl,
  storeInitials,
} from '../src/screens/buyforme/requestHelpers';
import { STORES } from '../src/screens/buyforme/RequestProductScreen';

describe('store from a pasted link', () => {
  it.each([
    ['https://item.taobao.com/item.htm?id=1', 'Taobao'],
    ['https://detail.tmall.com/item.htm?id=2', 'Taobao'],
    ['https://detail.1688.com/offer/3.html', 'Alibaba'],
    ['https://www.alibaba.com/product-detail/x.html', 'Alibaba'],
    ['https://www.aliexpress.com/item/4.html', 'AliExpress'],
    ['https://www.amazon.in/dp/B0', 'Amazon (India)'],
    ['https://www.amazon.ae/dp/B0', 'Amazon (UAE)'],
    ['https://www.amazon.com/dp/B0', 'Amazon (USA)'],
    ['https://www.flipkart.com/p/itm', 'Flipkart'],
    ['https://www.walmart.com/ip/5', 'Walmart'],
    ['https://www.ebay.com/itm/6', 'eBay'],
    ['https://mobile.yangkeduo.com/goods.html?goods_id=7', 'Pingduoduo'],
    ['https://www.noon.com/uae-en/x', 'Noon'],
    ['https://www.myntra.com/8', 'Myntra'],
    ['https://jlcpcb.com/quote', 'JLCPCB'],
    ['https://www.bestbuy.com/site/9', 'Best Buy'],
    ['https://www.gearbest.com/x', 'Gearbest'],
  ])('%s → %s', (url, store) => {
    expect(storeFromUrl(url)).toBe(store);
  });

  it('only names stores from the web form', () => {
    const names = STORES.map(store => store.value);
    expect(names).toEqual(expect.arrayContaining(['Taobao', 'Alibaba', 'eBay', 'Best Buy']));
  });

  it("returns nothing when the store isn't obvious", () => {
    expect(storeFromUrl('https://example.com/item')).toBe('');
    expect(storeFromUrl('https://notamazon.com.evil.io/x')).toBe('');
    expect(storeFromUrl('')).toBe('');
  });

  it('finds the link inside shared text', () => {
    const shared = '【淘宝】Nice bag https://m.tb.cn/h.x 点击链接';
    expect(extractUrl(shared)).toBe('https://m.tb.cn/h.x');
    expect(storeFromUrl('Look: https://item.taobao.com/item.htm?id=1 thanks')).toBe('Taobao');
  });

  it('pre-picks the usual origin country', () => {
    expect(countryForStore('Taobao')).toBe('china');
    expect(countryForStore('Flipkart')).toBe('india');
    expect(countryForStore('Others')).toBe('');
  });
});

describe('form helpers', () => {
  it('builds two-letter store badges', () => {
    expect(storeInitials('Amazon (USA)')).toBe('AM');
    expect(storeInitials('eBay')).toBe('EB');
  });

  it('adds a description template once, on its own line', () => {
    expect(appendTemplate('', 'Color: ')).toBe('Color: ');
    expect(appendTemplate('Color: red  ', 'Size: ')).toBe('Color: red\nSize: ');
    expect(appendTemplate('color: red', 'Color: ')).toBe('color: red');
  });

  it('counts the required fields done', () => {
    expect(requiredProgress({})).toEqual({ done: 0, total: 5 });
    expect(
      requiredProgress({ store: 'Taobao', country: 'china', productType: 'Shoes', productQuantity: '0', productVariant: 'red' }),
    ).toEqual({ done: 4, total: 5 });
  });
});
