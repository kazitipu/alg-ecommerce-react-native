import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from '@react-native-firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { BottomActionBar, PressableScale } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import {
  addToOrdersApiRedux,
  removeItemFromCartRedux,
} from '../../actions';
import {
  getAllPartials,
  getSingleCoupon,
  updateUser,
} from '../../firebase/firebase.utils';
import { calculateDeliveryCharge } from '../../api';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { COUPON_ERRORS, getCouponAmount, validateCoupon, withCouponUsage } from '../../utils/coupon';
import {
  buildOrders,
  getCustomsCharge,
  getDeliveryCharge,
  getPayableNow,
  getShopQuantity,
  getShopTotal,
  summarizeOrder,
} from '../../utils/order';
import { CART_TEXT, orderSkuKey } from '../../utils/cart';
import { detailLines } from '../../utils/orderDetails';
import { formatPrice } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';
import { appAlert } from '../../utils/appAlert';

/** RedX pickup warehouse, hardcoded on the web too. */
const PICKUP_AREA_ID = 288;
const COD_ESTIMATE = 1000;

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const INK = '#1f2340';
const STEPS = ['Cart', 'Checkout', 'Payment'];

/** Tinted icon tile used by card headers and summary rows. */
const IconTile = ({ icon, tint, color, size = 32 }) => (
  <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint }]}>
    <Icon name={icon} size={size * 0.5} color={color} />
  </View>
);

/** White rounded card with an icon-tile header, as on the cart and product screens. */
const Card = ({ icon, tint, color, title, right, delay = 0, children }) => (
  <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.card}>
    <View style={styles.cardHeader}>
      <IconTile icon={icon} tint={tint} color={color} size={30} />
      <Text style={styles.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
    {children}
  </Animated.View>
);

/** One summary line: tinted icon, label with an optional hint, and the amount. */
const SummaryRow = ({ icon, tint, color, label, hint, value, valueStyle }) => (
  <View style={styles.summaryRow}>
    <IconTile icon={icon} tint={tint} color={color} />
    <View style={styles.summaryText}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
    </View>
    <Animated.Text key={value} entering={FadeIn} style={[styles.summaryValue, valueStyle]}>
      {value}
    </Animated.Text>
  </View>
);

