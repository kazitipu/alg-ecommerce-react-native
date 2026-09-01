import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';

import { CATEGORY_TREE } from '../../constants/categoryTree';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/** An icon per top-level group, standing in for the web drawer's tile images. */
const GROUP_ICONS = {
  'Dress & clothing': 'shirt-outline',
  'Accessories Shoes': 'footsteps-outline',
  'Handbags Wallets': 'bag-handle-outline',
  'Sports Apparel': 'basketball-outline',
  "Children's clothing": 'happy-outline',
  'Home Furnishings': 'bed-outline',
  'Home imporovement': 'hammer-outline',
  'Office Culture/Pet': 'briefcase-outline',
  'Food,Drink': 'fast-food-outline',
  'Beauty & Makeup': 'color-palette-outline',
  Digital: 'hardware-chip-outline',
};

/** Counts the leaf categories under a group, for the row subtitle. */
const countLeaves = group =>
  group.mainCategories.reduce(
    (total, main) =>
      total +
      main.subCategories.reduce((sum, sub) => sum + sub.categories.length, 0),
    0,
  );

/** Level one of the category drawer: the 11 top-level groups. */
const CategoryListScreen = () => {
  const navigation = useNavigation();
  const groups = Object.keys(CATEGORY_TREE);

  return (
    <FlatList
      style={styles.container}
      data={groups}
      keyExtractor={name => name}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const group = CATEGORY_TREE[item];
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate(ROUTES.CATEGORY_SUB, { group: item })
            }>
            <View style={styles.iconWrap}>
              <Icon
                name={GROUP_ICONS[item] || 'pricetag-outline'}
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item}</Text>
              <Text style={styles.rowMeta}>{countLeaves(group)} categories</Text>
            </View>

            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  list: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, marginLeft: spacing.md },
  rowTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});

export default CategoryListScreen;
