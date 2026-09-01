import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { EmptyState } from '../../components';
import { getAllNoticesRedux } from '../../actions';
import { formatDate, truncate } from '../../utils/format';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/** Announcements from the `notices` collection, newest first. */
const NoticesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const notices = useSelector(state => state.notices.notices);

  useEffect(() => {
    dispatch(getAllNoticesRedux());
  }, [dispatch]);

  return (
    <FlatList
      style={styles.container}
      data={notices}
      keyExtractor={(item, index) => item.noticeId || item.id || String(index)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState
          icon="megaphone-outline"
          title="No notices yet"
          message="Announcements from the ALG team will appear here."
        />
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() =>
            navigation.navigate(ROUTES.NOTICE_DETAIL, {
              notice: item,
              noticeId: item.noticeId || item.id,
            })
          }>
          <View style={styles.iconWrap}>
            <Icon name="megaphone-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title || item.name}
            </Text>
            {item.description ? (
              <Text style={styles.excerpt} numberOfLines={2}>
                {truncate(String(item.description).replace(/<[^>]+>/g, ' '), 120)}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDate(item.time)}</Text>
          </View>

          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  list: { padding: spacing.md, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, marginHorizontal: spacing.md },
  title: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  excerpt: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: typography.size.xxs, color: colors.textMuted, marginTop: 4 },
});

export default NoticesScreen;
