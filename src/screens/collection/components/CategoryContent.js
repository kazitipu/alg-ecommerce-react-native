import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { CATEGORY_TREE } from '../../../constants/categoryTree';
import { colors, radius, typography } from '../../../theme';

const EASE = Easing.out(Easing.cubic);

/** An icon and colour pair per top-level group. */
export const GROUP_LOOKS = {
  'Dress & clothing': { icon: 'shirt', colors: ['#ff9ab8', '#e11d74'] },
  'Accessories Shoes': { icon: 'footsteps', colors: ['#ffb35c', '#ea580c'] },
  'Handbags Wallets': { icon: 'bag-handle', colors: ['#c4a1ff', '#7c3aed'] },
  'Sports Apparel': { icon: 'basketball', colors: ['#6ee7b7', '#059669'] },
  "Children's clothing": { icon: 'happy', colors: ['#fde047', '#eab308'] },
  'Home Furnishings': { icon: 'bed', colors: ['#7dd3fc', '#0284c7'] },
  'Home imporovement': { icon: 'hammer', colors: ['#fca5a5', '#dc2626'] },
  'Office Culture/Pet': { icon: 'briefcase', colors: ['#a5b4fc', '#4f46e5'] },
  'Food,Drink': { icon: 'fast-food', colors: ['#fdba74', '#f97316'] },
  'Beauty & Makeup': { icon: 'color-palette', colors: ['#f9a8d4', '#db2777'] },
  Digital: { icon: 'hardware-chip', colors: ['#67e8f9', '#0891b2'] },
};

export const lookOf = group =>
  GROUP_LOOKS[group] || {
    icon: 'pricetag',
    colors: ['#ff8a5c', colors.primary],
  };

/**
 * Leaves are `{ name, route }` (plus 16 featured `{ title, route, src }`), but
 * three are bare strings in the taxonomy; those use the word as both the label
 * and the search term instead of rendering blank.
 */
export const normalizeLeaf = leaf =>
  typeof leaf === 'string' ? { name: leaf, route: leaf } : leaf || { name: '', route: '' };

export const labelOf = leaf => {
  const item = normalizeLeaf(leaf);
  return `${item.name || item.title || item.route || ''}`;
};

/** Number of leaf categories under a group. */
export const countLeaves = group =>
  (CATEGORY_TREE[group]?.mainCategories || []).reduce(
    (total, main) =>
      total +
      main.subCategories.reduce((sum, sub) => sum + sub.categories.length, 0),
    0,
  );

/** Every leaf in the tree with where it sits, for search. */
export const ALL_LEAVES = Object.keys(CATEGORY_TREE).flatMap(group =>
  CATEGORY_TREE[group].mainCategories.flatMap(main =>
    main.subCategories.flatMap(sub =>
      sub.categories.map(raw => normalizeLeaf(raw)).map(leaf => ({
        leaf,
        group,
        path: `${main.id} · ${sub.id}`,
      })),
    ),
  ),
);

/** Leaves whose English label (or Chinese search term) contains the query. */
export const searchLeaves = query => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_LEAVES.filter(
    ({ leaf }) =>
      labelOf(leaf).toLowerCase().includes(q) ||
      `${leaf.route}`.includes(query.trim()),
  );
};

