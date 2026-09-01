import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';

import { Button, EmptyState, Input } from '../../components';
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
import { useAuth } from '../../hooks';
import { getCouponAmount, validateCoupon, withCouponUsage } from '../../utils/coupon';
import { buildOrders, getShopTotal, summarizeOrder } from '../../utils/order';
import { formatPrice, truncate } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { DEFAULTS } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/** RedX pickup warehouse, hardcoded on the web too. */
const PICKUP_AREA_ID = 288;
const COD_ESTIMATE = 1000;

/**
 * Checkout.
 *
 * Costs come from four places: the goods themselves, the China-side courier,
 * the customs/freight estimate (`shippingRate` x weight), and the Bangladesh
 * delivery charge quoted per shop by RedX against the customer's default
 * address. A coupon, if valid, is split evenly across the shops.
 */
const PlaceOrderScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const pendingOrders = useSelector(state => state.cartList.pendingOrders);
  const symbol = useSelector(state => state.data.symbol);
  const currency = useSelector(state => state.user.currency);
  const taka = currency?.taka || 0;

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState({});
  const [partials, setPartials] = useState([]);
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

  /** Per-shop customs/freight estimate, as shown on the web. */
  const shippingEstimate = useMemo(
    () =>
      (pendingOrders || []).reduce((total, shop) => {
        const item = shop.items?.[0];
        const rate = Number(item?.shippingRate) || DEFAULTS.shippingRate;
        const weight = Number(item?.weight) || 0;
        return total + Math.round(rate * weight);
      }, 0),
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
        (total, shop) =>
          total + (deliveryCharges[shop.shopId] ?? DEFAULTS.deliveryCharge),
        0,
      ),
    [pendingOrders, deliveryCharges],
  );

  const payable = totalAmount - couponAmount + localCourier + shippingEstimate + deliveryTotal;

  useEffect(() => {
    getAllPartials().then(setPartials).catch(() => setPartials([]));
  }, []);

  /** Quotes the in-country delivery charge for each shop by weight. */
  const loadDeliveryCharges = useCallback(async () => {
    if (!defaultShipping?.areaObj?.id || !pendingOrders?.length) return;

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
  }, [defaultShipping, pendingOrders]);

  useEffect(() => {
    loadDeliveryCharges();
  }, [loadDeliveryCharges]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      notifyError('Enter a coupon code first.');
      return;
    }

    const found = await getSingleCoupon(couponCode.trim());
    const result = validateCoupon(found, totalAmount, currentUser);

    if (!result.valid) {
      notifyError(result.reason);
      return;
    }

    setCoupon(result.coupon);
    setCouponCode('');
    notifySuccess('Coupon added successfully');
  };

  const placeOrder = async () => {
    if (!defaultShipping) {
      notifyError('Please add a delivery address before placing your order.');
      navigation.navigate(ROUTES.PROFILE_INFORMATION);
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

      await dispatch(addToOrdersApiRedux(currentUser, orders));

      // Clear the ordered lines out of the cart, as the web app did.
      for (const shop of pendingOrders) {
        for (const item of shop.items || []) {
          await dispatch(
            removeItemFromCartRedux(currentUser, {
              id: item.id,
              skus: (item.skus || []).map(sku => ({
                sku_id: `${item.id}-${sku.sku_id}`,
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

      navigation.replace(ROUTES.ORDER_SUCCESS, {
        orders,
        payable,
        partials,
      });
    } catch (error) {
      notifyError(error, 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (!pendingOrders || pendingOrders.length === 0) {
    return (
      <EmptyState
        icon="bag-outline"
        title="Nothing to check out"
        message="Add something to your cart first."
        actionLabel="Go to cart"
        onAction={() => navigation.navigate(ROUTES.CART)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate(ROUTES.PROFILE_INFORMATION)}>
          <View style={styles.cardHeader}>
            <Icon name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery address</Text>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {defaultShipping ? (
            <>
              <Text style={styles.addressName}>{defaultShipping.name}</Text>
              <Text style={styles.addressLine}>
                {defaultShipping.address}
                {defaultShipping.areaObj?.name ? `, ${defaultShipping.areaObj.name}` : ''}
              </Text>
              {defaultShipping.mobileNo ? (
                <Text style={styles.addressLine}>{defaultShipping.mobileNo}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.addressMissing}>
              No delivery address yet — tap to add one.
            </Text>
          )}
        </Pressable>

        {pendingOrders.map((shop, index) => (
          <View key={`${shop.shopId}-${index}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="storefront-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.cardTitle}>
                {truncate(shop.shopName || 'Shop', 30)}
              </Text>
            </View>

            {(shop.items || []).map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {truncate(item.name, 46)}
                </Text>
                <Text style={styles.itemMeta}>
                  {(item.skus || []).reduce(
                    (total, sku) => total + Number(sku.totalQuantity || 0),
                    0,
                  )}{' '}
                  units
                </Text>
              </View>
            ))}

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Goods total</Text>
              <Text style={styles.rowValue}>
                {formatPrice(getShopTotal(shop), symbol)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Delivery inside BD</Text>
              <Text style={styles.rowValue}>
                {formatPrice(
                  deliveryCharges[shop.shopId] ?? DEFAULTS.deliveryCharge,
                  symbol,
                )}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coupon</Text>
          {coupon ? (
            <View style={styles.couponApplied}>
              <Icon name="pricetag" size={16} color={colors.success} />
              <Text style={styles.couponName}>{coupon.name}</Text>
              <Pressable onPress={() => setCoupon(null)} hitSlop={8}>
                <Text style={styles.couponRemove}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Coupon code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <Button title="Apply" variant="secondary" onPress={applyCoupon} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes for our team</Text>
          <Input
            placeholder="Anything we should know about this order?"
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {goodsCategory} products · {totalQuantity} units
            </Text>
            <Text style={styles.rowValue}>{formatPrice(totalAmount, symbol)}</Text>
          </View>

          {localCourier > 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>China local courier (approx.)</Text>
              <Text style={styles.rowValue}>{formatPrice(localCourier, symbol)}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Customs & shipping (approx.)</Text>
            <Text style={styles.rowValue}>{formatPrice(shippingEstimate, symbol)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Delivery inside BD</Text>
            <Text style={styles.rowValue}>{formatPrice(deliveryTotal, symbol)}</Text>
          </View>

          {couponAmount > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, styles.discount]}>Coupon discount</Text>
              <Text style={[styles.rowValue, styles.discount]}>
                −{formatPrice(couponAmount, symbol)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Payable</Text>
            <Text style={styles.totalValue}>{formatPrice(payable, symbol)}</Text>
          </View>

          <Text style={styles.estimateNote}>
            Shipping and customs are estimates. Our team confirms the final amount
            once your goods reach the warehouse.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <View style={styles.barTotals}>
          <Text style={styles.rowLabel}>Payable</Text>
          <Text style={styles.totalValue}>{formatPrice(payable, symbol)}</Text>
        </View>
        <Button
          title="Place order"
          onPress={placeOrder}
          loading={placing}
          style={styles.barButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  addressName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  addressLine: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addressMissing: { fontSize: typography.size.sm, color: colors.accent },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemName: { flex: 1, fontSize: typography.size.sm, color: colors.textSecondary },
  itemMeta: { fontSize: typography.size.xs, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.size.sm, color: colors.text },
  discount: { color: colors.success },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  estimateNote: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  couponRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  couponName: { flex: 1, fontSize: typography.size.sm, color: colors.success },
  couponRemove: { fontSize: typography.size.sm, color: colors.primary },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  barTotals: { flex: 1 },
  barButton: { minWidth: 150 },
});

export default PlaceOrderScreen;
