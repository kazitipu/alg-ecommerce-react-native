import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import {
  BottomSheet,
  Button,
  EmptyState,
  MediaActions,
  QtyStepper,
  Skeleton,
} from '../../components';
import { fetchLegacyProduct, fetchProduct, fetchShipping } from '../../api';
import {
  addToCart,
  addToPendingOrdersRedux,
  addToWishlist,
  setSearchedProductDetail,
} from '../../actions';
import { addWishlistTofirestore } from '../../firebase/firebase.utils';
import { useAuth, useAuthGuard, useDebouncedValue } from '../../hooks';
import {
  buildSelectedSkus,
  findVariant,
  getColorImage,
  getColors,
  getSelectedQuantity,
  getSizes,
  getTotalAvailableQuantity,
} from '../../utils/sku';
import { getTierPriceInTaka, parsePriceRange } from '../../utils/priceTiers';
import { adaptProduct } from '../../utils/adaptProduct';
import { formatPrice, truncate } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { DEFAULTS } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Product detail — the app's counterpart to the web's 4,600-line
 * `details-price-1688.jsx`.
 *
 * The pricing model is the important part: 1688 sells on quantity tiers, so the
 * unit price depends on the *total* selected across every variant, and crossing
 * a threshold re-prices the whole line. Some listings also sell only in packs
 * (`batch`), which the quantity stepper enforces.
 */
