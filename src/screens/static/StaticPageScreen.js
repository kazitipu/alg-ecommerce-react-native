import React, { useLayoutEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { EmptyState } from '../../components';
import { STATIC_PAGES } from '../../constants/staticPages';
import { CONTACT } from '../../constants/config';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Renders any of the eight policy/help pages from extracted content.
 *
 * The web app had one component per page, each a wall of styled JSX. Here the
 * text lives in `constants/staticPages.js` and one screen renders it, so the
 * pages stay in step and the wording is easy to update.
 */
const StaticPageScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const pageKey = route.params?.page;
  const page = STATIC_PAGES[pageKey];

  useLayoutEffect(() => {
    if (page?.title) navigation.setOptions({ title: page.title });
  }, [navigation, page]);

  if (!page) {
    return <EmptyState icon="document-outline" title="Page not found" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {page.blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text
              key={index}
              style={[styles.heading, index === 0 && styles.firstHeading]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'item') {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{block.text}</Text>
            </View>
          );
        }
        return (
          <Text key={index} style={styles.paragraph}>
            {block.text}
          </Text>
        );
      })}

      {pageKey === 'CONTACT' ? (
        <View style={styles.contactCard}>
          <ContactRow
            icon="call-outline"
            label={CONTACT.hotline}
            onPress={() => Linking.openURL(`tel:${CONTACT.hotline}`)}
          />
          <ContactRow
            icon="logo-whatsapp"
            label="Chat on WhatsApp"
            onPress={() =>
              Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}`)
            }
          />
          <ContactRow
            icon="mail-outline"
            label={CONTACT.email}
            onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
};

const ContactRow = ({ icon, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
    <Icon name={icon} size={20} color={colors.primary} />
    <Text style={styles.contactLabel}>{label}</Text>
    <Icon name="chevron-forward" size={18} color={colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    lineHeight: 26,
  },
  firstHeading: { marginTop: 0 },
  paragraph: {
    marginBottom: spacing.md,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  bulletRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bullet: { color: colors.primary, marginRight: spacing.sm, lineHeight: 26 },
  bulletText: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  contactCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactLabel: { flex: 1, fontSize: typography.size.md, color: colors.text },
  pressed: { opacity: 0.85 },
});

export default StaticPageScreen;