/** Cart → Checkout → Payment, with Checkout current. */
const Steps = () => (
  <View style={styles.steps}>
    {STEPS.map((step, index) => (
      <React.Fragment key={step}>
        {index > 0 ? <View style={[styles.stepLine, index === 1 && styles.stepLineDone]} /> : null}
        <View style={styles.step}>
          <View style={[styles.stepDot, index <= 1 && styles.stepDotOn]}>
            {index === 0 ? (
              <Icon name="checkmark" size={11} color={colors.white} />
            ) : (
              <Text style={[styles.stepNumber, index <= 1 && styles.stepNumberOn]}>{index + 1}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, index === 1 && styles.stepLabelOn]}>{step}</Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

const itemQuantity = item => (item.skus || []).reduce((total, sku) => total + Number(sku.totalQuantity || 0), 0);

/** "Thana, District, Division", as the web lists it under the address. */
const addressArea = address =>
  [address?.thana, address?.district, address?.division].filter(value => value && typeof value !== 'object').join(', ');

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Checkout, following the web's `pages/placeOrder.jsx`.
 *
 * What is paid now is the goods total minus any coupon ("Total Payable Now,
 * excluding all shipping charges"). Each shop also shows, for information,
 * its China local courier, customs & shipping estimate (`shippingRate` ×
 * weight) and the RedX delivery charge inside Bangladesh — those are settled
 * later. A coupon is split evenly across the shops.
 *
 * Placing creates one `ordersApi` document per shop, clears those lines from
 * the cart, records the coupon's use, then goes to payment: through the
 * pay-now offer when `partial-payments` has one, else straight to the sheet.
 */
const PlaceOrderScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  useDarkStatusBar();
  // The order bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const pendingOrders = useSelector(state => state.cartList.pendingOrders);
  const symbol = useSelector(state => state.data.symbol);
  const currency = useSelector(state => state.user.currency);
  const taka = currency?.taka || 0;

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState({});
  const [quotingDelivery, setQuotingDelivery] = useState(false);
  const [partials, setPartials] = useState([]);
  const [applying, setApplying] = useState(false);
  const [placing, setPlacing] = useState(false);

  const defaultShipping = useMemo(
    () => (currentUser?.addressBook || []).find(address => address.defaultShipping),
    [currentUser],
  );

  const { totalAmount, goodsCategory, totalQuantity } = useMemo(
    () => summarizeOrder(pendingOrders),
    [pendingOrders],
  );

  const couponAmount = getCouponAmount(coupon, totalAmount);

  /** Charges shown for information; they are settled after the goods arrive. */
  const customsTotal = useMemo(
    () => (pendingOrders || []).reduce((total, shop) => total + getCustomsCharge(shop), 0),
    [pendingOrders],
  );

  const localCourier = useMemo(
    () =>
      (pendingOrders || []).reduce(
        (total, shop) => total + (Number(shop.localShipping) || 0),
        0,
      ),
    [pendingOrders],
  );

  const deliveryTotal = useMemo(
    () =>
      (pendingOrders || []).reduce(
        (total, shop) => total + getDeliveryCharge(deliveryCharges, shop),
        0,
      ),
    [pendingOrders, deliveryCharges],
  );

  // "Total Payable Now (excluding all shipping charges)".
  const payable = getPayableNow(totalAmount, couponAmount);

  useEffect(() => {
    getAllPartials().then(setPartials).catch(() => setPartials([]));
  }, []);

  /** Quotes the in-country delivery charge for each shop by weight. */
  const loadDeliveryCharges = useCallback(async () => {
    if (!defaultShipping?.areaObj?.id || !pendingOrders?.length) return;

    setQuotingDelivery(true);
    const charges = {};
    for (const shop of pendingOrders) {
      try {
        const data = await calculateDeliveryCharge({
          deliveryAreaId: defaultShipping.areaObj.id,
          pickupAreaId: PICKUP_AREA_ID,
          cashCollectionAmount: COD_ESTIMATE,
          weight: parseInt((Number(shop.items?.[0]?.weight) || 0) * 1000, 10),
        });
        charges[shop.shopId] =
          parseInt(data.deliveryCharge, 10) + parseInt(data.codCharge, 10);
      } catch (error) {
        // A failed quote falls back to the flat rate rather than blocking checkout.
      }
    }
    setDeliveryCharges(charges);
    setQuotingDelivery(false);
  }, [defaultShipping, pendingOrders]);

  useEffect(() => {
    loadDeliveryCharges();
  }, [loadDeliveryCharges]);

  const applyCoupon = async () => {
    if (applying) return;
    if (!couponCode.trim()) {
      appAlert('', COUPON_ERRORS.EMPTY);
      return;
    }

    setApplying(true);
    let found;
    try {
      found = await getSingleCoupon(couponCode.trim());
    } catch (error) {
      notifyError(error, 'Could not look that coupon up.');
      return;
    } finally {
      setApplying(false);
    }
    const result = validateCoupon(found, totalAmount, currentUser);

    if (!result.valid) {
      appAlert('', result.reason);
      return;
    }

    setCoupon(result.coupon);
    setCouponCode('');
    notifySuccess('Coupon added successfully');
  };

  const placeOrder = async () => {
    if (placing) return;
    if (!defaultShipping) {
      appAlert('', 'Please choose your delivery address above.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add address', onPress: () => navigation.navigate(ROUTES.PROFILE_INFORMATION, { mode: 'pickDelivery' }) },
      ]);
      return;
    }

    setPlacing(true);
    try {
      const orders = buildOrders({
        pendingOrders,
        couponAmount,
        coupon,
        additionalNotes,
        deliveryCharges,
        deliveryAddress: defaultShipping,
        currency: taka,
        createdAt: Timestamp.now(),
      });

      const stored = await dispatch(addToOrdersApiRedux(currentUser, orders));
      // Only what was actually saved is cleared from the cart and paid for —
      // the web emptied the cart even when saving failed, losing the items.
      const savedIds = new Set((stored || []).map(order => `${order.orderId}`));
      const placed = orders.filter(order => savedIds.has(`${order.orderId}`));
      if (placed.length === 0) {
        notifyError('Could not place your order. Please try again.');
        return;
      }

      for (const shop of placed) {
        for (const item of shop.items || []) {
          await dispatch(
            removeItemFromCartRedux(currentUser, {
              id: item.id,
              skus: (item.skus || []).map(sku => ({
                sku_id: orderSkuKey(item, sku),
              })),
            }),
          );
        }
      }

      if (coupon) {
        await updateUser({
          ...currentUser,
          usedCoupons: withCouponUsage(currentUser, coupon),
        });
      }

      // A partial save is charged for what was saved.
      const placedPayable =
        placed.length === orders.length
          ? payable
          : placed.reduce((total, order) => total + order.orderTotal, 0);

      // The web opens payment straight away: the pay-now offer when there is
      // one, otherwise the payment sheet for the full amount.
      // Offers load on open; fetch them now if that has not finished yet.
      const offers = partials.length ? partials : await getAllPartials().catch(() => []);
      const payment = offers?.length
        ? {
            route: ROUTES.DISCOUNT_MODAL,
            params: { orders: placed, total: placedPayable, couponAmount, partial: offers[0] },
          }
        : {
            route: ROUTES.PAYMENT_SHEET,
            params: {
              orders: placed,
              newOrder: {
                total: placedPayable,
                payableTotal: placedPayable,
                offer: '0%',
                payNowPercent: '100%',
                couponAmount,
              },
            },
          };

      navigation.replace(ROUTES.ORDER_SUCCESS, { orders: placed, payable: placedPayable, payment });
    } catch (error) {
      notifyError(error, 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const hasOrders = Boolean(pendingOrders?.length);

  const header = (
    <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Back">
          <Icon name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <View style={styles.headerIcon}>
          <Icon name="bag-check" size={20} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Place order</Text>
          {hasOrders ? (
            <Text style={styles.headerSub}>
              {plural(goodsCategory, 'product')} · {totalQuantity} pcs from {plural(pendingOrders.length, 'seller')}
            </Text>
          ) : null}
        </View>
      </View>
      <Steps />
    </LinearGradient>
  );

  if (!hasOrders) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.empty}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.emptyIcon}>
            <Icon name="bag-outline" size={40} color={colors.primary} />
          </Animated.View>
          <Text style={styles.emptyTitle}>Nothing to check out</Text>
          <Text style={styles.emptyText}>Add something to your cart first.</Text>
          <PressableScale onPress={() => navigation.navigate(ROUTES.CART)} scaleTo={0.95} style={styles.gradientShadow}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyButton}>
              <Icon name="cart" size={16} color={colors.white} />
              <Text style={styles.primaryText}>Go to cart</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {/* The web's reminder that shipping is charged later */}
        <Animated.View entering={FadeInDown.duration(380)} style={styles.topNotice}>
          <Icon name="boat" size={16} color="#1f2a5c" />
          <Text style={styles.topNoticeText}>{CART_TEXT.notice}</Text>
        </Animated.View>

        {/* Delivery address */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <PressableScale onPress={() => navigation.navigate(ROUTES.PROFILE_INFORMATION, { mode: 'pickDelivery' })} scaleTo={0.98} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconTile icon="location" tint="#e8f7f1" color="#059669" size={30} />
              <Text style={styles.cardTitle}>Delivery address</Text>
              <View style={styles.changeChip}>
                <Text style={styles.changeText}>{defaultShipping ? 'Change' : 'Add'}</Text>
                <Icon name="chevron-forward" size={12} color={colors.primary} />
              </View>
            </View>
            {defaultShipping ? (
              <View style={styles.address}>
                <View style={styles.addressTop}>
                  <Text style={styles.addressName}>{defaultShipping.name}</Text>
                  <View style={styles.defaultChip}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                </View>
                <Text style={styles.addressLine}>
                  {defaultShipping.address}
                  {defaultShipping.areaObj?.name && !addressArea(defaultShipping) ? `, ${defaultShipping.areaObj.name}` : ''}
                </Text>
                {addressArea(defaultShipping) ? <Text style={styles.addressLine}>{addressArea(defaultShipping)}</Text> : null}
                {defaultShipping.mobileNo ? (
                  <View style={styles.addressPhone}>
                    <Icon name="call-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.addressLine}>{defaultShipping.mobileNo}</Text>
                  </View>
                ) : null}
                {currentUser?.email ? (
                  <View style={styles.addressPhone}>
                    <Icon name="mail-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.addressLine}>{currentUser.email}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.addressMissing}>
                <Icon name="alert-circle" size={16} color="#c25e00" />
                <Text style={styles.addressMissingText}>No delivery address yet — tap to add one.</Text>
              </View>
            )}
          </PressableScale>
        </Animated.View>

        {/* One card per seller */}
        {pendingOrders.map((shop, index) => (
          <Card
            key={`${shop.shopId}-${index}`}
            delay={80 + index * 60}
            icon="storefront"
            tint="#eef0f6"
            color={INK}
            title={shop.shopName || 'Shop'}>
            {(shop.items || []).map(item => {
              const lines = detailLines({ items: [item] }, false);
              return (
                <React.Fragment key={item.id}>
                <View style={styles.item}>
                  <Image source={{ uri: item.picture || item.skus?.[0]?.image }} style={styles.itemImage} />
                  <View style={styles.itemText}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.itemChips}>
                      <View style={styles.qtyChip}>
                        <Icon name="cube-outline" size={11} color={colors.primary} />
                        <Text style={styles.qtyText}>{itemQuantity(item)} pcs</Text>
                      </View>
                      {item.productType ? (
                        <View style={styles.typeChip}>
                          <Icon name="pricetag" size={10} color="#c026d3" />
                          <Text style={styles.typeText} numberOfLines={1}>
                            {item.productType}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                  </View>
                </View>
                {lines.length > 0 ? (
                  <View style={styles.skuList}>
                    {lines.map(line => (
                      <View key={line.key} style={styles.skuLine}>
                        {line.image ? <Image source={{ uri: line.image }} style={styles.skuThumb} /> : null}
                        <View style={styles.skuInfo}>
                          <Text style={styles.skuOptions} numberOfLines={2}>
                            {line.variants.length
                              ? line.variants.map(variant => `${variant.label}: ${variant.value}`).join(' · ')
                              : 'Standard'}
                          </Text>
                          <Text style={styles.skuMath}>
                            {formatPrice(line.unit, symbol)} × {line.quantity}
                          </Text>
                        </View>
                        <Text style={styles.skuAmount}>{formatPrice(line.amount, symbol)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </React.Fragment>
              );
            })}

            <View style={styles.shopTotals}>
              <View style={styles.shopTotal}>
                <Text style={styles.shopTotalLabel}>Goods total</Text>
                <Text style={styles.shopTotalValue}>{formatPrice(getShopTotal(shop), symbol)}</Text>
              </View>
              <View style={styles.shopDivider} />
              <View style={styles.shopTotal}>
                <Text style={styles.shopTotalLabel}>China courier</Text>
                <Text style={styles.shopTotalValue}>{formatPrice(Number(shop.localShipping) || 0, symbol)}</Text>
              </View>
              <View style={styles.shopDivider} />
              <View style={styles.shopTotal}>
                <Text style={styles.shopTotalLabel}>Delivery in BD</Text>
                {quotingDelivery ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.shopTotalValue}>
                    {formatPrice(getDeliveryCharge(deliveryCharges, shop), symbol)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.shopExtra}>
              <Text style={styles.shopExtraText}>
                {getShopQuantity(shop)} pcs · Weight (approx) {shop.items?.[0]?.weight || 0}kg
              </Text>
              <Text style={styles.shopExtraText}>
                Customs & shipping (approx) <Text style={styles.shopExtraValue}>{formatPrice(getCustomsCharge(shop), symbol)}</Text>
              </Text>
            </View>
          </Card>
        ))}

        {/* Coupon */}
        <Card delay={160} icon="pricetag" tint="#fdeefe" color="#c026d3" title="Coupon">
          {coupon ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.ticket}>
              <View style={[styles.ticketNotch, styles.ticketNotchLeft]} />
              <View style={[styles.ticketNotch, styles.ticketNotchRight]} />
              <Icon name="checkmark-circle" size={20} color="#059669" />
              <View style={styles.ticketText}>
                <Text style={styles.ticketName}>{coupon.name}</Text>
                <Text style={styles.ticketSaving}>You save {formatPrice(couponAmount, symbol)}</Text>
              </View>
              <PressableScale onPress={() => setCoupon(null)} scaleTo={0.9} hitSlop={8} style={styles.ticketRemove}>
                <Text style={styles.ticketRemoveText}>Remove</Text>
              </PressableScale>
            </Animated.View>
          ) : (
            <View style={styles.couponRow}>
              <View style={styles.field}>
                <Icon name="ticket-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  style={styles.fieldInput}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={applyCoupon}
                />
              </View>
              <PressableScale onPress={applyCoupon} scaleTo={0.95} style={styles.applyButton}>
                {applying ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.applyText}>Apply</Text>
                )}
              </PressableScale>
            </View>
          )}
        </Card>

        {/* Notes */}
        <Card delay={200} icon="chatbox-ellipses" tint="#e8f4ff" color="#2563eb" title="Notes for our team">
          <View style={[styles.field, styles.notesField]}>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              placeholder="Anything we should know about this order?"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Summary */}
        <Card delay={240} icon="receipt" tint="#fff2e5" color="#f97316" title="Order summary">
          <SummaryRow
            icon="bag-handle"
            tint="#fff2e5"
            color="#f97316"
            label="Products"
            hint={`${plural(goodsCategory, 'product')} · ${totalQuantity} pcs`}
            value={formatPrice(totalAmount, symbol)}
          />
          {couponAmount > 0 ? (
            <SummaryRow
              icon="pricetag"
              tint="#fdeefe"
              color="#c026d3"
              label="Coupon discount"
              value={`−${formatPrice(couponAmount, symbol)}`}
              valueStyle={styles.discount}
            />
          ) : null}

          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.payable}>
            <View style={styles.payableIcon}>
              <Icon name="wallet" size={20} color={colors.white} />
            </View>
            <View style={styles.payableText}>
              <Text style={styles.payableLabel}>Payable now</Text>
              <Text style={styles.payableSub}>Excluding all shipping charges</Text>
            </View>
            <Animated.Text key={payable} entering={FadeIn} style={styles.payableValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatPrice(payable, symbol)}
            </Animated.Text>
          </LinearGradient>

        </Card>

        {/* Charged later — shown on the web next to each order, not in the payable. */}
        <Card delay={280} icon="time" tint="#eef2ff" color="#4f46e5" title="Charged later (approx)">
          <SummaryRow
            icon="bus"
            tint="#fff6dc"
            color="#e08a00"
            label="China local courier"
            hint="Seller to our China warehouse"
            value={formatPrice(localCourier, symbol)}
          />
          <SummaryRow
            icon="airplane"
            tint="#e8f4ff"
            color="#2563eb"
            label="Customs & shipping"
            hint="China → Bangladesh, by weight"
            value={formatPrice(customsTotal, symbol)}
          />
          <SummaryRow
            icon="home"
            tint="#e8f7f1"
            color="#059669"
            label="Delivery inside BD"
            hint="To your door"
            value={formatPrice(deliveryTotal, symbol)}
          />
          <View style={styles.note}>
            <Icon name="information-circle" size={15} color={colors.textMuted} />
            <Text style={styles.noteText}>
              Customs & shipping charge will be included later, after the products reach our local warehouse.
            </Text>
          </View>
        </Card>

        <View style={styles.trust}>
          {[
            { icon: 'shield-checkmark', label: 'Secure payment' },
            { icon: 'navigate', label: 'Live tracking' },
            { icon: 'chatbubbles', label: '24/7 support' },
          ].map(entry => (
            <View key={entry.label} style={styles.trustItem}>
              <Icon name={entry.icon} size={14} color={colors.primary} />
              <Text style={styles.trustText}>{entry.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomActionBar style={styles.bar}>
        <View style={styles.barTotals}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {totalQuantity} pcs · Payable now
          </Text>
          <Animated.Text key={payable} entering={FadeIn} style={styles.barValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatPrice(payable, symbol)}
          </Animated.Text>
        </View>
        <PressableScale onPress={placeOrder} disabled={placing} scaleTo={0.95} style={styles.gradientShadow}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.placeButton}>
            {placing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryText}>Place order</Text>
                <View style={styles.placeArrow}>
                  <Icon name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </>
            )}
          </LinearGradient>
        </PressableScale>
      </BottomActionBar>
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
    shadowColor: INK,
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
  steps: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, paddingHorizontal: 12 },
  step: { alignItems: 'center', width: 64 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#d9d9e3',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepNumber: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
  stepNumberOn: { color: colors.white },
  stepLabel: { marginTop: 4, fontSize: 10.5, fontWeight: typography.weight.semiBold, color: colors.textMuted },
  stepLabelOn: { color: colors.primary, fontWeight: typography.weight.bold },
  stepLine: { flex: 1, height: 2, marginTop: 10, marginHorizontal: -18, borderRadius: 1, backgroundColor: '#e4e4ec' },
  stepLineDone: { backgroundColor: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  card: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  tile: { alignItems: 'center', justifyContent: 'center' },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  changeText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  address: { padding: 12, borderRadius: 16, backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#e2f3ea' },
  addressTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressName: { fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold, color: colors.text },
  defaultChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#d1fae5' },
  defaultText: { fontSize: 10, fontWeight: typography.weight.bold, color: '#047857' },
  addressLine: { marginTop: 3, fontSize: typography.size.sm, lineHeight: 19, color: colors.textSecondary },
  addressPhone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressMissing: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#fff4e6' },
  addressMissingText: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: '#c25e00' },
  item: { flexDirection: 'row', paddingVertical: 8 },
  itemImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f1f1f5' },
  itemText: { flex: 1, marginLeft: 12 },
  skuList: { marginTop: 4, marginBottom: 6, marginLeft: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#f1f1f5' },
  skuLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  skuThumb: { width: 34, height: 34, borderRadius: 9, marginRight: 10, backgroundColor: '#f1f1f5' },
  skuInfo: { flex: 1 },
  skuOptions: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.text },
  skuMath: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  skuAmount: { marginLeft: 8, fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  topNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.sm,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#eef1fb',
  },
  topNoticeText: { flex: 1, fontSize: typography.size.xs + 1, lineHeight: 17, color: '#1f2a5c' },
  itemName: { fontSize: typography.size.sm, lineHeight: 19, fontWeight: typography.weight.semiBold, color: colors.text },
  itemChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  qtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  qtyText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 160,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fdeefe',
  },
  typeText: { fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: '#c026d3' },
  shopTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f7f7fa',
  },
  shopTotal: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 34 },
  shopTotalLabel: { fontSize: 10.5, color: colors.textMuted },
  shopTotalValue: { marginTop: 2, fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  shopExtra: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, marginTop: 8, paddingHorizontal: 4 },
  shopExtraText: { fontSize: typography.size.xs, color: colors.textMuted },
  shopExtraValue: { fontWeight: typography.weight.bold, color: colors.text },
  shopDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#dcdce4' },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  fieldInput: { flex: 1, paddingVertical: 0, fontSize: typography.size.sm + 1, color: colors.text },
  notesField: { flex: 0, height: 96, alignItems: 'flex-start', paddingTop: 10 },
  notesInput: { height: '100%' },
  applyButton: {
    height: 50,
    minWidth: 84,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
    overflow: 'hidden',
  },
  ticketNotch: { position: 'absolute', top: '50%', width: 16, height: 16, marginTop: -8, borderRadius: 8, backgroundColor: colors.white },
  ticketNotchLeft: { left: -9 },
  ticketNotchRight: { right: -9 },
  ticketText: { flex: 1, marginLeft: 10 },
  ticketName: { fontSize: typography.size.sm + 1, fontWeight: '800', color: '#047857', letterSpacing: 0.5 },
  ticketSaving: { marginTop: 1, fontSize: typography.size.xs, color: '#059669' },
  ticketRemove: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.white },
  ticketRemoveText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f9f9fb',
    borderWidth: 1,
    borderColor: '#f0f0f4',
  },
  summaryText: { flex: 1, marginLeft: 10 },
  summaryLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  summaryHint: { marginTop: 1, fontSize: typography.size.xs, color: colors.textMuted },
  summaryValue: { marginLeft: 8, fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  discount: { color: '#059669' },
  payable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 14,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  payableIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payableText: { flex: 1, marginLeft: 10 },
  payableLabel: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.white },
  payableSub: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  payableValue: { maxWidth: '55%', fontSize: 24, fontWeight: '800', color: colors.white },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  noteText: { flex: 1, fontSize: typography.size.xs, lineHeight: 16, color: colors.textMuted },
  trust: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: spacing.lg },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustText: { marginLeft: 4, fontSize: typography.size.xs, color: colors.textSecondary },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTotals: { flex: 1 },
  barLabel: { fontSize: typography.size.xxs + 1, color: colors.textMuted },
  barValue: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.primary },
  gradientShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, minWidth: 150, paddingHorizontal: 18, borderRadius: 16 },
  placeArrow: {
    width: 24,
    height: 24,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.white, fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold, letterSpacing: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: 80 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing.md, fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text },
  emptyText: { marginTop: 6, marginBottom: spacing.lg, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 24, borderRadius: 16 },
});

export default PlaceOrderScreen;
