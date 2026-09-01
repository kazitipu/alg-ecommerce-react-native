import React, { useLayoutEffect, useMemo } from 'react';
import { Image, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { CATEGORY_TREE } from '../../constants/categoryTree';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Level two: every leaf category in the chosen group, grouped by its section.
 *
 * Tapping a leaf searches 1688 for its `route` — the Chinese term — while
 * showing the English label, which is exactly what the web drawer did.
 *
 * The taxonomy carries two leaf shapes: 265 plain `{ name, route }` chips and
 * 16 featured `{ title, route, src }` entries that came with a thumbnail. Both
 * are rendered, the latter with its image.
 */
const CategorySubScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const groupName = route.params?.group;

  useLayoutEffect(() => {
    navigation.setOptions({ title: groupName || 'Category' });
  }, [navigation, groupName]);

  const sections = useMemo(() => {
    const group = CATEGORY_TREE[groupName];
    if (!group) return [];

    return group.mainCategories.flatMap(main =>
      main.subCategories.map(sub => ({
        title: `${main.id} · ${sub.id}`,
        data: sub.categories,
      })),
    );
  }, [groupName]);

  const labelOf = leaf => leaf.name || leaf.title || leaf.route;

  const openCategory = leaf =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: leaf.route,
      title: labelOf(leaf),
    });

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item, index) => `${item.route}-${index}`}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          onPress={() => openCategory(item)}>
          {item.src ? (
            <Image source={{ uri: item.src }} style={styles.thumb} resizeMode="cover" />
          ) : null}
          <Text style={styles.chipLabel}>{labelOf(item)}</Text>
        </Pressable>
      )}
      renderSectionFooter={() => <View style={styles.sectionGap} />}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  list: { padding: spacing.md },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  pressed: { opacity: 0.9 },
  chipLabel: {
    fontSize: typography.size.sm,
    color: colors.text,
    textTransform: 'capitalize',
  },
  sectionGap: { height: spacing.lg },
});

export default CategorySubScreen;
