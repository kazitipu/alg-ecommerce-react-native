import React, { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRoute } from '@react-navigation/native';

import {
  EmptyState,
  PressableScale,
  ScreenHeader,
  Skeleton,
} from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { getSingleNotice } from '../../firebase/firebase.utils';
import { useDarkStatusBar } from '../../hooks';
import { formatDate } from '../../utils/format';
import {
  isNewNotice,
  noticeText,
  noticeTitle,
  readingMinutes,
} from './noticeUtils';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/**
 * A single notice. The list already carries the record, so it renders straight
 * away and only refetches when opened by id (e.g. from a deep link).
 */
const NoticeDetailScreen = () => {
  const route = useRoute();
  useDarkStatusBar();
  useHideSupportFab();

  const [notice, setNotice] = useState(route.params?.notice || null);
  const [loading, setLoading] = useState(!route.params?.notice);
  const noticeId = route.params?.noticeId;

  useEffect(() => {
    if (notice || !noticeId) return undefined;

    let active = true;
    getSingleNotice(noticeId)
      .then(result => active && setNotice(result))
      .catch(() => {})
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [notice, noticeId]);

  const title = notice ? noticeTitle(notice) : 'Notice';
  const text = notice ? noticeText(notice) : '';
  const share = () =>
    Share.share({ title, message: `${title}\n\n${text}` }).catch(() => {});

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Notice"
        subtitle={
          notice && formatDate(notice.time)
            ? formatDate(notice.time)
            : 'From the ALG team'
        }
        icon="megaphone"
        right={
          notice ? (
            <PressableScale
              onPress={share}
              scaleTo={0.88}
              hitSlop={8}
              style={styles.share}
              accessibilityLabel="Share"
            >
              <Icon name="share-social-outline" size={18} color={colors.text} />
            </PressableScale>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.content}>
          <View style={styles.card}>
            <Skeleton width="70%" height={22} style={styles.line} />
            <Skeleton width="100%" height={14} style={styles.line} />
            <Skeleton width="90%" height={14} style={styles.line} />
            <Skeleton width="80%" height={14} />
          </View>
        </View>
      ) : !notice ? (
        <EmptyState
          icon="document-outline"
          title="Notice not found"
          message="It may have been removed by the ALG team."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Animated.View entering={FadeIn.duration(380)}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroBlob} />
              <View style={styles.heroChips}>
                {isNewNotice(notice) ? (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>NEW</Text>
                  </View>
                ) : null}
                <View style={styles.heroChip}>
                  <Icon name="time-outline" size={11} color={colors.primary} />
                  <Text style={styles.heroChipText}>
                    {readingMinutes(text)} min read
                  </Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{title}</Text>
              {formatDate(notice.time) ? (
                <View style={styles.heroDate}>
                  <Icon
                    name="calendar-outline"
                    size={12}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.heroDateText}>
                    {formatDate(notice.time)}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(120).duration(380).easing(EASE)}
            style={styles.card}
          >
            {text ? (
              text.split('\n\n').map((paragraph, index) => (
                <Text key={index} style={styles.body} selectable>
                  {paragraph.trim()}
                </Text>
              ))
            ) : (
              <Text style={styles.body}>
                This notice has no further details.
              </Text>
            )}
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(260).duration(300)}
            style={styles.sign}
          >
            <View style={styles.signIcon}>
              <Icon name="shield-checkmark" size={14} color={colors.primary} />
            </View>
            <Text style={styles.signText}>Official announcement from ALG</Text>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  share: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { padding: 18, borderRadius: 22, overflow: 'hidden' },
  heroBlob: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroChips: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  heroChipText: { fontSize: 10.5, fontWeight: '800', color: colors.primary },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: '800',
    lineHeight: 28,
    color: colors.white,
  },
  heroDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  heroDateText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    marginTop: spacing.md,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  body: {
    marginBottom: 10,
    fontSize: typography.size.md - 1,
    lineHeight: 25,
    color: colors.textSecondary,
  },
  line: { marginBottom: spacing.sm },
  sign: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  signIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signText: { fontSize: typography.size.xs + 1, color: colors.textSecondary },
});

export default NoticeDetailScreen;
