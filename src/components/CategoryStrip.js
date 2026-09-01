import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { HOME_CATEGORIES } from '../constants/categories';
import { colors, radius, spacing, typography } from '../theme';

/**
 * The horizontally scrolling category tiles under the home banner.
 * A tile's name is also the 1688 search keyword, as on the web.
 */
const CategoryStrip = ({ onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}>
    {HOME_CATEGORIES.map(category => (
      <Pressable
        key={category.name}
        onPress={() => onSelect(category)}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        <View style={styles.iconWrap}>
          <Icon name={category.icon} size={24} color={colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {category.name}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tile: { width: 72, alignItems: 'center', marginRight: spacing.sm },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: spacing.xs,
    fontSize: typography.size.xxs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default CategoryStrip;
