import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import RouteChip from '../../../components/RouteChip';
import {
  AlertIcon,
  CourierIcon,
  CustomsIcon,
  FreightIcon,
  QuantityIcon,
  ReceiptIcon,
  TypeIcon,
  WeightIcon,
} from './ShippingIcons';
import { DEFAULT_SHIPPING_RATE, PRODUCT_TEXT, isFreeLocalShipping, localShippingLabel } from '../../../utils/productDetail';
import FreeBadge from '../../../components/FreeBadge';
import { formatPrice } from '../../../utils/format';
import { colors, radius, spacing, typography } from '../../../theme';

/** Colours per calculator row: icon tile tint and the icon's gradient. */
const ROW_LOOKS = {
  quantity: { tint: '#fff2e5', from: '#ffb35c', to: '#f97316' },
  weight: { tint: '#eef2ff', from: '#8ea2ff', to: '#4f5bd5' },
  type: { tint: '#fdeefe', from: '#f08ce8', to: '#c026d3' },
  customs: { tint: '#e8f7f1', from: '#4fd1a5', to: '#059669' },
  freight: { tint: '#e8f4ff', from: '#60b6ff', to: '#2563eb' },
  courier: { tint: '#fff6dc', from: '#ffd166', to: '#e08a00' },
};

/** One calculator line: a coloured custom icon, label with a hint, and the value. */
const Row = ({ icon: RowIcon, look, label, hint, value, muted, index, free }) => (
  <Animated.View entering={FadeIn.delay(index * 70).duration(350)} style={styles.row}>
    <View style={[styles.rowIcon, { backgroundColor: look.tint }]}>
      <RowIcon size={22} from={look.from} to={look.to} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
    </View>
    {free ? (
      <FreeBadge />
    ) : (
      <Animated.Text
        key={value}
        entering={FadeIn.duration(250)}
        style={[styles.rowValue, muted && styles.rowMuted]}
        numberOfLines={2}>
        {value}
      </Animated.Text>
    )}
  </Animated.View>
);

/** The route an order takes, summarised from the web's delivery process note. */
const JOURNEY = [
  { icon: 'business', label: 'China factory', color: '#f59e0b' },
  { icon: 'cube', label: 'ALG China warehouse', color: '#ef4444' },
  { icon: 'airplane', label: 'Shipping & customs', color: '#3b82f6' },
  { icon: 'home', label: 'Your door', color: '#10b981' },
];

const Journey = () => (
  <View style={styles.journey}>
    {JOURNEY.map((step, index) => (
      <Animated.View key={step.label} entering={FadeIn.delay(index * 120)} style={styles.journeyStep}>
        <View style={[styles.journeyDot, { backgroundColor: step.color }]}>
          <Icon name={step.icon} size={14} color={colors.white} />
        </View>
        {index < JOURNEY.length - 1 ? <View style={styles.journeyLine} /> : null}
        <Text style={styles.journeyLabel} numberOfLines={2}>
          {step.label}
        </Text>
      </Animated.View>
    ))}
  </View>
);

