/**
 * The policy pages are legal text lifted verbatim from the website. If an
 * extraction bug ever drops or mangles a section, this catches it.
 */
import { STATIC_PAGES } from '../src/constants/staticPages';
import { DIVISIONS, DISTRICTS_BY_DIVISION, districtsOf } from '../src/constants/bdAddress';
import { allThanas } from '../src/constants/thana';

const EXPECTED = {
  ABOUT_US: 3,
  FAQ: 14,
  PRIVACY: 28,
  REFUND: 13,
  TERMS: 10,
  TAX_AND_SHIPPING: 5,
  HOW_TO_ORDER: 7,
  CONTACT: 4,
};

describe('static pages', () => {
  it('carries all eight pages', () => {
    expect(Object.keys(STATIC_PAGES).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('kept every content block from the web app', () => {
    Object.entries(EXPECTED).forEach(([key, count]) => {
      expect(STATIC_PAGES[key].blocks).toHaveLength(count);
    });
  });

  it('gives every page a title and every block real text', () => {
    Object.values(STATIC_PAGES).forEach(page => {
      expect(page.title.length).toBeGreaterThan(0);
      page.blocks.forEach(block => {
        expect(['heading', 'text', 'item']).toContain(block.type);
        expect(block.text.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('left no JSX artefacts in the extracted text', () => {
    Object.values(STATIC_PAGES).forEach(page => {
      page.blocks.forEach(block => {
        expect(block.text).not.toMatch(/[<>]/);
        expect(block.text).not.toContain('className');
        expect(block.text).not.toContain('{"');
      });
    });
  });

  it('preserves the Bengali policy wording', () => {
    // The privacy policy opens with the same sentence as the website.
    expect(STATIC_PAGES.PRIVACY.blocks[0].text).toContain('গোপনীয়তা নীতি');
    expect(STATIC_PAGES.PRIVACY.blocks[1].text).toContain('ALG.COM.BD');
  });

  it('turns each FAQ entry into a question heading with an answer', () => {
    const headings = STATIC_PAGES.FAQ.blocks.filter(b => b.type === 'heading');
    // Six accordion questions plus the page title heading.
    expect(headings.length).toBeGreaterThanOrEqual(6);
    expect(STATIC_PAGES.FAQ.blocks.some(b => b.text.includes('ওজন'))).toBe(true);
  });
});

describe('Bangladesh address data', () => {
  it('has all 8 divisions and 64 districts', () => {
    expect(DIVISIONS).toHaveLength(8);
    expect(Object.values(DISTRICTS_BY_DIVISION).flat()).toHaveLength(64);
  });

  it('resolves districts for a division', () => {
    expect(districtsOf('Dhaka')).toContain('Gazipur');
    expect(districtsOf('Sylhet')).toContain('Sylhet');
  });

  it('returns an empty list for an unknown division', () => {
    expect(districtsOf('Atlantis')).toEqual([]);
    expect(districtsOf(undefined)).toEqual([]);
  });

  it('ships thana lists that match district names', () => {
    const dhaka = allThanas.find(entry => entry.name === 'Dhaka');
    expect(dhaka.thana.length).toBeGreaterThan(10);
    expect(dhaka.thana).toContain('DHANMONDI');
  });
});
