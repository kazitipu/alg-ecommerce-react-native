import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import PressableScale from '../../../components/PressableScale';
import useAuth from '../../../hooks/useAuth';
import UserAvatar from '../../../components/UserAvatar';
import useDarkStatusBar from '../../../hooks/useDarkStatusBar';
import { ROUTES } from '../../../navigation/routes';
import useHomeSearch from '../useHomeSearch';
import { colors, radius, spacing, typography } from '../../../theme';

// Each foldable row's height includes the gap below it, so nothing is left
// behind once it folds away.
const BRAND_ROW_HEIGHT = 42;
const COLLAPSE_DISTANCE = 90;
const HINT_INTERVAL = 3000;

const logoMark = require('../../../assets/logo-mark.png');
const logoWordmark = require('../../../assets/logo-wordmark.png');
// Cropped from the web logo; the wordmark is 647 × 102.
const WORDMARK_HEIGHT = 17;
const WORDMARK_WIDTH = Math.round((WORDMARK_HEIGHT * 647) / 102);

/** Cycled inside the empty search box to show what it can do. */
const SEARCH_HINTS = [
  'Search "Kids dress"',
  'Paste a 1688 or Taobao link',
  'Tap the camera to search by photo',
  'Search "Ladies Bags"',
];

/** Shrinks a row from `height` to nothing, fading it out, as the page scrolls. */
const useFoldStyle = (scrollY, height) =>
  useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [height, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.55], [1, 0], Extrapolation.CLAMP),
  }));

const firstName = user => (user?.displayName || user?.name || '').trim().split(' ')[0];

/** Round icon button with an optional count badge. */
const HeaderAction = ({ icon, count, onPress, label }) => (
  <PressableScale
    onPress={onPress}
    scaleTo={0.88}
    hitSlop={6}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={styles.action}>
    <Icon name={icon} size={20} color={colors.text} />
    {count > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    ) : null}
  </PressableScale>
);

