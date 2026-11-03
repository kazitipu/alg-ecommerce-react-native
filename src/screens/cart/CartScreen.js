import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutLeft,
  LinearTransition,
  ZoomIn,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { BottomActionBar, QtyStepper } from '../../components';
import ConfirmSheet from '../../components/ConfirmSheet';
import PressableScale from '../../components/PressableScale';
import { useHideSupportFab } from '../../components/SupportFab';
import { addToPendingOrdersRedux, removeItemFromCartRedux, updateCartQuantityRedux } from '../../actions';
import { useAuth, useDarkStatusBar } from '../../hooks';
import {
  CART_TEXT,
  allKeys,
  buildCartSelection,
  getCartTiers,
  itemKeys,
  itemQuantity,
  newestFirst,
  lineTotal,
  minQuantity,
  shopKeys,
  skuKey,
  skuQuantity,
  validateTypedQuantity,
} from '../../utils/cart';
import { formatPrice } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';
import useCartCourierQuotes from './useCartCourierQuotes';
import { appAlert } from '../../utils/appAlert';
import { thumbImage } from '../../utils/imageUrl';
import RemoteImage from '../../components/RemoteImage';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** Round checkbox that springs its tick in. `partial` shows a dash. */
const Checkbox = ({ checked, partial, onPress, label }) => {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale
      onPress={() => {
        scale.value = withSequence(withSpring(0.8, { damping: 12 }), withSpring(1, { damping: 8 }));
        onPress();
      }}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(checked) }}
      accessibilityLabel={label}>
      <Animated.View style={[styles.checkbox, (checked || partial) && styles.checkboxOn, style]}>
        {checked ? (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Icon name="checkmark" size={14} color={colors.white} />
          </Animated.View>
        ) : partial ? (
          <View style={styles.partial} />
        ) : null}
      </Animated.View>
    </PressableScale>
  );
};

/** A tilted parcel with a heart, for the empty and signed-out states. */
const CartIllustration = ({ locked }) => (
  <Svg width={170} height={140} viewBox="0 0 170 140">
    <Defs>
      <SvgGradient id="cartBox" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ffb98a" />
        <Stop offset="1" stopColor="#ff7a5a" />
      </SvgGradient>
    </Defs>
    <Circle cx={85} cy={66} r={60} fill="#fff1ec" />
    <Path d="M30 46h14l12 52h60l12-38H50" stroke="#2f3e9e" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M56 60h70l-9 30H62z" fill="url(#cartBox)" />
    <Circle cx={64} cy={110} r={7} fill="#2f3e9e" />
    <Circle cx={110} cy={110} r={7} fill="#2f3e9e" />
    {locked ? (
      <>
        <Path d="M80 66v-6a9 9 0 0 1 18 0v6" stroke="#fff" strokeWidth={4} fill="none" />
        <Path d="M76 66h26v16H76z" fill="#fff" />
      </>
    ) : (
      <Path d="M89 84c-7-5-11-8.5-11-12.5a5 5 0 0 1 11-2.5 5 5 0 0 1 11 2.5c0 4-4 7.5-11 12.5z" fill="#fff" />
    )}
  </Svg>
);

/** Repeats a 0 → 1 → 0 swing forever, optionally after a delay. */
const useSwing = (duration, delay = 0) => {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration }), withTiming(0, { duration })), -1),
    );
    return () => cancelAnimation(value);
  }, [value, duration, delay]);
  return value;
};

