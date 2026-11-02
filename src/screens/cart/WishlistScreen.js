import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { PressableScale, ScreenHeader } from '../../components';
import ConfirmSheet from '../../components/ConfirmSheet';
import { useHideSupportFab } from '../../components/SupportFab';
import { addToWishlist, removeFromWishlist } from '../../actions';
import { removeFromWishlistFirestore } from '../../firebase/firebase.utils';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { formatPrice } from '../../utils/format';
import { notifyError, notifyInfo } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import {
  WISHLIST_SORTS,
  arrangeWishlist,
  wishlistImage,
  wishlistName,
  wishlistPrice,
} from './wishlistUtils';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const GAP = 12;

/** The heart-and-message state for signed-out or empty wishlists. */
const EmptyHeart = ({ icon, title, text, action, onAction }) => (
  <Animated.View entering={FadeIn.duration(420)} style={styles.empty}>
    <View style={styles.emptyArt}>
      <LinearGradient
        colors={['#ffe4e6', '#ffd0d6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyCircle}
      >
        <Icon name={icon} size={40} color={colors.primary} />
      </LinearGradient>
      <View style={[styles.emptySpark, styles.emptySparkA]} />
      <View style={[styles.emptySpark, styles.emptySparkB]} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
    <PressableScale onPress={onAction} scaleTo={0.95} style={styles.ctaShadow}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>{action}</Text>
        <Icon name="arrow-forward" size={16} color={colors.white} />
      </LinearGradient>
    </PressableScale>
  </Animated.View>
);

/**
 * Saved products, backed by `wishlists/{uid}` and kept live by the snapshot
 * listener in `useFirebaseSync` — so adding on the website shows up here.
 */
const WishlistScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const { currentUser, isSignedIn } = useAuth();
  useDarkStatusBar();
  useHideSupportFab();

  const list = useSelector(state => state.wishlist.list);
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const items = useMemo(
    () => arrangeWishlist(list, { query, sort, taka }),
    [list, query, sort, taka],
  );
  const total = Array.isArray(list) ? list.length : 0;
  const cardWidth = (width - spacing.md * 2 - GAP) / 2;

  const open = product =>
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { id: product.id, product });

  // The product waiting for the user to confirm its removal.
  const [removing, setRemoving] = useState(null);
  const remove = product => setRemoving(product);

  const confirmRemove = async () => {
    const product = removing;
    if (!product) return;
    setRemoving(null);
    // Off the screen straight away; back again if saving fails.
    dispatch(removeFromWishlist(product.id));
    try {
      await removeFromWishlistFirestore(currentUser, product);
      notifyInfo('Removed from wishlist', wishlistName(product));
    } catch (error) {
      dispatch(addToWishlist(product));
      notifyError(error, 'Could not update your wishlist.');
    }
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Wishlist"
          subtitle="Your saved products"
          icon="heart"
        />
        <EmptyHeart
          icon="lock-closed"
          title="Sign in to see your wishlist"
          text="Saved items follow your account across the app and the website."
          action="Sign in"
          onAction={() => navigation.navigate(ROUTES.LOGIN)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Wishlist"
        subtitle={
          total
            ? `${total} saved ${total === 1 ? 'product' : 'products'}`
            : 'Your saved products'
        }
        icon="heart"
      >
        {total > 0 ? (
          <>
            <View style={styles.search}>
              <Icon name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search your wishlist"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
              />
              {query ? (
                <PressableScale
                  onPress={() => setQuery('')}
                  scaleTo={0.85}
                  hitSlop={8}
                >
                  <Icon
                    name="close-circle"
                    size={16}
                    color={colors.textMuted}
                  />
                </PressableScale>
              ) : null}
            </View>
            <View style={styles.sorts}>
              {WISHLIST_SORTS.map(option => {
                const on = option.key === sort;
                return (
                  <PressableScale
                    key={option.key}
                    onPress={() => setSort(option.key)}
                    scaleTo={0.94}
                    style={[styles.sort, on && styles.sortOn]}
                  >
                    <Text style={[styles.sortText, on && styles.sortTextOn]}>
                      {option.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}
      </ScreenHeader>

      {total === 0 ? (
        <EmptyHeart
          icon="heart"
          title="Nothing saved yet"
          text="Tap the heart on a product to keep it here for later."
          action="Browse products"
          onAction={() => navigation.navigate(ROUTES.TAB_HOME)}
        />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(item, index) => `${item.id || index}`}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noMatch}>
              <Icon name="search" size={22} color={colors.textMuted} />
              <Text style={styles.noMatchText}>
                No saved product matches “{query.trim()}”
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const image = wishlistImage(item);
            return (
              <Animated.View
                entering={FadeInUp.delay(Math.min(index, 8) * 50)
                  .duration(340)
                  .easing(EASE)}
                exiting={FadeOut.duration(200)}
                layout={LinearTransition.duration(240).easing(EASE)}
                style={[styles.card, { width: cardWidth }]}
              >
                <PressableScale onPress={() => open(item)} scaleTo={0.97}>
                  <View style={styles.imageWrap}>
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <Icon
                          name="image-outline"
                          size={28}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                    <PressableScale
                      onPress={() => remove(item)}
                      scaleTo={0.85}
                      hitSlop={8}
                      style={styles.heart}
                      accessibilityLabel="Saved — tap to remove from wishlist"
                    >
                      <Icon name="heart" size={16} color={colors.primary} />
                    </PressableScale>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={2}>
                      {wishlistName(item)}
                    </Text>
                    <Text style={styles.price}>
                      {formatPrice(wishlistPrice(item, taka), symbol)}
                    </Text>
                  </View>
                </PressableScale>
                <View style={styles.actions}>
                  <PressableScale
                    onPress={() => open(item)}
                    scaleTo={0.95}
                    style={[styles.view, styles.viewFlex]}
                  >
                    <Icon
                      name="bag-add-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.viewText}>View & buy</Text>
                  </PressableScale>
                  <PressableScale
                    onPress={() => remove(item)}
                    scaleTo={0.9}
                    hitSlop={6}
                    style={styles.removeButton}
                    accessibilityLabel={`Remove ${wishlistName(
                      item,
                    )} from wishlist`}
                  >
                    <Icon name="trash-outline" size={15} color="#e11d48" />
                  </PressableScale>
                </View>
              </Animated.View>
            );
          }}
        />
      )}

      <ConfirmSheet
        visible={Boolean(removing)}
        icon="heart-dislike"
        title="Remove from wishlist?"
        message="You can save it again any time from the product page."
        preview={
          removing
            ? {
                image: wishlistImage(removing),
                title: wishlistName(removing),
                subtitle: formatPrice(wishlistPrice(removing, taka), symbol),
              }
            : null
        }
        confirmLabel="Remove"
        confirmIcon="trash-outline"
        cancelLabel="Keep it"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: typography.size.sm + 1,
    color: colors.text,
  },
  sorts: { flexDirection: 'row', gap: 6, marginTop: 10 },
  sort: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  sortOn: { backgroundColor: colors.primary },
  sortText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  sortTextOn: { color: colors.white, fontWeight: typography.weight.bold },
  list: { padding: spacing.md, flexGrow: 1 },
  column: { gap: GAP, marginBottom: GAP },
  card: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: { borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#f1f1f5' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  body: { paddingHorizontal: 4, paddingTop: 8 },
  name: {
    minHeight: 34,
    fontSize: typography.size.xs + 1,
    lineHeight: 17,
    color: colors.text,
  },
  price: {
    marginTop: 4,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.primary,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  view: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  viewFlex: { flex: 1 },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  noMatch: { alignItems: 'center', gap: 8, paddingTop: 60 },
  noMatchText: { fontSize: typography.size.sm, color: colors.textSecondary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  emptyArt: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySpark: { position: 'absolute', borderRadius: radius.full },
  emptySparkA: {
    top: 8,
    right: 10,
    width: 12,
    height: 12,
    backgroundColor: '#fbbf24',
  },
  emptySparkB: {
    bottom: 14,
    left: 8,
    width: 8,
    height: 8,
    backgroundColor: '#f472b6',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 26,
    borderRadius: 16,
  },
  ctaText: {
    color: colors.white,
    fontSize: typography.size.md - 1,
    fontWeight: typography.weight.bold,
  },
});

export default WishlistScreen;
