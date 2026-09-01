import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import {
  CampaignCard,
  CategoryStrip,
  Carousel,
  ProductRail,
  Skeleton,
} from '../../components';
import {
  getAllBannersRedux,
  getAllCampaignsRedux,
  getAllHomeCategoryRedux,
} from '../../actions';
import { getSelectedIntroModal } from '../../firebase/firebase.utils';
import { HOME_RAILS } from '../../constants/categories';
import { ROUTES } from '../../navigation/routes';
import { clearCache } from '../../utils/cache';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Home screen, mirroring the web page's section order:
 * search bar, hero banners, category strip, campaigns, six fixed product rails,
 * then one rail per admin-configured home category.
 *
 * The web version deferred its fetches behind a `setTimeout` after first paint
 * and wrapped them in a 10-minute cache. Here the fetches are plain effects —
 * React Native paints the shell immediately regardless — while the rails keep
 * their own five-minute memo cache.
 */
const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const banners = useSelector(state => state.orders.banners);
  const campaigns = useSelector(state => state.orders.campaigns);
  const homeCategories = useSelector(state => state.user.homeCategories);

  const [refreshing, setRefreshing] = useState(false);
  const [introImage, setIntroImage] = useState(null);
  const [introVisible, setIntroVisible] = useState(false);

  const loadAll = useCallback(() => {
    dispatch(getAllBannersRedux());
    dispatch(getAllCampaignsRedux());
    dispatch(getAllHomeCategoryRedux());
  }, [dispatch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Promotional splash, shown once per launch when the admin has one selected.
  useEffect(() => {
    let active = true;
    getSelectedIntroModal()
      .then(url => {
        if (active && url) {
          setIntroImage(url);
          setIntroVisible(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Drop the memoised rail results so a pull-to-refresh really refetches.
    clearCache();
    loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const openSearch = () => navigation.navigate(ROUTES.SEARCH);

  const openCategory = category =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: category.name,
      title: category.name,
    });

  const openCampaign = campaign =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: campaign.categoryId || campaign.name,
      title: campaign.name,
      categoryId: campaign.categoryId,
    });

  // The banner list is split the same way as on the web: entries flagged
  // `secondBanner` are a side promo rather than part of the hero rotation.
  const heroBanners = (banners || []).filter(banner => !banner.secondBanner);

  const railSections = [
    ...HOME_RAILS,
    ...(homeCategories || []).map(category => ({
      title: category.name,
      categoryId: category.categoryId,
    })),
  ];

  const renderHeader = () => (
    <View>
      <Pressable style={styles.searchBar} onPress={openSearch}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchText}>Search products, or paste a 1688 link</Text>
        <Icon name="camera-outline" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.bannerWrap}>
        {heroBanners.length > 0 ? (
          <Carousel data={heroBanners} imageKey="banner" onPressItem={openCampaign} />
        ) : (
          <Skeleton width="100%" height={180} borderRadius={radius.md} />
        )}
      </View>

      <CategoryStrip onSelect={openCategory} />

      {campaigns?.length > 0 ? (
        <View style={styles.campaigns}>
          <Text style={styles.sectionTitle}>Campaigns</Text>
          <FlatList
            data={campaigns}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignList}
            keyExtractor={(item, index) => item.id || item.name || String(index)}
            renderItem={({ item }) => (
              <CampaignCard campaign={item} onPress={() => openCampaign(item)} />
            )}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={railSections}
        keyExtractor={item => item.categoryId || item.title}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ProductRail title={item.title} categoryId={item.categoryId} />
        )}
        ListFooterComponent={<View style={styles.footer} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      <Modal
        visible={introVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIntroVisible(false)}>
        <Pressable style={styles.introBackdrop} onPress={() => setIntroVisible(false)}>
          <View style={styles.introCard}>
            <Image source={{ uri: introImage }} style={styles.introImage} resizeMode="contain" />
            <Pressable
              style={styles.introClose}
              onPress={() => setIntroVisible(false)}
              hitSlop={12}>
              <Icon name="close-circle" size={32} color={colors.white} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  bannerWrap: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  campaigns: { marginTop: spacing.lg },
  campaignList: { paddingHorizontal: spacing.md },
  footer: { height: spacing.xxl },
  introBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  introCard: { width: '100%', aspectRatio: 0.8 },
  introImage: { width: '100%', height: '100%', borderRadius: radius.md },
  introClose: { position: 'absolute', top: -spacing.xl, right: 0 },
});

export default HomeScreen;
