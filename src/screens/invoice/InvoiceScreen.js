import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { PressableScale, ScreenHeader } from '../../components';
import BottomActionBar from '../../components/BottomActionBar';
import { useHideSupportFab } from '../../components/SupportFab';
import { useDarkStatusBar } from '../../hooks';
import { getSingleOrderApi } from '../../firebase/orders';
import { getSingleProductRequest } from '../../firebase/freight';
import { getSingleUser } from '../../firebase/users';
import { INVOICE_LOGO, INVOICE_PAID_STAMP } from '../../constants/invoiceAssets';
import {
  billingContact,
  buildInvoiceHtml,
  invoiceLines,
  invoiceNumber,
  invoiceTotals,
  isInvoicePaid,
  isProductRequest,
} from '../../utils/invoiceHtml';
import { BUCKETS, canPay } from '../../utils/dashboard';
import { formatPrice } from '../../utils/format';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify';
import { saveInvoicePdf, shareInvoicePdf } from '../../utils/invoicePdf';
import { ROUTES } from '../../navigation/routes';
import useOrderActions from '../dashboard/components/useOrderActions';
import { invoiceFacts, invoiceRows, invoiceStatus } from './invoiceSummary';
import { colors, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const EASE = Easing.out(Easing.cubic);
const INK = '#1f2340';

const STATUS_LOOK = {
  paid: { color: '#16a34a', tint: '#ecfdf3', icon: 'checkmark-circle' },
  partial: { color: '#d97706', tint: '#fffbeb', icon: 'pie-chart' },
  due: { color: colors.primary, tint: '#fff1ee', icon: 'alert-circle' },
};

const VIEWS = [
  { key: 'summary', label: 'Summary', icon: 'list' },
  { key: 'document', label: 'Document', icon: 'document-text' },
];

const enter = index => FadeInUp.delay(60 + index * 60).duration(380).easing(EASE);

/**
 * The invoice for an order or product request, as the website's invoice page.
 * The latest record is fetched again (the web loads it by id) with the
 * customer's profile. "Summary" shows it natively — status, facts, goods,
 * charges, payments — and "Document" previews the web's printable invoice,
 * which is exported to a PDF to share or save in place of the browser's print
 * dialog. "Pay" appears when the order can still be paid.
 */
const InvoiceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const passed = route.params?.order;
  const isRequest = isProductRequest(passed, route.params?.isRequest);
  const currentUser = useSelector(state => state.user.currentUser);
  const symbol = useSelector(state => state.data.symbol);
  const { payFor } = useOrderActions();

  useDarkStatusBar();
  useHideSupportFab();

  const [order, setOrder] = useState(passed);
  const [user, setUser] = useState(currentUser);
  const [loading, setLoading] = useState(Boolean(passed));
  const [busy, setBusy] = useState(null);
  const [view, setView] = useState('summary');
  const [previewReady, setPreviewReady] = useState(false);
  const [toggleWidth, setToggleWidth] = useState(0);
  const slide = useSharedValue(0);

  useEffect(() => {
    if (!passed) return undefined;
    let alive = true;
    const id = passed.orderId || passed.bookingId;
    (async () => {
      const [fresh, owner] = await Promise.all([
        isRequest ? getSingleProductRequest(id) : getSingleOrderApi(id),
        passed.userId && passed.userId !== currentUser?.id ? getSingleUser(passed.userId) : Promise.resolve(null),
      ]);
      if (!alive) return;
      if (fresh) setOrder(fresh);
      if (owner) setUser(owner);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [passed, isRequest, currentUser?.id]);

  useEffect(() => {
    slide.value = withTiming(view === 'summary' ? 0 : 1, { duration: 260, easing: EASE });
  }, [view, slide]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * (toggleWidth / 2) }],
  }));

  const html = useMemo(
    () => (order ? buildInvoiceHtml(order, { user, isRequest, logo: INVOICE_LOGO, paidStamp: INVOICE_PAID_STAMP }) : ''),
    [order, user, isRequest],
  );

  if (!order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Invoice" icon="document-text" />
        <Animated.View entering={FadeInUp.duration(380).easing(EASE)} style={styles.missing}>
          <View style={styles.missingIcon}>
            <Icon name="document-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.missingTitle}>No invoice to show</Text>
          <PressableScale onPress={() => navigation.navigate(ROUTES.DASHBOARD)} scaleTo={0.95} style={styles.ctaShadow}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.missingCta}>
              <Text style={styles.ctaText}>Back to orders</Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  const number = invoiceNumber(order);
  const sums = invoiceTotals(order, isRequest);
  const status = invoiceStatus(order, isRequest);
  const look = STATUS_LOOK[status.key];
  const stamped = isInvoicePaid(order);
  const facts = invoiceFacts(order, isRequest);
  const rows = invoiceRows(order, isRequest);
  const lines = invoiceLines(order, isRequest);
  const contact = billingContact(order, user);
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const payable = canPay(order, isRequest ? BUCKETS.REQUESTS : BUCKETS.ORDERS);

  const copy = (label, value) => {
    Clipboard.setString(value);
    notifyInfo(`${label} copied`, value);
  };

  const exportPdf = async shareIt => {
    setBusy(shareIt ? 'share' : 'save');
    try {
      if (shareIt) {
        await shareInvoicePdf(html, number);
      } else {
        const where = await saveInvoicePdf(html, number);
        if (where === 'downloads') notifySuccess('Invoice saved', 'Find it in Downloads › ALG.');
      }
    } catch (error) {
      notifyError(error, shareIt ? 'Could not share the invoice.' : 'Could not save the invoice.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Invoice"
        subtitle={`#${number}`}
        icon="document-text"
        right={
          <PressableScale onPress={() => copy('Invoice number', number)} scaleTo={0.9} style={styles.headerBtn} accessibilityLabel="Copy invoice number">
            <Icon name="copy-outline" size={17} color={INK} />
          </PressableScale>
        }
      >
        {/* At a glance */}
        <Animated.View entering={FadeInUp.duration(380).easing(EASE)} style={styles.glance}>
          {stamped ? (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>PAID</Text>
            </View>
          ) : null}
          <View style={styles.glanceTop}>
            <View style={[styles.statusPill, { backgroundColor: look.tint }]}>
              <Icon name={look.icon} size={13} color={look.color} />
              <Text style={[styles.statusText, { color: look.color }]}>{status.label}</Text>
            </View>
            {loading ? (
              <View style={styles.syncing}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.syncText}>Updating</Text>
              </View>
            ) : (
              <Text style={styles.glanceDate}>{facts.find(f => f.label === 'Submitted on')?.value || ''}</Text>
            )}
          </View>
          <View style={styles.glanceAmounts}>
            <Amount label="Total" value={formatPrice(sums.total, symbol)} />
            <Amount label="Paid" value={formatPrice(sums.paid, symbol)} color="#16a34a" />
            <Amount label="Due" value={formatPrice(sums.due, symbol)} color={sums.due > 0 ? colors.primary : '#16a34a'} />
          </View>
          <View style={styles.track}>
            <Animated.View entering={FadeIn.delay(200).duration(400)} style={[styles.trackFill, { width: `${Math.round(status.progress * 100)}%`, backgroundColor: look.color }]} />
          </View>
          <Text style={styles.trackText}>{Math.round(status.progress * 100)}% paid</Text>
        </Animated.View>

        {/* Summary / Document */}
        <View style={styles.toggle} onLayout={event => setToggleWidth(event.nativeEvent.layout.width - 8)}>
          {toggleWidth ? <Animated.View style={[styles.togglePill, { width: toggleWidth / 2 }, pillStyle]} /> : null}
          {VIEWS.map(option => {
            const on = option.key === view;
            return (
              <PressableScale key={option.key} onPress={() => setView(option.key)} scaleTo={0.96} style={styles.toggleItem}>
                <Icon name={option.icon} size={14} color={on ? colors.primary : colors.textMuted} />
                <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{option.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </ScreenHeader>

      {view === 'summary' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summary}>
          {/* Billed to */}
          <Animated.View entering={enter(0)} style={styles.card}>
            <CardTitle icon="person" tint="#eef2ff" color="#4f46e5" title="Billed to" />
            <Text style={styles.who}>{contact.name || '—'}</Text>
            {contact.address ? <Text style={styles.whoLine}>{contact.address}</Text> : null}
            {contact.area ? <Text style={styles.whoLine}>{contact.area}</Text> : null}
            <View style={styles.whoChips}>
              {contact.mobile ? <MiniChip icon="call-outline" text={contact.mobile} /> : null}
              {contact.email ? <MiniChip icon="mail-outline" text={contact.email} /> : null}
            </View>
          </Animated.View>

          {/* Details */}
          <Animated.View entering={enter(1)} style={styles.card}>
            <CardTitle icon="information-circle" tint="#e0f2fe" color="#0284c7" title="Details" />
            {facts.map(fact =>
              fact.copy ? (
                <PressableScale key={fact.label} onPress={() => copy(fact.label, fact.value.replace(/^#/, ''))} scaleTo={0.98} style={styles.row}>
                  <Text style={styles.rowLabel}>{fact.label}</Text>
                  <View style={styles.copyValue}>
                    <Text style={styles.rowValue} numberOfLines={1}>{fact.value}</Text>
                    <Icon name="copy-outline" size={12} color={colors.textMuted} />
                  </View>
                </PressableScale>
              ) : (
                <View key={fact.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{fact.label}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>{fact.value}</Text>
                </View>
              ),
            )}
          </Animated.View>

          {/* Goods */}
          <Animated.View entering={enter(2)} style={styles.card}>
            <CardTitle
              icon="cube"
              tint="#fdeefe"
              color="#c026d3"
              title={isRequest ? 'Product' : 'Items'}
              right={<Text style={styles.cardMeta}>{lines.reduce((sum, line) => sum + line.quantity, 0)} pcs</Text>}
            />
            {lines.length === 0 ? <Text style={styles.empty}>No line items recorded.</Text> : null}
            {lines.map((line, index) => (
              <View key={`${line.name}-${index}`} style={[styles.line, index > 0 && styles.lineDivided]}>
                <View style={styles.lineIndex}>
                  <Text style={styles.lineIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.lineBody}>
                  <Text style={styles.lineName} numberOfLines={2}>{line.name}</Text>
                  {line.variant ? <Text style={styles.lineVariant}>{line.variant}</Text> : null}
                  <Text style={styles.lineUnit}>
                    {formatPrice(line.unit, symbol)} × {line.quantity}
                  </Text>
                </View>
                <Text style={styles.lineAmount}>{formatPrice(line.amount, symbol)}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Charges */}
          <Animated.View entering={enter(3)} style={styles.card}>
            <CardTitle icon="calculator" tint="#fff2e5" color="#f97316" title="Charges" />
            {rows.map(row => (
              <View key={row.key} style={[styles.row, row.strong && styles.rowStrong]}>
                <Text style={[styles.rowLabel, row.strong && styles.rowLabelStrong]}>
                  {row.label}
                  {row.note ? <Text style={styles.rowNote}>  {row.note}</Text> : null}
                </Text>
                <Text style={[styles.rowValue, row.sign === '-' && styles.minus, row.strong && styles.rowValueStrong]}>
                  {row.sign || ''}
                  {formatPrice(row.value, symbol)}
                </Text>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total paid</Text>
              <Text style={[styles.rowValue, styles.minus]}>{formatPrice(sums.paid, symbol)}</Text>
            </View>
            {sums.refunded ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Refunded</Text>
                <Text style={[styles.rowValue, styles.refund]}>{formatPrice(sums.refunded, symbol)}</Text>
              </View>
            ) : null}
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dueBand}>
              <Text style={styles.dueLabel}>Total bill due</Text>
              <Text style={styles.dueValue}>{formatPrice(sums.due, symbol)}</Text>
            </LinearGradient>
            <Text style={styles.footnote}>Freight, approx. customs duty and 5% service charge included.</Text>
          </Animated.View>

          {/* Payments */}
          <Animated.View entering={enter(4)} style={styles.card}>
            <CardTitle icon="wallet" tint="#ecfdf5" color="#059669" title="Payments" right={<Text style={styles.cardMeta}>{payments.length}</Text>} />
            {payments.length === 0 ? <Text style={styles.empty}>No payments yet.</Text> : null}
            {payments.map((payment, index) => (
              <View key={`${payment?.paymentId || index}`} style={styles.payment}>
                <View style={styles.paymentIcon}>
                  <Icon name="checkmark" size={13} color="#059669" />
                </View>
                <View style={styles.paymentText}>
                  <Text style={styles.paymentMethod}>{String(payment?.method || 'Payment')}</Text>
                  {payment?.date ? <Text style={styles.paymentDate}>{String(payment.date)}</Text> : null}
                </View>
                <Text style={styles.paymentAmount}>{formatPrice(parseInt(payment?.amount, 10) || 0, symbol)}</Text>
              </View>
            ))}
          </Animated.View>
          <View style={styles.brand}>
            <Image source={{ uri: INVOICE_LOGO }} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandText}>Hotline +8801881934658 · info@alg.com.bd</Text>
          </View>
        </ScrollView>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={styles.paper}>
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={styles.preview}
            onLoadEnd={() => setPreviewReady(true)}
            showsVerticalScrollIndicator={false}
            scalesPageToFit
            setBuiltInZoomControls
            setDisplayZoomControls={false}
          />
          {loading || !previewReady ? (
            <Animated.View entering={FadeIn} style={styles.loader} pointerEvents="none">
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loaderText}>{loading ? 'Getting the latest invoice…' : 'Preparing preview…'}</Text>
            </Animated.View>
          ) : (
            <View style={styles.zoomHint} pointerEvents="none">
              <Icon name="expand-outline" size={12} color={colors.white} />
              <Text style={styles.zoomHintText}>Pinch to zoom</Text>
            </View>
          )}
        </Animated.View>
      )}

      <BottomActionBar style={styles.bar}>
        <PressableScale onPress={busy ? undefined : () => exportPdf(false)} scaleTo={0.92} style={styles.iconBtn} accessibilityLabel="Save PDF">
          {busy === 'save' ? <ActivityIndicator color={colors.primary} /> : <Icon name="download-outline" size={20} color={colors.primary} />}
        </PressableScale>
        {payable ? (
          <PressableScale onPress={busy ? undefined : () => exportPdf(true)} scaleTo={0.92} style={styles.iconBtn} accessibilityLabel="Share PDF">
            {busy === 'share' ? <ActivityIndicator color={colors.primary} /> : <Icon name="share-social-outline" size={20} color={colors.primary} />}
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={busy ? undefined : payable ? () => payFor(order, isRequest) : () => exportPdf(true)}
          scaleTo={0.96}
          style={[styles.ctaShadow, styles.primaryWrap]}
        >
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            {busy === 'share' && !payable ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name={payable ? 'wallet' : 'share-social'} size={17} color={colors.white} />
                <Text style={styles.ctaText}>{payable ? `Pay ${formatPrice(sums.due, symbol)}` : 'Share PDF'}</Text>
              </>
            )}
          </LinearGradient>
        </PressableScale>
      </BottomActionBar>
    </View>
  );
};

const Amount = ({ label, value, color = INK }) => (
  <View style={styles.amount}>
    <Text style={styles.amountLabel}>{label}</Text>
    <Text style={[styles.amountValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
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

const MiniChip = ({ icon, text }) => (
  <View style={styles.miniChip}>
    <Icon name={icon} size={12} color={colors.textSecondary} />
    <Text style={styles.miniChipText} numberOfLines={1}>{text}</Text>
  </View>
);

const card = {
  borderRadius: 22,
  backgroundColor: colors.white,
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  glance: { ...card, marginTop: spacing.md, padding: 14, overflow: 'hidden' },
  ribbon: {
    position: 'absolute',
    top: 14,
    right: -34,
    width: 120,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#16a34a',
    transform: [{ rotate: '35deg' }],
  },
  ribbonText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: colors.white },
  glanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: typography.size.xs + 1, fontWeight: '800' },
  syncing: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncText: { fontSize: typography.size.xs, color: colors.textMuted },
  glanceDate: { fontSize: typography.size.xs, color: colors.textMuted },
  glanceAmounts: { flexDirection: 'row', marginTop: 12 },
  amount: { flex: 1 },
  amountLabel: { fontSize: typography.size.xs, color: colors.textMuted, fontWeight: typography.weight.semiBold },
  amountValue: { marginTop: 2, fontSize: typography.size.md + 1, fontWeight: '800' },
  track: { height: 6, marginTop: 12, borderRadius: 3, backgroundColor: '#f0f0f4', overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  trackText: { marginTop: 5, fontSize: 11, color: colors.textMuted },
  toggle: { flexDirection: 'row', marginTop: 12, padding: 4, borderRadius: 16, backgroundColor: '#ececf1' },
  togglePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38 },
  toggleText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.textMuted },
  toggleTextOn: { color: colors.primary },
  summary: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 120 },
  card: { ...card, marginTop: spacing.md, padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tile: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.md, fontWeight: '800', color: INK },
  cardMeta: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.textSecondary },
  who: { fontSize: typography.size.md, fontWeight: '800', color: INK },
  whoLine: { marginTop: 2, fontSize: typography.size.sm, lineHeight: 19, color: colors.textSecondary },
  whoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: '#f3f3f7' },
  miniChipText: { flexShrink: 1, fontSize: 12, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowStrong: { marginTop: 4, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dcdce4' },
  rowLabel: { flexShrink: 1, fontSize: typography.size.sm, color: colors.textSecondary },
  rowLabelStrong: { fontWeight: '800', color: INK },
  rowNote: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  rowValue: { marginLeft: 12, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: INK },
  rowValueStrong: { fontWeight: '800', fontSize: typography.size.sm + 1 },
  minus: { color: '#059669' },
  refund: { color: '#d97706' },
  copyValue: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, marginLeft: 12 },
  line: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  lineDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e4e4ec' },
  lineIndex: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f3f7' },
  lineIndexText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  lineBody: { flex: 1, marginHorizontal: 10 },
  lineName: { fontSize: typography.size.sm, lineHeight: 19, fontWeight: typography.weight.semiBold, color: INK },
  lineVariant: { marginTop: 2, fontSize: 11.5, color: colors.textMuted },
  lineUnit: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  lineAmount: { fontSize: typography.size.sm + 1, fontWeight: '800', color: INK },
  empty: { fontSize: typography.size.sm, color: colors.textMuted },
  dueBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  dueLabel: { fontSize: typography.size.sm, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  dueValue: { fontSize: typography.size.lg, fontWeight: '900', color: colors.white },
  footnote: { marginTop: 10, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  payment: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  paymentIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' },
  paymentText: { flex: 1, marginLeft: 10 },
  paymentMethod: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: INK },
  paymentDate: { marginTop: 1, fontSize: 11, color: colors.textMuted },
  paymentAmount: { fontSize: typography.size.sm, fontWeight: '800', color: '#059669' },
  brand: { alignItems: 'center', marginTop: spacing.lg, opacity: 0.8 },
  brandLogo: { width: 110, height: 50 },
  brandText: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  paper: { ...card, flex: 1, marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: 96, overflow: 'hidden' },
  preview: { flex: 1, backgroundColor: colors.white },
  loader: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  loaderText: { fontSize: typography.size.sm, color: colors.textMuted },
  zoomHint: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(31,35,64,0.6)',
  },
  zoomHintText: { fontSize: 10.5, fontWeight: typography.weight.bold, color: colors.white },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff3ef' },
  primaryWrap: { flex: 1 },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cta: { flexDirection: 'row', gap: 8, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0ec',
  },
  missingTitle: { marginTop: 12, marginBottom: 18, fontSize: typography.size.lg, fontWeight: '800', color: INK },
  missingCta: { height: 48, paddingHorizontal: 26, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

export default InvoiceScreen;
