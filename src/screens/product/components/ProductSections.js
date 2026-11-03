import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { formatPrice } from '../../../utils/format';
import { getOptionValue, PRODUCT_TEXT } from '../../../utils/productDetail';
import { colors, radius, typography } from '../../../theme';
import { thumbImage } from '../../../utils/imageUrl';

/** Five stars, half-filled where the rating falls between two. */
export const Stars = ({ rating, size = 13 }) => (
  <View style={styles.stars}>
    {[0, 1, 2, 3, 4].map(index => (
      <Icon
        key={index}
        name={rating >= index + 1 ? 'star' : rating > index ? 'star-half' : 'star-outline'}
        size={size}
        color="#ffa41b"
      />
    ))}
  </View>
);

/** Small stat tile used in the title card. */
const Stat = ({ icon, tint, color, value, label }) => (
  <View style={styles.stat}>
    <View style={[styles.statIcon, { backgroundColor: tint }]}>
      <Icon name={icon} size={14} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

/** Rating, sold and stock as three tiles. Only what the product reports. */
export const StatsRow = ({ rating, totalSold, available }) => {
  const stats = [];
  if (rating > 0) stats.push({ key: 'rating', icon: 'star', tint: '#fff4dd', color: '#f59e0b', value: rating.toFixed(1), label: 'Rating' });
  if (totalSold) stats.push({ key: 'sold', icon: 'bag-check', tint: '#ffe8e8', color: colors.primary, value: Number(totalSold).toLocaleString('en-US'), label: 'Total sold' });
  if (available) stats.push({ key: 'stock', icon: 'cube', tint: '#e6f7ef', color: '#0e9a72', value: Number(available).toLocaleString('en-US'), label: 'Available' });
  if (stats.length === 0) return null;

  return (
    <View style={styles.statsRow}>
      {stats.map(({ key, ...stat }, index) => (
        <Animated.View key={key} entering={FadeInRight.delay(120 + index * 80)} style={styles.statWrap}>
          <Stat {...stat} />
        </Animated.View>
      ))}
    </View>
  );
};

/** A soft shine that sweeps across the price banner every few seconds. */
const Shine = () => {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(withSequence(withTiming(-1, { duration: 2400 }), withTiming(1.4, { duration: 900 })), 3);
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 320 }, { rotate: '18deg' }] }));
  return <Animated.View pointerEvents="none" style={[styles.shine, style]} />;
};

/**
 * The price banner: the current price on a warm gradient, the quantity tiers
 * as chips with the active one highlighted, and the minimum-order / pack-size
 * lines in Bengali as on the web.
 */
