import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../components/PressableScale';
import CategoryContent, {
  CategorySearchResults,
  countLeaves,
  labelOf,
  lookOf,
  searchLeaves,
  ALL_LEAVES,
} from './components/CategoryContent';
import { CATEGORY_TREE } from '../../constants/categoryTree';
import { useDarkStatusBar } from '../../hooks';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const RAIL_ITEM = 78;
const GROUPS = Object.keys(CATEGORY_TREE);

/** One group in the left rail: gradient icon when selected, tinted otherwise. */
const RailItem = ({ group, selected, onPress }) => {
  const look = lookOf(group);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={styles.railItem}
    >
      {selected ? (
        <LinearGradient
          colors={look.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.railIcon}
        >
          <Icon name={look.icon} size={19} color={colors.white} />
        </LinearGradient>
      ) : (
        <View style={[styles.railIcon, styles.railIconIdle]}>
          <Icon
            name={`${look.icon}-outline`}
            size={19}
            color={colors.textSecondary}
          />
        </View>
      )}
      <Text
        style={[styles.railLabel, selected && styles.railLabelOn]}
        numberOfLines={2}
      >
        {group}
      </Text>
    </PressableScale>
  );
};

/**
 * Categories, as a two-pane browser: the 11 groups in a rail on the left and
 * the chosen group's markets, featured picks and categories on the right, with
 * a search across all 281 categories on top.
 *
 * Opening a category searches 1688 for its `route` — the Chinese term — while
 * showing the English label, exactly as the web drawer did.
 */
const CategoryListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();

  const [selected, setSelected] = useState(GROUPS[0]);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchLeaves(query), [query]);
  const searching = query.trim().length > 0;

  // The rail's red marker glides to the selected group.
  const index = GROUPS.indexOf(selected);
  const marker = useSharedValue(index);
  useEffect(() => {
    marker.value = withTiming(index, { duration: 260, easing: EASE });
  }, [index, marker]);
  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: marker.value * RAIL_ITEM }],
  }));

  const contentRef = useRef(null);
  const selectGroup = group => {
    setSelected(group);
    contentRef.current?.scrollTo({ y: 0, animated: false });
  };

  const openCategory = leaf =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: leaf.route,
      title: labelOf(leaf),
    });

  const look = lookOf(selected);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fff0ec', '#fff8f6', '#f6f6f8']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Icon name="grid" size={19} color={colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Categories</Text>
            <Text style={styles.headerSub}>
              {GROUPS.length} departments · {ALL_LEAVES.length} categories from
              China
            </Text>
          </View>
        </View>
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories, e.g. dress, shoes"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching ? (
            <PressableScale
              onPress={() => setQuery('')}
              scaleTo={0.85}
              hitSlop={8}
            >
              <Icon name="close-circle" size={17} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      </LinearGradient>

      {searching ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.searchContent}
        >
          <CategorySearchResults
            results={results}
            query={query}
            onOpen={openCategory}
          />
        </ScrollView>
      ) : (
        <View style={styles.panes}>
          <ScrollView
            style={styles.rail}
            contentContainerStyle={styles.railContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.railMarker, markerStyle]} />
            {GROUPS.map(group => (
              <RailItem
                key={group}
                group={group}
                selected={group === selected}
                onPress={() => selectGroup(group)}
              />
            ))}
          </ScrollView>

          <ScrollView
            ref={contentRef}
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={`hero-${selected}`}
              entering={FadeIn.duration(260)}
            >
              <LinearGradient
                colors={look.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groupHero}
              >
                <View style={styles.groupHeroBlob} />
                <View style={styles.groupHeroText}>
                  <Text style={styles.groupHeroTitle} numberOfLines={2}>
                    {selected}
                  </Text>
                  <Text style={styles.groupHeroSub}>
                    {countLeaves(selected)} categories
                  </Text>
                </View>
                <View style={styles.groupHeroIcon}>
                  <Icon name={look.icon} size={26} color={colors.white} />
                </View>
              </LinearGradient>
            </Animated.View>
            <CategoryContent
              key={selected}
              group={selected}
              onOpen={openCategory}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: spacing.md, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 10 },
  headerTitle: {
    fontSize: typography.size.lg + 1,
    fontWeight: '800',
    color: colors.text,
  },
  headerSub: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: typography.size.sm + 1,
    color: colors.text,
  },
  searchContent: { padding: spacing.md },
  panes: { flex: 1, flexDirection: 'row' },
  rail: {
    width: 88,
    flexGrow: 0,
    backgroundColor: colors.white,
    borderTopRightRadius: 22,
  },
  railContent: { paddingVertical: 6 },
  railMarker: {
    position: 'absolute',
    top: 6 + 18,
    left: 0,
    width: 4,
    height: RAIL_ITEM - 36,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
  },
  railItem: {
    height: RAIL_ITEM,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  railIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railIconIdle: { backgroundColor: '#f3f3f6' },
  railLabel: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  railLabelOn: { color: colors.primary, fontWeight: '800' },
  content: { flex: 1 },
  contentInner: { padding: 12, paddingBottom: spacing.lg },
  groupHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  groupHeroBlob: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  groupHeroText: { flex: 1 },
  groupHeroTitle: {
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.white,
  },
  groupHeroSub: {
    marginTop: 2,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: 'rgba(255,255,255,0.9)',
  },
  groupHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryListScreen;