const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const requireAuth = useAuthGuard();
  const { currentUser } = useAuth();

  const currency = useSelector(state => state.user.currency);
  const symbol = useSelector(state => state.data.symbol);

  const productId = route.params?.id;
  // Set for the /1688/:id and /taobao/:id entry points, which read from the
  // legacy detail proxy rather than the newer product endpoint.
  const source = route.params?.source;
  const [item, setItem] = useState(route.params?.product || null);
  const [loading, setLoading] = useState(!route.params?.product);
  const [failed, setFailed] = useState(false);

  // Quantities keyed by variant `properties`, as the web app stored them.
  const [quantities, setQuantities] = useState({});
  const [activeColor, setActiveColor] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shipping, setShipping] = useState(null);

  const taka = currency?.taka || 0;

  // Always refetch: the card that navigated here carries only a search summary,
  // without props_list, variants or price_range.
  useEffect(() => {
    let active = true;
    if (!productId) return undefined;

    setLoading(true);

    const request = source
      ? fetchLegacyProduct(productId, source).then(data => {
          // Keep Redux in step, as the web screens did, then adapt for render.
          dispatch(setSearchedProductDetail(data, source));
          return adaptProduct(data, source);
        })
      : fetchProduct(productId).then(data => data?.product || data?.item || data);

    request
      .then(product => {
        if (!active) return;
        if (product && (product.num_iid || product.id)) setItem(product);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [productId, source, dispatch]);

  const colorOptions = useMemo(() => getColors(item), [item]);
  const sizeOptions = useMemo(() => getSizes(item), [item]);
  const priceRange = useMemo(() => parsePriceRange(item?.price_range), [item]);
  const totalAvailable = useMemo(() => getTotalAvailableQuantity(item), [item]);

  const selectedQuantity = getSelectedQuantity(quantities);

  /** Unit price for the tier the current total lands in. */
  const unitPrice = useMemo(() => {
    if (priceRange.length > 0) {
      return getTierPriceInTaka(priceRange, selectedQuantity || 1, taka);
    }
    const base = parseFloat(item?.price ?? item?.salePrice ?? 0) || 0;
    return Math.round(base * (parseFloat(taka) || 0));
  }, [priceRange, selectedQuantity, taka, item]);

  const goodsTotal = unitPrice * selectedQuantity;

  // Shipping is quoted by the backend and depends on the chosen SKUs, so the
  // request is debounced exactly as the web app debounced it (1s via lodash).
  const debouncedQuantity = useDebouncedValue(selectedQuantity, 1000);

  useEffect(() => {
    if (!item || debouncedQuantity <= 0) {
      setShipping(null);
      return undefined;
    }

    let active = true;
    const skus = buildSelectedSkus(item, quantities, unitPrice);

    fetchShipping({
      productId: item.num_iid || item.id,
      totalQuantity: debouncedQuantity,
      skus,
    })
      .then(data => active && setShipping(data))
      .catch(() => active && setShipping(null));

    return () => {
      active = false;
    };
    // `quantities` is intentionally excluded: the debounced total is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, debouncedQuantity, unitPrice]);

  const setVariantQuantity = useCallback((properties, quantity) => {
    setQuantities(previous => {
      const next = { ...previous };
      if (quantity > 0) next[properties] = quantity;
      else delete next[properties];
      return next;
    });
  }, []);

  const images = useMemo(() => {
    if (!item) return [];
    const gallery = item.pictures || item.item_imgs?.map(image => image.url) || [];
    return [item.pic_url, ...gallery].filter(Boolean);
  }, [item]);

  const buildCartPayload = () => {
    const skus = buildSelectedSkus(item, quantities, unitPrice);
    if (skus.length === 0) {
      notifyError('Please choose at least one option first.');
      return null;
    }

    return {
      shopId: item.shop_id || item.seller_info?.sid,
      shopName: item.shop_name || item.seller_info?.shop_name,
      localShipping: item.localShipping || 0,
      currency: taka,
      items: [
        {
          id: item.num_iid || item.id,
          name: item.title || item.name,
          detail_url: item.detail_url,
          picture: images[0],
          price_range: item.price_range,
          batch: item.batch || 1,
          weight: item.item_weight,
          shippingRate: item.shippingRate || DEFAULTS.shippingRate,
          productType: item.productType,
          propertyNames: item.props_name,
          skus,
        },
      ],
    };
  };

  const handleAddToCart = () =>
    requireAuth(async () => {
      const payload = buildCartPayload();
      if (!payload) return;
      await dispatch(addToCart(currentUser, payload));
      notifySuccess('Added to your cart');
      setPickerVisible(false);
    });

  /** Buy now skips the cart entirely, as on the web. */
  const handleBuyNow = () =>
    requireAuth(async () => {
      const payload = buildCartPayload();
      if (!payload) return;
      await dispatch(addToPendingOrdersRedux([payload]));
      setPickerVisible(false);
      navigation.navigate(ROUTES.PLACE_ORDER);
    });

  const handleWishlist = () =>
    requireAuth(async () => {
      dispatch(addToWishlist(item));
      await addWishlistTofirestore(currentUser, item);
    });

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <Skeleton width={SCREEN_WIDTH} height={SCREEN_WIDTH} borderRadius={0} />
        <View style={styles.section}>
          <Skeleton width="60%" height={22} style={styles.skeletonLine} />
          <Skeleton width="90%" height={16} style={styles.skeletonLine} />
          <Skeleton width="40%" height={16} />
        </View>
      </ScrollView>
    );
  }

  if (failed || !item) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Product unavailable"
        message="We could not load this product. It may have been removed from the marketplace."
        actionLabel="Go back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          renderItem={({ item: uri, index }) => (
            <Pressable
              onPress={() =>
                navigation.navigate(ROUTES.GALLERY, { images, initialIndex: index })
              }>
              <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
            </Pressable>
          )}
        />

        <View style={styles.section}>
          <Text style={styles.title}>{item.title || item.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(unitPrice, symbol)}</Text>
            <Text style={styles.priceUnit}>per unit</Text>
          </View>

          {priceRange.length > 0 ? (
            <View style={styles.tiers}>
              <Text style={styles.tiersLabel}>Bulk pricing</Text>
              <View style={styles.tierRow}>
                {priceRange.map((tier, index) => (
                  <View key={index} style={styles.tier}>
                    <Text style={styles.tierQty}>
                      {index === 0 ? `1+` : `${tier[0]}+`}
                    </Text>
                    <Text style={styles.tierPrice}>
                      {formatPrice(Math.round(parseFloat(tier[1]) * (parseFloat(taka) || 0)), symbol)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.tiersHint}>
                The price drops for the whole order as your total quantity grows.
              </Text>
            </View>
          ) : null}

          {item.shop_name || item.seller_info?.shop_name ? (
            <Pressable
              style={styles.shopRow}
              onPress={() =>
                navigation.navigate(ROUTES.VENDOR_PRODUCTS, {
                  vendorId: item.shop_id || item.seller_info?.sid,
                  title: item.shop_name || item.seller_info?.shop_name,
                })
              }>
              <Icon name="storefront-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.shopName} numberOfLines={1}>
                {truncate(item.shop_name || item.seller_info?.shop_name, 40)}
              </Text>
              <Icon name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <View style={styles.metaRow}>
            {item.batch > 1 ? (
              <Text style={styles.metaChip}>Packs of {item.batch}</Text>
            ) : null}
            {totalAvailable > 0 ? (
              <Text style={styles.metaChip}>{totalAvailable} available</Text>
            ) : null}
            {item.total_sold ? (
              <Text style={styles.metaChip}>{item.total_sold} sold</Text>
            ) : null}
          </View>

          <View style={styles.mediaActions}>
            <MediaActions product={item} images={images} />
          </View>
        </View>

        {selectedQuantity > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your selection</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{selectedQuantity} items</Text>
              <Text style={styles.summaryValue}>{formatPrice(goodsTotal, symbol)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>China shipping (approx.)</Text>
              <Text style={styles.summaryValue}>
                {shipping === null
                  ? 'Calculating…'
                  : shipping?.freePostage
                  ? 'Free'
                  : shipping?.freight
                  ? formatPrice(Math.round(shipping.freight * (parseFloat(taka) || 0)), symbol)
                  : 'Added later'}
              </Text>
            </View>
          </View>
        ) : null}

        {item.desc ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{truncate(String(item.desc).replace(/<[^>]+>/g, ' '), 600)}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bar}>
        <Pressable style={styles.wishButton} onPress={handleWishlist} hitSlop={8}>
          <Icon name="heart-outline" size={24} color={colors.primary} />
        </Pressable>

        <Button
          title="Add to cart"
          variant="secondary"
          onPress={() => setPickerVisible(true)}
          style={styles.barButton}
        />
        <Button title="Buy now" onPress={() => setPickerVisible(true)} style={styles.barButton} />
      </View>

      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Choose options"
        fullHeight>
        <VariantPicker
          item={item}
          colorOptions={colorOptions}
          sizeOptions={sizeOptions}
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          quantities={quantities}
          onChangeQuantity={setVariantQuantity}
          symbol={symbol}
          unitPrice={unitPrice}
        />

        <View style={styles.sheetSummary}>
          <Text style={styles.summaryLabel}>
            {selectedQuantity} items · {formatPrice(goodsTotal, symbol)}
          </Text>
        </View>

        <View style={styles.sheetActions}>
          <Button
            title="Add to cart"
            variant="secondary"
            onPress={handleAddToCart}
            style={styles.barButton}
          />
          <Button title="Buy now" onPress={handleBuyNow} style={styles.barButton} />
        </View>
      </BottomSheet>
    </View>
  );
};

/**
 * Colour swatches plus a per-size quantity row.
 *
 * When a listing has both dimensions the user picks a colour first and then
 * sets a quantity per size; a colour-only listing shows one row per colour.
 * Sizes the seller does not stock for the chosen colour are disabled.
 */
const VariantPicker = ({
  item,
  colorOptions,
  sizeOptions,
  activeColor,
  onSelectColor,
  quantities,
  onChangeQuantity,
  symbol,
  unitPrice,
}) => {
  const selectedColor = activeColor || colorOptions[0]?.properties;
  const hasSizes = sizeOptions.length > 0;

  if (colorOptions.length === 0 && !hasSizes) {
    // A listing with a single implicit variant.
    const only = item.variants?.[0];
    if (!only) return <Text style={styles.emptyVariants}>No options available.</Text>;
    return (
      <View style={styles.variantRow}>
        <Text style={styles.variantLabel}>Quantity</Text>
        <QtyStepper
          value={quantities[only.properties] || 0}
          onChange={quantity => onChangeQuantity(only.properties, quantity)}
          batch={item.batch || 1}
          available={parseInt(only.quantity, 10)}
        />
      </View>
    );
  }

  return (
    <View>
      {colorOptions.length > 0 ? (
        <>
          <Text style={styles.pickerLabel}>Colour</Text>
          <View style={styles.swatches}>
            {colorOptions.map(option => {
              const image = option.url || getColorImage(item, option.properties);
              const active = option.properties === selectedColor;
              return (
                <Pressable
                  key={option.properties}
                  onPress={() => onSelectColor(option.properties)}
                  style={[styles.swatch, active && styles.swatchActive]}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.swatchImage} />
                  ) : (
                    <Text style={styles.swatchText} numberOfLines={1}>
                      {option.value}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.pickerLabel}>{hasSizes ? 'Size and quantity' : 'Quantity'}</Text>

      {hasSizes ? (
        sizeOptions.map(size => {
          const sizeProperties = Object.keys(size)[0];
          const variant = findVariant(item, selectedColor, sizeProperties);
          const stock = parseInt(variant?.quantity, 10) || 0;

          return (
            <View key={sizeProperties} style={styles.variantRow}>
              <View style={styles.variantInfo}>
                <Text style={styles.variantLabel}>{size[sizeProperties]}</Text>
                <Text style={styles.variantStock}>
                  {variant ? `${stock} in stock` : 'Unavailable'}
                </Text>
              </View>

              <QtyStepper
                value={variant ? quantities[variant.properties] || 0 : 0}
                onChange={quantity => onChangeQuantity(variant.properties, quantity)}
                batch={item.batch || 1}
                available={stock}
                disabled={!variant || stock === 0}
              />
            </View>
          );
        })
      ) : (
        colorOptions.map(option => {
          const variant = findVariant(item, option.properties, null);
          const stock = parseInt(variant?.quantity, 10) || 0;

          return (
            <View key={option.properties} style={styles.variantRow}>
              <View style={styles.variantInfo}>
                <Text style={styles.variantLabel}>{option.value}</Text>
                <Text style={styles.variantStock}>
                  {variant ? `${stock} in stock` : 'Unavailable'}
                </Text>
              </View>

              <QtyStepper
                value={variant ? quantities[variant.properties] || 0 : 0}
                onChange={quantity => onChangeQuantity(variant.properties, quantity)}
                batch={item.batch || 1}
                available={stock}
                disabled={!variant || stock === 0}
              />
            </View>
          );
        })
      )}

      <Text style={styles.unitHint}>Current unit price: {formatPrice(unitPrice, symbol)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  scrollContent: { paddingBottom: 96 },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.surfaceAlt,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    color: colors.text,
    lineHeight: 24,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  price: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  priceUnit: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  tiers: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  tiersLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tier: { minWidth: 70 },
  tierQty: { fontSize: typography.size.xs, color: colors.textSecondary },
  tierPrice: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  tiersHint: {
    marginTop: spacing.xs,
    fontSize: typography.size.xxs,
    color: colors.textSecondary,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  shopName: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  mediaActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metaChip: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  summaryValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  wishButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barButton: { flex: 1 },
  pickerLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  swatchActive: { borderColor: colors.primary },
  swatchImage: { width: '100%', height: '100%' },
  swatchText: { fontSize: typography.size.xxs, color: colors.textSecondary, padding: 2 },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  variantInfo: { flex: 1, marginRight: spacing.md },
  variantLabel: { fontSize: typography.size.sm, color: colors.text },
  variantStock: { fontSize: typography.size.xs, color: colors.textMuted },
  emptyVariants: { fontSize: typography.size.sm, color: colors.textMuted },
  unitHint: {
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  sheetSummary: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  skeletonLine: { marginBottom: spacing.sm },
});

export default ProductDetailScreen;
