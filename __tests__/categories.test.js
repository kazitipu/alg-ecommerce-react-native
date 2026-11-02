import { ALL_LEAVES, countLeaves, labelOf, searchLeaves } from '../src/screens/collection/components/CategoryContent';
import { CATEGORY_TREE } from '../src/constants/categoryTree';

describe('category browser', () => {
  it('indexes every leaf category for search', () => {
    const total = Object.keys(CATEGORY_TREE).reduce((sum, group) => sum + countLeaves(group), 0);
    expect(ALL_LEAVES).toHaveLength(total);
    // 265 { name, route } chips plus 3 stored as bare words.
    expect(total).toBe(268);
    expect(ALL_LEAVES.every(({ leaf }) => labelOf(leaf) && leaf.route)).toBe(true);
  });

  it('finds categories by English label, case-insensitively, with their path', () => {
    const results = searchLeaves('SKIRT');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ group: 'Dress & clothing' });
    expect(labelOf(results[0].leaf).toLowerCase()).toContain('skirt');
  });

  it('finds the categories stored as bare words', () => {
    expect(searchLeaves('sauna')[0].leaf).toEqual({ name: 'sauna', route: 'sauna' });
  });

  it('also matches the Chinese search term, and nothing for a blank query', () => {
    expect(searchLeaves('裙子').some(({ leaf }) => leaf.route === '裙子')).toBe(true);
    expect(searchLeaves('   ')).toEqual([]);
  });
});
