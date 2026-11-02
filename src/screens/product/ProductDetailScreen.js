import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import InfoTabs from './components/InfoTabs';
import ProductGallery from './components/ProductGallery';
import HowItWorks from './components/HowItWorks';
import ShippingCard from './components/ShippingCard';
import VariantDrawer from './components/VariantDrawer';
import { PriceCard, PromiseGrid, SellerCard, StatsRow, VariantPreview } from './components/ProductSections';
import { BottomActionBar, CardMotion, MediaActions, ProductTile, Shimmer } from '../../components';
import PressableScale from '../../components/PressableScale';
import { useHideSupportFab } from '../../components/SupportFab';
import { fetchCategory, fetchLegacyProduct, fetchProduct, fetchShipping } from '../../api';
import { withRetry } from '../../utils/cache';
import { addToCart, addToPendingOrdersRedux, setSearchedProductDetail } from '../../actions';
import { get1688Category } from '../../firebase/firebase.utils';
import { useAuth, useDarkStatusBar, useDebouncedValue, useWishlistSave } from '../../hooks';
import { adaptProduct } from '../../utils/adaptProduct';
import { selectCartCount } from '../../utils/cartCount';
import { formatPrice } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { getColors } from '../../utils/sku';
import {
  DEFAULT_SHIPPING_RATE,
  SERVICE_PROMISES,
  buildOrderEntry,
  buildShippingSkus,
  computeTotals,
  getCategoryRef,
  getFreightEstimate,
  getRelatedProducts,
  getSelectionMode,
  getWeight,
  isShippingPending,
  parseLocalShipping,
  skuPriceInTaka,
  validateOrder,
} from '../../utils/productDetail';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';
import { appAlert } from '../../utils/appAlert';


