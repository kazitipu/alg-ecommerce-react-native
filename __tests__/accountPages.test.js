import { passwordStrength } from '../src/screens/profile/passwordStrength';
import { groupBlocks, lookOfPage } from '../src/screens/static/staticSections';
import { isNewNotice, noticeText, noticeTitle, noticeTime } from '../src/screens/notices/noticeUtils';
import { arrangeWishlist, wishlistImage, wishlistName, wishlistPrice } from '../src/screens/cart/wishlistUtils';
import { STATIC_PAGES } from '../src/constants/staticPages';

describe('password strength', () => {
  it('scores nothing under the 6-character minimum', () => {
    expect(passwordStrength('abc12').score).toBe(0);
    expect(passwordStrength('abc12').checks[0]).toMatchObject({ key: 'length', passed: false, required: true });
    expect(passwordStrength(undefined).score).toBe(0);
  });

  it('rises with length, mixed case, numbers and symbols', () => {
    expect(passwordStrength('abcdef').score).toBe(1);
    expect(passwordStrength('abcdef1').score).toBe(2);
    expect(passwordStrength('Abcdef1').score).toBe(3);
    expect(passwordStrength('Abcdefgh1!').label).toBe('Strong');
  });
});

describe('static page sections', () => {
  it('groups text under its heading and keeps every block', () => {
    Object.entries(STATIC_PAGES).forEach(([, page]) => {
      const sections = groupBlocks(page.blocks, page.title);
      const kept = sections.reduce((sum, section) => sum + section.blocks.length + (section.title ? 1 : 0), 0);
      const dropped = page.blocks.filter(b => b.type === 'heading' && b.text.trim().toLowerCase() === page.title.toLowerCase());
      expect(kept + Math.min(dropped.length, 1)).toBe(page.blocks.length);
    });
  });

  it('puts text before the first heading in an untitled intro', () => {
    const sections = groupBlocks([{ type: 'text', text: 'Hi' }, { type: 'heading', text: 'Q?' }, { type: 'item', text: 'A' }], 'Page');
    expect(sections).toEqual([
      { title: '', blocks: [{ type: 'text', text: 'Hi' }] },
      { title: 'Q?', blocks: [{ type: 'item', text: 'A' }] },
    ]);
  });

  it('has a look for every page, and FAQ renders as an accordion', () => {
    Object.keys(STATIC_PAGES).forEach(key => expect(lookOfPage(key).icon).toBeTruthy());
    expect(lookOfPage('FAQ').accordion).toBe(true);
  });
});

describe('notices', () => {
  it('strips HTML and reads titles defensively', () => {
    expect(noticeText({ description: '<p>Hello&nbsp;<b>world</b></p>' })).toBe('Hello world');
    expect(noticeText({ description: { nested: true } })).toBe('');
    expect(noticeTitle({ title: null, name: 42 })).toBe('42');
  });

  it('reads Firestore times and flags last week as new', () => {
    const now = Date.UTC(2026, 10, 2);
    expect(noticeTime({ time: { seconds: 10 } })).toBe(10000);
    expect(isNewNotice({ time: now - 2 * 86400000 }, now)).toBe(true);
    expect(isNewNotice({ time: now - 10 * 86400000 }, now)).toBe(false);
    expect(isNewNotice({}, now)).toBe(false);
  });
});

describe('wishlist', () => {
  const list = [
    { id: 'a', name: 'Red dress', price: 10 },
    { id: 'b', name: 'Blue shoes', salePrice: 5, pictures: ['x.jpg'] },
    { id: 'c', name: 'Red cap', price: '20' },
  ];

  it('shows the newest save first and sorts by price in taka', () => {
    expect(arrangeWishlist(list).map(p => p.id)).toEqual(['c', 'b', 'a']);
    expect(arrangeWishlist(list, { sort: 'low', taka: 17 }).map(p => p.id)).toEqual(['b', 'a', 'c']);
    expect(arrangeWishlist(list, { sort: 'high', taka: 17 }).map(p => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('searches by name and reads fields defensively', () => {
    expect(arrangeWishlist(list, { query: 'red' }).map(p => p.id)).toEqual(['c', 'a']);
    expect(wishlistPrice(list[1], 17)).toBe(85);
    expect(wishlistImage(list[1])).toBe('x.jpg');
    expect(wishlistName({ name: { bad: true } })).toBe('Saved product');
    expect(arrangeWishlist(null)).toEqual([]);
  });
});
