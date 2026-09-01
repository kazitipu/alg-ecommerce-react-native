import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import ProductCard, { ProductCardSkeleton } from './ProductCard';
import { searchProducts } from '../api';
import { fetchOnce } from '../utils/cache';
import { CACHE_TTL } from '../constants/config';
import { ROUTES } from '../navigation/routes';
import { colors, spacing, typography } from '../theme';

const CARD_WIDTH = 150;
const PLACEHOLDER_COUNT = 4;

/**
 * A horizontally scrolling row of products for one keyword — the app's version
 * of the web `<CollectionThree>` / `<CollectionTwo>` rails.
 *
 * Each rail searches independently, and results are memoised for five minutes,
 * so the six rails on the home screen do not refetch on every remount. The
 * shared cache also de-dupes: two rails on the same keyword make one request.
 */
const ProductRail = ({ title, categoryId }) => {
  const navigation = useNavigation();
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka);

  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchOnce(
          `rail:${categoryId}`,
          CACHE_TTL.search,
          () =>
            searchProducts({
              keyword: categoryId,
              framePosition: 1,
              filterByCategory: 'Default',
            }),
        );
        if (active) setItems(data?.products || []);
      } catch (error) {
        // A failed rail should not take the home screen down with it.
        if (active) setItems([]);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [categoryId]);

  // A rail that returned nothing is hidden rather than shown empty.
  if (items?.length === 0) return null;

  const openProduct = product =>
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      id: product.num_iid || product.id,
      product,
    });

  const seeAll = () =>
    navigation.navigate(ROUTES.COLLECTION, { keyword: categoryId, title });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={seeAll} hitSlop={8}>
          <Text style={styles.seeAll}>View all</Text>
        </Pressable>
      </View>

      {items === null ? (
        <View style={styles.row}>
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
            <View key={index} style={styles.cardSpacing}>
              <ProductCardSkeleton width={CARD_WIDTH} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item, index) => `${item.num_iid || item.id || index}`}
          renderItem={({ item }) => (
            <View style={styles.cardSpacing}>
              <ProductCard
                product={item}
                width={CARD_WIDTH}
                symbol={symbol}
                taka={taka}
                onPress={() => openProduct(item)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  seeAll: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  row: { flexDirection: 'row', paddingHorizontal: spacing.md },
  listContent: { paddingHorizontal: spacing.md },
  cardSpacing: { marginRight: spacing.sm },
});

export default ProductRail;
