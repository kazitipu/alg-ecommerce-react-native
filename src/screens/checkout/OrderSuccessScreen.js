import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { BottomActionBar, PressableScale } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { getSingleOrderApi } from '../../firebase/firebase.utils';
import { useDarkStatusBar } from '../../hooks';
import { formatPrice } from '../../utils/format';
import { notifyInfo } from '../../utils/notify';
import { isAwaitingPayment } from '../../utils/order';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const SUCCESS = ['#34d399', '#059669'];
const EASE = Easing.out(Easing.cubic);

/** The journey after checkout, from the web's delivery process. */
const STEPS = [
  { icon: 'card', label: 'Payment', hint: 'Pay now, or later from My orders' },
  {
    icon: 'storefront',
    label: 'We buy from the seller',
    hint: 'Our China team places the order',
  },
  { icon: 'business', label: 'China warehouse', hint: 'Checked and packed' },
  {
    icon: 'airplane',
    label: 'Shipped to Bangladesh',
    hint: 'By air, customs cleared',
  },
  {
    icon: 'home',
    label: 'Delivered to you',
    hint: 'Shipping & customs charged on arrival',
  },
];

const CONFETTI = [
  { x: -110, y: -40, color: '#fbbf24', size: 8, delay: 0 },
  { x: 100, y: -54, color: '#f472b6', size: 7, delay: 80 },
  { x: -80, y: 46, color: '#60a5fa', size: 6, delay: 140 },
  { x: 118, y: 30, color: '#34d399', size: 8, delay: 60 },
  { x: -30, y: -78, color: '#ffffff', size: 6, delay: 120 },
  { x: 46, y: 70, color: '#fde047', size: 7, delay: 180 },
  { x: -126, y: 6, color: '#ffffff', size: 5, delay: 200 },
  { x: 130, y: -8, color: '#fb7185', size: 6, delay: 100 },
];

