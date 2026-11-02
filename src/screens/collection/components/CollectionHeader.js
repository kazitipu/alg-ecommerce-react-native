import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../../components/PressableScale';
import Shimmer from '../../../components/Shimmer';
import useDarkStatusBar from '../../../hooks/useDarkStatusBar';
import { ROUTES } from '../../../navigation/routes';
import { colors, radius, spacing, typography } from '../../../theme';

const TOGGLE_ITEM = 32;
// The sort / layout row, including the gap above it, so folding it leaves no space.
const TOOLBAR_HEIGHT = 40;

const RoundButton = ({ icon, onPress, label }) => (
  <PressableScale
    onPress={onPress}
    scaleTo={0.88}
    hitSlop={6}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={styles.round}>
    <Icon name={icon} size={20} color={colors.text} />
  </PressableScale>
);

/** Grid / list switch with a pill that slides to the active layout. */
const LayoutToggle = ({ columns, onChange }) => {
  const position = useSharedValue(columns === 2 ? 0 : 1);

  useEffect(() => {
    position.value = withSpring(columns === 2 ? 0 : 1, {
      damping: 16,
      stiffness: 220,
    });
  }, [columns, position]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * TOGGLE_ITEM }],
  }));

  return (
    <View style={styles.toggle}>
      <Animated.View style={[styles.togglePill, pillStyle]} />
      {[
        { value: 2, icon: 'grid' },
        { value: 1, icon: 'list' },
      ].map(option => (
        <PressableScale
          key={option.value}
          onPress={() => onChange(option.value)}
          scaleTo={0.88}
          accessibilityLabel={option.value === 2 ? 'Grid view' : 'List view'}
          accessibilityState={{ selected: columns === option.value }}
          style={styles.toggleItem}>
          <Icon
            name={
              columns === option.value ? option.icon : `${option.icon}-outline`
            }
            size={16}
            color={
              columns === option.value ? colors.white : colors.textSecondary
            }
          />
        </PressableScale>
      ))}
    </View>
  );
};

/**
 * Product-list header, matching the home header: a soft blush wash, round back
 * and search buttons, the list's title with its product count, and a toolbar
 * with the sort pill and the grid / list switch. `toolbarProgress` (1 shown,
 * 0 hidden) folds the toolbar away while the list scrolls down.
 */
const CollectionHeader = ({
  title,
  count,
  loading,
  columns,
  onLayoutChange,
  sortLabel,
  sorted,
  onOpenSort,
  toolbarProgress,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();

  const toolbarStyle = useAnimatedStyle(() => {
    const progress = toolbarProgress ? toolbarProgress.value : 1;
    return {
      height: interpolate(
        progress,
        [0, 1],
        [0, TOOLBAR_HEIGHT],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(progress, [0.3, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            progress,
            [0, 1],
            [-10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#fff0ec', '#fff8f6', colors.white]}
        style={[styles.container, { paddingTop: insets.top + 4 }]}>
        <View style={styles.titleRow}>
          <RoundButton
            icon="chevron-back"
            label="Back"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {loading ? (
              <Shimmer style={styles.countSkeleton} borderRadius={5} />
            ) : (
              <Text style={styles.count}>
                {count} {count === 1 ? 'product' : 'products'}
              </Text>
            )}
          </View>
          <RoundButton
            icon="search"
            label="Search"
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          />
        </View>

        <Animated.View style={[styles.toolbarFold, toolbarStyle]}>
          <View style={styles.toolbar}>
            <PressableScale
              onPress={onOpenSort}
              scaleTo={0.94}
              accessibilityLabel="Sort products"
              style={[styles.sortPill, sorted && styles.sortPillActive]}>
              <Icon
                name="swap-vertical"
                size={14}
                color={sorted ? colors.primary : colors.text}
              />
              <Text
                style={[styles.sortText, sorted && styles.sortTextActive]}
                numberOfLines={1}>
                {sortLabel}
              </Text>
              <Icon
                name="chevron-down"
                size={13}
                color={sorted ? colors.primary : colors.textSecondary}
              />
            </PressableScale>

            <LayoutToggle columns={columns} onChange={onLayoutChange} />
          </View>
        </Animated.View>
      </LinearGradient>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(31, 35, 64, 0.07)', 'rgba(31, 35, 64, 0)']}
        style={styles.shadow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { zIndex: 2 },
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  round: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  titleWrap: { flex: 1, marginHorizontal: spacing.sm + 4 },
  title: {
    fontSize: typography.size.md + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  count: { fontSize: typography.size.xxs + 1, color: colors.textSecondary },
  countSkeleton: { width: 64, height: 9, marginTop: 3 },
  toolbarFold: { overflow: 'hidden' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TOOLBAR_HEIGHT,
    paddingTop: 8,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '62%',
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#f0e4e2',
  },
  sortPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sortText: {
    marginHorizontal: 5,
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  sortTextActive: { color: colors.primary },
  toggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#f0e4e2',
  },
  togglePill: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: TOGGLE_ITEM,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primary,
  },
  toggleItem: {
    width: TOGGLE_ITEM,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: { position: 'absolute', left: 0, right: 0, bottom: -8, height: 8 },
});

export default CollectionHeader;