/** A leaf as a tile: tinted initial (or its picture) over the label. */
const LeafTile = ({ leaf, tint, onPress, index }) => (
  <Animated.View
    entering={FadeIn.delay(Math.min(index, 12) * 25).duration(260)}
    style={styles.tileWrap}
  >
    <PressableScale
      onPress={() => onPress(leaf)}
      scaleTo={0.94}
      style={styles.tile}
    >
      {leaf.src ? (
        <Image source={{ uri: leaf.src }} style={styles.tileImage} />
      ) : (
        <View style={[styles.tileInitial, { backgroundColor: `${tint}1f` }]}>
          <Text style={[styles.tileInitialText, { color: tint }]}>
            {labelOf(leaf).trim()[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.tileLabel} numberOfLines={2}>
        {labelOf(leaf)}
      </Text>
    </PressableScale>
  </Animated.View>
);

/**
 * One group's categories: per market a featured banner (when the web had a
 * picture for it) and its subsections as a grid of tiles.
 */
const CategoryContent = ({ group, onOpen }) => {
  const data = CATEGORY_TREE[group];
  if (!data) return null;
  const look = lookOf(group);
  const tint = look.colors[1];

  return (
    <View>
      {data.mainCategories.map((main, mainIndex) => (
        <Animated.View
          key={main.id}
          entering={FadeInUp.delay(mainIndex * 70)
            .duration(340)
            .easing(EASE)}
          style={styles.market}
        >
          <Text style={styles.marketTitle}>{main.id}</Text>

          {main.image?.src ? (
            <PressableScale
              onPress={() => onOpen(main.image)}
              scaleTo={0.98}
              style={styles.banner}
            >
              <Image
                source={{ uri: main.image.src }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(20,22,38,0.75)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.bannerTag}>
                <Icon name="flame" size={11} color={colors.white} />
                <Text style={styles.bannerTagText}>Featured</Text>
              </View>
              <View style={styles.bannerBottom}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {main.image.title}
                </Text>
                <View style={styles.bannerGo}>
                  <Icon name="arrow-forward" size={13} color={colors.text} />
                </View>
              </View>
            </PressableScale>
          ) : null}

          {main.subCategories.map(sub => (
            <View key={sub.id} style={styles.sub}>
              <View style={styles.subHeader}>
                <View style={[styles.subDot, { backgroundColor: tint }]} />
                <Text style={styles.subTitle}>{sub.id}</Text>
                <Text style={styles.subCount}>{sub.categories.length}</Text>
              </View>
              <View style={styles.grid}>
                {sub.categories.map(normalizeLeaf).map((leaf, index) => (
                  <LeafTile
                    key={`${leaf.route}-${index}`}
                    leaf={leaf}
                    tint={tint}
                    index={index}
                    onPress={onOpen}
                  />
                ))}
              </View>
            </View>
          ))}
        </Animated.View>
      ))}
    </View>
  );
};

/** Search results across every group. */
export const CategorySearchResults = ({ results, query, onOpen }) =>
  results.length === 0 ? (
    <Animated.View entering={FadeIn} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="search" size={24} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        No category matches “{query.trim()}”
      </Text>
      <Text style={styles.emptyText}>
        Try another word, or search all products from the home screen.
      </Text>
    </Animated.View>
  ) : (
    <View>
      <Text style={styles.resultsCount}>
        {results.length} {results.length === 1 ? 'category' : 'categories'}
      </Text>
      {results.map(({ leaf, group, path }, index) => {
        const look = lookOf(group);
        return (
          <Animated.View
            key={`${group}-${leaf.route}-${index}`}
            entering={FadeIn.delay(Math.min(index, 10) * 30).duration(240)}
          >
            <PressableScale
              onPress={() => onOpen(leaf)}
              scaleTo={0.98}
              style={styles.result}
            >
              <LinearGradient
                colors={look.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultIcon}
              >
                <Icon name={look.icon} size={16} color={colors.white} />
              </LinearGradient>
              <View style={styles.resultText}>
                <Text style={styles.resultLabel} numberOfLines={1}>
                  {labelOf(leaf)}
                </Text>
                <Text style={styles.resultPath} numberOfLines={1}>
                  {group} › {path}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );

const styles = StyleSheet.create({
  market: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  marketTitle: {
    marginBottom: 10,
    fontSize: typography.size.md - 1,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'capitalize',
  },
  banner: {
    height: 104,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f1f5',
  },
  bannerTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  bannerTagText: { fontSize: 10, fontWeight: '800', color: colors.white },
  bannerBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: {
    flex: 1,
    fontSize: typography.size.sm + 1,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'capitalize',
  },
  bannerGo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { marginBottom: 6 },
  subHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subDot: { width: 6, height: 6, borderRadius: 3 },
  subTitle: {
    flex: 1,
    marginLeft: 6,
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  subCount: { fontSize: 10.5, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tileWrap: { width: '33.333%', padding: 4 },
  tile: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#f8f8fb',
  },
  tileImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ececf1',
  },
  tileInitial: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileInitialText: { fontSize: 17, fontWeight: '800' },
  tileLabel: {
    marginTop: 6,
    minHeight: 28,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  resultsCount: {
    marginBottom: 8,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1, marginHorizontal: 10 },
  resultLabel: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  resultPath: {
    marginTop: 1,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 4,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default CategoryContent;
