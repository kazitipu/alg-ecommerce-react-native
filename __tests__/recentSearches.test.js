import { MAX_RECENT, addRecent, isMarketplaceLink, removeRecent } from '../src/screens/collection/recentSearches';

describe('recent searches', () => {
  it('adds to the front without duplicates and caps the list', () => {
    expect(addRecent(['bag', 'shoes'], 'Shoes')).toEqual(['Shoes', 'bag']);
    expect(addRecent(['bag'], '  ')).toEqual(['bag']);
    const many = Array.from({ length: MAX_RECENT }, (_, i) => `k${i}`);
    expect(addRecent(many, 'new')).toHaveLength(MAX_RECENT);
    expect(addRecent(many, 'new')[0]).toBe('new');
  });

  it('removes one keyword', () => {
    expect(removeRecent(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('spots 1688 and Taobao links', () => {
    expect(isMarketplaceLink('https://detail.1688.com/offer/123.html')).toBe(true);
    expect(isMarketplaceLink('https://item.taobao.com/item.htm?id=1')).toBe(true);
    expect(isMarketplaceLink('hello')).toBe(false);
  });
});