export const PriceCard = ({ priceLabel, tiers, tierIndex, taka, symbol, moq, batch, totalQuantity }) => (
  <View style={styles.priceCard}>
    <LinearGradient colors={['#fff1ec', '#ffe4de']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.priceGradient}>
      <Shine />
      <View style={styles.priceTop}>
        <View>
          <Text style={styles.priceCaption}>{tiers.length > 0 ? 'Price at your quantity' : 'Price'}</Text>
          <Animated.Text key={priceLabel} entering={FadeIn.duration(300)} style={styles.price}>
            {priceLabel}
          </Animated.Text>
        </View>
        <View style={styles.perUnit}>
          <Text style={styles.perUnitText}>/ pc</Text>
        </View>
      </View>

      {tiers.length > 0 ? (
        <>
          <View style={styles.tiers}>
            {tiers.map((tier, index) => {
              const active = index === Math.max(tierIndex, 0);
              return (
                <View key={index} style={[styles.tier, active && styles.tierActive]}>
                  {active ? (
                    <Animated.View entering={ZoomIn} style={styles.tierTick}>
                      <Icon name="checkmark" size={9} color={colors.white} />
                    </Animated.View>
                  ) : null}
                  <Text
                    style={[styles.tierPrice, active && styles.tierPriceActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {formatPrice(Math.round(parseFloat(tier[1]) * parseFloat(taka)), symbol)}
                  </Text>
                  <Text
                    style={[styles.tierQty, active && styles.tierQtyActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {index === 0 && Number(tier[0]) !== 1 ? 'below ' : ''}
                    {tier[0]} or more
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.tierHint}>
            <Icon name="trending-down" size={13} color="#0e9a72" />
            <Text style={styles.tierHintText}>
              The whole order gets cheaper as your total grows{totalQuantity ? ` · ${totalQuantity} pc now` : ''}
            </Text>
          </View>
        </>
      ) : null}
    </LinearGradient>

    <View style={styles.moqRow}>
      <View style={styles.moqChip}>
        <Icon name="layers-outline" size={13} color={colors.success} />
        <Text style={styles.moqText}>{PRODUCT_TEXT.moq(moq || 1)}</Text>
      </View>
      {Number(batch) > 1 ? (
        <View style={styles.moqChip}>
          <Icon name="albums-outline" size={13} color={colors.success} />
          <Text style={styles.moqText}>{PRODUCT_TEXT.packSize(batch)}</Text>
        </View>
      ) : null}
    </View>
    <Text style={styles.moqHint}>{PRODUCT_TEXT.onlyThisProduct}</Text>
  </View>
);

/**
 * The page's entry to the variant drawer: a preview of the colour swatches
 * and a summary of what is picked. Tapping it opens the drawer.
 */
const SWATCH = 44;
const SWATCH_GAP = 8;

/**
 * How many swatches fit one row of `width`: all of them when they fit,
 * otherwise one slot fewer so the "+N" box fits too. Before the row is
 * measured it shows up to 6, as before.
 */
export const swatchSlots = (width, total) => {
  const capacity = width > 0 ? Math.max(1, Math.floor((width + SWATCH_GAP) / (SWATCH + SWATCH_GAP))) : 7;
  if (total <= capacity) return { shown: total };
  return { shown: Math.max(0, capacity - 1) };
};

export const VariantPreview = ({ mode, colors: colorOptions, selectedColor, quantities, totalQuantity, propertyNames, onOpen }) => {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (totalQuantity > 0) return;
    pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 700 }), withTiming(1, { duration: 700 })), 4);
  }, [pulse, totalQuantity]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ scale: totalQuantity > 0 ? 1 : pulse.value }] }));

  const pickedColors = new Set(Object.keys(quantities).map(key => key.split(';')[0]));

  // Fit the swatches to the row's real width: as many as there is room for,
  // with the last slot turned into "+N" when some are left over.
  const [rowWidth, setRowWidth] = useState(0);
  const slots = swatchSlots(rowWidth, colorOptions.length);
  const shown = colorOptions.slice(0, slots.shown);
  const hidden = colorOptions.length - shown.length;
  const optionsLabel =
    mode === 'single' ? 'Quantity' : (propertyNames || []).filter(Boolean).join(' · ') || 'Options';

  return (
    <PressableScale onPress={onOpen} scaleTo={0.98} style={styles.preview}>
      <View style={styles.previewHeader}>
        <View style={styles.previewIcon}>
          <Icon name="color-palette" size={16} color={colors.white} />
        </View>
        <View style={styles.previewText}>
          <Text style={styles.previewTitle}>Select variants</Text>
          <Text style={styles.previewSub} numberOfLines={1}>
            {totalQuantity > 0
              ? `${totalQuantity} pc selected${selectedColor ? ` · ${getOptionValue(selectedColor)}` : ''}`
              : `Choose ${optionsLabel.toLowerCase()}`}
          </Text>
        </View>
        <Animated.View style={[styles.previewChevron, chevronStyle]}>
          <Icon name="chevron-up" size={16} color={colors.primary} />
        </Animated.View>
      </View>

      {colorOptions.length > 0 ? (
        <View style={styles.previewSwatches} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
          {shown.map((option, index) => (
            <Animated.View key={option.properties} entering={FadeInRight.delay(index * 50)} style={styles.previewSwatch}>
              {option.url ? (
                <Image source={{ uri: thumbImage(option.url) }} style={styles.previewSwatchImage} />
              ) : (
                <Text style={styles.previewSwatchText} numberOfLines={2}>
                  {getOptionValue(option)}
                </Text>
              )}
              {pickedColors.has(option.properties) ? (
                <View style={styles.previewPicked}>
                  <Icon name="checkmark" size={9} color={colors.white} />
                </View>
              ) : null}
            </Animated.View>
          ))}
          {hidden > 0 ? (
            <View style={[styles.previewSwatch, styles.previewMore]}>
              <Text style={styles.previewMoreText} numberOfLines={1} adjustsFontSizeToFit>
                +{hidden}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </PressableScale>
  );
};

/** Seller name, rating and a link to the store, on a dark brand card. */
export const SellerCard = ({ name, rating, onViewStore, wishlisted, onWishlist }) => (
  <View>
    <LinearGradient colors={['#262a4a', '#1a1d33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.seller}>
      <View style={styles.sellerAvatar}>
        <Icon name="storefront" size={22} color="#1f2340" />
      </View>
      <View style={styles.sellerText}>
        <Text style={styles.sellerLabel}>Seller</Text>
        <Text style={styles.sellerName} numberOfLines={1}>
          {name}
        </Text>
        {rating ? (
          <View style={styles.sellerRating}>
            <Stars rating={Number(rating) || 0} size={11} />
            <Text style={styles.sellerRatingText}>{rating}</Text>
          </View>
        ) : null}
      </View>
      <PressableScale onPress={onViewStore} scaleTo={0.92} style={styles.visitStore}>
        <Text style={styles.visitStoreText}>View Store</Text>
        <Icon name="arrow-forward" size={13} color="#1f2340" />
      </PressableScale>
    </LinearGradient>
    <PressableScale onPress={onWishlist} scaleTo={0.96} style={styles.wishlistButton}>
      <Icon name={wishlisted ? 'heart' : 'heart-outline'} size={17} color={colors.primary} />
      <Text style={styles.wishlistText}>{wishlisted ? 'In your wishlist' : 'Add To WishList'}</Text>
    </PressableScale>
  </View>
);

const PROMISE_STYLE = [
  { icon: 'chatbubbles', tint: '#eef2ff', color: '#4f5bd5' },
  { icon: 'pricetags', tint: '#fff4dd', color: '#e08a00' },
  { icon: 'navigate', tint: '#e6f7ef', color: '#0e9a72' },
  { icon: 'shield-checkmark', tint: '#ffe8e8', color: colors.primary },
  { icon: 'airplane', tint: '#e8f4ff', color: '#2563eb' },
  { icon: 'cash', tint: '#f3edff', color: '#7a4cf5' },
  { icon: 'refresh-circle', tint: '#ffeef5', color: '#db2777' },
];

/** The web's service promises as a two-column grid of icon tiles. */
export const PromiseGrid = ({ promises }) => (
  <View style={styles.promises}>
    {promises.map((promise, index) => {
      const look = PROMISE_STYLE[index % PROMISE_STYLE.length];
      return (
        <Animated.View key={promise} entering={FadeIn.delay(index * 60)} style={styles.promise}>
          <View style={[styles.promiseIcon, { backgroundColor: look.tint }]}>
            <Icon name={look.icon} size={16} color={look.color} />
          </View>
          <Text style={styles.promiseText}>{promise}</Text>
        </Animated.View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  stars: { flexDirection: 'row' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statWrap: { flex: 1 },
  stat: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 14, backgroundColor: '#f8f8fb' },
  statIcon: { width: 28, height: 28, borderRadius: 9, marginRight: 7, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted },
  priceCard: { marginTop: 14 },
  priceGradient: { padding: 14, borderRadius: 18, overflow: 'hidden' },
  shine: { position: 'absolute', top: -40, bottom: -40, width: 60, backgroundColor: 'rgba(255,255,255,0.35)' },
  priceTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  priceCaption: { fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: '#b0473f' },
  price: { marginTop: 2, fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  perUnit: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  perUnitText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#b0473f' },
  // All tiers share one row, splitting its width evenly.
  tiers: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tier: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierActive: { backgroundColor: colors.white, borderColor: colors.primary },
  tierTick: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPrice: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  tierPriceActive: { color: colors.primary },
  tierQty: { marginTop: 2, fontSize: 10.5, color: colors.textSecondary },
  tierQtyActive: { color: colors.text, fontWeight: typography.weight.semiBold },
  tierHint: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tierHintText: { flex: 1, marginLeft: 5, fontSize: typography.size.xs, color: '#0e7a52' },
  moqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  moqChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: '#ecfaf2' },
  moqText: { marginLeft: 5, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.success },
  moqHint: { marginTop: 4, fontSize: typography.size.xs, color: colors.textMuted },
  preview: { padding: 14, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#ffd9d3' },
  previewHeader: { flexDirection: 'row', alignItems: 'center' },
  previewIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1, marginHorizontal: 10 },
  previewTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.text },
  previewSub: { marginTop: 1, fontSize: typography.size.xs + 1, color: colors.textSecondary },
  previewChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  previewSwatches: { flexDirection: 'row', gap: SWATCH_GAP, marginTop: 12, overflow: 'hidden' },
  previewSwatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 12,
    backgroundColor: '#f6f6f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSwatchImage: { width: 44, height: 44, borderRadius: 12 },
  previewSwatchText: { fontSize: 8.5, color: colors.textSecondary, textAlign: 'center', padding: 2 },
  previewPicked: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: '#0e9a72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMore: { backgroundColor: colors.primarySoft },
  previewMoreText: { paddingHorizontal: 3, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  seller: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18 },
  sellerAvatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#ffc23d', alignItems: 'center', justifyContent: 'center' },
  sellerText: { flex: 1, marginHorizontal: 10 },
  sellerLabel: { fontSize: 10, fontWeight: typography.weight.bold, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.6, textTransform: 'uppercase' },
  sellerName: { marginTop: 1, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.white },
  sellerRating: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  sellerRatingText: { marginLeft: 4, fontSize: typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  visitStore: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: '#ffc23d' },
  visitStoreText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: '#1f2340' },
  wishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#f3d9d5',
  },
  wishlistText: { marginLeft: 6, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  promises: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  promise: { width: '48.5%', padding: 10, borderRadius: 14, backgroundColor: '#fafafc' },
  promiseIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  promiseText: { fontSize: typography.size.xs, lineHeight: 16, color: colors.textSecondary },
});

