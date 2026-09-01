/**
 * ALG customers usually paste a marketplace URL rather than search, so the
 * search box has to tell a link from a keyword and pull the product id out.
 */
import {
  get1688ProductId,
  getTaobaoProductId,
  resolveSearchInput,
} from '../src/utils/productLink';
import { CATEGORY_TREE } from '../src/constants/categoryTree';

describe('1688 links', () => {
  it('reads the offer id from a mobile link', () => {
    expect(
      get1688ProductId('https://m.1688.com/offer_detail.html?offerId=678901234'),
    ).toBe('678901234');
  });

  it('reads the offer id from a desktop link', () => {
    expect(get1688ProductId('https://detail.1688.com/offer/678901234.html')).toBe(
      '678901234',
    );
  });

  it('returns null for a link with no id', () => {
    expect(get1688ProductId('https://www.1688.com/')).toBeNull();
    expect(get1688ProductId('not a url')).toBeNull();
  });
});

describe('Taobao links', () => {
  it('reads the item id from the query string', () => {
    expect(getTaobaoProductId('https://item.taobao.com/item.htm?id=555666777')).toBe(
      '555666777',
    );
  });
});

describe('resolveSearchInput', () => {
  it('treats short text as a keyword search', () => {
    expect(resolveSearchInput('ladies bags')).toEqual({
      type: 'search',
      keyword: 'ladies bags',
    });
  });

  it('routes a 1688 link to the product screen', () => {
    expect(
      resolveSearchInput('https://detail.1688.com/offer/678901234.html'),
    ).toEqual({ type: 'product', id: '678901234', source: '1688' });
  });

  it('routes a Taobao link to the product screen', () => {
    expect(
      resolveSearchInput('https://item.taobao.com/item.htm?id=555666777'),
    ).toEqual({ type: 'product', id: '555666777', source: 'taobao' });
  });

  it('falls back to a keyword search for an unparseable link', () => {
    const input = 'https://example.com/some/very/long/path/that/has/no/product/id/at/all';
    expect(resolveSearchInput(input)).toEqual({ type: 'search', keyword: input });
  });

  it('ignores empty input', () => {
    expect(resolveSearchInput('')).toBeNull();
    expect(resolveSearchInput('   ')).toBeNull();
  });
});

/**
 * The drawer taxonomy was lifted out of the web header. Its Chinese `route`
 * values are the actual 1688 search terms, so losing or "tidying" them would
 * silently break browsing.
 */
describe('category tree', () => {
  const leaves = [];
  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (typeof node.route === 'string') leaves.push(node);
      Object.values(node).forEach(walk);
    }
  };
  walk(CATEGORY_TREE);

  it('carries all 281 leaf categories from the web app', () => {
    expect(leaves).toHaveLength(281);
  });

  it('gives every leaf a label and a search route', () => {
    // Two shapes exist: plain `{ name, route }` chips and featured
    // `{ title, route, src }` tiles that carry a thumbnail.
    leaves.forEach(leaf => {
      const label = leaf.name || leaf.title;
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(leaf.route.length).toBeGreaterThan(0);
    });
  });

  it('splits into 265 plain chips and 16 featured tiles', () => {
    const named = leaves.filter(leaf => leaf.name);
    const titled = leaves.filter(leaf => !leaf.name && leaf.title);
    expect(named).toHaveLength(265);
    expect(titled).toHaveLength(16);
    // Every featured tile carries the image the web drawer showed.
    titled.forEach(leaf => expect(typeof leaf.src).toBe('string'));
  });

  it('keeps the 11 top-level groups', () => {
    expect(Object.keys(CATEGORY_TREE)).toHaveLength(11);
  });

  it('keeps every group navigable down to leaves', () => {
    Object.values(CATEGORY_TREE).forEach(group => {
      expect(group.mainCategories.length).toBeGreaterThan(0);
      group.mainCategories.forEach(main => {
        expect(main.subCategories.length).toBeGreaterThan(0);
      });
    });
  });
});
