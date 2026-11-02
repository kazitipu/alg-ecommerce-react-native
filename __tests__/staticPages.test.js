/**
 * The policy pages are legal text lifted verbatim from the website. If an
 * extraction bug ever drops or mangles a section, this catches it.
 */
import { STATIC_PAGES } from '../src/constants/staticPages';
import { DIVISIONS, DISTRICTS_BY_DIVISION, districtsOf } from '../src/constants/bdAddress';
import { allThanas } from '../src/constants/thana';

const EXPECTED = {
  ABOUT_US: 16,
  FAQ: 14,
  PRIVACY: 28,
  REFUND: 14,
  TERMS: 10,
  TAX_AND_SHIPPING: 6,
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

describe('content the web kept outside <p> tags', () => {
  const { groupBlocks, isProhibitedSection, withoutMarker } = require('../src/screens/static/staticSections');

  it('shows the About us welcome paragraph and every prohibited item on its own line', () => {
    const about = STATIC_PAGES.ABOUT_US.blocks;
    expect(about.some(b => b.type === 'text' && b.text.startsWith('ALG Limited Wholesale'))).toBe(true);
    const items = about.filter(b => b.type === 'item');
    expect(items).toHaveLength(13);
    // Bengali য় can be stored precomposed or as য + nukta; compare normalised.
    expect(withoutMarker(items[0].text).normalize('NFD')).toBe('সেক্স টয়'.normalize('NFD'));
    const sections = groupBlocks(about, 'About us');
    expect(sections[0].title).toBe('');
    expect(isProhibitedSection(sections[1])).toBe(true);
  });

  it('restores the refund and tax & shipping introductions', () => {
    expect(STATIC_PAGES.REFUND.blocks[1].text).toContain('কার্টন খুলে পরিদর্শন');
    expect(STATIC_PAGES.TAX_AND_SHIPPING.blocks[1].text).toContain('আমরা B2B ব্যবসা করি');
  });

  it('drops the literal markdown markers the web carried', () => {
    Object.values(STATIC_PAGES).forEach(page =>
      page.blocks.forEach(block => {
        expect(block.text).not.toMatch(/^#|\*\*/);
      }),
    );
  });
});

describe('contact details', () => {
  const { parseContactDetails } = require('../src/screens/static/staticSections');

  it('turns the web contact lines into labelled, de-duplicated details', () => {
    const details = parseContactDetails(STATIC_PAGES.CONTACT.blocks);
    expect(details.map(d => d.kind)).toEqual(['phone', 'address', 'email', 'fax']);
    expect(details[0].values).toEqual(['+88-01881934658']);
    expect(details[1].values[0]).toContain('Purana Paltan');
    expect(details[2].values).toEqual(['support@alg.com.bd']);
  });

  it('keeps unknown lines rather than dropping them', () => {
    expect(parseContactDetails([{ text: 'Open Sat–Thu' }])).toEqual([{ kind: 'other', label: '', values: ['Open Sat–Thu'] }]);
  });
});
