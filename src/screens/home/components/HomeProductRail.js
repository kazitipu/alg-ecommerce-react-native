import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import SectionHeader from './SectionHeader';
import CardMotion, { useRailLean } from '../../../components/CardMotion';
import PressableScale from '../../../components/PressableScale';
import ProductTile, { ProductTileSkeleton } from '../../../components/ProductTile';
import { searchProducts } from '../../../api';
import { CACHE_TTL } from '../../../constants/config';
import useWishlistSave from '../../../hooks/useWishlistSave';
import { ROUTES } from '../../../navigation/routes';
import { fetchOnce } from '../../../utils/cache';
import { colors, radius, spacing, typography } from '../../../theme';

// The web shows the first 20 results of each rail.
const MAX_ITEMS = 20;
const PLACEHOLDER_COUNT = 3;
// Only the cards visible on first paint stagger in; later ones just appear.
const ANIMATED_ITEMS = 4;

const ViewAllCard = ({ onPress }) => (
  <PressableScale onPress={onPress} scaleTo={0.95} style={styles.viewAllCard}>
    <View style={styles.viewAllIcon}>
      <Icon name="arrow-forward" size={20} color={colors.white} />
    </View>
    <Text style={styles.viewAllText}>View all</Text>
  </PressableScale>
);

/**
 * One home rail of products for a search keyword, like the web's
 * `<CollectionThree>` / `<CollectionTwo>`. Results are memoised for five
 * minutes, and a rail that comes back empty hides itself.
 */
const HomeProductRail = ({ title, categoryId, isHomeCategory }) => {
  const navigation = useNavigation();
  const { wishlistIds, saveToWishlist } = useWishlistSave();
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka);

  const [items, setItems] = useState(null);
  const { lean, onScroll } = useRailLean();

  useEffect(() => {
    let active = true;

    fetchOnce(`rail:${categoryId}`, CACHE_TTL.search, () =>
      searchProducts({ keyword: categoryId, framePosition: 1, filterByCategory: 'Default' }),
    )
      .then(data => {
        if (active) setItems((data?.products || []).slice(0, MAX_ITEMS));
      })
      .catch(() => {
        // A failed rail should not take the home screen down with it.
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
  }, [categoryId]);

  const openProduct = useCallback(
    product =>
      navigation.navigate(ROUTES.PRODUCT_DETAIL, { id: product.num_iid || product.id, product }),
    [navigation],
  );


  const viewAll = () =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: categoryId,
      title,
      ...(isHomeCategory ? { categoryId } : null),
    });

  if (items?.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title={title} onViewAll={viewAll} />

      {items === null ? (
        <View style={styles.row}>
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
            <View key={index} style={styles.cell}>
              <ProductTileSkeleton index={index} />
            </View>
          ))}
        </View>
      ) : (
        <Animated.FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          initialNumToRender={4}
          windowSize={5}
          keyExtractor={(item, index) => `${item.num_iid || item.id || index}`}
          ListFooterComponent={<ViewAllCard onPress={viewAll} />}
          ListFooterComponentStyle={styles.footer}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={
                index < ANIMATED_ITEMS
                  ? FadeInRight.delay(index * 70).springify().damping(16)
                  : undefined
              }
              style={styles.cell}>
              <CardMotion lean={lean}>
                <ProductTile
                  product={item}
                  index={index}
                  symbol={symbol}
                  taka={taka}
                  wishlisted={wishlistIds.has(item.id)}
                  onPress={() => openProduct(item)}
                  onWishlist={() => saveToWishlist(item)}
                />
              </CardMotion>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.white },
  row: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 12 },
  // Vertical padding leaves room for tilted corners and shadows in the clipped list.
  list: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  cell: { marginRight: spacing.md - 2 },
  footer: { alignSelf: 'stretch' },
  viewAllCard: {
    flex: 1,
    width: 96,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#ffd9d9',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.primary,
  },
});

export default HomeProductRail;
