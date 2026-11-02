import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { HOME_RAILS } from '../../../constants/categories';
import { colors, radius, spacing, typography } from '../../../theme';

/** An open parcel with a magnifying glass over it and a few sparkles. */
const EmptyIllustration = () => (
  <Svg width={180} height={150} viewBox="0 0 180 150">
    <Defs>
      <SvgGradient id="box" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ffb98a" />
        <Stop offset="1" stopColor="#ff7a5a" />
      </SvgGradient>
      <SvgGradient id="lens" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ffffff" />
        <Stop offset="1" stopColor="#ffe9e4" />
      </SvgGradient>
    </Defs>
    <Circle cx={90} cy={72} r={64} fill="#fff1ec" />
    <Ellipse cx={86} cy={132} rx={46} ry={6} fill="#f3e3df" />
    <Path d="M46 70l40 18v40l-40-18z" fill="url(#box)" />
    <Path d="M86 88l40-18v40l-40 18z" fill="#f2653f" />
    <Path d="M46 70l40-16 40 16-40 18z" fill="#ffd2bb" />
    <Path d="M46 70l-12-14 40-16 12 14zM126 70l12-14-40-16-12 14z" fill="#ffc4a6" />
    <Path d="M66 79l20 9" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    <Circle cx={120} cy={56} r={20} fill="url(#lens)" stroke="#2f3e9e" strokeWidth={6} />
    <Path d="M134 71l15 15" stroke="#2f3e9e" strokeWidth={8} strokeLinecap="round" />
    <Path d="M113 50a9 9 0 0 1 9-5" stroke="#c8d0ff" strokeWidth={3} strokeLinecap="round" fill="none" />
    <Path d="M32 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc23d" />
    <Path d="M150 22l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#6c7bff" />
    <Circle cx={156} cy={104} r={3} fill="#3ccf91" />
  </Svg>
);

/**
 * Shown when a search, photo search or shop listing comes back empty: a
 * friendly illustration, what happened, a way back to search, and popular
 * keywords to try instead.
 */
const CollectionEmpty = ({ isPhotoSearch, keyword, onSearch, onTryKeyword }) => (
  <View style={styles.container}>
    <Animated.View entering={FadeInDown.springify().damping(14)}>
      <EmptyIllustration />
    </Animated.View>

    <Animated.View entering={FadeInUp.delay(120).duration(400)} style={styles.texts}>
      <Text style={styles.title}>No products found</Text>
      <Text style={styles.message}>
        {isPhotoSearch
          ? 'We could not match that photo. Try a clearer picture, or search by name.'
          : `Nothing came back for "${keyword}". Check the spelling or try a broader word.`}
      </Text>
    </Animated.View>

    <Animated.View entering={FadeInUp.delay(220).duration(400)}>
      <PressableScale onPress={onSearch} scaleTo={0.95} style={styles.buttonShadow}>
        <LinearGradient
          colors={['#ff8a5c', colors.primary, '#e8344a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}>
          <Icon name="search" size={16} color={colors.white} />
          <Text style={styles.buttonText}>Search something else</Text>
        </LinearGradient>
      </PressableScale>
    </Animated.View>

    <Animated.View entering={FadeInUp.delay(320).duration(400)} style={styles.suggestions}>
      <Text style={styles.suggestionsTitle}>Try these</Text>
      <View style={styles.chips}>
        {HOME_RAILS.map(rail => (
          <PressableScale
            key={rail.title}
            onPress={() => onTryKeyword(rail)}
            scaleTo={0.92}
            style={styles.chip}>
            <Text style={styles.chipText}>{rail.title}</Text>
          </PressableScale>
        ))}
      </View>
    </Animated.View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  texts: { alignItems: 'center', marginTop: spacing.md },
  title: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonShadow: {
    marginTop: spacing.lg,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 16,
  },
  buttonText: {
    marginLeft: 8,
    color: colors.white,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  suggestions: { alignItems: 'center', marginTop: spacing.xl },
  suggestionsTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.sm },
  chip: {
    margin: 4,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#f0e4e2',
  },
  chipText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
});

export default CollectionEmpty;
