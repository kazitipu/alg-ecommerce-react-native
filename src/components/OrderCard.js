import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { shipmentStages } from '../theme';
import { getOrderTotals } from '../utils/dashboard';
import { formatDate, formatPrice, truncate } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme';

/** Row summarising one order, request or shipment booking. */
const OrderCard = ({ order, symbol, onPress, onPay, onTrack, onInvoice, onRefund }) => {
  const { total, paid, due } = getOrderTotals(order);
  const stage = shipmentStages.find(
    entry => entry.score === Number(order.shipmentStatusScore),
  );

  const reference = order.orderId || order.bookingId;
  const itemCount = (order.items || []).length;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.reference}>#{reference}</Text>
          {order.shopName ? (
            <Text style={styles.shop}>{truncate(order.shopName, 28)}</Text>
          ) : null}
        </View>

        <View style={styles.stageChip}>
          <Text style={styles.stageText}>{stage?.label || 'Pending'}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        {itemCount > 0 ? (
          <Text style={styles.metaText}>{itemCount} product(s)</Text>
        ) : null}
        {order.orderedDate || order.time ? (
          <Text style={styles.metaText}>
            {order.orderedDate || formatDate(order.time)}
          </Text>
        ) : null}
        {order.trackingNo ? (
          <Text style={styles.metaText}>Tracking {order.trackingNo}</Text>
        ) : null}
      </View>

      <View style={styles.amounts}>
        <Amount label="Total" value={formatPrice(total, symbol)} />
        <Amount label="Paid" value={formatPrice(paid, symbol)} tone={colors.success} />
        <Amount
          label="Due"
          value={formatPrice(due, symbol)}
          tone={due > 0 ? colors.primary : colors.textMuted}
        />
      </View>

      {order.refundStatus ? (
        <Text style={styles.refundNote}>Refund {order.refundStatus}</Text>
      ) : null}

      <View style={styles.actions}>
        {due > 0 && onPay ? (
          <Action icon="card-outline" label="Pay" onPress={onPay} primary />
        ) : null}
        {onTrack ? <Action icon="navigate-outline" label="Track" onPress={onTrack} /> : null}
        {onInvoice ? (
          <Action icon="document-text-outline" label="Invoice" onPress={onInvoice} />
        ) : null}
        {onRefund && !order.refundStatus ? (
          <Action icon="return-down-back-outline" label="Refund" onPress={onRefund} />
        ) : null}
      </View>
    </Pressable>
  );
};

const Amount = ({ label, value, tone }) => (
  <View style={styles.amount}>
    <Text style={styles.amountLabel}>{label}</Text>
    <Text style={[styles.amountValue, tone ? { color: tone } : null]}>{value}</Text>
  </View>
);

const Action = ({ icon, label, onPress, primary }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.action,
      primary && styles.actionPrimary,
      pressed && styles.pressed,
    ]}>
    <Icon name={icon} size={14} color={primary ? colors.white : colors.textSecondary} />
    <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.9 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reference: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  shop: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  stageChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  stageText: {
    fontSize: typography.size.xxs,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metaText: { fontSize: typography.size.xs, color: colors.textMuted },
  amounts: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amount: { flex: 1 },
  amountLabel: { fontSize: typography.size.xxs, color: colors.textMuted },
  amountValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  refundNote: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    color: colors.accent,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionLabel: { fontSize: typography.size.xs, color: colors.textSecondary },
  actionLabelPrimary: { color: colors.white, fontWeight: typography.weight.semiBold },
});

export default OrderCard;