/** A white rounded section card with an optional icon title. */
const Section = ({ title, icon, children, delay = 0, style }) => (
  <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={[styles.section, style]}>
    {title ? (
      <View style={styles.sectionHeader}>
        {icon ? (
          <View style={styles.sectionIcon}>
            <Icon name={icon} size={15} color={colors.primary} />
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    ) : null}
    {children}
  </Animated.View>
);

const RoundButton = ({ icon, onPress, label, badge, tint }) => (
  <PressableScale onPress={onPress} scaleTo={0.88} hitSlop={6} accessibilityLabel={label} style={styles.round}>
    <Icon name={icon} size={19} color={tint || colors.text} />
    {badge ? (
      <View style={styles.roundBadge}>
        <Text style={styles.roundBadgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    ) : null}
  </PressableScale>
);

const LoadingState = ({ width, insetTop }) => (
  <View style={styles.container}>
    <Shimmer style={{ width, height: width }} borderRadius={0} />
    <View style={[styles.floatingBack, { top: insetTop + 6 }]} />
    <View style={styles.section}>
      <Shimmer style={styles.skeletonTitle} />
      <Shimmer style={[styles.skeletonTitle, styles.skeletonShort]} />
      <Shimmer style={styles.skeletonPrice} />
      <View style={styles.skeletonRow}>
        <Shimmer style={styles.skeletonChip} borderRadius={10} />
        <Shimmer style={styles.skeletonChip} borderRadius={10} />
        <Shimmer style={styles.skeletonChip} borderRadius={10} />
      </View>
    </View>
    <View style={styles.section}>
      <Shimmer style={styles.skeletonBlock} borderRadius={14} />
    </View>
  </View>
);

/**
 * Product detail, implementing the web product page's behaviour
 * (`details-price-1688.jsx`): media with video, quantity-tier pricing, colour /
 * size tables with per-SKU prices, the China local courier quote, the
 * category-based customs & shipping rate, the CN → BD cost calculator, MOQ and
 * order checks, cart and buy-now entries in the web's format, seller details,
 * specifications / overview / reviews and similar products.
 */
const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser, isSignedIn } = useAuth();
  const { wishlistIds, saveToWishlist } = useWishlistSave();
  useDarkStatusBar();
  // The order bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const taka = useSelector(state => state.user.currency?.taka) || 0;
  const symbol = useSelector(state => state.data.symbol);
  const cartCount = useSelector(state => selectCartCount(state.cartList.cart));

  const productId = route.params?.id;
  // Set for the /1688/:id and /taobao/:id entry points, which read from the
  // legacy detail proxy rather than the newer product endpoint.
  const source = route.params?.source;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [quantities, setQuantities] = useState({});
  const [singleQuantity, setSingleQuantity] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [colorImage, setColorImage] = useState(null);
  const [localShipping, setLocalShipping] = useState(null);
  const [category, setCategory] = useState(null);
  const [productType, setProductType] = useState('');
  const [shippingRate, setShippingRate] = useState(0);
  const [missingInfo, setMissingInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The variant drawer is hidden until Add to Cart / Buy Now (or the variants card) opens it.
  const [drawer, setDrawer] = useState({ visible: false, action: null });

  useEffect(() => {
    let active = true;
    if (!productId) return undefined;

    setLoading(true);
    // The product API fails now and then; retry before calling it unavailable.
    // An answer without a product counts as a failure so it is retried too.
    const request = withRetry(async () => {
      if (source) {
        const data = await fetchLegacyProduct(productId, source);
        const adapted = adaptProduct(data, source);
        if (!adapted || !(adapted.id || adapted.num_iid)) throw new Error('No product in the answer');
        dispatch(setSearchedProductDetail(data, source));
        return adapted;
      }
      const data = await fetchProduct(productId);
      const product = data?.product || data?.item || data;
      if (!product || !(product.id || product.num_iid)) throw new Error('No product in the answer');
      return product;
    });

    request
      .then(product => {
        if (!active) return;
        if (product && (product.id || product.num_iid)) setItem(product);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [productId, source, dispatch]);

  const colorOptions = useMemo(() => getColors(item), [item]);
  const mode = useMemo(() => getSelectionMode(item), [item]);

  // The first colour is pre-selected, as on the web.
  useEffect(() => {
    if (colorOptions.length > 0) setSelectedColor(colorOptions[0]);
  }, [colorOptions]);

  // Product type and customs & shipping rate come from the product's category:
  // the 1688 category API names it, and Firestore `1688Category` holds the rates.
  useEffect(() => {
    if (!item) return undefined;
    let active = true;
    const { categoryId, level } = getCategoryRef(item);
    if (!categoryId) {
      setProductType('Others');
      setShippingRate(DEFAULT_SHIPPING_RATE);
      return undefined;
    }

    Promise.all([
      get1688Category(level, categoryId).catch(() => undefined),
      fetchCategory({ categoryId }).catch(() => undefined),
    ]).then(([rateCategory, apiCategory]) => {
      if (!active) return;
      setCategory(rateCategory || null);
      setProductType(apiCategory?.category?.translatedName || 'Others');
      setShippingRate(rateCategory?.eleven || DEFAULT_SHIPPING_RATE);
    });

    return () => {
      active = false;
    };
  }, [item]);

  const totals = useMemo(
    () => computeTotals({ item, mode, quantities, singleQuantity, taka }),
    [item, mode, quantities, singleQuantity, taka],
  );

  // The China local courier quote is debounced by a second, like the web.
  const debouncedQuantity = useDebouncedValue(totals.totalQuantity, 1000);
  useEffect(() => {
    if (!item) return undefined;
    if (debouncedQuantity <= 0) {
      setLocalShipping({ kind: 'amount', amount: 0, forQuantity: debouncedQuantity });
      return undefined;
    }

    let active = true;
    setLocalShipping(null);
    fetchShipping({
      productId: item.id || item.num_iid,
      totalQuantity: debouncedQuantity,
      skus: buildShippingSkus(item, mode, quantities),
    })
      .then(data => active && setLocalShipping({ ...parseLocalShipping(data, taka), forQuantity: debouncedQuantity }))
      .catch(() => active && setLocalShipping({ kind: 'later', amount: 0, forQuantity: debouncedQuantity }));

    return () => {
      active = false;
    };
    // The debounced total is the trigger; `quantities` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, debouncedQuantity, mode, taka]);

  // Buy now / Add to cart wait until the courier quote matches the quantity
  // picked, including the debounce before it is even requested.
  const shippingPending = isShippingPending(localShipping, totals.totalQuantity);

  const images = useMemo(() => {
    if (!item) return [];
    const gallery = item.pictures || item.item_imgs?.map(image => image.url) || [];
    return [...new Set([item.pic_url, ...gallery].filter(Boolean))];
  }, [item]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [width * 0.45, width * 0.75], [0, 1], Extrapolation.CLAMP),
  }));

  const setVariantQuantity = useCallback((properties, quantity) => {
    setMissingInfo(false);
    setQuantities(previous => {
      const next = { ...previous };
      if (quantity > 0) next[properties] = quantity;
      else delete next[properties];
      return next;
    });
  }, []);

  const selectColor = option => {
    setSelectedColor(option);
    if (option.url) setColorImage(option.url);
  };

  const resetSelection = () => {
    setQuantities({});
    setSingleQuantity(0);
    setMissingInfo(false);
  };

  /** Runs the web's checks, then builds the entry; null when blocked. */
  const prepareOrder = () => {
    const problem = validateOrder({ item, totals, productType, shippingRate });
    if (problem?.type === 'alert') {
      appAlert('', problem.message);
      return null;
    }
    if (problem?.type === 'missing') {
      setMissingInfo(true);
      return null;
    }
    return buildOrderEntry({ item, mode, quantities, totals, taka, localShipping, shippingRate, productType });
  };

  // A second tap (common on a slow phone) would run after the selection has
  // been cleared and warn about an empty order on top of checkout.
  const leavingForCheckout = useRef(false);
  useFocusEffect(
    useCallback(() => {
      leavingForCheckout.current = false;
    }, []),
  );

  const handleBuyNow = () => {
    if (shippingPending || leavingForCheckout.current) return;
    const entry = prepareOrder();
    if (!entry) return;
    leavingForCheckout.current = true;
    dispatch(addToPendingOrdersRedux([entry]));
    setDrawer({ visible: false, action: null });
    // Checkout lives in the Cart tab; a product opened from Home, Categories
    // or Account is in another tab's stack, which has no PlaceOrder screen.
    navigation.navigate(ROUTES.TAB_CART, { screen: ROUTES.PLACE_ORDER, initial: false });
    resetSelection();
  };

  const handleAddToCart = async () => {
    if (submitting || shippingPending) return;
    const entry = prepareOrder();
    if (!entry) return;
    setSubmitting(true);
    try {
      await dispatch(addToCart(currentUser, { ...entry, currency: taka }));
      notifySuccess('Added to Cart');
      setDrawer({ visible: false, action: null });
      resetSelection();
    } catch (error) {
      notifyError(error, 'Could not add this to your cart.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDrawer = action => setDrawer({ visible: true, action });
  const closeDrawer = () => setDrawer(previous => ({ ...previous, visible: false }));
  const confirmDrawer = action => (action === 'buy' ? handleBuyNow() : handleAddToCart());

  const shareProduct = () =>
    Share.open({
      title: item?.name,
      message: `${item?.name || ''}\nhttps://alg.com.bd/product/${item?.id || productId}`,
      failOnCancel: false,
    }).catch(() => {});

  const openGallery = index => navigation.navigate(ROUTES.GALLERY, { images, initialIndex: index });

  if (loading) return <LoadingState width={width} insetTop={insets.top} />;

  if (failed || !item) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.failIcon}>
          <Icon name="cube-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.failTitle}>Product unavailable</Text>
        <Text style={styles.failText}>
          We could not load this product. It may have been removed from the marketplace.
        </Text>
        <PressableScale onPress={() => navigation.goBack()} scaleTo={0.95} style={styles.failButton}>
          <Text style={styles.failButtonText}>Go back</Text>
        </PressableScale>
      </View>
    );
  }

  const wishlisted = wishlistIds.has(item.id);
  const rating = Number(item.rating) || 0;
  const skuPrices = (item.variants || []).map(variant => skuPriceInTaka(variant, taka)).filter(Boolean);
  const minSku = skuPrices.length ? Math.min(...skuPrices) : 0;
  const maxSku = skuPrices.length ? Math.max(...skuPrices) : 0;
  const priceLabel =
    totals.tiers.length > 0
      ? formatPrice(totals.tierPrice, symbol)
      : mode === 'single'
        ? formatPrice(Math.round(parseFloat(item.price) * parseFloat(taka)), symbol)
        : `${formatPrice(minSku, symbol)}${maxSku > minSku ? ` – ${formatPrice(maxSku, symbol)}` : ''}`;
  const related = getRelatedProducts(item);
  // The web shows six similar products, and a second six only past twelve.
  const relatedShown = related.slice(0, related.length > 12 ? 12 : 6);
  const freight = getFreightEstimate(item, totals.totalQuantity, shippingRate);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <ProductGallery images={images} video={item.videos?.[0]} colorImage={colorImage} onOpenGallery={openGallery} />

        <Section delay={60}>
          <View style={styles.chipsRow}>
            <View style={styles.deliveryChip}>
              <Icon name="airplane" size={12} color="#2f3e9e" />
              <Text style={styles.deliveryText}>15–20 working days</Text>
            </View>
            {item.store ? <Text style={styles.storeChip}>{String(item.store).toUpperCase()}</Text> : null}
            {item.availability ? <Text style={styles.availabilityChip}>{item.availability}</Text> : null}
          </View>

          <Text style={styles.title}>{item.name || item.title}</Text>

          <StatsRow rating={rating} totalSold={item.totalSold} available={item.totalAvailableQuantity} />

          <PriceCard
            priceLabel={priceLabel}
            tiers={totals.tiers}
            tierIndex={totals.tierIndex}
            taka={taka}
            symbol={symbol}
            moq={item.moq}
            batch={item.batch}
            totalQuantity={totals.totalQuantity}
          />

          <View style={styles.mediaActions}>
            <MediaActions product={item} images={images} />
          </View>
        </Section>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.previewWrap}>
          <VariantPreview
            mode={mode}
            colors={colorOptions}
            selectedColor={selectedColor}
            quantities={quantities}
            totalQuantity={totals.totalQuantity}
            propertyNames={item.propertyNames}
            onOpen={() => openDrawer(null)}
          />
        </Animated.View>

        <Section title="Customs & Shipping rate" icon="boat-outline" delay={160}>
          <ShippingCard
            category={category}
            productType={productType}
            shippingRate={shippingRate}
            totalQuantity={totals.totalQuantity}
            weight={getWeight(item, totals.totalQuantity)}
            freightEstimate={freight}
            localShipping={shippingPending ? null : localShipping}
            totalCost={totals.totalCost}
            symbol={symbol}
          />
        </Section>

        {item.shop_name ? (
          <Section title="Seller Details" icon="storefront-outline" delay={200}>
            <SellerCard
              name={item.shop_name}
              rating={item.shop_rating}
              onViewStore={() =>
                navigation.navigate(ROUTES.VENDOR_PRODUCTS, { vendorId: item.shop_id, title: item.shop_name })
              }
              wishlisted={wishlisted}
              onWishlist={() => saveToWishlist(item)}
            />
          </Section>
        ) : null}

        <Section delay={240}>
          <InfoTabs item={item} />
        </Section>

        <Section title="Why shop with ALG" icon="shield-checkmark-outline" delay={260}>
          <PromiseGrid promises={SERVICE_PROMISES} />
          <PressableScale
            onPress={() => navigation.navigate(ROUTES.TAB_ACCOUNT, { screen: ROUTES.REFUND, initial: false })}
            scaleTo={0.96}
            style={styles.refundLink}>
            <Text style={styles.refundText}>See refund policy</Text>
            <Icon name="chevron-forward" size={14} color={colors.primary} />
          </PressableScale>
          <HowItWorks />
        </Section>

        {relatedShown.length > 0 ? (
          <Animated.View entering={FadeIn.delay(300)} style={styles.related}>
            <Text style={styles.relatedTitle}>Similar Products</Text>
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedList}>
              {relatedShown.map((product, index) => (
                <CardMotion key={`${product.id}-${index}`}>
                  <ProductTile
                    product={{ id: product.id, name: product.name, pictures: [product.image], salePrice: product.marginPrice }}
                    index={index}
                    symbol={symbol}
                    taka={taka}
                    wishlisted={wishlistIds.has(product.id)}
                    onPress={() => navigation.push(ROUTES.PRODUCT_DETAIL, { id: product.id })}
                  />
                </CardMotion>
              ))}
            </Animated.ScrollView>
          </Animated.View>
        ) : null}
      </Animated.ScrollView>

      {/* Header: floating round buttons over the photo, a solid bar once scrolled. */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.headerSolid, headerStyle]} pointerEvents="none" />
        <RoundButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <Animated.Text style={[styles.headerTitle, headerStyle]} numberOfLines={1}>
          {item.name}
        </Animated.Text>
        <RoundButton icon="share-social-outline" label="Share" onPress={shareProduct} />
        <RoundButton
          icon={wishlisted ? 'heart' : 'heart-outline'}
          tint={wishlisted ? colors.primary : undefined}
          label="Add to wishlist"
          onPress={() => saveToWishlist(item)}
        />
        <RoundButton icon="cart-outline" label="Cart" badge={cartCount} onPress={() => navigation.navigate(ROUTES.TAB_CART)} />
      </View>

      <BottomActionBar>
        {!isSignedIn ? (
          <View style={styles.loginRow}>
            <View style={styles.loginInfo}>
              <Icon name="lock-closed-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.loginText}>You must login first</Text>
            </View>
            <PressableScale onPress={() => navigation.navigate(ROUTES.LOGIN, { redirectBack: true })} scaleTo={0.95} style={styles.gradientShadow}>
              <LinearGradient colors={['#ff8a5c', colors.primary, '#e8344a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginButton}>
                <Text style={styles.primaryText}>LOGIN</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <View style={styles.totalCol}>
              <Text style={styles.totalLabel} numberOfLines={1}>{totals.totalQuantity} pc · Total</Text>
              <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(totals.totalCost, symbol)}</Text>
            </View>
            <PressableScale
              onPress={() => openDrawer('cart')}
              disabled={shippingPending}
              scaleTo={0.95}
              style={[styles.secondaryButton, shippingPending && styles.waiting]}>
              <Icon name="cart-outline" size={16} color={colors.primary} />
              <Text style={styles.secondaryText}>Add to Cart</Text>
            </PressableScale>
            <PressableScale
              onPress={() => openDrawer('buy')}
              disabled={shippingPending}
              scaleTo={0.95}
              style={[styles.gradientShadow, shippingPending && styles.waiting]}>
              <LinearGradient colors={['#ff8a5c', colors.primary, '#e8344a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Buy Now</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        )}
      </BottomActionBar>

      <VariantDrawer
        visible={drawer.visible}
        action={drawer.action}
        onClose={closeDrawer}
        onConfirm={confirmDrawer}
        submitting={submitting}
        shippingPending={shippingPending}
        localShipping={localShipping}
        item={item}
        mode={mode}
        colors={colorOptions}
        selectedColor={selectedColor}
        onSelectColor={selectColor}
        quantities={quantities}
        onChangeQuantity={setVariantQuantity}
        singleQuantity={singleQuantity}
        onChangeSingle={value => {
          setMissingInfo(false);
          setSingleQuantity(value);
        }}
        totals={totals}
        priceLabel={priceLabel}
        image={colorImage || images[0]}
        missingInfo={missingInfo}
        taka={taka}
        symbol={symbol}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  waiting: { opacity: 0.45 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  scroll: { paddingBottom: spacing.xl },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginRight: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.text },
  chipsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  deliveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eef1ff',
  },
  deliveryText: { marginLeft: 4, fontSize: 10.5, fontWeight: typography.weight.bold, color: '#2f3e9e' },
  storeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff1e6',
    color: '#e8590c',
    fontSize: 10.5,
    fontWeight: typography.weight.bold,
  },
  availabilityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ecfaf2',
    color: '#0e7a52',
    fontSize: 10.5,
    fontWeight: typography.weight.bold,
    textTransform: 'capitalize',
  },
  title: { fontSize: typography.size.md + 1, lineHeight: 23, fontWeight: typography.weight.semiBold, color: colors.text },
  previewWrap: { marginHorizontal: spacing.md, marginTop: spacing.md },
  mediaActions: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ececf1' },
  refundLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 2 },
  refundText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  related: { marginTop: spacing.lg },
  relatedTitle: { marginLeft: spacing.md, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  relatedList: { paddingHorizontal: spacing.md, paddingVertical: 12, gap: 12 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  headerSolid: { backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e4e4e8' },
  headerTitle: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  round: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  roundBadge: {
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
  roundBadgeText: { color: colors.white, fontSize: 8.5, fontWeight: typography.weight.bold },
  floatingBack: { position: 'absolute', left: spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)' },
  loginRow: { flexDirection: 'row', alignItems: 'center' },
  loginInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  loginText: { marginLeft: 6, fontSize: typography.size.sm, color: colors.textSecondary },
  loginButton: { height: 46, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalCol: { flex: 1 },
  totalLabel: { fontSize: typography.size.xxs + 1, color: colors.textMuted },
  totalValue: { fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  secondaryText: { marginLeft: 5, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  gradientShadow: {
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButton: { height: 46, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold, letterSpacing: 0.3 },
  failIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failTitle: { marginTop: spacing.md, fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  failText: { marginTop: 6, fontSize: typography.size.sm, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  failButton: { marginTop: spacing.lg, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primary },
  failButtonText: { color: colors.white, fontWeight: typography.weight.bold },
  skeletonTitle: { height: 14, marginBottom: 10 },
  skeletonShort: { width: '60%' },
  skeletonPrice: { width: '45%', height: 28, marginTop: 6, marginBottom: 14 },
  skeletonRow: { flexDirection: 'row', gap: 8 },
  skeletonChip: { width: 80, height: 26 },
  skeletonBlock: { height: 160 },
});

export default ProductDetailScreen;
