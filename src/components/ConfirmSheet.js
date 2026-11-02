import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from './PressableScale';
import { colors, typography } from '../theme';

const EASE = Easing.out(Easing.cubic);
const INK = '#1f2340';
const DANGER = ['#ff6b6b', '#e8344a'];

/**
 * A bottom-sheet confirmation in the app's style, in place of the system
 * dialog: an icon (or the item's picture), title, message, an optional
 * preview of what is affected, and confirm / cancel buttons.
 *
 * `preview` is `{ image, icon, title, subtitle }` (`icon` shows when there is no image). `tone="danger"` colours the
 * confirm button red for removals.
 */
const ConfirmSheet = ({
  visible,
  icon = 'help-circle',
  tone = 'danger',
  title,
  message,
  preview,
  confirmLabel = 'Confirm',
  confirmIcon,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const danger = tone === 'danger';
  const accent = danger ? '#e8344a' : colors.primary;
  const tint = danger ? '#fff1f2' : '#fff3ef';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      {visible ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} accessibilityLabel="Close" />
          <Animated.View
            entering={SlideInDown.duration(320).easing(EASE)}
            exiting={SlideOutDown.duration(220)}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.handle} />

            <Animated.View entering={FadeInDown.delay(80).duration(320).easing(EASE)} style={[styles.halo, { backgroundColor: tint }]}>
              <View style={[styles.iconCircle, { backgroundColor: accent }]}>
                <Icon name={icon} size={26} color={colors.white} />
              </View>
            </Animated.View>

            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {preview ? (
              <Animated.View entering={FadeInDown.delay(140).duration(320).easing(EASE)} style={styles.preview}>
                {preview.image ? (
                  <Image source={{ uri: preview.image }} style={styles.previewImage} />
                ) : (
                  <View style={[styles.previewImage, styles.previewEmpty]}>
                    <Icon name={preview.icon || 'cube-outline'} size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.previewText}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {preview.title}
                  </Text>
                  {preview.subtitle ? <Text style={styles.previewSub}>{preview.subtitle}</Text> : null}
                </View>
              </Animated.View>
            ) : null}

            <View style={styles.actions}>
              <PressableScale onPress={busy ? undefined : onCancel} scaleTo={0.96} style={styles.cancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </PressableScale>
              <PressableScale onPress={busy ? undefined : onConfirm} scaleTo={0.96} style={[styles.confirmShadow, { shadowColor: accent }]}>
                <LinearGradient
                  colors={danger ? DANGER : ['#ff8a5c', colors.primary, '#e8344a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirm}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      {confirmIcon ? <Icon name={confirmIcon} size={16} color={colors.white} /> : null}
                      <Text style={styles.confirmText}>{confirmLabel}</Text>
                    </>
                  )}
                </LinearGradient>
              </PressableScale>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 22, 38, 0.55)' },
  sheet: {
    alignItems: 'center',
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  handle: { width: 40, height: 4, marginTop: 10, marginBottom: 18, borderRadius: 2, backgroundColor: '#dcdce4' },
  halo: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 14, fontSize: typography.size.lg, fontWeight: '800', color: INK, textAlign: 'center' },
  message: {
    marginTop: 6,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#f7f7fa',
  },
  previewImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#ececf1' },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1, marginLeft: 12 },
  previewTitle: { fontSize: typography.size.sm, lineHeight: 19, fontWeight: typography.weight.semiBold, color: INK },
  previewSub: { marginTop: 3, fontSize: typography.size.sm, fontWeight: '800', color: colors.primary },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 20 },
  cancel: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f6',
  },
  cancelText: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: INK },
  confirmShadow: {
    flex: 1.3,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirm: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.white },
});

export default ConfirmSheet;
