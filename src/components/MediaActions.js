import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from '@react-native-vector-icons/ionicons';
import Share from 'react-native-share';
import { saveProductPhotos } from '../utils/savePhotos';

import { notifyError, notifySuccess } from '../utils/notify';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Copy link, share and save a product's photos.
 *
 * The web version (`productMediaActions.jsx`) streamed each file with `fetch`
 * and a `ReadableStream` reader to drive a progress bar, then saved it with a
 * synthetic `<a download>` click — all browser-only. Here the native share
 * sheet handles sharing, and photos are saved to the gallery (see `utils/savePhotos`).
 */
const MediaActions = ({ product, images = [] }) => {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);

  // Always the ALG product page, as the web shares `window.location.href` —
  // never the supplier's 1688 `detail_url`.
  const productUrl = `https://alg.com.bd/product/${product?.id || ''}`;

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
      `https://wa.me/?text=${encodeURIComponent(`${product?.name || ''}\n${productUrl}`)}`,
    );

  const shareOnFacebook = () =>
    Linking.openURL(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    );

  /** Saves every photo to the phone's gallery (an "ALG" album). */
  const saveImages = async () => {
    if (images.length === 0) {
      notifyError('There are no photos to save.');
      return;
    }

    setSaving(true);
    setProgress({ done: 0, total: images.length });
    try {
      const result = await saveProductPhotos(images, {
        productId: product?.id || 'product',
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (result.denied) {
        notifyError('Allow storage access to save photos.');
      } else if (result.saved > 0) {
        notifySuccess(
          `Saved ${result.saved} photo${result.saved > 1 ? 's' : ''}`,
          result.failed ? `${result.failed} could not be downloaded` : 'Find them in your gallery, in the ALG album.',
        );
      } else if (!result.cancelled) {
        notifyError('The photos could not be downloaded. Please try again.');
      }
    } catch (error) {
      notifyError(error, 'Could not save the photos.');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <View style={styles.container}>
      <ActionButton icon="link-outline" label="Copy link" onPress={copyLink} />
      <ActionButton icon="share-social-outline" label="Share" onPress={shareProduct} />
      <ActionButton icon="logo-facebook" label="Facebook" onPress={shareOnFacebook} />
      <ActionButton icon="logo-whatsapp" label="WhatsApp" onPress={shareOnWhatsApp} />
      <ActionButton
        icon="download-outline"
        label={saving ? (progress ? `Saving ${progress.done}/${progress.total}…` : 'Saving…') : 'Save photos'}
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
