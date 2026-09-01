import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import {
  BottomSheet,
  Button,
  EmptyState,
  ProductCard,
  ProductCardSkeleton,
} from '../../components';
import { fetchVendorProducts, searchByImage, searchProducts } from '../../api';
import { fetchOnce } from '../../utils/cache';
import { CACHE_TTL, DEFAULTS } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = spacing.sm;

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'LowToHigh', label: 'Price: low to high' },
  { value: 'HighToLow', label: 'Price: high to low' },
];

/**
 * Product grid for a keyword search, a reverse-image search, or a shop's
 * listing — the three modes the web `product-listing.jsx` handled.
 *
 * Paging is FlatList's `onEndReached` rather than
 * `react-infinite-scroll-component`, and the web's 300-result ceiling is kept
 * so counts match the site.
 */
const CollectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka);

  const { keyword, imgId, vendorId, title, filterByCategory = 'Default' } = route.params || {};

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [columns, setColumns] = useState(2);
  const [sortBy, setSortBy] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: title || keyword || 'Products' });
  }, [navigation, title, keyword]);

  /** One request for a page, dispatched by mode and memoised for 5 minutes. */
  const loadPage = useCallback(
    async framePosition => {
      if (imgId) {
        return fetchOnce(`img:${imgId}-cat:${filterByCategory}-page:${framePosition}`, CACHE_TTL.search, () =>
          searchByImage({ imgId, framePosition, filterByCategory }),
        );
      }
      if (vendorId) {
        return fetchOnce(`vendor:${vendorId}-cat:${filterByCategory}-page:${framePosition}`, CACHE_TTL.search, () =>
          fetchVendorProducts({ vendorId, framePosition, filterByCategory }),
        );
      }
      return fetchOnce(`search:${keyword}-cat:${filterByCategory}-page:${framePosition}`, CACHE_TTL.search, () =>
        searchProducts({ keyword, framePosition, filterByCategory }),
      );
    },
    [keyword, imgId, vendorId, filterByCategory],
  );

  // First page, and a reset whenever the query itself changes.
  useEffect(() => {
    let active = true;

    const loadFirstPage = async () => {
      setLoading(true);
      setExhausted(false);
      setPage(1);

      try {
        const data = await loadPage(1);
        if (!active) return;
        const results = data?.products || [];
        setProducts(results);
        setExhausted(results.length === 0);
      } catch (error) {
        if (active) {
          setProducts([]);
          setExhausted(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFirstPage();
    return () => {
      active = false;
    };
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    // The web app stopped paging at 300 results; the same ceiling is kept here.
    if (loading || loadingMore || exhausted || products.length >= DEFAULTS.maxSearchResults) {
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const data = await loadPage(nextPage);
      const results = data?.products || [];
      if (results.length === 0) {
        setExhausted(true);
      } else {
        setProducts(previous => [...previous, ...results]);
        setPage(nextPage);
      }
    } catch (error) {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, exhausted, products.length, page, loadPage]);

  /** Sorting is client-side over what has loaded, as it was on the web. */
  const visibleProducts = useMemo(() => {
    if (!sortBy) return products;
    const priceOf = product => parseFloat(product.price ?? product.salePrice ?? 0) || 0;
    return [...products].sort((a, b) =>
      sortBy === 'LowToHigh' ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a),
    );
  }, [products, sortBy]);

  const cardWidth = (SCREEN_WIDTH - spacing.md * 2 - GAP * (columns - 1)) / columns;

  const openProduct = product =>
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      id: product.num_iid || product.id,
      product,
    });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.gridItem}>
              <ProductCardSkeleton width={cardWidth} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon="search-outline"
        title="No products found"
        message={
          imgId
            ? 'We could not match that photo. Try a clearer picture or search by name.'
            : `Nothing came back for "${keyword}". Try a different search.`
        }
        actionLabel="Back to search"
        onAction={() => navigation.navigate(ROUTES.SEARCH)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{products.length} products</Text>

        <View style={styles.toolbarActions}>
          <Pressable
            onPress={() => setColumns(columns === 2 ? 1 : 2)}
            hitSlop={8}
            style={styles.toolbarButton}
            accessibilityLabel="Toggle layout">
            <Icon
              name={columns === 2 ? 'list-outline' : 'grid-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() => setFiltersVisible(true)}
            hitSlop={8}
            style={styles.toolbarButton}
            accessibilityLabel="Sort and filter">
            <Icon name="options-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        key={`columns-${columns}`}
        data={visibleProducts}
        numColumns={columns}
        keyExtractor={(item, index) => `${item.num_iid || item.id || index}`}
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            width={columns > 1 ? cardWidth : undefined}
            symbol={symbol}
            taka={taka}
            onPress={() => openProduct(item)}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : products.length >= DEFAULTS.maxSearchResults ? (
            <Text style={styles.footerText}>
              Showing the first {DEFAULTS.maxSearchResults} results — refine your search to
              see more.
            </Text>
          ) : exhausted ? (
            <Text style={styles.footerText}>That's everything.</Text>
          ) : null
        }
      />

      <BottomSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        title="Sort">
        {SORT_OPTIONS.map(option => (
          <Pressable
            key={option.value || 'default'}
            onPress={() => setSortBy(option.value)}
            style={styles.sortRow}>
            <Text
              style={[styles.sortLabel, sortBy === option.value && styles.sortLabelActive]}>
              {option.label}
            </Text>
            {sortBy === option.value ? (
              <Icon name="checkmark" size={20} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
        <Button
          title="Done"
          onPress={() => setFiltersVisible(false)}
          style={styles.sheetButton}
        />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  count: { fontSize: typography.size.sm, color: colors.textSecondary },
  toolbarActions: { flexDirection: 'row' },
  toolbarButton: { marginLeft: spacing.md },
  list: { padding: spacing.md },
  column: { gap: GAP, marginBottom: GAP },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: GAP },
  gridItem: { marginBottom: GAP },
  footer: { paddingVertical: spacing.lg },
  footerText: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortLabel: { fontSize: typography.size.md, color: colors.text },
  sortLabelActive: {
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  sheetButton: { marginTop: spacing.lg },
  radius: { borderRadius: radius.md },
});

export default CollectionScreen;
