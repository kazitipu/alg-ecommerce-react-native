import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import PressableScale from './PressableScale';
import Shimmer from './Shimmer';
import { DEFAULTS } from '../constants/config';
import { formatPrice, toTaka } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme';

export const TILE_WIDTH = 164;
// Card padding (6) plus frame padding (6) on each side of the image.
const IMAGE_INSET = 24;
const ROW_IMAGE = 112;

/** Pastel frames cycled by position, each with a white stitched edge. */
const FRAMES = ['#dcefff', '#fff0bf', '#ebe3ff', '#d9f6e6', '#ffdfe2'];

const BADGE_STYLES = {
  topRated: { label: 'Top Rated', background: '#fff1df', color: '#ef8a00' },
  highRated: { label: 'High Rated', background: '#ddf6ee', color: '#0e9a72' },
  bestSeller: { label: 'Best Seller', background: '#ffe2e2', color: '#e5383b' },
  popular: { label: 'Popular', background: '#efe6ff', color: '#7a4cf5' },
};

const compactCount = value => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
};

/**
 * Badges earned from the product's own numbers — never invented: rating for
 * Top/High Rated, units sold for Best Seller, and the 1688 repurchase rate for
 * Popular. At most two are shown.
 */
const getBadges = ({ rating, sold, repurchaseRate }) => {
  const badges = [];
  if (rating >= 4.5) badges.push(BADGE_STYLES.topRated);
  else if (rating >= 4) badges.push(BADGE_STYLES.highRated);
  if (sold >= 1000) badges.push(BADGE_STYLES.bestSeller);
  if (repurchaseRate >= 30) badges.push(BADGE_STYLES.popular);
  return badges.slice(0, 2);
};

/** Five small stars, half-filled where the rating falls between two. */
const Stars = ({ rating }) => (
  <View style={styles.stars}>
    {[0, 1, 2, 3, 4].map(index => {
      const name =
        rating >= index + 1 ? 'star' : rating > index ? 'star-half' : 'star-outline';
      return <Icon key={index} name={name} size={10} color="#ffa41b" />;
    })}
  </View>
);

const DeliveryChip = ({ style }) => (
  <View style={[styles.delivery, style]}>
    <Icon name="airplane" size={11} color="#2f3e9e" />
    <Text style={styles.deliveryText}>{DEFAULTS.deliveryEstimate}</Text>
  </View>
);

/**
 * The app's product card, shared by the home rails and the product list.
 * The image sits in a pastel "stitched" frame with the delivery estimate
 * pinned to it, followed by name, rating and sales, earned badges and the
 * price in Tk (`salePrice × taka`, as on the web).
 *
 * `layout="grid"` is a vertical tile `width` wide; `layout="row"` lays the
 * image beside the details for list views.
 */
