import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { PressableScale, ScreenHeader } from '../../components';
import BottomActionBar from '../../components/BottomActionBar';
import { useHideSupportFab } from '../../components/SupportFab';
import { trackParcel } from '../../api';
import { getAllBookingsOfSingleUserRedux, getAllOrdersApiRedux } from '../../actions';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { BUCKETS, canPay, canRefund, hasInvoice } from '../../utils/dashboard';
import {
  chargeBreakdown,
  detailLines,
  orderFacts,
  orderSummaryText,
  paidShare,
  refundState,
  showsProgress,
  warehousePhoto,
} from '../../utils/orderDetails';
import { formatPrice } from '../../utils/format';
import { notifyInfo } from '../../utils/notify';
import { buildTimeline } from '../../utils/tracking';
import JourneyTimeline from '../../components/JourneyTimeline';
import { ROUTES } from '../../navigation/routes';
import {
  STAGES,
  asText,
  paymentStateOf,
  stageOf,
} from './components/orderHelpers';
import {
  GlanceGrid,
  HelpCard,
  HeroStat,
  ImageViewer,
  ItemLine,
  PaymentHistory,
  PaymentProgress,
  StageStepper,
} from './components/OrderDetailParts';
import RefundSheet from './components/RefundSheet';
import useOrderActions from './components/useOrderActions';
import { colors, radius, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const EASE = Easing.out(Easing.cubic);

/**
 * What the website's order page says before an order has tracking: pending,
 * rejected, not yet ordered from the supplier, or not yet shipped. Null once
 * there is a tracking number (the journey and courier updates say the rest).
 */
export const orderNotice = order => {
  const orderStatus = asText(order?.orderStatus).toLowerCase();
  if (orderStatus === 'pending') {
    return { icon: 'hourglass', color: '#d97706', tint: '#fffbeb', border: '#fde68a', title: 'Your order is still being processed.', body: 'You will be informed soon' };
  }
  if (orderStatus === 'reject') {
    return { icon: 'close-circle', color: '#e11d48', tint: '#fff1f2', border: '#fecdd3', title: 'Your order has been rejected.', body: 'To reorder make the payment again or contact us' };
  }
  if (order?.orderId && !asText(order?.orderNumber)) {
    return { icon: 'cart', color: '#4f46e5', tint: '#eef2ff', border: '#c7d2fe', title: 'Your order has not been ordered yet.', body: 'It will be ordered within 2 working days' };
  }
  if (order?.orderId && !asText(order?.trackingNo)) {
    return { icon: 'cube', color: '#0284c7', tint: '#e0f2fe', border: '#bae6fd', title: 'No logistics yet', body: 'Your order has not been shipped by the supplier yet.' };
  }
  return null;
};

const INK = '#1f2340';
const ITEMS_PREVIEW = 3;

/**
 * One order or product request, with what the website shows in its Buy & Ship
 * rows: the header facts, every sku with its variant, price and shipping rate,
 * the 7-stage progress (hidden once rejected), the abroad-warehouse photo,
 * refund state, the money owed and its payments — plus RedX courier events
 * for the final leg. Pay, Quick refund and Invoice follow the list's rules.
 */
const TrackingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const symbol = useSelector(state => state.data.symbol);
  const ordersApi = useSelector(state => state.orders.ordersApi);
  const bookings = useSelector(state => state.bookingRequests.bookingsArrayOfSingleUser);
  useDarkStatusBar();
  useHideSupportFab();

  const passed = route.params?.order;
  const flow = route.params?.flow;
  const isRequest =
    typeof route.params?.isRequest === 'boolean'
      ? route.params.isRequest
      : Boolean(passed?.bookingId && !passed?.orderId);

  // The live copy from the store, so a payment or refund shows up on return.
  const order = useMemo(() => {
    if (!passed) return passed;
    const list = isRequest ? bookings : ordersApi;
    const id = isRequest ? passed.bookingId : passed.orderId;
    return (Array.isArray(list) ? list : []).find(record => (isRequest ? record?.bookingId : record?.orderId) === id) || passed;
  }, [passed, isRequest, ordersApi, bookings]);

  const [courierEvents, setCourierEvents] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [viewing, setViewing] = useState(null);
  const { payFor, refundFor, refunding, openRefund, closeRefund, submitRefund } = useOrderActions();

  useEffect(() => {
    if (!order?.courierTrackingId) return undefined;

    let active = true;
    trackParcel(order.courierTrackingId)
      .then(
        data =>
          active &&
          setCourierEvents(Array.isArray(data?.tracking) ? data.tracking : []),
      )
      .catch(() => active && setCourierEvents([]));

    return () => {
      active = false;
    };
  }, [order?.courierTrackingId]);

  /** Pull to refresh: reload the customer's orders and requests, as the list does. */
  const onRefresh = useCallback(async () => {
    if (!currentUser?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(getAllOrdersApiRedux(currentUser.id)),
        dispatch(getAllBookingsOfSingleUserRedux(currentUser.id)),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, currentUser?.id]);

  if (!order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Order details" icon="navigate" />
        <Animated.View
          entering={FadeInUp.duration(380).easing(EASE)}
          style={styles.missing}
        >
          <View style={styles.missingIcon}>
            <Icon name="help-circle" size={30} color={colors.primary} />
          </View>
          <Text style={styles.missingTitle}>Order not found</Text>
          <PressableScale
            onPress={() => navigation.navigate(ROUTES.DASHBOARD)}
            scaleTo={0.95}
            style={styles.ctaShadow}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Back to orders</Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  const stage = stageOf(order);
  const timeline = buildTimeline(order);
  const payment = paymentStateOf(order);
  const reference = asText(order.orderId || order.bookingId);
  const tracking = asText(order.trackingNo);
  const notice = orderNotice(order);
  const facts = orderFacts(order, isRequest).filter(fact => fact.value);
  const lines = detailLines(order, isRequest);
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);
  const shownLines = showAllItems ? lines : lines.slice(0, ITEMS_PREVIEW);
  const money = chargeBreakdown(order);
  const share = paidShare(money);
  const refund = refundState(order);
  const photo = warehousePhoto(order, isRequest);
  const rejected = !showsProgress(order);

  const payable = canPay(order, isRequest ? BUCKETS.REQUESTS : BUCKETS.ORDERS);
  const refundable = canRefund(order);
  const invoice = hasInvoice(order);
  const hasActions = payable || refundable || invoice;

  const copy = (label, value) => {
    Clipboard.setString(value);
    notifyInfo(`${label} copied`, value);
  };
  const summary = () => orderSummaryText({ record: order, isRequest, symbol });
  const shareSummary = () => Share.share({ message: summary() }).catch(() => {});
  const openLink = url => Linking.openURL(url).catch(() => notifyInfo('Could not open the link', url));

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${isRequest ? 'Request' : 'Order'} #${reference}`}
        subtitle={asText(order.shopName) || asText(order.store) || 'Order details'}
        icon={isRequest ? 'document-text' : 'receipt'}
        right={
          <PressableScale onPress={shareSummary} scaleTo={0.9} style={styles.headerAction} accessibilityLabel="Share order summary">
            <Icon name="share-outline" size={18} color={INK} />
          </PressableScale>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, hasActions && styles.contentWithBar]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Hero: stage, mini stepper, quick stats and IDs */}
        <Animated.View entering={FadeIn.duration(380)} style={styles.heroShadow}>
          <LinearGradient
            colors={rejected ? ['#e11d48', INK] : [stage.color, INK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBlob} />
            <View style={styles.heroBlobSmall} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Icon name={rejected ? 'close-circle' : stage.icon} size={24} color={colors.white} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>{rejected ? 'Status' : `Step ${stage.score} of ${STAGES.length}`}</Text>
                <Text style={styles.heroStage}>{rejected ? 'Rejected' : stage.label}</Text>
              </View>
              <View style={styles.heroPill}>
                <Icon name="wallet-outline" size={12} color={colors.white} />
                <Text style={styles.heroPillText}>{payment.label}</Text>
              </View>
            </View>

            {rejected ? null : <StageStepper score={stage.score} />}

            <View style={styles.heroStats}>
              <HeroStat icon="cube-outline" label="Pieces" value={String(pieces)} />
              <HeroStat icon="pricetag-outline" label="Total" value={formatPrice(money.total, symbol)} />
              <HeroStat
                icon={money.due > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                label="Due"
                value={money.due > 0 ? formatPrice(money.due, symbol) : 'Clear'}
                tone={money.due > 0 ? '#ffd5c7' : '#a7f3d0'}
              />
            </View>

            <View style={styles.heroChips}>
              <PressableScale onPress={() => copy(isRequest ? 'Booking ID' : 'Order ID', reference)} scaleTo={0.94} style={styles.heroChip}>
                <Icon name="receipt-outline" size={12} color={colors.white} />
                <Text style={styles.heroChipText}>#{reference}</Text>
                <Icon name="copy-outline" size={11} color="rgba(255,255,255,0.8)" />
              </PressableScale>
              {tracking ? (
                <PressableScale onPress={() => copy('Tracking number', tracking)} scaleTo={0.94} style={styles.heroChip}>
                  <Icon name="barcode-outline" size={12} color={colors.white} />
                  <Text style={styles.heroChipText}>{tracking}</Text>
                  <Icon name="copy-outline" size={11} color="rgba(255,255,255,0.8)" />
                </PressableScale>
              ) : null}
              {refund ? (
                <View style={[styles.heroChip, refund.rejected ? styles.heroChipBad : styles.heroChipWarn]}>
                  <Icon name="return-down-back" size={12} color={colors.white} />
                  <Text style={styles.heroChipText}>
                    {refund.status ? `Refund ${refund.status}` : 'Refunded'}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInUp.delay(40).duration(380).easing(EASE)} style={styles.quick}>
          <QuickAction icon="copy" label="Copy summary" tint="#eef2ff" color="#4f46e5" onPress={() => copy('Order summary', summary())} />
          <QuickAction icon="share-social" label="Share" tint="#fff2e5" color="#f97316" onPress={shareSummary} />
          {invoice ? (
            <QuickAction
              icon="document-text"
              label="Invoice"
              tint="#fdeefe"
              color="#c026d3"
              onPress={() => navigation.navigate(ROUTES.INVOICE, { order, flow, isRequest })}
            />
          ) : (
            <QuickAction icon="refresh" label="Refresh" tint="#ecfdf5" color="#059669" onPress={onRefresh} />
          )}
        </Animated.View>

        {/* Where the order stands, in the website's words */}
        {notice ? (
          <Animated.View
            entering={FadeInUp.delay(60).duration(380).easing(EASE)}
            style={[styles.notice, { backgroundColor: notice.tint, borderColor: notice.border }]}
          >
            <View style={[styles.noticeIcon, { backgroundColor: notice.color }]}>
              <Icon name={notice.icon} size={18} color={colors.white} />
            </View>
            <View style={styles.noticeText}>
              <Text style={[styles.noticeTitle, { color: notice.color }]}>{notice.title}</Text>
              <Text style={styles.noticeBody}>{notice.body}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* At a glance: the web row's header facts */}
        <Animated.View entering={FadeInUp.delay(90).duration(400).easing(EASE)} style={styles.card}>
          <CardTitle icon="information-circle" tint="#eef2ff" color="#4f46e5" title="At a glance" right={<Text style={styles.cardHint}>Tap to copy</Text>} />
          <GlanceGrid facts={facts} onCopy={copy} />
        </Animated.View>

        {/* Timeline — the web hides it once rejected */}
        {rejected ? null : (
          <Animated.View entering={FadeInUp.delay(120).duration(400).easing(EASE)} style={styles.card}>
            <JourneyTimeline stages={timeline} score={order.shipmentStatusScore} title="Shipment progress" />
          </Animated.View>
        )}

        {/* Courier updates */}
        {courierEvents?.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(380).easing(EASE)} style={styles.card}>
            <CardTitle
              icon="bicycle"
              tint="#ecfdf5"
              color="#059669"
              title="Courier updates"
              right={<Text style={styles.cardHint}>RedX</Text>}
            />
            {courierEvents.map((event, index) => (
              <View key={index} style={styles.event}>
                <View style={styles.eventRail}>
                  <View style={[styles.eventDot, index === 0 && styles.eventDotLatest]} />
                  {index < courierEvents.length - 1 ? <View style={styles.eventLine} /> : null}
                </View>
                <View style={styles.eventText}>
                  <Text style={[styles.eventStatus, index === 0 && styles.eventStatusLatest]}>
                    {asText(event?.messageEn) || asText(event?.status) || 'Update'}
                  </Text>
                  <Text style={styles.eventTime}>{asText(event?.time)}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {/* Goods, one line per sku */}
        {lines.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(160).duration(400).easing(EASE)} style={styles.card}>
            <CardTitle
              icon="cube"
              tint="#fdeefe"
              color="#c026d3"
              title={isRequest ? 'Product' : 'Items'}
              right={
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>
                    {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {pieces} pcs
                  </Text>
                </View>
              }
            />
            {shownLines.map((line, index) => (
              <ItemLine
                key={line.key}
                line={line}
                symbol={symbol}
                divided={index > 0}
                onImage={setViewing}
                onLink={openLink}
              />
            ))}
            {lines.length > ITEMS_PREVIEW ? (
              <PressableScale onPress={() => setShowAllItems(value => !value)} scaleTo={0.97} style={styles.moreBtn}>
                <Text style={styles.moreText}>
                  {showAllItems ? 'Show less' : `Show all ${lines.length} lines`}
                </Text>
                <Icon name={showAllItems ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
              </PressableScale>
            ) : null}
          </Animated.View>
        ) : null}

        {/* The abroad warehouse's photo of the parcel */}
        {photo ? (
          <Animated.View entering={FadeInUp.delay(190).duration(400).easing(EASE)} style={styles.card}>
            <CardTitle icon="camera" tint="#e0f2fe" color="#0284c7" title="Abroad warehouse received" />
            <PressableScale onPress={() => setViewing(photo)} scaleTo={0.98}>
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              <View style={styles.photoBadge}>
                <Icon name="expand" size={12} color={colors.white} />
                <Text style={styles.photoBadgeText}>Tap to enlarge</Text>
              </View>
            </PressableScale>
          </Animated.View>
        ) : null}

        {/* Payment */}
        <Animated.View entering={FadeInUp.delay(220).duration(400).easing(EASE)} style={styles.card}>
          <CardTitle
            icon="wallet"
            tint="#fff2e5"
            color="#f97316"
            title="Payment"
            right={
              <View style={[styles.payChip, payment.tone === 'paid' && styles.payChipPaid]}>
                <Text style={[styles.payChipText, payment.tone === 'paid' && styles.payChipTextPaid]}>{payment.label}</Text>
              </View>
            }
          />
          <PaymentProgress share={share} paid={money.paid} total={money.total} symbol={symbol} />
          {money.rows.map(item => (
            <Row
              key={item.key}
              label={item.label}
              hint={item.hint}
              value={`${item.sign || ''}${formatPrice(item.value, symbol)}`}
              tone={item.sign === '-' ? '#059669' : undefined}
            />
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.rowLabelStrong}>Total</Text>
            <Text style={styles.rowValueStrong}>{formatPrice(money.total, symbol)}</Text>
          </View>
          <Row label="Paid" value={formatPrice(money.paid, symbol)} tone="#059669" />
          {refund?.amount ? <Row label="Refunded" value={formatPrice(refund.amount, symbol)} tone="#d97706" /> : null}
          <View style={[styles.dueBox, money.due <= 0 && styles.dueBoxClear]}>
            <View>
              <Text style={styles.dueLabel}>{money.due > 0 ? 'Due now' : 'Nothing due'}</Text>
              {money.due > 0 && !payable && payment.tone === 'pending' ? (
                <Text style={styles.dueHint}>Your payment is being confirmed</Text>
              ) : null}
            </View>
            <Text style={[styles.dueValue, money.due <= 0 && styles.dueClear]}>{formatPrice(money.due, symbol)}</Text>
          </View>

          {money.payments.length > 0 ? <PaymentHistory payments={money.payments} symbol={symbol} /> : null}
        </Animated.View>

        {/* Help */}
        <Animated.View entering={FadeInUp.delay(260).duration(400).easing(EASE)} style={styles.helpWrap}>
          <HelpCard reference={reference} isRequest={isRequest} />
        </Animated.View>
      </ScrollView>

      {hasActions ? (
        <BottomActionBar style={styles.bar}>
          {invoice ? (
            <PressableScale
              onPress={() => navigation.navigate(ROUTES.INVOICE, { order, flow, isRequest })}
              scaleTo={0.94}
              style={styles.barSecondary}
              accessibilityLabel="Invoice"
            >
              <Icon name="document-text-outline" size={18} color={colors.primary} />
              {payable && refundable ? null : <Text style={styles.barSecondaryText}>Invoice</Text>}
            </PressableScale>
          ) : null}
          {refundable ? (
            <PressableScale onPress={() => openRefund(order)} scaleTo={0.94} style={[styles.barSecondary, styles.barRefund]}>
              <Icon name="return-down-back" size={18} color="#d97706" />
              <Text style={[styles.barSecondaryText, styles.refundText]}>Refund</Text>
            </PressableScale>
          ) : null}
          {payable ? (
            <PressableScale onPress={() => payFor(order, isRequest)} scaleTo={0.96} style={[styles.ctaShadow, styles.barPrimary]}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Icon name="wallet" size={16} color={colors.white} />
                <Text style={styles.ctaText}>Pay {formatPrice(money.due, symbol)}</Text>
              </LinearGradient>
            </PressableScale>
          ) : null}
        </BottomActionBar>
      ) : null}

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />

      <RefundSheet
        visible={Boolean(refundFor)}
        order={refundFor}
        isRequest={isRequest}
        symbol={symbol}
        submitting={refunding}
        onClose={closeRefund}
        onSubmit={submitRefund}
      />
    </View>
  );
};

const QuickAction = ({ icon, label, tint, color, onPress }) => (
  <PressableScale onPress={onPress} scaleTo={0.94} style={styles.quickItem}>
    <View style={[styles.quickIcon, { backgroundColor: tint }]}>
      <Icon name={icon} size={17} color={color} />
    </View>
    <Text style={styles.quickLabel} numberOfLines={1}>
      {label}
    </Text>
  </PressableScale>
);

const CardTitle = ({ icon, tint, color, title, right }) => (
  <View style={styles.cardTitleRow}>
    <View style={[styles.tile, { backgroundColor: tint }]}>
      <Icon name={icon} size={15} color={color} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    {right}
  </View>
);

const Row = ({ label, value, tone, hint }) => (
  <View style={styles.row}>
    <View style={styles.rowLabelCol}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? (
        <View style={styles.rowHintChip}>
          <Icon name="scale-outline" size={11} color="#2563eb" />
          <Text style={styles.rowHint}>{hint}</Text>
        </View>
      ) : null}
    </View>
    <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
  </View>
);

const cardShadow = {
  shadowColor: '#5b5f7a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  contentWithBar: { paddingBottom: 116 },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...cardShadow,
  },
  heroShadow: {
    borderRadius: 24,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  hero: { padding: 16, borderRadius: 24, overflow: 'hidden' },
  heroBlob: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBlobSmall: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, marginLeft: 12 },
  heroLabel: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  heroStage: { marginTop: 1, fontSize: typography.size.xl, fontWeight: '800', color: colors.white },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroPillText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.white },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroChipWarn: { backgroundColor: 'rgba(245,158,11,0.55)' },
  heroChipBad: { backgroundColor: 'rgba(225,29,72,0.6)' },
  heroChipText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.white },
  quick: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    ...cardShadow,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { marginTop: 6, fontSize: 12, fontWeight: typography.weight.semiBold, color: INK },
  notice: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, padding: 14, borderRadius: 20, borderWidth: 1 },
  noticeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1, marginLeft: 12 },
  noticeTitle: { fontSize: typography.size.sm + 1, fontWeight: '800' },
  noticeBody: { marginTop: 2, fontSize: typography.size.xs + 1, color: colors.textSecondary },
  card: { marginTop: spacing.md, padding: 14, borderRadius: 22, backgroundColor: colors.white, ...cardShadow },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tile: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  cardHint: { fontSize: 11, fontWeight: typography.weight.semiBold, color: colors.textMuted },
  event: { flexDirection: 'row' },
  eventRail: { width: 14, alignItems: 'center' },
  eventDot: { width: 10, height: 10, marginTop: 4, borderRadius: 5, backgroundColor: '#d9d9e3' },
  eventDotLatest: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#059669', borderWidth: 2, borderColor: '#bbf7d0' },
  eventLine: { width: 2, flex: 1, minHeight: 14, marginVertical: 2, backgroundColor: '#ececf1' },
  eventText: { flex: 1, marginLeft: 10, paddingBottom: 12 },
  eventStatus: { fontSize: typography.size.sm, color: colors.textSecondary },
  eventStatusLatest: { fontWeight: typography.weight.bold, color: INK },
  eventTime: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  countChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#fdeefe' },
  countChipText: { fontSize: 11, fontWeight: '800', color: '#a21caf' },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff3ef',
  },
  moreText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  photo: { width: '100%', height: 210, borderRadius: 16, backgroundColor: '#f1f1f5' },
  photoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(31,35,64,0.6)',
  },
  photoBadgeText: { fontSize: 11, fontWeight: typography.weight.bold, color: colors.white },
  payChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#fff2e5' },
  payChipPaid: { backgroundColor: '#dcfce7' },
  payChipText: { fontSize: 11, fontWeight: '800', color: '#c2410c' },
  payChipTextPaid: { color: '#059669' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabelCol: { flex: 1, marginRight: 10 },
  rowHintChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#eef4ff' },
  rowHint: { fontSize: 11, fontWeight: typography.weight.semiBold, color: '#2563eb' },
  rowLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dcdce4',
  },
  rowLabelStrong: { fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  rowValueStrong: { fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  dueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#fff1ee',
  },
  dueBoxClear: { backgroundColor: '#ecfdf5' },
  dueLabel: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  dueHint: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  dueValue: { fontSize: typography.size.lg, fontWeight: '800', color: colors.primary },
  dueClear: { color: '#059669' },
  helpWrap: { marginTop: spacing.md },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 50,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#fff3ef',
  },
  barRefund: { backgroundColor: '#fffbeb' },
  barSecondaryText: { fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold, color: colors.primary },
  refundText: { color: '#d97706' },
  barPrimary: { flex: 1 },
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
    justifyContent: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  ctaText: { color: colors.white, fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  missingIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.text,
  },
});

export default TrackingDetailsScreen;
