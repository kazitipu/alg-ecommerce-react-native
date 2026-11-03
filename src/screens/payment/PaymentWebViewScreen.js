import React, { useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../components/PressableScale';
import ConfirmSheet from '../../components/ConfirmSheet';

import { parsePaymentReturn } from '../../utils/payment';
import { leaveToRoute } from '../../navigation/leaveModal';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify';
import { colors, typography } from '../../theme';

const INK = '#1f2340';

/** The checkout's host, shown in the header so the customer sees where they are paying. */
export const hostOf = url => {
  const match = String(url || '').match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1].replace(/^www\./, '') : '';
};

/**
 * Hosted checkout for bKash and SSLCommerz.
 *
 * Both gateways work the same way: the backend creates a session and returns a
 * URL, the customer completes payment on the gateway's own page, and the
 * gateway redirects to a return URL carrying `?paymentStatus=`. The web app did
 * this as a full-page `window.open(url, '_self')`; here it happens in a WebView
 * and navigation is watched for the return URL, so the customer never leaves
 * the app.
 */
const PaymentWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const insets = useSafeAreaInsets();
  const { url, onCompleteRoute } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Android's back button asks before leaving a payment half-way.
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setConfirmLeave(true);
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  // A redirect can fire more than one navigation event for the same URL.
  const settled = useRef(false);

  const finish = status => {
    if (settled.current) return;
    settled.current = true;

    if (status === 'success') {
      notifySuccess('Payment received', 'Thank you — your payment is being verified.');
    } else if (status === 'cancel') {
      notifyInfo('Payment cancelled');
    } else {
      notifyError('Payment failed. Please try again.');
    }

    leaveToRoute(navigation, onCompleteRoute, { paymentStatus: status });
  };

  /**
   * Watches every navigation for the gateway's return URL and reads the status
   * off its query string.
   */
  const handleNavigationChange = navState => {
    if (navState.url) setCurrentUrl(navState.url);
    const status = parsePaymentReturn(navState.url);
    if (status) finish(status);
  };

  if (!url) {
    // Nothing to load; bounce straight back rather than showing a blank page.
    navigation.goBack();
    return null;
  }

  const host = hostOf(currentUrl);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => setConfirmLeave(true)} scaleTo={0.88} hitSlop={8} style={styles.close} accessibilityLabel="Leave checkout">
            <Icon name="close" size={20} color={colors.text} />
          </PressableScale>
          <View style={styles.headerIcon}>
            <Icon name="shield-checkmark" size={18} color={colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Complete payment</Text>
            <View style={styles.hostRow}>
              <Icon name="lock-closed" size={11} color="#059669" />
              <Text style={styles.host} numberOfLines={1}>
                {host || 'Secure checkout'}
              </Text>
            </View>
          </View>
          <View style={styles.secureChip}>
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          {progress < 1 ? <View style={[styles.progressFill, { width: `${Math.max(progress, 0.08) * 100}%` }]} /> : null}
        </View>
      </LinearGradient>

      <View style={styles.page}>
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={request => {
            handleNavigationChange(request);
            return true;
          }}
          onLoadProgress={event => setProgress(event.nativeEvent.progress)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            notifyError('Could not open the payment page.');
            navigation.goBack();
          }}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
        />

        {loading ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(250).easing(Easing.out(Easing.cubic))} style={styles.loading}>
            <View style={styles.loadingIcon}>
              <Icon name="card" size={26} color={colors.primary} />
            </View>
            <Text style={styles.loadingTitle}>Opening secure checkout…</Text>
            <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
            <Text style={styles.loadingHint}>Don't close the app until the payment finishes.</Text>
          </Animated.View>
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmLeave}
        icon="exit-outline"
        title="Leave checkout?"
        message="Your payment isn't finished. If you've already paid, wait for the confirmation page before leaving."
        confirmLabel="Leave"
        confirmIcon="exit-outline"
        cancelLabel="Stay"
        onConfirm={() => {
          setConfirmLeave(false);
          finish('cancel');
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  headerIcon: {
    width: 38,
    height: 38,
    marginLeft: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  headerText: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: typography.size.lg, fontWeight: '800', color: INK },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  host: { flexShrink: 1, fontSize: typography.size.xs, color: colors.textSecondary },
  secureChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#dcfce7' },
  secureText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  progressTrack: { height: 3, marginTop: 10, borderRadius: 2, overflow: 'hidden', backgroundColor: 'transparent' },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
  page: { flex: 1, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.white },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0ec' },
  loadingTitle: { marginTop: 14, fontSize: typography.size.md, fontWeight: '800', color: INK },
  loadingSpinner: { marginTop: 14 },
  loadingHint: { marginTop: 10, fontSize: typography.size.xs + 1, color: colors.textMuted, textAlign: 'center' },
});

export default PaymentWebViewScreen;
