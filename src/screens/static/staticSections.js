/**
 * Turns a static page's flat block list (headings, paragraphs, bullets from
 * `constants/staticPages.js`) into sections for the card layout. The wording
 * is untouched — only grouped.
 *
 *  - A heading starts a new section; text and bullets after it belong to it.
 *  - Blocks before the first heading form an untitled intro section.
 *  - A heading that just repeats the page title becomes the hero, not a card.
 */
export const groupBlocks = (blocks, pageTitle = '') => {
  const sections = [];
  let current = null;
  const title = String(pageTitle || '')
    .trim()
    .toLowerCase();

  (Array.isArray(blocks) ? blocks : []).forEach(block => {
    const text = typeof block?.text === 'string' ? block.text : '';
    if (!text.trim()) return;
    if (block.type === 'heading') {
      if (
        sections.length === 0 &&
        !current &&
        text.trim().toLowerCase() === title
      )
        return;
      current = { title: text, blocks: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { title: '', blocks: [] };
      sections.push(current);
    }
    current.blocks.push({
      type: block.type === 'item' ? 'item' : 'text',
      text,
    });
  });

  return sections;
};

/** Items the web marks with ❌ (e.g. About us → Prohibited Products). */
export const isProhibitedItem = block =>
  block?.type === 'item' &&
  String(block.text || '')
    .trim()
    .startsWith('❌');

/** The item's text without its ❌ marker, which the app draws as an icon. */
export const withoutMarker = text =>
  String(text || '').replace(/^\s*❌\s*/, '');

/** A section that is only a list of ❌ items, shown as a "not allowed" card. */
export const isProhibitedSection = section =>
  section.blocks.length > 0 && section.blocks.every(isProhibitedItem);

/** The Contact us lines on the web, by their leading label. */
const CONTACT_KINDS = [
  { prefix: 'Contact Us', kind: 'phone', label: 'Phone' },
  { prefix: 'Address', kind: 'address', label: 'Office address' },
  { prefix: 'Email', kind: 'email', label: 'Email' },
  { prefix: 'Fax', kind: 'fax', label: 'Fax' },
];

/**
 * The web's Contact us list ("Contact Us +88-… +88-…", "Address …", "Email …",
 * "Fax …") as labelled details. Phone numbers are split out and de-duplicated
 * (the web repeats the same number). Unknown lines are kept as-is.
 */
export const parseContactDetails = blocks =>
  (Array.isArray(blocks) ? blocks : [])
    .map(block => String(block?.text || '').trim())
    .filter(Boolean)
    .map(line => {
      const match = CONTACT_KINDS.find(({ prefix }) =>
        line.toLowerCase().startsWith(prefix.toLowerCase()),
      );
      if (!match) return { kind: 'other', label: '', values: [line] };
      const rest = line.slice(match.prefix.length).trim();
      if (match.kind === 'phone') {
        const numbers = rest.match(/\+?\d[\d\s-]{6,}\d/g) || [rest];
        return { ...match, values: [...new Set(numbers.map(n => n.trim()))] };
      }
      return { ...match, values: [rest] };
    });

/** Look and layout per page: icon, colours, and how sections render. */
export const PAGE_LOOKS = {
  ABOUT_US: {
    icon: 'information-circle',
    colors: ['#7aa8ff', '#4f46e5'],
    tagline: 'Who we are and what we ship',
  },
  FAQ: {
    icon: 'help-circle',
    colors: ['#ffb35c', '#f97316'],
    tagline: 'Quick answers to common questions',
    accordion: true,
  },
  PRIVACY: {
    icon: 'shield-checkmark',
    colors: ['#34d399', '#059669'],
    tagline: 'How we handle your information',
  },
  REFUND: {
    icon: 'return-down-back',
    colors: ['#f472b6', '#db2777'],
    tagline: 'Returns, refunds and when they apply',
  },
  TERMS: {
    icon: 'document-text',
    colors: ['#a5b4fc', '#4f46e5'],
    tagline: 'The rules of using ALG',
  },
  TAX_AND_SHIPPING: {
    icon: 'calculator',
    colors: ['#67e8f9', '#0891b2'],
    tagline: 'Customs, shipping and charges',
  },
  HOW_TO_ORDER: {
    icon: 'help-buoy',
    colors: ['#ff8a5c', '#e8344a'],
    tagline: 'From product link to your door',
    steps: true,
  },
  CONTACT: {
    icon: 'call',
    colors: ['#4ade80', '#16a34a'],
    tagline: "We're here to help",
  },
};

export const lookOfPage = key =>
  PAGE_LOOKS[key] || {
    icon: 'document-text',
    colors: ['#ff8a5c', '#e8344a'],
    tagline: '',
  };

export default groupBlocks;
