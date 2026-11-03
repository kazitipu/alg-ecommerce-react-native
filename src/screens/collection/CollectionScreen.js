import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import CollectionEmpty from './components/CollectionEmpty';
import CollectionHeader from './components/CollectionHeader';
import SortSheet from './components/SortSheet';
import PhotoSearchBanner from './components/PhotoSearchBanner';
import SellerBanner from './components/SellerBanner';
import { CardMotion, PressableScale, ProductTile, ProductTileSkeleton } from '../../components';
import useWishlistSave from '../../hooks/useWishlistSave';
import { launchImageLibrary } from 'react-native-image-picker';
import { SEARCH_PHOTO_OPTIONS, fetchVendorProducts, searchByImage, searchProducts, uploadSearchImage } from '../../api';
import { notifyError } from '../../utils/notify';
import { fetchOnce, withRetry } from '../../utils/cache';
import { CACHE_TTL, DEFAULTS } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = spacing.sm + 4;
// Scroll distance (px per event) that counts as a deliberate direction change.
const SCROLL_INTENT = 4;
// The first screenful of cards staggers in; later pages just appear.
const ANIMATED_ITEMS = 6;

const SORT_OPTIONS = [
  {
    value: '',
    label: 'Default',
    caption: 'In the order the search returns',
    icon: 'sparkles-outline',
    tint: '#f1edff',
    color: '#7a4cf5',
  },
  {
    value: 'LowToHigh',
    label: 'Price: low to high',
    caption: 'Cheapest first',
    icon: 'trending-up',
    tint: '#e4f7ee',
    color: '#0e9a72',
  },
  {
    value: 'HighToLow',
    label: 'Price: high to low',
    caption: 'Most expensive first',
    icon: 'trending-down',
    tint: '#ffece6',
    color: '#f05a1a',
  },
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
  const { wishlistIds, saveToWishlist } = useWishlistSave();

  const { keyword, imgId, imageUri, vendorId, title, filterByCategory = 'Default' } = route.params || {};
  const [researching, setResearching] = useState(false);

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // A next page that failed even after retries; scrolling or "Try again" asks again.
  const [loadError, setLoadError] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [columns, setColumns] = useState(2);
  const [sortBy, setSortBy] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  /**
   * One request for a page, dispatched by mode and memoised for 5 minutes.
   * An error answer (no `products` list) throws, so it is retried and never
   * cached as if it were the end of the results.
   */
  const loadPage = useCallback(
    async framePosition => {
      const request = () => {
        if (imgId) return searchByImage({ imgId, framePosition, filterByCategory });
        if (vendorId) return fetchVendorProducts({ vendorId, framePosition, filterByCategory });
        return searchProducts({ keyword, framePosition, filterByCategory });
      };
      const mode = imgId ? `img:${imgId}` : vendorId ? `vendor:${vendorId}` : `search:${keyword}`;
      return fetchOnce(`${mode}-cat:${filterByCategory}-page:${framePosition}`, CACHE_TTL.search, () =>
        withRetry(async () => {
          const data = await request();
          if (!Array.isArray(data?.products)) {
            throw new Error(data?.message || 'The product list did not load.');
          }
          return data;
        }),
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
        setTotalRecords(Number(data?.totalRecords) || 0);
        setLoadError(false);
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
    if (
      loading ||
      loadingMore ||
      exhausted ||
      products.length >= DEFAULTS.maxSearchResults ||
      (totalRecords > 0 && products.length >= totalRecords)
    ) {
      return;
    }

    setLoadingMore(true);
    setLoadError(false);
    const nextPage = page + 1;

    try {
      const data = await loadPage(nextPage);
      const results = data?.products || [];
      if (Number(data?.totalRecords)) setTotalRecords(Number(data.totalRecords));
      if (results.length === 0) {
        setExhausted(true);
      } else {
        // Pages can overlap; keep each product once.
        setProducts(previous => {
          const seen = new Set(previous.map(item => `${item.num_iid || item.id}`));
          return [...previous, ...results.filter(item => !seen.has(`${item.num_iid || item.id}`))];
        });
        setPage(nextPage);
      }
    } catch (error) {
      // Not the end of the list — just a failed request. Leave paging open.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, exhausted, products.length, totalRecords, page, loadPage]);

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

  // The toolbar folds away while scrolling down and returns on any scroll up
  // or near the top. `toolbarTarget` stops the animation restarting each event.
  const toolbarProgress = useSharedValue(1);
  const toolbarTarget = useSharedValue(1);
  const lastScrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(event => {
    const y = event.contentOffset.y;
    const delta = y - lastScrollY.value;
    lastScrollY.value = y;

    let target = toolbarTarget.value;
    if (y < 24) target = 1;
    else if (delta > SCROLL_INTENT) target = 0;
    else if (delta < -SCROLL_INTENT) target = 1;

    if (target !== toolbarTarget.value) {
      toolbarTarget.value = target;
      toolbarProgress.value = withTiming(target, { duration: 260 });
    }
  });

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sortBy)?.label || SORT_OPTIONS[0].label;

  /** Searches again with another photo, replacing this results page. */
  const searchNewPhoto = async () => {
    const result = await launchImageLibrary(SEARCH_PHOTO_OPTIONS);
    const asset = result.didCancel ? null : result.assets?.[0];
    if (!asset) return;
    setResearching(true);
    try {
      const nextId = await uploadSearchImage(asset);
      if (!nextId) {
        notifyError('There was an error uploading your image.');
        return;
      }
      navigation.replace(ROUTES.COLLECTION, { imgId: nextId, imageUri: asset.uri, title: 'Photo search' });
    } catch (error) {
      notifyError(error, 'There was an error uploading your image.');
    } finally {
      setResearching(false);
    }
  };

  const sellerBanner = vendorId ? (
    <SellerBanner name={title} count={products.length} total={totalRecords} loading={loading} />
  ) : null;

  const photoBanner = imgId ? (
    <PhotoSearchBanner
      uri={imageUri}
      loading={loading}
      count={products.length}
      searching={researching}
      onNewPhoto={searchNewPhoto}
    />
  ) : null;

  const header = (
    <CollectionHeader
      title={vendorId ? 'Seller store' : title || keyword || (imgId ? 'Photo search' : 'Products')}
      count={products.length}
      loading={loading}
      columns={columns}
      onLayoutChange={setColumns}
      sortLabel={sortBy ? sortLabel : 'Sort'}
      sorted={Boolean(sortBy)}
      onOpenSort={() => setFiltersVisible(true)}
      toolbarProgress={toolbarProgress}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        {photoBanner}
        {sellerBanner}
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductTileSkeleton key={index} index={index} width={cardWidth} />
          ))}
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        {photoBanner}
        {sellerBanner}
        <CollectionEmpty
          isPhotoSearch={Boolean(imgId)}
          keyword={keyword}
          onSearch={() => navigation.navigate(ROUTES.SEARCH)}
          onTryKeyword={rail =>
            navigation.push(ROUTES.COLLECTION, { keyword: rail.categoryId, title: rail.title })
          }
        />
      </View>
    );
  }

  const isGrid = columns > 1;

  return (
    <View style={styles.container}>
      {header}

      <Animated.FlatList
        key={`columns-${columns}`}
        data={visibleProducts}
        numColumns={columns}
        keyExtractor={(item, index) => `${item.num_iid || item.id || index}`}
        columnWrapperStyle={isGrid ? styles.column : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={photoBanner || sellerBanner}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        // Draw a screen or two ahead, not the whole list; Android skips off-screen cards.
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={
              index < ANIMATED_ITEMS
                ? FadeInDown.delay(index * 50).duration(320)
                : undefined
            }
            style={isGrid ? null : styles.rowItem}>
            <CardMotion>
              <ProductTile
                product={item}
                index={index}
                layout={isGrid ? 'grid' : 'row'}
                width={cardWidth}
                symbol={symbol}
                taka={taka}
                wishlisted={wishlistIds.has(item.id)}
                onPress={() => openProduct(item)}
                onWishlist={() => saveToWishlist(item)}
              />
            </CardMotion>
          </Animated.View>
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerPill}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.footerText}>Loading more products…</Text>
            </View>
          ) : products.length >= DEFAULTS.maxSearchResults ? (
            <View style={styles.footerPill}>
              <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.footerText}>
                Showing the first {DEFAULTS.maxSearchResults} results — refine your search to see
                more.
              </Text>
            </View>
          ) : loadError ? (
            <PressableScale onPress={loadMore} scaleTo={0.96} style={styles.footerPill}>
              <Icon name="refresh" size={16} color={colors.primary} />
              <Text style={styles.footerText}>Couldn't load more products · </Text>
              <Text style={styles.footerRetry}>Try again</Text>
            </PressableScale>
          ) : exhausted || (totalRecords > 0 && products.length >= totalRecords) ? (
            <View style={styles.footerPill}>
              <Icon name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.footerText}>That's everything</Text>
            </View>
          ) : null
        }
      />

      <SortSheet
        visible={filtersVisible}
        options={SORT_OPTIONS}
        value={sortBy}
        onChange={setSortBy}
        onClose={() => setFiltersVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },
  column: { gap: GAP, marginBottom: GAP },
  rowItem: { marginBottom: GAP },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    columnGap: GAP,
    rowGap: GAP,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    marginTop: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  footerRetry: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  footerText: {
    flexShrink: 1,
    marginLeft: 6,
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
  },
});

export default CollectionScreen;
