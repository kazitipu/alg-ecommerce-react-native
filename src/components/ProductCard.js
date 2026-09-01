import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Skeleton from './Skeleton';
import { formatPrice, toTaka, truncate } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Grid tile used by the home rails, collection grid and search results.
 *
 * Prices from the 1688 API are in CNY, so they must be converted with the
 * `Currency/taka` rate before being shown with a Tk label — the same
 * `salePrice * taka` the web card does. Without a rate loaded yet the raw
 * figure is shown rather than a misleading zero.
 */
const ProductCard = ({ product, onPress, width, symbol, taka }) => {
  const image = product?.pictures?.[0] || product?.pic_url || product?.picture;
  const rawPrice = product?.salePrice ?? product?.price;
  const rate = parseFloat(taka);
  const price = Number.isFinite(rate) && rate > 0 ? toTaka(rawPrice, rate) : rawPrice;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, width ? { width } : null, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Skeleton width="100%" height="100%" borderRadius={0} />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {truncate(product?.name || product?.title, 48)}
        </Text>
        <Text style={styles.price}>{formatPrice(price, symbol)}</Text>
        {product?.orders ? (
          <Text style={styles.meta}>{product.orders} sold</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

/** Matching placeholder so grids do not reflow when results arrive. */
export const ProductCardSkeleton = ({ width }) => (
  <View style={[styles.card, width ? { width } : null]}>
    <Skeleton width="100%" height={140} borderRadius={0} />
    <View style={styles.body}>
      <Skeleton width="90%" height={12} style={styles.skeletonLine} />
      <Skeleton width="60%" height={12} style={styles.skeletonLine} />
      <Skeleton width="40%" height={14} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.9 },
  imageWrap: {
    height: 140,
    backgroundColor: colors.surfaceAlt,
  },
  image: { width: '100%', height: '100%' },
  body: { padding: spacing.sm },
  name: {
    fontSize: typography.size.sm,
    color: colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  price: {
    marginTop: spacing.xs,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  meta: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  skeletonLine: { marginBottom: spacing.xs },
});

export default ProductCard;
