import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  LinearTransition,
} from 'react-native-reanimated';
import { useRoute } from '@react-navigation/native';

import { EmptyState, PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { STATIC_PAGES } from '../../constants/staticPages';
import { CONTACT } from '../../constants/config';
import { notifyInfo } from '../../utils/notify';
import { useDarkStatusBar } from '../../hooks';
import {
  groupBlocks,
  isProhibitedItem,
  isProhibitedSection,
  lookOfPage,
  parseContactDetails,
  withoutMarker,
} from './staticSections';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const LAYOUT = LinearTransition.duration(240).easing(EASE);

/** Paragraphs and bullets of one section; ❌ items get a "not allowed" icon. */
const Body = ({ blocks, tint, lead }) =>
  blocks.map((block, index) =>
    isProhibitedItem(block) ? (
      <View key={index} style={[styles.banRow, index > 0 && styles.banDivider]}>
        <View style={styles.banIcon}>
          <Icon name="close" size={12} color={colors.white} />
        </View>
        <Text style={styles.banText}>{withoutMarker(block.text)}</Text>
      </View>
    ) : block.type === 'item' ? (
      <View key={index} style={styles.bulletRow}>
        <View style={[styles.bulletDot, { backgroundColor: tint }]} />
        <Text style={styles.bulletText}>{block.text}</Text>
      </View>
    ) : (
      <Text key={index} style={[styles.paragraph, lead && styles.lead]}>
        {block.text}
      </Text>
    ),
  );

/** FAQ entry: the question, opening to its answer. */
const FaqItem = ({ section, index, open, onToggle, tint }) => (
  <Animated.View
    entering={FadeInUp.delay(80 + index * 50)
      .duration(340)
      .easing(EASE)}
    layout={LAYOUT}
    style={[styles.card, open && styles.cardOpen]}
  >
    <PressableScale
      onPress={onToggle}
      scaleTo={0.99}
      style={styles.faqHeader}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <View style={[styles.faqNumber, { backgroundColor: `${tint}1f` }]}>
        <Text style={[styles.faqNumberText, { color: tint }]}>{index + 1}</Text>
      </View>
      <Text style={styles.faqQuestion}>{section.title}</Text>
      <Icon
        name={open ? 'remove-circle' : 'add-circle'}
        size={22}
        color={open ? tint : colors.textMuted}
      />
    </PressableScale>
    {open ? (
      <Animated.View entering={FadeIn.duration(220)} style={styles.faqAnswer}>
        <Body blocks={section.blocks} tint={tint} />
      </Animated.View>
    ) : null}
  </Animated.View>
);

/** A tappable way to reach ALG on the Contact page. */
const ContactCard = ({ icon, colors: fill, title, value, onPress, index }) => (
  <Animated.View
    entering={FadeInUp.delay(60 + index * 60)
      .duration(340)
      .easing(EASE)}
    style={styles.contactWrap}
  >
    <PressableScale onPress={onPress} scaleTo={0.96} style={styles.contact}>
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.contactIcon}
      >
        <Icon name={icon} size={20} color={colors.white} />
      </LinearGradient>
      <Text style={styles.contactTitle}>{title}</Text>
      <Text style={styles.contactValue} numberOfLines={1}>
        {value}
      </Text>
    </PressableScale>
  </Animated.View>
);

const DETAIL_LOOKS = {
  phone: { icon: 'call', tint: '#e8f7f1', color: '#16a34a' },
  address: { icon: 'location', tint: '#fff0ec', color: '#e8344a' },
  email: { icon: 'mail', tint: '#eef2ff', color: '#4f46e5' },
  fax: { icon: 'print', tint: '#eef0f6', color: '#1f2340' },
  other: { icon: 'information-circle', tint: '#f3f3f6', color: '#6b6b78' },
};

const mapsUrl = address =>
  `https://maps.google.com/?q=${encodeURIComponent(address)}`;