/** Signed in: the user's initial on a brand gradient. Signed out: a sign-in pill. */
const AccountButton = ({ name, user, isSignedIn, onPress }) =>
  isSignedIn ? (
    <PressableScale onPress={onPress} scaleTo={0.88} accessibilityLabel="My account">
      <LinearGradient
        colors={['#ff7a5a', colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}>
        <UserAvatar
          user={user}
          initials={(name || 'A').charAt(0).toUpperCase()}
          style={styles.avatarFill}
          textStyle={styles.avatarText}
        />
      </LinearGradient>
    </PressableScale>
  ) : (
    <PressableScale onPress={onPress} scaleTo={0.92} style={styles.signIn} accessibilityLabel="Sign in">
      <Icon name="person-circle-outline" size={17} color={colors.white} />
      <Text style={styles.signInText}>Sign in</Text>
    </PressableScale>
  );

/**
 * Home header on a soft blush-to-white wash: the ALG logo with wishlist /
 * notices / account, then the search box with rotating hints. Scrolling folds
 * the logo row away so only the search stays pinned.
 */
const HomeHeader = ({ scrollY }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentUser, isSignedIn } = useAuth();
  const wishlistCount = useSelector(state => state.wishlist.list?.length || 0);
  const { submit, searchByPhoto, uploading } = useHomeSearch();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  useDarkStatusBar();

  useEffect(() => {
    const timer = setInterval(
      () => setHintIndex(index => (index + 1) % SEARCH_HINTS.length),
      HINT_INTERVAL,
    );
    return () => clearInterval(timer);
  }, []);

  const onSubmit = () => {
    if (submit(query)) setQuery('');
  };

  // Account-tab screens are opened inside that tab, with its root beneath them.
  const openAccountScreen = screen =>
    navigation.navigate(ROUTES.TAB_ACCOUNT, { screen, initial: false });

  const openAccount = () =>
    isSignedIn ? navigation.navigate(ROUTES.TAB_ACCOUNT) : navigation.navigate(ROUTES.LOGIN);

  const brandRowStyle = useFoldStyle(scrollY, BRAND_ROW_HEIGHT);

  // The pinned search box is a little slimmer than the resting one.
  const searchStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [46, 42], Extrapolation.CLAMP),
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_DISTANCE * 0.5, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));

  const name = firstName(currentUser);
  const showHint = !query && !focused;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#fff0ec', '#fff8f6', colors.white]}
        style={[styles.container, { paddingTop: insets.top + 4 }]}>
        <Animated.View style={[styles.brandRow, brandRowStyle]}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.logo}>
            <Image source={logoMark} style={styles.logoMark} />
            <Image source={logoWordmark} style={styles.wordmark} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.actions}>
            <HeaderAction
              icon="heart-outline"
              label="Wishlist"
              count={wishlistCount}
              onPress={() => openAccountScreen(ROUTES.WISHLIST)}
            />
            <AccountButton name={name} user={currentUser} isSignedIn={isSignedIn} onPress={openAccount} />
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(180).duration(500)}
          style={[styles.search, focused && styles.searchFocused, searchStyle]}>
          <Icon name="search" size={19} color={focused ? colors.primary : colors.textSecondary} />
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={onSubmit}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? 'Search products or paste a link' : ''}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search products or paste a 1688 link"
            />
            {showHint ? (
              <Animated.Text
                key={hintIndex}
                // Entering only: an exiting animation can leave a ghost of the
                // previous hint behind on Android.
                entering={FadeInDown.duration(350)}
                pointerEvents="none"
                numberOfLines={1}
                style={styles.hint}>
                {SEARCH_HINTS[hintIndex]}
              </Animated.Text>
            ) : null}
          </View>
          <PressableScale
            onPress={searchByPhoto}
            disabled={uploading}
            scaleTo={0.85}
            hitSlop={8}
            accessibilityLabel="Search by photo"
            style={styles.camera}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="camera-outline" size={20} color={colors.text} />
            )}
          </PressableScale>
          <PressableScale
            onPress={onSubmit}
            scaleTo={0.92}
            accessibilityLabel="Search"
            style={styles.submitShadow}>
            <LinearGradient
              colors={['#ff8a5c', colors.primary, '#e8344a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submit}>
              {/* A soft sheen across the top half gives the button some gloss. */}
              <View style={styles.sheen} />
              <Icon name="search" size={13} color={colors.white} />
              <Text style={styles.submitText}>Search</Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

      </LinearGradient>

      {/* Soft shadow under the header, faded in once content scrolls beneath. */}
      <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle]}>
        <LinearGradient colors={['rgba(31, 35, 64, 0.08)', 'rgba(31, 35, 64, 0)']} style={styles.fill} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { zIndex: 2 },
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    overflow: 'hidden',
  },
  logo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 21, height: 21, marginRight: 6 },
  wordmark: { width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  action: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 8.5, fontWeight: typography.weight.bold },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFill: { width: '100%', height: '100%', borderRadius: radius.full },
  avatarText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#1f2340',
  },
  signInText: {
    marginLeft: 4,
    color: colors.white,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.white,
    shadowColor: '#c2423f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchFocused: { borderColor: colors.primary },
  inputWrap: { flex: 1, justifyContent: 'center', marginLeft: spacing.sm, overflow: 'hidden' },
  input: { paddingVertical: 0, fontSize: typography.size.sm, color: colors.text },
  hint: { position: 'absolute', left: 0, right: 0, fontSize: typography.size.sm, color: colors.textMuted },
  camera: {
    width: 34,
    height: 34,
    marginRight: 5,
    borderRadius: 11,
    backgroundColor: '#f4f4f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitShadow: {
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  submitText: {
    marginLeft: 4,
    color: colors.white,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.3,
  },
  shadow: { position: 'absolute', left: 0, right: 0, bottom: -10, height: 10 },
  fill: { flex: 1 },
});

export default HomeHeader;
