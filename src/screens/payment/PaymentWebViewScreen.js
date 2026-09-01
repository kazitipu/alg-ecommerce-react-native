import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';

import { parsePaymentReturn } from '../../utils/payment';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify';
import { colors } from '../../theme';

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

  const { url, onCompleteRoute } = route.params || {};
  const [loading, setLoading] = useState(true);
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

    if (onCompleteRoute) navigation.replace(onCompleteRoute, { paymentStatus: status });
    else navigation.goBack();
  };

  /**
   * Watches every navigation for the gateway's return URL and reads the status
   * off its query string.
   */
  const handleNavigationChange = navState => {
    const status = parsePaymentReturn(navState.url);
    if (status) finish(status);
  };

  if (!url) {
    // Nothing to load; bounce straight back rather than showing a blank page.
    navigation.goBack();
    return null;
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationChange}
        onShouldStartLoadWithRequest={request => {
          handleNavigationChange(request);
          return true;
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          notifyError('Could not open the payment page.');
          navigation.goBack();
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default PaymentWebViewScreen;
