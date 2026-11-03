import React, { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import CampaignSection from './components/CampaignSection';
import CategoryGrid from './components/CategoryGrid';
import HeroCarousel from './components/HeroCarousel';
import HomeHeader from './components/HomeHeader';
import HomeProductRail from './components/HomeProductRail';
import ServicesSection from './components/ServicesSection';
import {
  getAllBannersRedux,
  getAllBookingsOfSingleUserRedux,
  getAllCampaignsRedux,
  getAllHomeCategoryRedux,
  getAllOrdersApiRedux,
} from '../../actions';
import { getSelectedIntroModal } from '../../firebase/firebase.utils';
import { HOME_RAILS } from '../../constants/categories';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../navigation/routes';
import { clearCache } from '../../utils/cache';
import { colors, radius, spacing } from '../../theme';

/**
 * Home screen. Behaviour follows the web home page: search (keyword, pasted
 * 1688/Taobao link, or photo), hero banners, category tiles, campaigns with
 * countdowns, six fixed product rails and one rail per admin home category
 * (with shortcuts to ALG's services after the first two),
 * plus the promotional intro modal. A signed-in user's bookings,
 * requests and orders are loaded too, as the web page does on mount.
 */
const SERVICES_SECTION = { key: 'services' };

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const userId = currentUser?.id || currentUser?.uid;

  const banners = useSelector(state => state.orders.banners);
  const campaigns = useSelector(state => state.orders.campaigns);
  const homeCategories = useSelector(state => state.user.homeCategories);

  const [refreshing, setRefreshing] = useState(false);
  const [introImage, setIntroImage] = useState(null);
  const [introVisible, setIntroVisible] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const loadAll = useCallback(() => {
    dispatch(getAllBannersRedux());
    dispatch(getAllCampaignsRedux());
    dispatch(getAllHomeCategoryRedux());
  }, [dispatch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!userId) return;
    dispatch(getAllBookingsOfSingleUserRedux(userId));
    dispatch(getAllOrdersApiRedux(userId));
  }, [dispatch, userId]);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Drop the memoised rail results so a pull-to-refresh really refetches.
    clearCache();
    loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const openCategory = category =>
    navigation.navigate(ROUTES.COLLECTION, { keyword: category.name, title: category.name });

  const openCampaign = campaign =>
    navigation.navigate(ROUTES.COLLECTION, {
      keyword: campaign.categoryId || campaign.name,
      title: campaign.name,
      categoryId: campaign.categoryId,
    });

  const rails = [
    ...HOME_RAILS,
    ...(homeCategories || []).map(category => ({
      title: category.name,
      categoryId: category.categoryId,
      isHomeCategory: true,
    })),
  ];
  // The services grid sits after the first two product rails.
  const sections = [...rails.slice(0, 2), SERVICES_SECTION, ...rails.slice(2)];

  const listHeader = (
    <View>
      <HeroCarousel banners={banners} />
      <CategoryGrid onSelect={openCategory} variant={5} />
      <CampaignSection campaigns={campaigns} onSelect={openCampaign} />
    </View>
  );

  return (
    <View style={styles.container}>
      <HomeHeader scrollY={scrollY} />

      <Animated.FlatList
        data={sections}
        keyExtractor={item => item.key || item.categoryId || item.title}
        ListHeaderComponent={listHeader}
        // Rails below the fold mount as they come near, not all at start.
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={5}
        renderItem={({ item }) =>
          item === SERVICES_SECTION ? (
            <ServicesSection variant={4} />
          ) : (
            <HomeProductRail
              title={item.title}
              categoryId={item.categoryId}
              isHomeCategory={item.isHomeCategory}
            />
          )
        }
        ListFooterComponent={<View style={styles.footer} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      <Modal
        visible={introVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIntroVisible(false)}>
        <Pressable style={styles.introBackdrop} onPress={() => setIntroVisible(false)}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.introCard}>
            <Image source={{ uri: introImage }} style={styles.introImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(250)}>
            <Pressable
              style={styles.introClose}
              onPress={() => setIntroVisible(false)}
              hitSlop={12}
              accessibilityLabel="Close">
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  // Clears the floating tab bar and the WhatsApp button.
  footer: { height: spacing.xxl + spacing.lg },
  introBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  introCard: { width: '100%', aspectRatio: 0.8 },
  introImage: { width: '100%', height: '100%', borderRadius: radius.lg },
  introClose: {
    marginTop: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
