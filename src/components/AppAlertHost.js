import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import PressableScale from './PressableScale';
import { alertLook, setAlertListener } from '../utils/appAlert';
import { colors, typography } from '../theme';

const EASE = Easing.out(Easing.cubic);
const INK = '#1f2340';

/**
 * Renders `appAlert(...)` calls as a centred card in the app's style — icon,
 * title, message and the given buttons — in place of the system dialog.
 * Mounted once at the root; alerts arriving together are shown in turn.
 */
const AppAlertHost = () => {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    setAlertListener(request => setQueue(previous => [...previous, request]));
    return () => setAlertListener(null);
  }, []);

  const current = queue[0];
  const close = button => {
    setQueue(previous => previous.slice(1));
    // Run the action after the card starts closing, as the system dialog does.
    if (button?.onPress) setTimeout(button.onPress, 0);
  };

  if (!current) return null;

  const look = alertLook(current.buttons);
  const danger = look.tone === 'danger';
  const cancel = current.buttons.find(button => button.style === 'cancel');
  // Cancel first (left), the main action last (right), as on the system dialog.
  const ordered = [...current.buttons].sort((a, b) => (a.style === 'cancel' ? -1 : b.style === 'cancel' ? 1 : 0));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close(cancel)}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel ? () => close(cancel) : undefined} />
        <Animated.View key={`${current.title}-${current.message}`} entering={ZoomIn.duration(240).easing(EASE)} style={styles.card}>
          <View style={[styles.halo, danger && styles.haloDanger]}>
            <View style={[styles.icon, danger && styles.iconDanger]}>
              <Icon name={look.icon} size={24} color={colors.white} />
            </View>
          </View>
          {current.title ? <Text style={styles.title}>{current.title}</Text> : null}
          {current.message ? (
            <Text style={[styles.message, !current.title && styles.messageOnly]}>{current.message}</Text>
          ) : null}

          <View style={[styles.actions, ordered.length > 2 && styles.actionsStacked]}>
            {ordered.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const primary = !isCancel && index === ordered.length - 1;
              const key = `${button.text}-${index}`;
              if (!primary) {
                return (
                  <PressableScale key={key} onPress={() => close(button)} scaleTo={0.96} style={[styles.secondary, ordered.length > 2 && styles.full]}>
                    <Text style={styles.secondaryText}>{button.text || 'OK'}</Text>
                  </PressableScale>
                );
              }
              return (
                <PressableScale key={key} onPress={() => close(button)} scaleTo={0.96} style={[styles.primaryShadow, ordered.length > 2 && styles.full]}>
                  <LinearGradient
                    colors={button.style === 'destructive' ? ['#ff6b6b', '#e8344a'] : ['#ff8a5c', colors.primary, '#e8344a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>{button.text || 'OK'}</Text>
                  </LinearGradient>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(20, 22, 38, 0.55)' },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    borderRadius: 26,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  halo: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff3ef' },
  haloDanger: { backgroundColor: '#fff1f2' },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  iconDanger: { backgroundColor: '#e8344a' },
  title: { marginTop: 14, fontSize: typography.size.lg, fontWeight: '800', color: INK, textAlign: 'center' },
  message: { marginTop: 6, fontSize: typography.size.sm + 1, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' },
  messageOnly: { marginTop: 14, fontSize: typography.size.md, fontWeight: typography.weight.semiBold, color: INK },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 20 },
  actionsStacked: { flexDirection: 'column' },
  full: { flex: 0, alignSelf: 'stretch' },
  secondary: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f3f6' },
  secondaryText: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: INK },
  primaryShadow: {
    flex: 1,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primary: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.white },
});

export default AppAlertHost;
