import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';

import PressableScale from './PressableScale';
import { getOrderTotals } from '../utils/dashboard';
import { formatDate, formatPrice } from '../utils/format';
import { notifyInfo } from '../utils/notify';
import {
  STAGES,
  asText,
  orderPieces,
  orderThumbs,
  paymentStateOf,
  stageOf,
} from '../screens/dashboard/components/orderHelpers';
import { colors, radius, typography } from '../theme';
import { thumbImage } from '../utils/imageUrl';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

const PAYMENT_TONES = {
  paid: { color: '#047857', tint: '#ecfdf5', icon: 'checkmark-circle' },
  pending: { color: '#b45309', tint: '#fff4e6', icon: 'hourglass' },
  partial: { color: '#4f46e5', tint: '#eef2ff', icon: 'pie-chart' },
  unpaid: {
    color: colors.primary,
    tint: colors.primarySoft,
    icon: 'alert-circle',
  },
};

/** Card summarising one order, request or shipment booking. */
const OrderCard = ({
  order,
  symbol,
  onPress,
  onPay,
  onTrack,
  onInvoice,
  onRefund,
}) => {
  const { total, paid, due } = getOrderTotals(order);
  const stage = stageOf(order);
  const payment = PAYMENT_TONES[paymentStateOf(order).tone];
  const paymentLabel = paymentStateOf(order).label;

  const reference = asText(order?.orderId || order?.bookingId);
  const items = Array.isArray(order?.items) ? order.items : [];
  const thumbs = orderThumbs(order);
  const pieces = orderPieces(order);
  const date = asText(order?.orderedDate) || formatDate(order?.time);
  const title =
    asText(items[0]?.name) ||
    asText(order?.productName) ||
    asText(order?.shopName) ||
    'Your order';
  const refund = asText(order?.refundStatus);
  const tracking = asText(order?.trackingNo);

  const copyReference = () => {
    Clipboard.setString(reference);
    notifyInfo('Order number copied', `#${reference}`);
  };

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.card}>
      {/* Seller and stage */}
      <View style={styles.top}>
        <View style={styles.shopIcon}>
          <Icon name="storefront" size={13} color="#1f2340" />
        </View>
        <Text style={styles.shop} numberOfLines={1}>
          {asText(order?.shopName) || 'ALG order'}
        </Text>
        <View style={[styles.stageChip, { backgroundColor: stage.tint }]}>
          <Icon name={stage.icon} size={11} color={stage.color} />
          <Text style={[styles.stageText, { color: stage.color }]}>
            {stage.label}
          </Text>
        </View>
      </View>

      {/* Products */}
      <View style={styles.body}>
        {thumbs.length ? (
          <View style={styles.thumbs}>
            {thumbs.map((uri, index) => (
              <Image
                key={uri}
                source={{ uri: thumbImage(uri) }}
                style={[styles.thumb, index > 0 && styles.thumbStacked]}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="cube-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.bodyText}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.meta}>
            {pieces > 0 ? (
              <Text style={styles.metaText}>{pieces} pcs</Text>
            ) : null}
            {items.length > 1 ? (
              <Text style={styles.metaText}>· {items.length} products</Text>
            ) : null}
            {date ? <Text style={styles.metaText}>· {date}</Text> : null}
          </View>
          {reference ? (
            <PressableScale
              onPress={copyReference}
              scaleTo={0.94}
              hitSlop={6}
              style={styles.reference}
            >
              <Text style={styles.referenceText}>#{reference}</Text>
              <Icon name="copy-outline" size={11} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      {/* 7-step progress */}
      <View style={styles.progress}>
        {STAGES.map(step => (
          <View
            key={step.score}
            style={[
              styles.progressStep,
              step.score <= stage.score && { backgroundColor: stage.color },
            ]}
          />
        ))}
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressText}>Step {stage.score} of 7</Text>
        {tracking ? (
          <Text style={styles.progressText}>Tracking {tracking}</Text>
        ) : null}
      </View>

      {/* Amounts */}
      <View style={styles.amounts}>
        <Amount label="Total" value={formatPrice(total, symbol)} />
        <Amount label="Paid" value={formatPrice(paid, symbol)} tone="#059669" />
        <Amount
          label="Due"
          value={formatPrice(due, symbol)}
          tone={due > 0 ? colors.primary : colors.textMuted}
          strong
        />
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.payChip, { backgroundColor: payment.tint }]}>
          <Icon name={payment.icon} size={12} color={payment.color} />
          <Text style={[styles.payText, { color: payment.color }]}>
            {paymentLabel}
          </Text>
        </View>
        {refund ? (
          <View style={styles.refundChip}>
            <Icon name="return-down-back" size={12} color="#b45309" />
            <Text style={styles.refundText}>Refund {refund}</Text>
          </View>
        ) : null}
        {Number(order?.refund) > 0 ? (
          <View style={styles.refundChip}>
            <Icon name="cash-outline" size={12} color="#b45309" />
            <Text style={styles.refundText}>Refunded {formatPrice(Number(order.refund), symbol)}</Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onTrack ? (
          <Action icon="navigate-outline" label="Track" onPress={onTrack} />
        ) : null}
        {onInvoice ? (
          <Action
            icon="document-text-outline"
            label="Invoice"
            onPress={onInvoice}
          />
        ) : null}
        {onRefund && !refund ? (
          <Action
            icon="return-down-back-outline"
            label="Refund"
            onPress={onRefund}
          />
        ) : null}
        {due > 0 && onPay ? (
          <PressableScale
            onPress={onPay}
            scaleTo={0.94}
            style={styles.payShadow}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pay}
            >
              <Icon name="wallet" size={13} color={colors.white} />
              <Text style={styles.payButtonText}>
                Pay {formatPrice(due, symbol)}
              </Text>
            </LinearGradient>
          </PressableScale>
        ) : null}
      </View>
    </PressableScale>
  );
};

const Amount = ({ label, value, tone, strong }) => (
  <View style={styles.amount}>
    <Text style={styles.amountLabel}>{label}</Text>
    <Text
      style={[
        styles.amountValue,
        strong && styles.amountStrong,
        tone ? { color: tone } : null,
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const Action = ({ icon, label, onPress }) => (
  <PressableScale onPress={onPress} scaleTo={0.94} style={styles.action}>
    <Icon name={icon} size={13} color={colors.text} />
    <Text style={styles.actionText}>{label}</Text>
  </PressableScale>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  shopIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#eef0f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shop: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  stageText: { fontSize: 10.5, fontWeight: '800' },
  body: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  thumbs: { flexDirection: 'row' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#f1f1f5',
  },
  thumbStacked: { marginLeft: -22 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  bodyText: { flex: 1, marginLeft: 12 },
  title: {
    fontSize: typography.size.sm,
    lineHeight: 19,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: colors.textMuted },
  reference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  referenceText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  progress: { flexDirection: 'row', gap: 3, marginTop: 14 },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ececf1',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressText: { fontSize: 10.5, color: colors.textMuted },
  amounts: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f7f7fa',
  },
  amount: { flex: 1 },
  amountLabel: { fontSize: 10.5, color: colors.textMuted },
  amountValue: {
    marginTop: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  amountStrong: { fontWeight: '800' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  payChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  payText: { fontSize: 11, fontWeight: typography.weight.bold },
  refundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#fff4e6',
  },
  refundText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: '#b45309',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf1',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
  },
  actionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  payShadow: {
    marginLeft: 'auto',
    borderRadius: radius.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  payButtonText: {
    fontSize: typography.size.xs + 1,
    fontWeight: '800',
    color: colors.white,
  },
});

export default OrderCard;
