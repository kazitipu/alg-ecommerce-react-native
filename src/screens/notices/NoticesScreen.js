import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { getAllNoticesRedux } from '../../actions';
import { useDarkStatusBar } from '../../hooks';
import { formatDate } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import {
  isNewNotice,
  noticeText,
  noticeTime,
  noticeTitle,
} from './noticeUtils';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** Announcements from the `notices` collection, newest first. */
const NoticesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const notices = useSelector(state => state.notices.notices);
  useDarkStatusBar();
  useHideSupportFab();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getAllNoticesRedux());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(getAllNoticesRedux());
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const sorted = useMemo(
    () =>
      [...(Array.isArray(notices) ? notices : [])].sort(
        (a, b) => noticeTime(b) - noticeTime(a),
      ),
    [notices],
  );
  const fresh = sorted.filter(notice => isNewNotice(notice)).length;

  const open = item =>
    navigation.navigate(ROUTES.NOTICE_DETAIL, {
      notice: item,
      noticeId: item.noticeId || item.id,
    });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Notices"
        subtitle={
          sorted.length
            ? `${sorted.length} announcements${fresh ? ` · ${fresh} new` : ''}`
            : 'News from the ALG team'
        }
        icon="megaphone"
      />
      <FlatList
        data={sorted}
        keyExtractor={(item, index) => `${item.noticeId || item.id || index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="megaphone" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No notices yet</Text>
            <Text style={styles.emptyText}>
              Announcements from the ALG team will appear here.
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const isNew = isNewNotice(item);
          const featured = index === 0;
          const text = noticeText(item);
          return (
            <Animated.View
              entering={FadeInUp.delay(Math.min(index, 8) * 60)
                .duration(360)
                .easing(EASE)}
            >
              <PressableScale
                onPress={() => open(item)}
                scaleTo={0.98}
                style={[styles.card, featured && styles.cardFeatured]}
              >
                {featured ? (
                  <LinearGradient
                    colors={GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredBar}
                  >
                    <Icon name="sparkles" size={12} color={colors.white} />
                    <Text style={styles.featuredText}>Latest</Text>
                  </LinearGradient>
                ) : null}
                <View style={styles.cardTop}>
                  <View style={[styles.icon, isNew && styles.iconNew]}>
                    <Icon
                      name={isNew ? 'notifications' : 'megaphone-outline'}
                      size={18}
                      color={isNew ? colors.white : colors.primary}
                    />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>
                        {noticeTitle(item)}
                      </Text>
                      {isNew ? (
                        <View style={styles.newChip}>
                          <Text style={styles.newText}>NEW</Text>
                        </View>
                      ) : null}
                    </View>
                    {text ? (
                      <Text
                        style={styles.excerpt}
                        numberOfLines={featured ? 3 : 2}
                      >
                        {text}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  {formatDate(item.time) ? (
                    <View style={styles.dateChip}>
                      <Icon
                        name="calendar-outline"
                        size={11}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.dateText}>
                        {formatDate(item.time)}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  <View style={styles.read}>
                    <Text style={styles.readText}>Read</Text>
                    <Icon
                      name="arrow-forward"
                      size={13}
                      color={colors.primary}
                    />
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  list: { padding: spacing.md, flexGrow: 1 },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardFeatured: { borderWidth: 1, borderColor: '#ffd9cc' },
  featuredBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  featuredText: { fontSize: 10.5, fontWeight: '800', color: colors.white },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconNew: { backgroundColor: colors.primary },
  body: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: {
    flex: 1,
    fontSize: typography.size.md - 1,
    fontWeight: '800',
    lineHeight: 21,
    color: colors.text,
  },
  newChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ffe4e6',
  },
  newText: { fontSize: 9.5, fontWeight: '800', color: colors.primary },
  excerpt: {
    marginTop: 4,
    fontSize: typography.size.xs + 1,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
  },
  dateText: {
    fontSize: 11,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  read: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  readText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 4,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default NoticesScreen;
