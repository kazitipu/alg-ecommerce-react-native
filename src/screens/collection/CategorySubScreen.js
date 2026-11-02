import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../components/PressableScale';
import CategoryContent, { countLeaves, labelOf, lookOf } from './components/CategoryContent';
import { useDarkStatusBar } from '../../hooks';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * One group's categories on their own page (for links straight to a group).
 * Same content as the right pane of the category browser.
 *
 * Tapping a leaf searches 1688 for its `route` — the Chinese term — while
 * showing the English label, which is exactly what the web drawer did.
 */
const CategorySubScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();
  const group = route.params?.group;
  const look = lookOf(group);

  const openCategory = leaf =>
    navigation.navigate(ROUTES.COLLECTION, { keyword: leaf.route, title: labelOf(leaf) });

  return (
    <View style={styles.container}>
      <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.blob} />
        <View style={styles.headerRow}>
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Back">
            <Icon name="chevron-back" size={20} color={colors.text} />
          </PressableScale>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {group || 'Category'}
            </Text>
            <Text style={styles.sub}>{countLeaves(group)} categories</Text>
          </View>
          <View style={styles.headerIcon}>
            <Icon name={look.icon} size={22} color={colors.white} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CategoryContent group={group} onOpen={openCategory} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, overflow: 'hidden' },
  blob: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.white },
  sub: { marginTop: 1, fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: 'rgba(255,255,255,0.9)' },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md },
});

export default CategorySubScreen;