/** One labelled office detail with its action (call / directions / email) and copy. */
const DetailRow = ({ detail, value, first }) => {
  const look = DETAIL_LOOKS[detail.kind] || DETAIL_LOOKS.other;
  const isEmail = value.includes('@');
  const action =
    detail.kind === 'phone'
      ? {
          label: 'Call',
          icon: 'call',
          url: `tel:${value.replace(/[^+\d]/g, '')}`,
        }
      : detail.kind === 'address'
      ? { label: 'Directions', icon: 'navigate', url: mapsUrl(value) }
      : isEmail
      ? { label: 'Email', icon: 'send', url: `mailto:${value}` }
      : null;
  const copy = () => {
    Clipboard.setString(value);
    notifyInfo(`${detail.label || 'Detail'} copied`, value);
  };
  return (
    <View style={[styles.detail, !first && styles.detailDivider]}>
      <View style={[styles.detailIcon, { backgroundColor: look.tint }]}>
        <Icon name={look.icon} size={17} color={look.color} />
      </View>
      <View style={styles.detailText}>
        {detail.label ? (
          <Text style={styles.detailLabel}>{detail.label}</Text>
        ) : null}
        <Text style={styles.detailValue} selectable>
          {value}
        </Text>
        <View style={styles.detailActions}>
          {action ? (
            <PressableScale
              onPress={() => Linking.openURL(action.url).catch(() => {})}
              scaleTo={0.94}
              style={[styles.detailAction, { backgroundColor: look.tint }]}
            >
              <Icon name={action.icon} size={12} color={look.color} />
              <Text style={[styles.detailActionText, { color: look.color }]}>
                {action.label}
              </Text>
            </PressableScale>
          ) : null}
          <PressableScale
            onPress={copy}
            scaleTo={0.94}
            style={styles.detailCopy}
          >
            <Icon name="copy-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.detailCopyText}>Copy</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

/** The web's contact list as an organised "Office details" card. */
const OfficeDetails = ({ details, index }) => {
  const rows = details.flatMap(detail =>
    detail.values.map(value => ({ detail, value })),
  );
  return (
    <Animated.View
      entering={FadeInUp.delay(80 + index * 50)
        .duration(340)
        .easing(EASE)}
      style={styles.card}
    >
      <View style={styles.officeHeader}>
        <View style={styles.officeIcon}>
          <Icon name="business" size={18} color={colors.white} />
        </View>
        <View style={styles.officeHeaderText}>
          <Text style={styles.officeTitle}>ALG Limited</Text>
          <Text style={styles.officeSub}>Head office · Dhaka, Bangladesh</Text>
        </View>
      </View>
      {rows.map(({ detail, value }, rowIndex) => (
        <DetailRow
          key={`${detail.kind}-${value}`}
          detail={detail}
          value={value}
          first={rowIndex === 0}
        />
      ))}
    </Animated.View>
  );
};

/**
 * Renders any of the eight policy/help pages from extracted content.
 *
 * The text lives in `constants/staticPages.js` (verbatim from the website);
 * this screen groups it into section cards, shows FAQ as an accordion and How
 * to order as numbered steps, and adds contact shortcuts on Contact us.
 */
const StaticPageScreen = () => {
  const route = useRoute();
  useDarkStatusBar();
  useHideSupportFab();

  const pageKey = route.params?.page;
  const page = STATIC_PAGES[pageKey];
  const look = lookOfPage(pageKey);
  const tint = look.colors[1];
  const sections = useMemo(
    () => (page ? groupBlocks(page.blocks, page.title) : []),
    [page],
  );
  const [openIndex, setOpenIndex] = useState(0);

  if (!page) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Page" />
        <EmptyState icon="document-outline" title="Page not found" />
      </View>
    );
  }

  const contactDetails =
    pageKey === 'CONTACT' ? parseContactDetails(page.blocks) : [];
  const detailOf = kind =>
    contactDetails.find(detail => detail.kind === kind)?.values[0];
  const officeAddress = detailOf('address');
  const supportEmail = detailOf('email') || CONTACT.email;

  const whatsapp = `https://wa.me/${String(CONTACT.whatsapp || '').replace(
    '+',
    '',
  )}`;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={page.title}
        subtitle={look.tagline}
        icon={look.icon}
        iconColor={tint}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View entering={FadeIn.duration(380)}>
          <LinearGradient
            colors={look.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBlob} />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{page.title}</Text>
              <Text style={styles.heroSub}>
                {pageKey === 'CONTACT'
                  ? `${
                      contactDetails.reduce((n, d) => n + d.values.length, 0) +
                      1
                    } ways to reach us`
                  : look.accordion
                  ? `${sections.length} questions answered`
                  : look.steps
                  ? `${sections.length} simple steps`
                  : `${sections.length} ${
                      sections.length === 1 ? 'section' : 'sections'
                    }`}
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <Icon name={look.icon} size={28} color={colors.white} />
            </View>
          </LinearGradient>
        </Animated.View>

        {pageKey === 'CONTACT' ? (
          <View style={styles.contacts}>
            <ContactCard
              index={0}
              icon="call"
              colors={['#4ade80', '#16a34a']}
              title="Call us"
              value={CONTACT.hotline}
              onPress={() => Linking.openURL(`tel:${CONTACT.hotline}`)}
            />
            <ContactCard
              index={1}
              icon="logo-whatsapp"
              colors={['#4ade80', '#25d366']}
              title="WhatsApp"
              value="Chat with us"
              onPress={() => Linking.openURL(whatsapp)}
            />
            <ContactCard
              index={2}
              icon="mail"
              colors={['#7aa8ff', '#4f46e5']}
              title="Email"
              value={supportEmail}
              onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
            />
            <ContactCard
              index={3}
              icon="location"
              colors={['#ff8a5c', '#e8344a']}
              title="Visit us"
              value="Paltan, Dhaka"
              onPress={() =>
                Linking.openURL(mapsUrl(officeAddress || 'ALG Limited Dhaka'))
              }
            />
          </View>
        ) : null}

        {pageKey === 'CONTACT' ? (
          <OfficeDetails details={contactDetails} index={1} />
        ) : null}

        {(pageKey === 'CONTACT' ? [] : sections).map((section, index) => {
          if (look.accordion && section.title) {
            return (
              <FaqItem
                key={index}
                section={section}
                index={index}
                tint={tint}
                open={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            );
          }
          const banned = isProhibitedSection(section);
          return (
            <Animated.View
              key={index}
              entering={FadeInUp.delay(80 + index * 50)
                .duration(340)
                .easing(EASE)}
              style={[
                styles.card,
                banned && styles.cardBanned,
                !section.title && styles.cardLead,
              ]}
            >
              {banned ? (
                <View style={styles.banHeader}>
                  <View style={styles.banHeaderIcon}>
                    <Icon name="ban" size={18} color={colors.white} />
                  </View>
                  <View style={styles.banHeaderText}>
                    <Text style={styles.banTitle}>
                      {section.title.replace(/:\s*$/, '')}
                    </Text>
                    <Text style={styles.banSub}>
                      {section.blocks.length} items we can't import for you
                    </Text>
                  </View>
                </View>
              ) : section.title ? (
                <View style={styles.sectionHeader}>
                  {look.steps ? (
                    <LinearGradient
                      colors={look.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.step}
                    >
                      <Text style={styles.stepText}>{index + 1}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[styles.sectionBar, { backgroundColor: tint }]}
                    />
                  )}
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
              ) : null}
              {!section.title && !banned ? (
                <View style={[styles.leadBar, { backgroundColor: tint }]} />
              ) : null}
              <Body blocks={section.blocks} tint={tint} lead={!section.title} />
            </Animated.View>
          );
        })}

        <View style={styles.help}>
          <Icon name="chatbubbles" size={14} color={colors.primary} />
          <Text style={styles.helpText}>Still have questions? </Text>
          <PressableScale
            onPress={() => Linking.openURL(whatsapp)}
            scaleTo={0.95}
          >
            <Text style={styles.helpLink}>Chat with us</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.white,
  },
  heroSub: {
    marginTop: 2,
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: 'rgba(255,255,255,0.9)',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardOpen: { borderWidth: 1, borderColor: '#ffe0d6' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: typography.size.md,
    fontWeight: '800',
    lineHeight: 22,
    color: colors.text,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.white,
  },
  paragraph: {
    marginTop: 4,
    fontSize: typography.size.sm + 1,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  cardLead: { paddingLeft: 20, overflow: 'hidden' },
  leadBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  lead: {
    fontSize: typography.size.md - 1,
    lineHeight: 25,
    color: colors.text,
  },
  cardBanned: {
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fffafa',
  },
  banHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#fecdd3',
  },
  banHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banHeaderText: { flex: 1, marginLeft: 12 },
  banTitle: {
    fontSize: typography.size.md,
    fontWeight: '800',
    color: '#9f1239',
  },
  banSub: { marginTop: 1, fontSize: typography.size.xs, color: '#be123c' },
  banRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  banDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffe4e6',
  },
  banIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banText: {
    flex: 1,
    marginLeft: 12,
    fontSize: typography.size.sm + 1,
    lineHeight: 21,
    color: colors.text,
  },
  officeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececf1',
  },
  officeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officeHeaderText: { flex: 1, marginLeft: 12 },
  officeTitle: {
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  officeSub: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf1',
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1, marginLeft: 12 },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  detailValue: {
    marginTop: 2,
    fontSize: typography.size.sm + 1,
    lineHeight: 21,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  detailActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  detailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  detailActionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  detailCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f3f3f6',
  },
  detailCopyText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bulletDot: {
    width: 6,
    height: 6,
    marginTop: 9,
    marginRight: 10,
    borderRadius: 3,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.size.sm + 1,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center' },
  faqNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqNumberText: { fontSize: typography.size.sm, fontWeight: '800' },
  faqQuestion: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    lineHeight: 22,
    color: colors.text,
  },
  faqAnswer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf1',
  },
  contacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 8,
  },
  contactWrap: { width: '50%', padding: 5 },
  contact: { padding: 14, borderRadius: 20, backgroundColor: colors.white },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    marginTop: 10,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.text,
  },
  contactValue: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  helpText: {
    marginLeft: 6,
    fontSize: typography.size.xs + 1,
    color: colors.textSecondary,
  },
  helpLink: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});

export default StaticPageScreen;
