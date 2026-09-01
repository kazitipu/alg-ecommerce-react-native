import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

import { Button, Input, Screen } from '../../components';
import { uploadSearchImage } from '../../api';
import { resolveSearchInput } from '../../utils/productLink';
import { notifyError } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const STEPS = [
  { icon: 'link-outline', title: 'Share the product', body: 'Paste a 1688 or Taobao link, or search by name or photo.' },
  { icon: 'card-outline', title: 'We buy it for you', body: 'Pay us in taka — no Chinese payment method needed.' },
  { icon: 'airplane-outline', title: 'We ship it over', body: 'Goods reach our China warehouse, then fly or sail to Bangladesh.' },
  { icon: 'home-outline', title: 'Delivered to your door', body: 'Track every stage from your orders list.' },
];

/**
 * "Buy for me" — ALG purchases from the Chinese marketplace on the customer's
 * behalf.
 *
 * On the web this page was really a search launcher: a link goes to that
 * product, a short phrase becomes a search, a photo becomes a reverse-image
 * search. All three opened new browser tabs; here they push screens.
 */
const BuyForMeScreen = () => {
  const navigation = useNavigation();
  const [value, setValue] = useState('');
  const [uploading, setUploading] = useState(false);

  const submit = () => {
    const intent = resolveSearchInput(value);
    if (!intent) {
      notifyError('Paste a product link, or type what you are looking for.');
      return;
    }

    if (intent.type === 'product') {
      navigation.navigate(
        intent.source === '1688' ? ROUTES.PRODUCT_1688 : ROUTES.PRODUCT_TAOBAO,
        { id: intent.id, source: intent.source },
      );
      return;
    }

    navigation.navigate(ROUTES.COLLECTION, {
      keyword: intent.keyword,
      title: intent.keyword,
    });
  };

  const searchByPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      const data = await uploadSearchImage(asset);
      const imgId = data?.imgId || data?.imageUrl || data;
      if (!imgId) {
        notifyError('The photo could not be processed. Try another one.');
        return;
      }
      navigation.navigate(ROUTES.COLLECTION, { imgId, title: 'Photo search' });
    } catch (error) {
      notifyError(error, 'Image search failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>We'll buy it for you</Text>
      <Text style={styles.sub}>
        Found something on 1688 or Taobao? Share it and we'll handle the purchase,
        the shipping and the customs.
      </Text>

      <Input
        placeholder="Paste a product link, or search"
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        returnKeyType="search"
      />

      <Button title="Find this product" onPress={submit} />

      <Pressable
        style={styles.photoButton}
        onPress={uploading ? undefined : searchByPhoto}>
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Icon name="camera-outline" size={20} color={colors.primary} />
            <Text style={styles.photoLabel}>Search by photo instead</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.sectionTitle}>How it works</Text>
      {STEPS.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.stepIcon}>
            <Icon name={step.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>
              {index + 1}. {step.title}
            </Text>
            <Text style={styles.stepText}>{step.body}</Text>
          </View>
        </View>
      ))}

      <Pressable
        style={styles.requestLink}
        onPress={() => navigation.navigate(ROUTES.REQUEST_PRODUCT)}>
        <Text style={styles.requestLinkText}>
          Can't find it? Send us a product request →
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  sub: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  photoLabel: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  step: { flexDirection: 'row', marginBottom: spacing.md },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, marginLeft: spacing.md },
  stepTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  stepText: {
    marginTop: 2,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  requestLink: { marginTop: spacing.lg, alignSelf: 'center' },
  requestLinkText: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
});

export default BuyForMeScreen;