/** A sparkle that twinkles: it grows, spins a little and fades, on a loop. */
const Twinkle = ({ style, delay, color, size = 16, icon = 'sparkles' }) => {
  const swing = useSwing(900, delay);
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(swing.value, [0, 1], [0.25, 1]),
    transform: [{ scale: interpolate(swing.value, [0, 1], [0.6, 1.15]) }, { rotate: `${swing.value * 25}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.twinkle, style, animated]}>
      <Icon name={icon} size={size} color={color} />
    </Animated.View>
  );
};

/** The illustration floating up and down above a shadow that breathes with it. */
const FloatingIllustration = ({ locked }) => {
  const float = useSwing(1600);
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -12]) }, { rotate: `${interpolate(float.value, [0, 1], [-2, 2])}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(float.value, [0, 1], [0.9, 0.45]),
    transform: [{ scaleX: interpolate(float.value, [0, 1], [1, 0.75]) }],
  }));

  return (
    <View style={styles.illustration}>
      <Animated.View style={bodyStyle}>
        <CartIllustration locked={locked} />
      </Animated.View>
      <Animated.View style={[styles.illustrationShadow, shadowStyle]} />
      <Twinkle style={styles.twinkleA} delay={0} color="#ffc23d" size={18} />
      <Twinkle style={styles.twinkleB} delay={450} color="#6c7bff" size={12} icon="ellipse" />
      <Twinkle style={styles.twinkleC} delay={800} color={colors.primary} size={14} icon="heart" />
    </View>
  );
};

/** A soft ring that keeps pulsing out from behind the main button. */
const PulseRing = () => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1);
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
    transform: [{ scaleX: interpolate(pulse.value, [0, 1], [1, 1.25]) }, { scaleY: interpolate(pulse.value, [0, 1], [1, 1.6]) }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, style]} />;
};

const StateMessage = ({ locked, title, message, action, onAction }) => (
  <View style={styles.state}>
    <Animated.View entering={FadeInDown.springify().damping(14)}>
      <FloatingIllustration locked={locked} />
    </Animated.View>
    <Animated.Text entering={FadeInUp.delay(120)} style={styles.stateTitle}>
      {title}
    </Animated.Text>
    <Animated.Text entering={FadeInUp.delay(180)} style={styles.stateText}>
      {message}
    </Animated.Text>
    <Animated.View entering={FadeInUp.delay(240)} style={styles.stateAction}>
      <PulseRing />
      <PressableScale onPress={onAction} scaleTo={0.95} style={styles.gradientShadow}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stateButton}>
          <Text style={styles.primaryText}>{action}</Text>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  </View>
);

/** The item's quantity tiers, the one its current quantity falls in highlighted. */
const PriceTiers = ({ tiers, symbol }) =>
  tiers.length === 0 ? null : (
    <View style={styles.tiers}>
      {tiers.map(tier => (
        <Animated.View
          key={`${tier.label}-${tier.active}`}
          entering={tier.active ? ZoomIn.springify().damping(14) : FadeIn}
          style={[styles.tier, tier.active && styles.tierActive]}>
          <Text style={[styles.tierPrice, tier.active && styles.tierTextActive]}>{formatPrice(tier.price, symbol)}</Text>
          <Text style={[styles.tierLabel, tier.active && styles.tierTextActive]}>{tier.label} pc</Text>
        </Animated.View>
      ))}
    </View>
  );

