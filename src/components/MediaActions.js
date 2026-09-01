import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from '@react-native-vector-icons/ionicons';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { notifyError, notifySuccess } from '../utils/notify';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Copy link, share and save a product's photos.
 *
 * The web version (`productMediaActions.jsx`) streamed each file with `fetch`
 * and a `ReadableStream` reader to drive a progress bar, then saved it with a
 * synthetic `<a download>` click — all browser-only. Here the native share
 * sheet handles sharing, and downloads go through the file system directly.
 */
const MediaActions = ({ product, images = [] }) => {
  const [saving, setSaving] = useState(false);

  const productUrl =
    product?.detail_url || `https://alg.com.bd/product/${product?.id || ''}`;

  const copyLink = () => {
    Clipboard.setString(productUrl);
    notifySuccess('Link copied');
  };

  const shareProduct = async () => {
    try {
      await Share.open({
        title: product?.name,
        message: `${product?.name || 'Check this out on ALG'}\n${productUrl}`,
        failOnCancel: false,
      });
    } catch (error) {
      notifyError(error, 'Could not open the share sheet.');
    }
  };

  const shareOnWhatsApp = () =>
    Linking.openURL(
      `https://wa.me/?text=${encodeURIComponent(`${product?.name || ''} ${productUrl}`)}`,
    );

  /** Downloads every photo into the device's own storage. */
  const saveImages = async () => {
    if (images.length === 0) {
      notifyError('There are no photos to save.');
      return;
    }

    setSaving(true);
    try {
      const { dirs } = ReactNativeBlobUtil.fs;
      const directory = dirs.DownloadDir || dirs.DocumentDir;

      for (let index = 0; index < images.length; index++) {
        await ReactNativeBlobUtil.config({
          fileCache: true,
          path: `${directory}/alg-${product?.id || 'product'}-${index + 1}.jpg`,
        }).fetch('GET', images[index]);
      }

      notifySuccess(
        `Saved ${images.length} photo${images.length > 1 ? 's' : ''}`,
        directory,
      );
    } catch (error) {
      notifyError(error, 'Could not save the photos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ActionButton icon="link-outline" label="Copy link" onPress={copyLink} />
      <ActionButton icon="share-social-outline" label="Share" onPress={shareProduct} />
      <ActionButton icon="logo-whatsapp" label="WhatsApp" onPress={shareOnWhatsApp} />
      <ActionButton
        icon="download-outline"
        label={saving ? 'Saving…' : 'Save photos'}
        onPress={saving ? undefined : saveImages}
      />
    </View>
  );
};

const ActionButton = ({ icon, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
    <Icon name={icon} size={18} color={colors.textSecondary} />
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  label: { fontSize: typography.size.xs, color: colors.textSecondary },
});

export default MediaActions;