/** A dot that drifts out from the check mark and fades. */
const Confetti = ({ x, y, color, size, delay }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      300 + delay,
      withTiming(1, { duration: 1100, easing: EASE }),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0.25]),
    transform: [
      { translateX: x * t.value },
      { translateY: y * t.value + 10 * t.value * t.value },
      { rotate: `${t.value * 240}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        { width: size, height: size, backgroundColor: color },
        style,
      ]}
    />
  );
};

/** Check mark in a white disc, with two rings rippling outward. */
const SuccessMark = () => {
  const ripple = useSharedValue(0);
  useEffect(() => {
    ripple.value = withDelay(
      400,
      withRepeat(withTiming(1, { duration: 1800, easing: EASE }), -1),
    );
    return () => cancelAnimation(ripple);
  }, [ripple]);
  const ringA = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ripple.value, [0, 1], [1, 1.9]) }],
  }));
  const ringB = useAnimatedStyle(() => {
    const v = (ripple.value + 0.5) % 1;
    return {
      opacity: interpolate(v, [0, 1], [0.4, 0]),
      transform: [{ scale: interpolate(v, [0, 1], [1, 1.9]) }],
    };
  });

  return (
    <View style={styles.markWrap}>
      <Animated.View style={[styles.ring, ringA]} />
      <Animated.View style={[styles.ring, ringB]} />
      {CONFETTI.map((piece, index) => (
        <Confetti key={index} {...piece} />
      ))}
      <Animated.View
        entering={ZoomIn.duration(450).easing(EASE)}
        style={styles.mark}
      >
        <LinearGradient
          colors={SUCCESS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.markInner}
        >
          <Icon name="checkmark" size={40} color={colors.white} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const pieces = order =>
  (order.items || []).reduce(
    (total, item) =>
      total +
      (item.skus || []).reduce(
        (sum, sku) => sum + (parseInt(sku.totalQuantity, 10) || 0),
        0,
      ),
    0,
  );

/**
 * Confirmation after checkout.
 *
 * Orders are created as `paymentStatus: 'purchaseLater'`, so paying is a
 * separate step — this screen is the handover into the payment flow.
 */
const OrderSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const symbol = useSelector(state => state.data.symbol);
  useDarkStatusBar();
  // The action bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const orders = route.params?.orders || [];
  const payable = route.params?.payable || 0;
  // `{ route, params }` for the payment step chosen at checkout.
  const payment = route.params?.payment;

  // Read the orders' payment status each time this screen is shown, so
  // "Pay now" goes once a payment has been submitted — by deposit here, or
  // by bKash / card in the browser.
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const orderIds = orders.map(order => order.orderId).join(',');
  useFocusEffect(
    useCallback(() => {
      if (!payment || !orderIds) return undefined;
      let active = true;
      Promise.all(orderIds.split(',').map(id => getSingleOrderApi(id)))
        .then(stored => {
          if (!active) return;
          // A missing document is treated as unpaid, so the button never hides by mistake.
          setPaymentSubmitted(
            stored.every(order => order && !isAwaitingPayment(order)),
          );
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [payment, orderIds]),
  );

  // Like the web, payment opens right after the order is placed; closing it
  // leaves the customer here, with "Pay now" to come back to it.
  const opened = useRef(false);
  useEffect(() => {
    if (!payment || opened.current) return;
    opened.current = true;
    navigation.navigate(payment.route, payment.params);
  }, [navigation, payment]);

  const needsPayment = Boolean(payment) && !paymentSubmitted;
  const totalPieces = orders.reduce((total, order) => total + pieces(order), 0);
  // Step 0 (payment) is current until a payment is in; then buying is.
  const currentStep = needsPayment ? 0 : 1;

  const viewOrders = () =>
    navigation.navigate(ROUTES.TAB_ORDERS, { screen: ROUTES.MY_ORDERS });
  const keepShopping = () => navigation.navigate(ROUTES.TAB_HOME);
  const copyId = id => {
    Clipboard.setString(`${id}`);
    notifyInfo('Order number copied', `#${id}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Celebration */}
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <View style={[styles.blob, styles.blobA]} />
          <View style={[styles.blob, styles.blobB]} />
          <View style={styles.heroTop}>
            <PressableScale
              onPress={keepShopping}
              scaleTo={0.88}
              hitSlop={8}
              style={styles.close}
              accessibilityLabel="Close"
            >
              <Icon name="close" size={20} color={colors.white} />
            </PressableScale>
          </View>
          <SuccessMark />
          <Animated.Text
            entering={FadeInUp.delay(250).duration(420).easing(EASE)}
            style={styles.title}
          >
            Order placed!
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(330).duration(420).easing(EASE)}
            style={styles.subtitle}
          >
            {orders.length === 1
              ? `${totalPieces} pcs from 1 seller — we've got it from here.`
              : `${orders.length} orders, one per seller · ${totalPieces} pcs in total.`}
          </Animated.Text>
          <Animated.View
            entering={FadeIn.delay(420).duration(400)}
            style={styles.heroStats}
          >
            <View style={styles.stat}>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>
                {orders.length === 1 ? 'Order' : 'Orders'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalPieces}</Text>
              <Text style={styles.statLabel}>Pieces</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatPrice(payable, symbol)}
              </Text>
              <Text style={styles.statLabel}>Payable now</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Payment status */}
        {payment ? (
          <Animated.View
            key={needsPayment ? 'due' : 'paid'}
            entering={FadeInDown.delay(150).duration(380).easing(EASE)}
            style={[
              styles.status,
              needsPayment ? styles.statusDue : styles.statusPaid,
            ]}
          >
            <View
              style={[
                styles.statusIcon,
                needsPayment ? styles.statusIconDue : styles.statusIconPaid,
              ]}
            >
              <Icon
                name={needsPayment ? 'time' : 'shield-checkmark'}
                size={18}
                color={colors.white}
              />
            </View>
            <View style={styles.statusText}>
              <Text
                style={[
                  styles.statusTitle,
                  needsPayment ? styles.statusTitleDue : styles.statusTitlePaid,
                ]}
              >
                {needsPayment
                  ? 'Waiting for your payment'
                  : 'Payment submitted'}
              </Text>
              <Text style={styles.statusBody}>
                {needsPayment
                  ? 'We start buying from the seller as soon as you pay. You can also pay later from My orders.'
                  : 'Our team member will confirm it soon, then we start buying your goods.'}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Receipts */}
        <Text style={styles.section}>
          Your {orders.length === 1 ? 'order' : 'orders'}
        </Text>
        {orders.map((order, index) => {
          const thumbs = (order.items || [])
            .flatMap(item => [
              item.picture,
              ...(item.skus || []).map(sku => sku.image),
            ])
            .filter(Boolean);
          return (
            <Animated.View
              key={order.orderId}
              entering={FadeInUp.delay(220 + index * 90)
                .duration(400)
                .easing(EASE)}
              style={styles.receipt}
            >
              <View style={styles.receiptTop}>
                <View style={styles.shopIcon}>
                  <Icon name="storefront" size={14} color="#1f2340" />
                </View>
                <Text style={styles.shopName} numberOfLines={1}>
                  {order.shopName || 'Seller'}
                </Text>
                <View style={styles.pending}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </View>

              <View style={styles.thumbs}>
                {[...new Set(thumbs)].slice(0, 4).map(uri => (
                  <Image key={uri} source={{ uri }} style={styles.thumb} />
                ))}
                <View style={styles.thumbText}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {order.items?.[0]?.name || 'Your products'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {pieces(order)} pcs
                    {(order.items || []).length > 1
                      ? ` · ${order.items.length} products`
                      : ''}
                  </Text>
                </View>
              </View>

              {/* Perforated tear line, like a printed receipt */}
              <View style={styles.tear}>
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={styles.tearLine} />
                <View style={[styles.notch, styles.notchRight]} />
              </View>

              <View style={styles.receiptBottom}>
                <PressableScale
                  onPress={() => copyId(order.orderId)}
                  scaleTo={0.95}
                  style={styles.orderId}
                >
                  <Text style={styles.orderIdLabel}>Order no.</Text>
                  <View style={styles.orderIdRow}>
                    <Text style={styles.orderIdValue}>#{order.orderId}</Text>
                    <Icon
                      name="copy-outline"
                      size={12}
                      color={colors.primary}
                    />
                  </View>
                </PressableScale>
                <View style={styles.amount}>
                  <Text style={styles.orderIdLabel}>Amount</Text>
                  <Text style={styles.amountValue}>
                    {formatPrice(order.orderTotal, symbol)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        })}

        {/* What happens next */}
        <Animated.View
          entering={FadeInUp.delay(380).duration(400).easing(EASE)}
          style={styles.next}
        >
          <View style={styles.nextHeader}>
            <View style={styles.nextIcon}>
              <Icon name="map" size={15} color="#4f46e5" />
            </View>
            <Text style={styles.nextTitle}>What happens next</Text>
          </View>
          {STEPS.map((step, index) => {
            const done = index < currentStep;
            const current = index === currentStep;
            return (
              <Animated.View
                key={step.label}
                entering={FadeIn.delay(480 + index * 90).duration(300)}
                style={styles.step}
              >
                <View style={styles.stepRail}>
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      current && styles.stepDotCurrent,
                    ]}
                  >
                    <Icon
                      name={done ? 'checkmark' : step.icon}
                      size={13}
                      color={done || current ? colors.white : colors.textMuted}
                    />
                  </View>
                  {index < STEPS.length - 1 ? (
                    <View
                      style={[styles.stepLine, done && styles.stepLineDone]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepText}>
                  <Text
                    style={[
                      styles.stepLabel,
                      current && styles.stepLabelCurrent,
                    ]}
                  >
                    {step.label}
                    {current ? '  ·  now' : ''}
                  </Text>
                  <Text style={styles.stepHint}>{step.hint}</Text>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        <PressableScale
          onPress={keepShopping}
          scaleTo={0.96}
          style={styles.shopMore}
        >
          <Icon name="bag-handle-outline" size={16} color={colors.primary} />
          <Text style={styles.shopMoreText}>Keep shopping</Text>
        </PressableScale>
      </ScrollView>

      <BottomActionBar style={styles.bar}>
        <PressableScale
          onPress={viewOrders}
          scaleTo={0.95}
          style={[styles.secondary, !needsPayment && styles.secondaryWide]}
        >
          <Icon name="receipt-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryText}>
            {needsPayment ? 'Orders' : 'View my orders'}
          </Text>
        </PressableScale>
        {needsPayment ? (
          <PressableScale
            onPress={() => navigation.navigate(payment.route, payment.params)}
            scaleTo={0.95}
            style={[styles.ctaShadow, styles.ctaFlex]}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Icon name="wallet" size={16} color={colors.white} />
              <Text style={styles.ctaText} numberOfLines={1}>
                Pay now · {formatPrice(payable, symbol)}
              </Text>
            </LinearGradient>
          </PressableScale>
        ) : null}
      </BottomActionBar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  scroll: { paddingBottom: spacing.lg },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blobA: { width: 240, height: 240, top: -90, right: -80 },
  blobB: { width: 170, height: 170, bottom: -70, left: -60 },
  heroTop: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: colors.white,
  },
  confetti: { position: 'absolute', borderRadius: 2 },
  mark: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 8, fontSize: 28, fontWeight: '800', color: colors.white },
  subtitle: {
    marginTop: 4,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statValue: {
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: { marginTop: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDue: { backgroundColor: '#fff8eb', borderColor: '#fde3b0' },
  statusPaid: { backgroundColor: '#ecfdf5', borderColor: '#bbf0d9' },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconDue: { backgroundColor: '#f59e0b' },
  statusIconPaid: { backgroundColor: '#059669' },
  statusText: { flex: 1, marginLeft: 12 },
  statusTitle: { fontSize: typography.size.md - 1, fontWeight: '800' },
  statusTitleDue: { color: '#b45309' },
  statusTitlePaid: { color: '#047857' },
  statusBody: {
    marginTop: 2,
    fontSize: typography.size.xs + 1,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: 10,
    marginHorizontal: spacing.md,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  receipt: {
    marginHorizontal: spacing.md,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  shopIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#eef0f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    flex: 1,
    marginLeft: 8,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#fff4e6',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  pendingText: {
    fontSize: 10.5,
    fontWeight: typography.weight.bold,
    color: '#b45309',
  },
  thumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f1f1f5',
  },
  thumbText: { flex: 1, marginLeft: 4 },
  itemName: {
    fontSize: typography.size.xs + 1,
    lineHeight: 17,
    color: colors.text,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  tear: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  tearLine: {
    flex: 1,
    height: 0,
    marginHorizontal: 12,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e4e4ec',
  },
  notch: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#f6f6f8' },
  notchLeft: { marginLeft: -8 },
  notchRight: { marginRight: -8 },
  receiptBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 10,
  },
  orderId: { flex: 1 },
  orderIdLabel: { fontSize: 10.5, color: colors.textMuted },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  orderIdValue: {
    fontSize: typography.size.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.text,
  },
  amount: { alignItems: 'flex-end' },
  amountValue: {
    marginTop: 1,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.primary,
  },
  next: {
    marginTop: 6,
    marginHorizontal: spacing.md,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nextIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTitle: {
    marginLeft: 10,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  step: { flexDirection: 'row' },
  stepRail: { width: 30, alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: '#059669' },
  stepDotCurrent: { backgroundColor: colors.primary },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
    backgroundColor: '#ececf1',
  },
  stepLineDone: { backgroundColor: '#059669' },
  stepText: { flex: 1, marginLeft: 10, paddingBottom: 14 },
  stepLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  stepLabelCurrent: { color: colors.primary },
  stepHint: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  shopMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: 10,
  },
  shopMoreText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  secondaryWide: { flex: 1 },
  secondaryText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaFlex: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  ctaText: {
    flexShrink: 1,
    color: colors.white,
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
  },
});

export default OrderSuccessScreen;
