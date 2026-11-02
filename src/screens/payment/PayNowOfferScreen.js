import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { BottomActionBar, PressableScale } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { useDarkStatusBar } from '../../hooks';
import { getPayNowOffer } from '../../utils/order';
import { formatPrice } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const INK = '#1f2340';

/** Look per choice: paying more now earns the bigger discount. */
const CHOICE_LOOKS = {
  100: { icon: 'flash', colors: ['#34d399', '#059669'], tag: 'Best value' },
  80: { icon: 'trending-up', colors: ['#7aa8ff', '#4f46e5'], tag: null },
  60: { icon: 'wallet', colors: ['#ffb35c', '#f97316'], tag: null },
};

/**
 * The web's `discountModal.js`, shown right after placing an order when
 * advance-payment offers exist: pay 100%, 80% or 60% now, each with its own
 * discount from `partials[0]`. "Proceed to Pay" opens the payment sheet with
 * the web's amounts.
 *
 * Params: `orders` (as stored), `total` (goods − coupon), `couponAmount`,
 * `partial` (`{ payNow100, payNow80, payNow60 }`).
 */
const PayNowOfferScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const symbol = useSelector(state => state.data.symbol);
  const { orders = [], total = 0, couponAmount = 0, partial } = route.params || {};
  useDarkStatusBar();
  // The pay bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const choices = useMemo(
    () =>
      partial
        ? [
            { key: '100', label: 'Pay 100% now', offer: `${partial.payNow100}%` },
            { key: '80', label: 'Pay 80% now', offer: `${partial.payNow80}%` },
            { key: '60', label: 'Pay 60% now', offer: `${partial.payNow60}%` },
          ]
        : [],
    [partial],
  );
  // The web starts on "pay 100%".
  const [offer, setOffer] = useState(choices[0]?.offer || '0%');
  const result = partial ? getPayNowOffer(partial, total, offer) : null;
  const saving = result ? Math.max(Math.round(total) - result.total, 0) : 0;
  const later = result ? Math.max(result.total - result.payableTotal, 0) : 0;

  const proceed = () => {
    if (!result) return;
    navigation.replace(ROUTES.PAYMENT_SHEET, {
      orders,
      newOrder: { ...result, couponAmount },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.text} />
          </PressableScale>
          <View style={styles.headerIcon}>
            <Icon name="gift" size={20} color={colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pay now & save</Text>
            <Text style={styles.headerSub}>
              {orders.length === 1 ? `Order #${orders[0].orderId}` : `${orders.length} orders`} · {formatPrice(total, symbol)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Savings hero */}
        <Animated.View entering={FadeInDown.duration(420)}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={[styles.blob, styles.blobA]} />
            <View style={[styles.blob, styles.blobB]} />
            <Text style={styles.heroLabel}>You save</Text>
            <Animated.Text key={saving} entering={ZoomIn.springify().damping(14)} style={styles.heroValue}>
              {formatPrice(saving, symbol)}
            </Animated.Text>
            {result ? (
              <View style={styles.heroChip}>
                <Icon name="pricetag" size={12} color={colors.primary} />
                <Text style={styles.heroChipText}>{result.offer} discount added</Text>
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>

        {/* The web's prompt: choose your advance payment percentage from the range below. */}
        <Text style={styles.prompt}>নিচের রেঞ্জ থেকে আপনার অগ্রীম পেমেন্ট পার্সেন্ট সিলেক্ট করুন</Text>

        {choices.map((choice, index) => {
          const selected = offer === choice.offer;
          const look = CHOICE_LOOKS[choice.key];
          const preview = getPayNowOffer(partial, total, choice.offer);
          return (
            <Animated.View key={choice.key} entering={FadeInDown.delay(80 + index * 70).duration(380)}>
              <PressableScale
                onPress={() => setOffer(choice.offer)}
                scaleTo={0.97}
                style={[styles.choice, selected && styles.choiceOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.choiceIcon}>
                  <Icon name={look.icon} size={20} color={colors.white} />
                </LinearGradient>
                <View style={styles.choiceText}>
                  <View style={styles.choiceTop}>
                    <Text style={styles.choiceLabel}>{choice.label}</Text>
                    {look.tag ? (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{look.tag}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.choiceHint}>
                    Pay {formatPrice(preview.payableTotal, symbol)} now · total {formatPrice(preview.total, symbol)}
                  </Text>
                </View>
                <View style={styles.choiceRight}>
                  <View style={[styles.offBadge, selected && styles.offBadgeOn]}>
                    <Text style={[styles.offText, selected && styles.offTextOn]}>{choice.offer} OFF</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.radioDot} /> : null}
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}

        {/* Breakdown */}
        {result ? (
          <Animated.View key={offer} entering={FadeIn.duration(250)} style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order total</Text>
              <Text style={styles.summaryStrike}>{formatPrice(total, symbol)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{result.offer} discount</Text>
              <Text style={[styles.summaryValue, styles.discount]}>−{formatPrice(saving, symbol)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total after discount</Text>
              <Text style={styles.summaryValue}>{formatPrice(result.total, symbol)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryNow]}>
              <Text style={styles.summaryNowLabel}>Pay now ({result.payNowPercent})</Text>
              <Text style={styles.summaryNowValue}>{formatPrice(result.payableTotal, symbol)}</Text>
            </View>
            {later > 0 ? (
              <View style={styles.laterRow}>
                <Icon name="time-outline" size={13} color={colors.textMuted} />
                <Text style={styles.laterText}>{formatPrice(later, symbol)} is paid later, before delivery.</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        <PressableScale onPress={() => navigation.goBack()} scaleTo={0.96} style={styles.skip}>
          <Text style={styles.skipText}>Skip — pay later from My orders</Text>
        </PressableScale>
      </ScrollView>

      <BottomActionBar style={styles.bar}>
        <View style={styles.barTotals}>
          <Text style={styles.barLabel} numberOfLines={1}>
            Pay now{result ? ` (${result.payNowPercent})` : ''}
          </Text>
          <Animated.Text key={result?.payableTotal} entering={FadeIn} style={styles.barValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatPrice(result?.payableTotal || 0, symbol)}
          </Animated.Text>
        </View>
        <PressableScale onPress={proceed} disabled={!result} scaleTo={0.95} style={styles.ctaShadow}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <Text style={styles.ctaText}>Proceed to Pay</Text>
            <View style={styles.ctaArrow}>
              <Icon name="arrow-forward" size={14} color={colors.primary} />
            </View>
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
  headerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.text },
  headerSub: { marginTop: 1, fontSize: typography.size.xs, color: colors.textSecondary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  hero: { alignItems: 'center', paddingVertical: 22, borderRadius: 24, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  blobA: { width: 160, height: 160, top: -70, right: -40 },
  blobB: { width: 110, height: 110, bottom: -50, left: -30 },
  heroLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: 'rgba(255,255,255,0.9)' },
  heroValue: { marginTop: 2, fontSize: 36, fontWeight: '800', color: colors.white },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  heroChipText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  prompt: { marginTop: spacing.md, marginBottom: 10, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  choiceOn: {
    borderColor: colors.primary,
    backgroundColor: '#fff8f6',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  choiceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, marginHorizontal: 10 },
  choiceTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  choiceLabel: { fontSize: typography.size.md - 1, fontWeight: '800', color: colors.text },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#d1fae5' },
  tagText: { fontSize: 9.5, fontWeight: '800', color: '#047857' },
  choiceHint: { marginTop: 3, fontSize: typography.size.xs, color: colors.textSecondary },
  choiceRight: { alignItems: 'flex-end', gap: 8 },
  offBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  offBadgeOn: { backgroundColor: colors.primary },
  offText: { fontSize: typography.size.xs, fontWeight: '800', color: colors.primary },
  offTextOn: { color: colors.white },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d2d2dc', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  summary: {
    marginTop: 6,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  summaryValue: { fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  summaryStrike: { fontSize: typography.size.sm, color: colors.textMuted, textDecorationLine: 'line-through' },
  discount: { color: '#059669' },
  summaryNow: { marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dcdce4' },
  summaryNowLabel: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  summaryNowValue: { fontSize: typography.size.lg, fontWeight: '800', color: colors.primary },
  laterRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  laterText: { flex: 1, fontSize: typography.size.xs, color: colors.textMuted },
  skip: { alignSelf: 'center', marginTop: spacing.md, padding: 8 },
  skipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTotals: { flex: 1 },
  barLabel: { fontSize: typography.size.xxs + 1, color: colors.textMuted },
  barValue: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.primary },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, paddingHorizontal: 18, borderRadius: 16 },
  ctaText: { color: colors.white, fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold },
  ctaArrow: { width: 24, height: 24, marginLeft: 8, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});

export default PayNowOfferScreen;
