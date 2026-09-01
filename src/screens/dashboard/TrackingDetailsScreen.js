import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { Button, EmptyState, StatusTimeline } from '../../components';
import { trackParcel } from '../../api';
import { getOrderTotals } from '../../utils/dashboard';
import { formatPrice, truncate } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * One order's progress through the 7-stage pipeline, plus the RedX courier
 * events for the final leg inside Bangladesh once a tracking id exists.
 */
const TrackingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const symbol = useSelector(state => state.data.symbol);

  const order = route.params?.order;
  const flow = route.params?.flow;
  const [courierEvents, setCourierEvents] = useState(null);

  useEffect(() => {
    if (!order?.courierTrackingId) return undefined;

    let active = true;
    trackParcel(order.courierTrackingId)
      .then(data => active && setCourierEvents(data?.tracking || []))
      .catch(() => active && setCourierEvents([]));

    return () => {
      active = false;
    };
  }, [order?.courierTrackingId]);

  if (!order) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Order not found"
        actionLabel="Back to orders"
        onAction={() => navigation.navigate(ROUTES.DASHBOARD)}
      />
    );
  }

  const { total, paid, due } = getOrderTotals(order);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.reference}>#{order.orderId || order.bookingId}</Text>
        {order.shopName ? (
          <Text style={styles.shop}>{truncate(order.shopName, 40)}</Text>
        ) : null}
        {order.trackingNo ? (
          <Text style={styles.meta}>Tracking number: {order.trackingNo}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shipment progress</Text>
        <StatusTimeline order={order} />
      </View>

      {courierEvents?.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Courier updates</Text>
          {courierEvents.map((event, index) => (
            <View key={index} style={styles.event}>
              <Text style={styles.eventStatus}>
                {event.messageEn || event.status}
              </Text>
              <Text style={styles.eventTime}>{event.time}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Row label="Order total" value={formatPrice(total, symbol)} />
        <Row label="Paid" value={formatPrice(paid, symbol)} tone={colors.success} />
        <Row label="Due" value={formatPrice(due, symbol)} tone={colors.primary} />
      </View>

      {(order.items || []).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          {order.items.map(item => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemName} numberOfLines={2}>
                {truncate(item.name, 50)}
              </Text>
              <Text style={styles.itemMeta}>
                {(item.skus || []).reduce(
                  (sum, sku) => sum + Number(sku.totalQuantity || 0),
                  0,
                )}{' '}
                units
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        title="View invoice"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.INVOICE, { order, flow })}
      />
    </ScrollView>
  );
};

const Row = ({ label, value, tone }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reference: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  shop: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  rowValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  event: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  eventStatus: { fontSize: typography.size.sm, color: colors.text },
  eventTime: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemName: { flex: 1, fontSize: typography.size.sm, color: colors.textSecondary },
  itemMeta: { fontSize: typography.size.xs, color: colors.textMuted },
});

export default TrackingDetailsScreen;
