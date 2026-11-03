import React, { useEffect } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../../components/PressableScale';
import { CONTACT } from '../../../constants/config';
import { formatPrice } from '../../../utils/format';
import { STAGES } from './orderHelpers';
import { colors, typography } from '../../../theme';
import { thumbImage } from '../../../utils/imageUrl';

const INK = '#1f2340';
const EASE = Easing.out(Easing.cubic);

/** Icons for the "at a glance" facts, keyed like `orderFacts`. */
const FACT_ICONS = {
  id: 'receipt-outline',
  date: 'calendar-outline',
  shop: 'storefront-outline',
  store: 'storefront-outline',
  status: 'flag-outline',
  suborder: 'git-branch-outline',
  tracking: 'barcode-outline',
};

/** Seven dots on a rail inside the hero: done, current, upcoming. */
export const StageStepper = ({ score }) => (
  <View style={styles.stepper}>
    {STAGES.map((stage, index) => {
      const done = stage.score < score;
      const current = stage.score === score;
      return (
        <React.Fragment key={stage.score}>
          {index > 0 ? <View style={[styles.stepperLine, (done || current) && styles.stepperLineOn]} /> : null}
          <View style={[styles.stepperDot, done && styles.stepperDotDone, current && styles.stepperDotNow]}>
            {done ? (
              <Icon name="checkmark" size={10} color={INK} />
            ) : (
              <Icon name={stage.icon} size={current ? 13 : 10} color={current ? INK : 'rgba(255,255,255,0.7)'} />
            )}
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

/** A translucent stat tile for the hero. */
export const HeroStat = ({ icon, label, value, tone }) => (
  <View style={styles.heroStat}>
    <Icon name={icon} size={13} color="rgba(255,255,255,0.8)" />
    <Text style={[styles.heroStatValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

/** Two-column grid of facts with icons; copyable ones copy on tap. */
export const GlanceGrid = ({ facts, onCopy }) => (
  <View style={styles.grid}>
    {facts.map(fact => {
      const body = (
        <>
          <View style={styles.gridIcon}>
            <Icon name={FACT_ICONS[fact.key] || 'ellipse-outline'} size={14} color="#4f46e5" />
          </View>
          <View style={styles.gridText}>
            <Text style={styles.gridLabel} numberOfLines={1}>
              {fact.label}
            </Text>
            <Text style={styles.gridValue} numberOfLines={2}>
              {fact.value}
            </Text>
          </View>
          {fact.copy ? <Icon name="copy-outline" size={12} color={colors.textMuted} style={styles.gridCopy} /> : null}
        </>
      );
      const wide = fact.value.length > 18 || fact.key === 'shop' || fact.key === 'date';
      return fact.copy ? (
        <PressableScale
          key={fact.key}
          onPress={() => onCopy(fact.label, fact.value)}
          scaleTo={0.96}
          style={[styles.gridCell, wide && styles.gridCellWide]}
          accessibilityLabel={`Copy ${fact.label}`}
        >
          {body}
        </PressableScale>
      ) : (
        <View key={fact.key} style={[styles.gridCell, wide && styles.gridCellWide]}>
          {body}
        </View>
      );
    })}
  </View>
);

/** One goods line: tappable thumbnail, variants, type, rate and price. */
export const ItemLine = ({ line, symbol, divided, onImage, onLink }) => (
  <View style={[styles.line, divided && styles.lineDivided]}>
    <PressableScale onPress={line.image ? () => onImage(line.image) : undefined} scaleTo={0.94} style={styles.thumbWrap}>
      {line.image ? (
        <>
          <Image source={{ uri: thumbImage(line.image) }} style={styles.thumb} />
          <View style={styles.thumbZoom}>
            <Icon name="expand" size={10} color={colors.white} />
          </View>
        </>
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Icon name="cube-outline" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.qtyBadge}>
        <Text style={styles.qtyText}>×{line.quantity}</Text>
      </View>
    </PressableScale>
    <View style={styles.lineBody}>
      <Text style={styles.lineName} numberOfLines={2}>
        {line.name}
      </Text>
      {line.variants.length > 0 ? (
        <View style={styles.variants}>
          {line.variants.map(variant => (
            <View key={variant.label} style={styles.variant}>
              <Text style={styles.variantText} numberOfLines={1}>
                {variant.label}: <Text style={styles.variantValue}>{variant.value}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.metaRow}>
        {line.productType ? (
          <View style={styles.meta}>
            <Icon name="pricetags-outline" size={11} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {line.productType}
            </Text>
          </View>
        ) : null}
        {line.shippingRate ? (
          <View style={styles.meta}>
            <Icon name="airplane-outline" size={11} color={colors.textMuted} />
            <Text style={styles.metaText}>{line.shippingRate}</Text>
          </View>
        ) : null}
      </View>
      {line.note ? <Text style={styles.note}>“{line.note}”</Text> : null}
      {line.link ? (
        <PressableScale onPress={() => onLink(line.link)} scaleTo={0.97} style={styles.linkChip}>
          <Icon name="open-outline" size={12} color="#4f46e5" />
          <Text style={styles.linkText}>Open product link</Text>
        </PressableScale>
      ) : null}
      <View style={styles.priceRow}>
        <Text style={styles.unit}>
          {line.unit ? `${formatPrice(line.unit, symbol)} × ${line.quantity}` : `${line.quantity} pcs`}
        </Text>
        {line.amount ? <Text style={styles.amount}>{formatPrice(line.amount, symbol)}</Text> : null}
      </View>
    </View>
  </View>
);

/** Full-screen photo viewer for item thumbnails and the warehouse photo. */
export const ImageViewer = ({ uri, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(uri)} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {uri ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.viewer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close photo" />
          <Animated.Image
            entering={ZoomIn.duration(260).easing(EASE)}
            source={{ uri }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
          <PressableScale
            onPress={onClose}
            scaleTo={0.9}
            style={[styles.viewerClose, { top: insets.top + 12 }]}
            accessibilityLabel="Close"
          >
            <Icon name="close" size={20} color={colors.white} />
          </PressableScale>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

/** Paid-vs-total bar that fills with an eased timing animation. */
export const PaymentProgress = ({ share, paid, total, symbol }) => {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(share, { duration: 700, easing: EASE });
  }, [fill, share]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const percent = Math.round(share * 100);
  return (
    <View style={styles.progress}>
      <View style={styles.progressTop}>
        <Text style={styles.progressLabel}>
          <Text style={styles.progressPaid}>{formatPrice(paid, symbol)}</Text> of {formatPrice(total, symbol)} paid
        </Text>
        <Text style={[styles.progressPercent, percent >= 100 && styles.progressDone]}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]}>
          <LinearGradient
            colors={percent >= 100 ? ['#34d399', '#059669'] : ['#ffb35c', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

/** Payments as a small vertical timeline, newest last as recorded. */
export const PaymentHistory = ({ payments, symbol }) => (
  <View style={styles.history}>
    <Text style={styles.historyTitle}>Payment history</Text>
    {payments.map((item, index) => (
      <View key={item.key} style={styles.historyRow}>
        <View style={styles.historyRail}>
          <View style={styles.historyDot}>
            <Icon name="checkmark" size={11} color={colors.white} />
          </View>
          {index < payments.length - 1 ? <View style={styles.historyLine} /> : null}
        </View>
        <View style={styles.historyBody}>
          <View style={styles.historyText}>
            <Text style={styles.historyMethod}>{item.method || 'Payment'}</Text>
            {item.date ? <Text style={styles.historyDate}>{item.date}</Text> : null}
          </View>
          <Text style={styles.historyAmount}>{formatPrice(item.amount, symbol)}</Text>
        </View>
      </View>
    ))}
  </View>
);

/** "Need help?" card that opens WhatsApp with the order reference filled in. */
export const HelpCard = ({ reference, isRequest }) => {
  const openWhatsApp = () => {
    const text = `Hi ALG, I need help with my ${isRequest ? 'product request' : 'order'} #${reference}.`;
    Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}?text=${encodeURIComponent(text)}`).catch(() => {});
  };
  const call = () => Linking.openURL(`tel:${CONTACT.hotline}`).catch(() => {});
  return (
    <View style={styles.help}>
      <View style={styles.helpIcon}>
        <Icon name="headset" size={20} color="#059669" />
      </View>
      <View style={styles.helpText}>
        <Text style={styles.helpTitle}>Need help with this {isRequest ? 'request' : 'order'}?</Text>
        <Text style={styles.helpBody}>Our team replies fastest on WhatsApp.</Text>
        <View style={styles.helpActions}>
          <PressableScale onPress={openWhatsApp} scaleTo={0.95} style={styles.helpPrimary}>
            <Icon name="logo-whatsapp" size={15} color={colors.white} />
            <Text style={styles.helpPrimaryText}>WhatsApp</Text>
          </PressableScale>
          <PressableScale onPress={call} scaleTo={0.95} style={styles.helpSecondary}>
            <Icon name="call" size={14} color="#059669" />
            <Text style={styles.helpSecondaryText}>Call</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stepperLine: { flex: 1, height: 2, marginHorizontal: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  stepperLineOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  stepperDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  stepperDotDone: { backgroundColor: 'rgba(255,255,255,0.9)' },
  stepperDotNow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  heroStatValue: { marginTop: 4, fontSize: typography.size.md, fontWeight: '800', color: colors.white },
  heroStatLabel: { marginTop: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.75)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f7f7fa',
  },
  gridCellWide: { flexBasis: '100%' },
  gridIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  gridText: { flex: 1, marginLeft: 9 },
  gridLabel: { fontSize: 10.5, fontWeight: typography.weight.semiBold, color: colors.textMuted },
  gridValue: { marginTop: 1, fontSize: typography.size.sm, fontWeight: '800', color: INK },
  gridCopy: { marginLeft: 6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  lineDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e4e4ec' },
  thumbWrap: { width: 76, height: 76 },
  thumb: { width: 76, height: 76, borderRadius: 16, backgroundColor: '#f1f1f5' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbZoom: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,35,64,0.55)',
  },
  qtyBadge: {
    position: 'absolute',
    bottom: -6,
    left: 8,
    right: 8,
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: colors.white,
  },
  qtyText: { fontSize: 10.5, fontWeight: '800', color: colors.white },
  lineBody: { flex: 1, marginLeft: 12 },
  lineName: { fontSize: typography.size.sm, lineHeight: 19, fontWeight: typography.weight.semiBold, color: INK },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  variant: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#f3f3f7' },
  variantText: { fontSize: 11, color: colors.textSecondary },
  variantValue: { fontWeight: typography.weight.bold, color: INK },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  metaText: { fontSize: 11.5, color: colors.textSecondary },
  note: { marginTop: 6, fontSize: 12, fontStyle: 'italic', color: colors.textSecondary },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  linkText: { fontSize: 12, fontWeight: typography.weight.bold, color: '#4f46e5' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  unit: { fontSize: 12, color: colors.textMuted },
  amount: { fontSize: typography.size.sm + 1, fontWeight: '800', color: INK },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,12,24,0.92)' },
  viewerImage: { width: '92%', height: '72%', borderRadius: 16 },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  progress: { marginBottom: 12, padding: 12, borderRadius: 16, backgroundColor: '#fff8f2' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, color: colors.textSecondary },
  progressPaid: { fontWeight: '800', color: INK },
  progressPercent: { fontSize: typography.size.sm, fontWeight: '800', color: '#f97316' },
  progressDone: { color: '#059669' },
  progressTrack: { height: 8, marginTop: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f1e6dc' },
  progressFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  history: { marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: '#f7f7fa' },
  historyTitle: {
    marginBottom: 8,
    fontSize: typography.size.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  historyRow: { flexDirection: 'row' },
  historyRail: { width: 22, alignItems: 'center' },
  historyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
  },
  historyLine: { width: 2, flex: 1, minHeight: 12, marginVertical: 2, backgroundColor: '#c7eedd' },
  historyBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', marginLeft: 10, paddingBottom: 12 },
  historyText: { flex: 1 },
  historyMethod: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: INK },
  historyDate: { marginTop: 1, fontSize: 11, color: colors.textMuted },
  historyAmount: { fontSize: typography.size.sm, fontWeight: '800', color: '#059669' },
  help: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c7eedd',
    backgroundColor: '#f0fdf6',
  },
  helpIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
  },
  helpText: { flex: 1, marginLeft: 12 },
  helpTitle: { fontSize: typography.size.sm + 1, fontWeight: '800', color: INK },
  helpBody: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  helpActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  helpPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#22c55e',
  },
  helpPrimaryText: { fontSize: 13, fontWeight: typography.weight.bold, color: colors.white },
  helpSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
  },
  helpSecondaryText: { fontSize: 13, fontWeight: typography.weight.bold, color: '#059669' },
});