/** A titled Bengali note that expands on tap. */
const ProcessNote = ({ icon, tint, color, title, body }) => {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={[styles.note, { backgroundColor: tint }]}>
      <PressableScale onPress={() => setOpen(!open)} scaleTo={0.98} style={styles.noteHeader}>
        <Icon name={icon} size={17} color={color} />
        <Text style={[styles.noteTitle, { color }]}>{title}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={color} />
      </PressableScale>
      {open ? (
        <Animated.Text entering={FadeIn} style={styles.noteBody}>
          {body}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
};

/**
 * The web's "Customs & Shipping rate" panel and "From China To Bangladesh"
 * calculator.
 *
 * The header shows the category's `ten` rate, while the calculation uses the
 * `eleven` rate (`shippingRate`) — both exactly as the web displays them.
 */
const ShippingCard = ({
  category,
  productType,
  shippingRate,
  totalQuantity,
  weight,
  freightEstimate,
  localShipping,
  totalCost,
  symbol,
}) => {
  const localShippingText = localShippingLabel(localShipping, totalQuantity, symbol);

  return (
    <View>
      {/* A boarding-pass style header: category, rate, and the CN → BD route. */}
      <LinearGradient colors={['#1f2a5c', '#2f3e9e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pass}>
        <View style={styles.passTop}>
          <View style={styles.passMode}>
            <Icon name="airplane" size={12} color="#1f2a5c" />
            <Text style={styles.passModeText}>BY AIR</Text>
          </View>
          <Text style={styles.passCategory} numberOfLines={1}>
            {(productType || 'Others').slice(0, 25).toUpperCase()}
          </Text>
        </View>
        <View style={styles.passRoute}>
          <View>
            <Text style={styles.passCode}>CN</Text>
            <Text style={styles.passCity}>China</Text>
          </View>
          <RouteChip width={64} style={styles.passChip} />
          <View style={styles.passEnd}>
            <Text style={styles.passCode}>BD</Text>
            <Text style={styles.passCity}>Bangladesh</Text>
          </View>
        </View>
        {/* Perforation between the route and the rate stub. */}
        <View style={styles.perforation}>
          <View style={[styles.notch, styles.notchLeft]} />
          <View style={styles.perforationLine} />
          <View style={[styles.notch, styles.notchRight]} />
        </View>
        <View style={styles.passStub}>
          <Text style={styles.passStubLabel}>Customs & Shipping rate</Text>
          <Text style={styles.passRate}>{category?.ten || DEFAULT_SHIPPING_RATE}Tk/Kg</Text>
        </View>
      </LinearGradient>

      <View style={styles.warning}>
        <AlertIcon size={20} from="#ffc94d" to="#f59e0b" />
        <Text style={styles.warningText}>{PRODUCT_TEXT.shippingNote}</Text>
      </View>

      <View style={styles.rows}>
        <Row index={0} icon={QuantityIcon} look={ROW_LOOKS.quantity} label="Total Quantity" value={`${totalQuantity} pc`} />
        <Row
          index={1}
          icon={WeightIcon}
          look={ROW_LOOKS.weight}
          label="Approx Weight"
          hint="Item weight × quantity"
          value={`${weight}kg`}
        />
        <Row index={2} icon={TypeIcon} look={ROW_LOOKS.type} label="Product Type" value={productType || '—'} />
        <Row
          index={3}
          icon={CustomsIcon}
          look={ROW_LOOKS.customs}
          label="Customs & Shipping Rate"
          value={shippingRate ? `Tk ${shippingRate}/kg` : 'Please choose product type first'}
          muted={!shippingRate}
        />
        {freightEstimate !== null ? (
          <Row
            index={4}
            icon={FreightIcon}
            look={ROW_LOOKS.freight}
            label="Shipping Charge (approx)"
            hint="China → Bangladesh"
            value={formatPrice(freightEstimate, symbol)}
          />
        ) : null}
        <Row
          index={5}
          icon={CourierIcon}
          look={ROW_LOOKS.courier}
          label="China local courier (approx)"
          hint="Seller to our China warehouse"
          value={localShippingText}
          free={isFreeLocalShipping(localShipping, totalQuantity)}
        />
      </View>

      {/* Total as a torn-edge ticket. */}
      <LinearGradient colors={['#ff8a5c', colors.primary, '#e8344a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.total}>
        <View style={styles.totalIcon}>
          <ReceiptIcon size={22} from="#ffffff" to="#ffe1dc" />
        </View>
        <View style={styles.totalText}>
          <Text style={styles.totalLabel}>Total Cost</Text>
          <Text style={styles.totalSub}>Product price only</Text>
        </View>
        <Animated.Text key={totalCost} entering={FadeIn.duration(250)} style={styles.totalValue}>
          {formatPrice(totalCost, symbol)}
        </Animated.Text>
      </LinearGradient>
      <View style={styles.footnoteBox}>
        <Text style={styles.footnote}>
          + china local courier charge + customs & shipping charge + delivery charge (BD)
        </Text>
      </View>

      <Journey />
      <ProcessNote
        icon="bus-outline"
        tint="#ecfaf2"
        color="#0e7a52"
        title={PRODUCT_TEXT.deliveryTitle}
        body={PRODUCT_TEXT.deliveryBody}
      />
      <ProcessNote
        icon="card-outline"
        tint="#eef2ff"
        color="#3446b8"
        title={PRODUCT_TEXT.paymentTitle}
        body={PRODUCT_TEXT.paymentBody}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pass: { borderRadius: 20, padding: 14, overflow: 'hidden' },
  passTop: { flexDirection: 'row', alignItems: 'center' },
  passMode: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#ffc23d' },
  passModeText: { fontSize: 10, fontWeight: '800', color: '#1f2a5c', letterSpacing: 0.6 },
  passCategory: { flex: 1, marginLeft: 10, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.white, letterSpacing: 0.3 },
  passRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  passCode: { fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: 1 },
  passCity: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.7)' },
  passEnd: { alignItems: 'flex-end' },
  passChip: { alignSelf: 'center' },
  perforation: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, marginHorizontal: -14 },
  notch: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  notchLeft: { marginLeft: -9 },
  notchRight: { marginRight: -9 },
  perforationLine: { flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)', marginHorizontal: 6 },
  passStub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passStubLabel: { fontSize: typography.size.xs + 1, color: 'rgba(255,255,255,0.8)' },
  passRate: { fontSize: typography.size.xl, fontWeight: '800', color: '#ffc23d' },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff8e6',
    borderWidth: 1,
    borderColor: '#ffe7a8',
  },
  warningText: { flex: 1, marginLeft: 8, fontSize: typography.size.xs, lineHeight: 18, color: '#8a5a00' },
  rows: { marginTop: 14, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#fafafc',
    borderWidth: 1,
    borderColor: '#f0f0f5',
  },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginHorizontal: 10 },
  rowLabel: { fontSize: typography.size.sm - 1, fontWeight: typography.weight.semiBold, color: colors.text },
  rowHint: { marginTop: 1, fontSize: 10.5, color: colors.textMuted },
  rowValue: { maxWidth: '42%', fontSize: typography.size.sm, fontWeight: '800', color: colors.text, textAlign: 'right' },
  rowMuted: { color: colors.textMuted, fontWeight: typography.weight.regular, fontSize: typography.size.xs },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  totalIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  totalText: { flex: 1, marginLeft: 10 },
  totalLabel: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.white },
  totalSub: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  totalValue: { fontSize: 24, fontWeight: '800', color: colors.white },
  footnoteBox: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 8, marginBottom: spacing.md, paddingHorizontal: 6 },
  footnote: { flexShrink: 1, marginLeft: 4, fontSize: typography.size.xs, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  journey: { flexDirection: 'row', alignSelf: 'stretch', marginBottom: 6, paddingVertical: 10 },
  // Fixed equal columns, so a long label can't squeeze its neighbours.
  journeyStep: { width: `${100 / JOURNEY.length}%`, alignItems: 'center', paddingHorizontal: 2 },
  journeyDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  journeyLine: {
    position: 'absolute',
    top: 14,
    // From just past this dot to just before the next one.
    left: '50%',
    right: '-50%',
    marginHorizontal: 20,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d9d9e3',
  },
  journeyLabel: { marginTop: 6, fontSize: 10, fontWeight: typography.weight.semiBold, color: colors.textSecondary, textAlign: 'center' },
  note: { marginTop: 8, borderRadius: radius.lg, padding: 12 },
  noteHeader: { flexDirection: 'row', alignItems: 'center' },
  noteTitle: { flex: 1, marginLeft: 8, fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  noteBody: { marginTop: 8, fontSize: typography.size.sm - 1, lineHeight: 21, color: colors.textSecondary },
});

export default ShippingCard;