/** One colour / size line of an item: its picture, options, price and stepper. */
const SkuRow = ({ item, sku, checked, onToggle, onQuantity, symbol }) => {
  const [colorLabel, sizeLabel] = item.propertyNames || [];
  const batch = minQuantity(item);
  const options = [
    sku.color ? `${colorLabel || 'Color'}: ${sku.color}` : null,
    sku.size ? `${sizeLabel || 'Size'}: ${sku.size}` : null,
  ].filter(Boolean);

  return (
    <View style={[styles.sku, checked && styles.skuOn]}>
      <Checkbox checked={checked} onPress={onToggle} label="Select this option" />
      <RemoteImage uri={thumbImage(sku.image || item.picture)} style={styles.skuImage} />
      <View style={styles.skuBody}>
        {options.length > 0 ? (
          options.map(option => (
            <Text key={option} style={styles.skuOption} numberOfLines={1}>
              {option}
            </Text>
          ))
        ) : (
          <Text style={styles.skuOption}>Standard</Text>
        )}
        <Text style={styles.skuUnit}>
          {formatPrice(parseInt(Number(sku.price) || 0, 10), symbol)} <Text style={styles.skuUnitMuted}>/ pc</Text>
        </Text>
        <View style={styles.skuFooter}>
          <QtyStepper
            value={skuQuantity(sku)}
            onChange={onQuantity}
            batch={batch}
            min={batch}
            typeable={batch === 1}
            validateTyped={validateTypedQuantity}
          />
          <Animated.Text key={lineTotal(sku)} entering={FadeIn} style={styles.skuTotal}>
            {formatPrice(lineTotal(sku), symbol)}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

/**
 * The cart, mirroring `carts/{uid}` and following the web's live cart
 * (`pages/cart1688.jsx`): entries grouped by shop with a "View store" link,
 * three-level selection (nothing selected by default), per-sku pictures,
 * options, prices and line totals, quantities stepped by pack size, the
 * shipping-excluded notice, and a settlement bar with the web's footer
 * figures. Quantity changes are saved, re-pricing the whole item on its tier.
 */
const CartScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { currentUser, isSignedIn } = useAuth();
  useDarkStatusBar();
  // The settlement bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const cart = useSelector(state => state.cartList.cart);
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka) || 0;

  const [selected, setSelected] = useState(() => new Set());
  const courier = useCartCourierQuotes({ cart, currentUser, taka });
  const quoting = courier.pending.size > 0;

  // Forget selections for skus that have left the cart.
  useEffect(() => {
    const present = new Set(allKeys(cart));
    setSelected(previous => {
      const next = new Set([...previous].filter(key => present.has(key)));
      return next.size === previous.size ? previous : next;
    });
  }, [cart]);

  // Newest first, for the list and for the order sellers go to checkout in.
  const orderedCart = useMemo(() => newestFirst(cart), [cart]);
  const selection = useMemo(() => buildCartSelection(orderedCart, selected), [orderedCart, selected]);
  const everyKey = useMemo(() => allKeys(cart), [cart]);
  const allSelected = everyKey.length > 0 && everyKey.every(key => selected.has(key));

  const setKeys = (keys, on) =>
    setSelected(previous => {
      const next = new Set(previous);
      keys.forEach(key => (on ? next.add(key) : next.delete(key)));
      return next;
    });
  const groupState = keys => {
    const count = keys.filter(key => selected.has(key)).length;
    return { checked: count > 0 && count === keys.length, partial: count > 0 && count < keys.length };
  };

  // Saving re-prices the item on its quantity tier; the courier charge is then
  // re-quoted for the new quantities. Without a loaded rate, the rate saved
  // with the cart entry is used so the tier price still updates.
  const changeQuantity = (shop, item, sku, quantity) =>
    courier.trackChange(item.id, () =>
      dispatch(
        updateCartQuantityRedux({
          currentUser,
          itemId: item.id,
          skuId: sku.sku_id,
          quantity,
          taka: taka || shop.currency,
        }),
      ),
    );

  // The item waiting for the user to confirm its removal, asked in the app's own sheet.
  const [removing, setRemoving] = useState(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const removeItem = item => setRemoving(item);
  const confirmRemove = async () => {
    const item = removing;
    if (!item) return;
    setRemovingBusy(true);
    try {
      await dispatch(
        removeItemFromCartRedux(currentUser, {
          id: item.id,
          skus: (item.skus || []).map(sku => ({ sku_id: skuKey(item, sku) })),
        }),
      );
    } finally {
      setRemovingBusy(false);
      setRemoving(null);
    }
  };
  const removingPieces = removing ? itemQuantity(removing) : 0;
  const removingAmount = removing ? (removing.skus || []).reduce((sum, sku) => sum + lineTotal(sku), 0) : 0;

  const settle = () => {
    if (selection.shops.length === 0 || quoting) return;
    if (selection.totalAmount <= 0) {
      appAlert('', CART_TEXT.zeroAmount);
      return;
    }
    dispatch(addToPendingOrdersRedux(selection.shops));
    navigation.navigate(ROUTES.PLACE_ORDER);
  };

  // The tab bar is hidden here (the checkout bar takes its place), so the
  // header carries a way back: to the previous tab, or Home.
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.TAB_HOME));

  const header = (
    <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <PressableScale onPress={goBack} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Back">
          <Icon name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <View style={styles.headerIcon}>
          <Icon name="cart" size={20} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>My purchase order</Text>
          {selection.categories > 0 ? (
            <Text style={styles.headerSub}>
              {selection.categories} {selection.categories === 1 ? 'item' : 'items'} from {selection.sellers}{' '}
              {selection.sellers === 1 ? 'seller' : 'sellers'}
            </Text>
          ) : null}
        </View>
        {everyKey.length > 0 ? (
          <PressableScale onPress={() => setKeys(everyKey, !allSelected)} scaleTo={0.94} style={styles.selectAll}>
            <Icon name={allSelected ? 'checkmark-done' : 'checkmark-done-outline'} size={15} color={colors.primary} />
            <Text style={styles.selectAllText}>{allSelected ? 'Unselect all' : 'Select all'}</Text>
          </PressableScale>
        ) : null}
      </View>
    </LinearGradient>
  );

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        {header}
        <StateMessage
          locked
          title="Sign in to see your cart"
          message="Your basket follows your account, so it is the same here and on the website."
          action="Sign in"
          onAction={() => navigation.navigate(ROUTES.LOGIN)}
        />
      </View>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <StateMessage
          title="Your cart is empty"
          message="Explore more and shortlist some items — or paste a 1688 link in search."
          action="Start shopping"
          onAction={() => navigation.navigate(ROUTES.TAB_HOME)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.notice}>
          <View style={styles.noticeIcon}>
            <Icon name="boat" size={18} color="#1f2a5c" />
          </View>
          <Text style={styles.noticeText}>{CART_TEXT.notice}</Text>
        </Animated.View>

        {orderedCart.map((shop, shopIndex) => {
          const shopState = groupState(shopKeys(cart, shop.shopId));
          return (
            <Animated.View
              key={`${shop.shopId}-${shop.items?.[0]?.id || shopIndex}`}
              entering={FadeInDown.delay(80 + shopIndex * 60).duration(400)}
              exiting={FadeOutLeft.duration(250)}
              layout={LinearTransition.springify().damping(18)}
              style={styles.shop}>
              <View style={styles.shopHeader}>
                <Checkbox
                  {...shopState}
                  label="Select this shop"
                  onPress={() => setKeys(shopKeys(cart, shop.shopId), !shopState.checked)}
                />
                <View style={styles.shopAvatar}>
                  <Icon name="storefront" size={14} color="#1f2340" />
                </View>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.shopName || 'Shop'}
                </Text>
                <PressableScale
                  onPress={() => navigation.navigate(ROUTES.VENDOR_PRODUCTS, { vendorId: shop.shopId, title: shop.shopName })}
                  scaleTo={0.92}
                  style={styles.viewStore}>
                  <Text style={styles.viewStoreText}>View store</Text>
                  <Icon name="chevron-forward" size={12} color={colors.primary} />
                </PressableScale>
              </View>

              {(shop.items || []).map(item => {
                const keys = itemKeys(item);
                const itemState = groupState(keys);
                return (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemHeader}>
                      <Checkbox {...itemState} label="Select this item" onPress={() => setKeys(keys, !itemState.checked)} />
                      <PressableScale
                        onPress={() => navigation.navigate(ROUTES.PRODUCT_DETAIL, { id: item.id })}
                        scaleTo={0.97}
                        style={styles.itemMain}>
                        <RemoteImage uri={thumbImage(item.picture)} style={styles.itemImage} />
                        <View style={styles.itemText}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          {item.productType ? (
                            <View style={styles.typeChip}>
                              <Icon name="pricetag" size={10} color="#c026d3" />
                              <Text style={styles.typeText}>{item.productType}</Text>
                            </View>
                          ) : null}
                        </View>
                      </PressableScale>
                      <PressableScale onPress={() => removeItem(item)} scaleTo={0.85} hitSlop={8} style={styles.trash} accessibilityLabel="Remove item">
                        <Icon name="trash-outline" size={16} color={colors.primary} />
                      </PressableScale>
                    </View>

                    {Number(item.batch) > 1 ? (
                      <View style={styles.packChip}>
                        <Icon name="albums-outline" size={11} color={colors.accentDark} />
                        <Text style={styles.packText}>Sold in packs of {item.batch}</Text>
                      </View>
                    ) : null}

                    {/* Quoted when the product was added; the web carries it per entry. */}
                    <View style={styles.courier}>
                      <View style={styles.courierIcon}>
                        <Icon name="bus" size={12} color="#e08a00" />
                      </View>
                      <Text style={styles.courierLabel}>China local courier</Text>
                      {courier.isPending(item.id) ? (
                        <View style={styles.courierPending}>
                          <ActivityIndicator size="small" color="#e08a00" />
                          <Text style={styles.courierPendingText}>Calculating…</Text>
                        </View>
                      ) : (
                        <Animated.Text key={`${shop.localShipping}`} entering={FadeIn} style={styles.courierValue}>
                          {formatPrice(Number(shop.localShipping) || 0, symbol)}
                        </Animated.Text>
                      )}
                    </View>

                    <PriceTiers tiers={getCartTiers(item, taka || shop.currency)} symbol={symbol} />

                    {(item.skus || []).map(sku => {
                      const key = skuKey(item, sku);
                      return (
                        <SkuRow
                          key={key}
                          item={item}
                          sku={sku}
                          symbol={symbol}
                          checked={selected.has(key)}
                          onToggle={() => setKeys([key], !selected.has(key))}
                          onQuantity={quantity => changeQuantity(shop, item, sku, quantity)}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Settlement bar, in the tab bar's place. */}
      <BottomActionBar style={styles.bar}>
        <View style={styles.barStats}>
          <View style={styles.barStat}>
            <Icon name="storefront-outline" size={12} color={colors.textMuted} />
            <Text style={styles.barStatText}>Sellers {selection.sellers}/12</Text>
          </View>
          <View style={styles.barStat}>
            <Icon name="grid-outline" size={12} color={colors.textMuted} />
            <Text style={styles.barStatText}>{selection.categories} types</Text>
          </View>
          <View style={styles.barStat}>
            <Icon name="cube-outline" size={12} color={colors.textMuted} />
            <Text style={styles.barStatText}>{selection.totalQuantity} pieces</Text>
          </View>
        </View>
        <View style={styles.barRow}>
          <Checkbox checked={allSelected} label="Select all" onPress={() => setKeys(everyKey, !allSelected)} />
          <Text style={styles.barAll}>All</Text>
          <View style={styles.barTotal}>
            <Text style={styles.barTotalLabel}>Total (excl. shipping)</Text>
            <Animated.Text key={selection.totalAmount} entering={FadeIn} style={styles.barTotalValue}>
              {formatPrice(selection.totalAmount, symbol)}
            </Animated.Text>
          </View>
          <PressableScale
            onPress={settle}
            disabled={selection.shops.length === 0 || quoting}
            scaleTo={0.95}
            style={[styles.gradientShadow, selection.shops.length === 0 && styles.settleOff, quoting && styles.waiting]}>
            <LinearGradient
              colors={selection.shops.length === 0 ? ['#c9c9d2', '#b4b4bf'] : GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.settle}>
              <Text style={styles.primaryText}>Checkout</Text>
              {selection.shops.length > 0 ? (
                <View style={styles.settleCount}>
                  <Text style={styles.settleCountText}>{selection.totalQuantity}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </PressableScale>
        </View>
      </BottomActionBar>

      <ConfirmSheet
        visible={Boolean(removing)}
        icon="trash-outline"
        title="Remove from your cart?"
        message="Every option you picked for this product will be removed. You can add it again from the product page."
        preview={
          removing
            ? {
                image: removing.picture || removing.skus?.[0]?.image,
                title: removing.name,
                subtitle: `${removingPieces} pcs · ${formatPrice(removingAmount, symbol)}`,
              }
            : null
        }
        confirmLabel="Remove"
        confirmIcon="trash-outline"
        cancelLabel="Keep it"
        busy={removingBusy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 36,
    height: 36,
    marginRight: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.text },
  headerSub: { marginTop: 1, fontSize: typography.size.xs, color: colors.textSecondary },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#f3d9d5',
  },
  selectAllText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#eef1ff',
    borderWidth: 1,
    borderColor: '#dbe1ff',
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ffc23d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: { flex: 1, marginLeft: 10, fontSize: typography.size.xs, lineHeight: 17, color: '#2f3a78' },
  shop: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  shopHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececf1' },
  shopAvatar: {
    width: 26,
    height: 26,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#ffc23d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { flex: 1, marginHorizontal: 8, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  viewStore: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  viewStoreText: { marginRight: 2, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  item: { paddingTop: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  itemImage: { width: 58, height: 58, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  itemText: { flex: 1, marginLeft: 10 },
  itemName: { fontSize: typography.size.sm - 1, lineHeight: 18, fontWeight: typography.weight.semiBold, color: colors.text },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fdeefe',
  },
  typeText: { marginLeft: 4, fontSize: 10.5, fontWeight: typography.weight.bold, color: '#a21caf' },
  trash: { width: 32, height: 32, marginLeft: 6, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  packChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 34,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fff4e6',
  },
  courier: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 34,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fff8e6',
  },
  courierIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#ffefc2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierLabel: { flex: 1, marginLeft: 6, fontSize: typography.size.xs, color: colors.textSecondary },
  courierPending: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  courierPendingText: { fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: '#e08a00' },
  waiting: { opacity: 0.5 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginLeft: 34 },
  tier: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  tierActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  tierPrice: { fontSize: typography.size.xs, fontWeight: '800', color: colors.text },
  tierLabel: { fontSize: 9.5, color: colors.textMuted },
  tierTextActive: { color: colors.white },
  courierValue: { fontSize: typography.size.xs + 1, fontWeight: '800', color: colors.text },
  packText: { marginLeft: 4, fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: colors.accentDark },
  sku: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#fafafc',
    borderWidth: 1.5,
    borderColor: '#f0f0f5',
  },
  skuOn: { borderColor: '#ffc9bf', backgroundColor: '#fff8f6' },
  skuImage: { width: 54, height: 54, marginLeft: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  skuBody: { flex: 1, marginLeft: 10 },
  skuOption: { fontSize: typography.size.xs + 1, color: colors.textSecondary },
  skuUnit: { marginTop: 3, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  skuUnitMuted: { fontSize: typography.size.xs, fontWeight: typography.weight.regular, color: colors.textMuted },
  skuFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  skuTotal: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d2d2dc',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  partial: { width: 10, height: 2.5, borderRadius: 2, backgroundColor: colors.white },
  bar: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  barStats: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececf1' },
  barStat: { flexDirection: 'row', alignItems: 'center' },
  barStatText: { marginLeft: 4, fontSize: typography.size.xs, color: colors.textSecondary },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barAll: { marginLeft: 6, fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.text },
  barTotal: { flex: 1, marginHorizontal: 10, alignItems: 'flex-end' },
  barTotalLabel: { fontSize: 10, color: colors.textMuted },
  barTotalValue: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.primary },
  gradientShadow: {
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  settleOff: { shadowOpacity: 0, elevation: 0 },
  settle: { flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 18, borderRadius: 14 },
  settleCount: {
    minWidth: 20,
    height: 20,
    marginLeft: 6,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleCountText: { fontSize: 10.5, fontWeight: '800', color: colors.primary },
  primaryText: { color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold, letterSpacing: 0.3 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: 120 },
  stateTitle: { marginTop: spacing.md, fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  stateText: { marginTop: 6, marginBottom: spacing.lg, fontSize: typography.size.sm, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  illustration: { alignItems: 'center' },
  illustrationShadow: { width: 96, height: 10, marginTop: -8, borderRadius: 5, backgroundColor: '#f0dcd7' },
  twinkle: { position: 'absolute' },
  twinkleA: { top: 6, right: 4 },
  twinkleB: { top: 16, left: 14 },
  twinkleC: { top: 58, right: -6 },
  stateAction: { alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: '100%', height: 48, borderRadius: 16, backgroundColor: colors.primary },
  stateButton: { height: 48, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

export default CartScreen;
