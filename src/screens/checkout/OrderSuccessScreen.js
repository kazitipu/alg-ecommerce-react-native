import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { Button } from '../../components';
import { formatPrice } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Confirmation after checkout.
 *
 * Orders are created as `paymentStatus: 'purchaseLater'`, so paying is a
 * separate step — this screen is the handover into the payment flow.
 */
const OrderSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const symbol = useSelector(state => state.data.symbol);

  const orders = route.params?.orders || [];
  const payable = route.params?.payable || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Icon name="checkmark-circle" size={64} color={colors.success} />
        </View>

        <Text style={styles.title}>Order placed</Text>
        <Text style={styles.subtitle}>
          {orders.length === 1
            ? 'Your order has been received.'
            : `${orders.length} orders have been received, one per shop.`}{' '}
          Our team will confirm the final shipping and customs charges shortly.
        </Text>

        <View style={styles.card}>
          {orders.map(order => (
            <View key={order.orderId} style={styles.row}>
              <View>
                <Text style={styles.orderId}>Order #{order.orderId}</Text>
                <Text style={styles.shopName}>{order.shopName}</Text>
              </View>
              <Text style={styles.amount}>
                {formatPrice(order.orderTotal, symbol)}
              </Text>
            </View>
          ))}

          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Payable</Text>
            <Text style={styles.totalValue}>{formatPrice(payable, symbol)}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Track progress any time under Orders. You can pay now or later from
          your order list.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="View my orders"
          onPress={() =>
            navigation.navigate(ROUTES.TAB_ORDERS, { screen: ROUTES.MY_ORDERS })
          }
        />
        <Button
          title="Keep shopping"
          variant="secondary"
          onPress={() => navigation.navigate(ROUTES.TAB_HOME)}
          style={styles.secondaryAction}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.lg, alignItems: 'center' },
  badge: { marginTop: spacing.lg },
  title: {
    marginTop: spacing.md,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  orderId: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  shopName: { fontSize: typography.size.xs, color: colors.textMuted },
  amount: { fontSize: typography.size.sm, color: colors.text },
  totalRow: {
    marginTop: spacing.xs,
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
  note: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  actions: { padding: spacing.md },
  secondaryAction: { marginTop: spacing.sm },
});

export default OrderSuccessScreen;
