import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { Button, EmptyState, QtyStepper } from '../../components';
import {
  addToPendingOrdersRedux,
  removeItemFromCartRedux,
  updateCartQuantityRedux,
} from '../../actions';
import { useAuth } from '../../hooks';
import { getTierPriceInTaka, parsePriceRange } from '../../utils/priceTiers';
import { formatPrice, truncate } from '../../utils/format';
import { notifyError } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * The cart, mirroring `carts/{uid}` in Firestore.
 *
 * Structure is shop -> items -> skus, and the web app kept a three-level
 * select-all checkbox tree over it (all / per shop / per item / per sku) so a
 * customer can check out part of a basket. Selection is tracked here as a flat
 * set of `"{shopIndex}:{itemId}:{skuId}"` keys, which is far easier to reason
 * about than the web's bag of booleans spread across `this.state`.
 *
 * Quantities re-resolve the price tier on every change, because crossing a
 * threshold re-prices the whole line.
 */
const CartScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { currentUser, isSignedIn } = useAuth();

  const cart = useSelector(state => state.cartList.cart);
  const symbol = useSelector(state => state.data.symbol);
  const currency = useSelector(state => state.user.currency);
  const taka = currency?.taka || 0;

  // Every sku starts selected, matching the web app's default.
  const allKeys = useMemo(() => {
    const keys = [];
    (cart || []).forEach((shop, shopIndex) => {
      (shop.items || []).forEach(item => {
        (item.skus || []).forEach(sku => {
          keys.push(`${shopIndex}:${item.id}:${sku.sku_id}`);
        });
      });
    });
    return keys;
  }, [cart]);

  const [deselected, setDeselected] = useState(() => new Set());

  const isSelected = key => !deselected.has(key);

  const toggleKeys = (keys, select) =>
    setDeselected(previous => {
      const next = new Set(previous);
      keys.forEach(key => (select ? next.delete(key) : next.add(key)));
      return next;
    });

  const selectedKeys = allKeys.filter(isSelected);
  const allSelected = selectedKeys.length === allKeys.length && allKeys.length > 0;

  /**
   * Rebuilds the cart tree with only the selected SKUs, re-pricing each line
   * against the tier its selected quantity lands in.
   */
  const selection = useMemo(() => {
    const shops = [];
    let goodsTotal = 0;
    let unitCount = 0;

    (cart || []).forEach((shop, shopIndex) => {
      const items = [];

      (shop.items || []).forEach(item => {
        const skus = (item.skus || []).filter(sku =>
          isSelected(`${shopIndex}:${item.id}:${sku.sku_id}`),
        );
        if (skus.length === 0) return;

        const lineQuantity = skus.reduce(
          (total, sku) => total + (Number(sku.totalQuantity) || 0),
          0,
        );

        const tiers = parsePriceRange(item.price_range);
        const unitPrice =
          tiers.length > 0
            ? getTierPriceInTaka(tiers, lineQuantity, taka)
            : Number(skus[0]?.price) || 0;

        goodsTotal += unitPrice * lineQuantity;
        unitCount += lineQuantity;

        items.push({ ...item, skus, lineQuantity, unitPrice });
      });

      if (items.length > 0) shops.push({ ...shop, items });
    });

    return { shops, goodsTotal, unitCount };
    // `deselected` drives isSelected; cart and taka are the other inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, deselected, taka]);

  /** Writes the new quantity to Firestore; the snapshot listener updates Redux. */
  const changeQuantity = (item, sku, quantity) =>
    dispatch(
      updateCartQuantityRedux({
        currentUser,
        itemId: item.id,
        skuId: sku.sku_id,
        quantity,
        taka,
      }),
    );

  const removeItem = async (_shopIndex, item) => {
    // The data layer expects composite sku ids, as the web cart built them.
    const payload = {
      id: item.id,
      skus: (item.skus || []).map(sku => ({ sku_id: `${item.id}-${sku.sku_id}` })),
    };
    await dispatch(removeItemFromCartRedux(currentUser, payload));
  };

  const checkout = async () => {
    if (selection.shops.length === 0) {
      notifyError('Select at least one item to continue.');
      return;
    }
    await dispatch(addToPendingOrdersRedux(selection.shops));
    navigation.navigate(ROUTES.PLACE_ORDER);
  };

  if (!isSignedIn) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Sign in to see your cart"
        message="Your basket follows your account, so it is the same here and on the website."
        actionLabel="Sign in"
        onAction={() => navigation.navigate(ROUTES.LOGIN)}
      />
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Your cart is empty"
        message="Browse products or paste a 1688 link to get started."
        actionLabel="Start shopping"
        onAction={() => navigation.navigate(ROUTES.TAB_HOME)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cart.map((shop, shopIndex) => {
          const shopKeys = (shop.items || []).flatMap(item =>
            (item.skus || []).map(sku => `${shopIndex}:${item.id}:${sku.sku_id}`),
          );
          const shopSelected = shopKeys.every(isSelected);

          return (
            <View key={`${shop.shopId}-${shopIndex}`} style={styles.shop}>
              <Pressable
                style={styles.shopHeader}
                onPress={() => toggleKeys(shopKeys, !shopSelected)}>
                <Checkbox checked={shopSelected} />
                <Icon name="storefront-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.shopName} numberOfLines={1}>
                  {truncate(shop.shopName || 'Shop', 32)}
                </Text>
              </Pressable>

              {(shop.items || []).map(item => {
                const itemKeys = (item.skus || []).map(
                  sku => `${shopIndex}:${item.id}:${sku.sku_id}`,
                );
                const itemSelected = itemKeys.every(isSelected);

                return (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemHeader}>
                      <Pressable
                        onPress={() => toggleKeys(itemKeys, !itemSelected)}
                        hitSlop={8}>
                        <Checkbox checked={itemSelected} />
                      </Pressable>

                      {item.picture ? (
                        <Image source={{ uri: item.picture }} style={styles.itemImage} />
                      ) : (
                        <View style={styles.itemImage} />
                      )}

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {truncate(item.name, 50)}
                        </Text>
                        {item.batch > 1 ? (
                          <Text style={styles.itemMeta}>Packs of {item.batch}</Text>
                        ) : null}
                      </View>

                      <Pressable onPress={() => removeItem(shopIndex, item)} hitSlop={8}>
                        <Icon name="trash-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>

                    {(item.skus || []).map(sku => {
                      const key = `${shopIndex}:${item.id}:${sku.sku_id}`;
                      return (
                        <View key={sku.sku_id} style={styles.skuRow}>
                          <Pressable
                            onPress={() => toggleKeys([key], !isSelected(key))}
                            hitSlop={8}>
                            <Checkbox checked={isSelected(key)} />
                          </Pressable>

                          <Text style={styles.skuName} numberOfLines={1}>
                            {sku.name || sku.properties}
                          </Text>

                          <Text style={styles.skuPrice}>
                            {formatPrice(sku.price, symbol)}
                          </Text>

                          <QtyStepper
                            value={Number(sku.totalQuantity) || 0}
                            onChange={quantity => changeQuantity(item, sku, quantity)}
                            batch={item.batch || 1}
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bar}>
        <Pressable
          style={styles.selectAll}
          onPress={() => toggleKeys(allKeys, !allSelected)}>
          <Checkbox checked={allSelected} />
          <Text style={styles.selectAllLabel}>All</Text>
        </Pressable>

        <View style={styles.totals}>
          <Text style={styles.totalLabel}>{selection.unitCount} items</Text>
          <Text style={styles.totalValue}>
            {formatPrice(selection.goodsTotal, symbol)}
          </Text>
        </View>

        <Button title="Checkout" onPress={checkout} style={styles.checkoutButton} />
      </View>
    </View>
  );
};

const Checkbox = ({ checked }) => (
  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
    {checked ? <Icon name="checkmark" size={14} color={colors.white} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  shop: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  shopName: { flex: 1, fontSize: typography.size.sm, color: colors.text },
  item: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: typography.size.sm, color: colors.text, lineHeight: 18 },
  itemMeta: { fontSize: typography.size.xs, color: colors.accent, marginTop: 2 },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: spacing.lg,
  },
  skuName: { flex: 1, fontSize: typography.size.xs, color: colors.textSecondary },
  skuPrice: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  selectAllLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  totals: { flex: 1, alignItems: 'flex-end' },
  totalLabel: { fontSize: typography.size.xs, color: colors.textMuted },
  totalValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  checkoutButton: { minWidth: 120 },
});

export default CartScreen;
