import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { EmptyState, Skeleton } from '../../components';
import { getSingleNotice } from '../../firebase/firebase.utils';
import { formatDate } from '../../utils/format';
import { colors, spacing, typography } from '../../theme';

/**
 * A single notice. The list already carries the record, so it renders straight
 * away and only refetches when opened by id (e.g. from a deep link).
 */
const NoticeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

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

  useLayoutEffect(() => {
    if (notice?.title) navigation.setOptions({ title: notice.title });
  }, [navigation, notice]);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton width="70%" height={22} style={styles.line} />
        <Skeleton width="100%" height={14} style={styles.line} />
        <Skeleton width="90%" height={14} />
      </ScrollView>
    );
  }

  if (!notice) {
    return <EmptyState icon="document-outline" title="Notice not found" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{notice.title || notice.name}</Text>
      <Text style={styles.date}>{formatDate(notice.time)}</Text>
      <Text style={styles.body}>
        {String(notice.description || '').replace(/<[^>]+>/g, '').trim()}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  date: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: spacing.xs },
  body: {
    marginTop: spacing.lg,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  line: { marginBottom: spacing.sm },
});

export default NoticeDetailScreen;