const ProductTile = ({
  product,
  index = 0,
  width = TILE_WIDTH,
  layout = 'grid',
  symbol,
  taka,
  wishlisted,
  onPress,
  onPressIn,
  onWishlist,
}) => {
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  const isRow = layout === 'row';
  const imageSize = isRow ? ROW_IMAGE : width - IMAGE_INSET;
  const image = product?.pictures?.[0] || product?.pic_url || product?.picture;
  const rawPrice = product?.salePrice ?? product?.price;
  const rate = parseFloat(taka);
  const price = Number.isFinite(rate) && rate > 0 ? toTaka(rawPrice, rate) : rawPrice;
  const soldCount = Number(product?.totalSold ?? product?.orders) || 0;
  const sold = compactCount(soldCount);
  const rating = Number(product?.rating) || 0;
  const badges = getBadges({
    rating,
    sold: soldCount,
    repurchaseRate: parseFloat(product?.repurchaseRate) || 0,
  });

  const onHeart = () => {
    heart.value = withSequence(withSpring(1.4, { damping: 6 }), withSpring(1, { damping: 10 }));
    onWishlist?.();
  };

  return (
    <PressableScale
      onPress={onPress}
      onPressIn={onPressIn}
      scaleTo={0.97}
      style={[styles.card, isRow ? styles.cardRow : { width }]}>
      <View style={[styles.frame, { backgroundColor: FRAMES[index % FRAMES.length] }]}>
        <View pointerEvents="none" style={styles.stitch} />
        <View style={[styles.imageWrap, { width: imageSize, height: imageSize }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          ) : (
            <Shimmer style={StyleSheet.absoluteFill} borderRadius={0} />
          )}
        </View>

        <Pressable
          onPress={onHeart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add to wishlist"
          style={[styles.heart, isRow && styles.heartSmall]}>
          <Animated.View style={heartStyle}>
            <Icon
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={isRow ? 14 : 16}
              color={wishlisted ? colors.primary : colors.text}
            />
          </Animated.View>
        </Pressable>

        {isRow ? null : <DeliveryChip style={styles.deliveryOnImage} />}
      </View>

      <View style={[styles.body, isRow && styles.bodyRow]}>
        <Text style={styles.name} numberOfLines={2}>
          {product?.name || product?.title}
        </Text>

        <View style={styles.meta}>
          {rating > 0 ? <Stars rating={rating} /> : null}
          {sold ? <Text style={styles.metaText}>{sold} sold</Text> : null}
        </View>

        <View style={styles.badges}>
          {badges.map(badge => (
            <Text
              key={badge.label}
              style={[styles.badge, { backgroundColor: badge.background, color: badge.color }]}>
              {badge.label}
            </Text>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(price, symbol)}
          </Text>
          {isRow ? <DeliveryChip /> : null}
        </View>
      </View>
    </PressableScale>
  );
};

/** Same footprint as the tile, with a sweeping shimmer while products load. */
export const ProductTileSkeleton = ({ index = 0, width = TILE_WIDTH, layout = 'grid' }) => {
  const isRow = layout === 'row';
  const imageSize = isRow ? ROW_IMAGE : width - IMAGE_INSET;

  return (
    <View style={[styles.card, isRow ? styles.cardRow : { width }]}>
      <View style={[styles.frame, { backgroundColor: FRAMES[index % FRAMES.length] }]}>
        <Shimmer style={{ width: imageSize, height: imageSize }} borderRadius={12} color="#ffffff" />
      </View>
      <View style={[styles.body, isRow && styles.bodyRow]}>
        <Shimmer style={styles.skeletonLine} />
        <Shimmer style={[styles.skeletonLine, styles.skeletonShort]} />
        <View style={styles.skeletonRow}>
          <Shimmer style={styles.skeletonPill} borderRadius={10} />
          <Shimmer style={styles.skeletonPill} borderRadius={10} />
        </View>
        <Shimmer style={styles.skeletonPrice} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 6,
    borderRadius: 22,
    backgroundColor: colors.surface,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  frame: { padding: 6, borderRadius: 18 },
  // A dashed white line inset in the frame gives the stitched-label look.
  stitch: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.white,
  },
  imageWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  image: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartSmall: { top: 9, right: 9, width: 26, height: 26 },
  delivery: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryOnImage: { position: 'absolute', left: 2, bottom: 14 },
  deliveryText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: '#2f3e9e',
  },
  body: { paddingHorizontal: 4, paddingTop: spacing.sm, paddingBottom: 2 },
  bodyRow: { flex: 1, paddingLeft: spacing.sm + 4, paddingTop: 0 },
  name: {
    fontSize: typography.size.sm - 1,
    color: colors.text,
    lineHeight: 16,
    minHeight: 32,
  },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 5, minHeight: 14 },
  stars: { flexDirection: 'row', marginRight: 5 },
  metaText: { fontSize: typography.size.xxs + 1, color: colors.textSecondary },
  badges: { flexDirection: 'row', marginTop: 6, minHeight: 19 },
  badge: {
    marginRight: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
    fontSize: 9.5,
    fontWeight: typography.weight.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  price: {
    flexShrink: 1,
    marginRight: 6,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.primary,
  },
  skeletonLine: { height: 11, marginBottom: 7 },
  skeletonShort: { width: '65%' },
  skeletonRow: { flexDirection: 'row', marginBottom: 9 },
  skeletonPill: { width: 54, height: 17, marginRight: 6 },
  skeletonPrice: { width: '50%', height: 17 },
});

export default ProductTile;
