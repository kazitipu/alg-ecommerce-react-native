import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Button, EmptyState } from '../../components';
import { buildInvoiceHtml } from '../../utils/invoiceHtml';
import { notifyError, notifySuccess } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, spacing } from '../../theme';

/**
 * Invoice preview and share.
 *
 * The web app printed through the browser (`react-to-print`). On mobile the
 * same HTML is rendered in a WebView for preview and converted to a PDF that
 * the customer can share or save — which is also what makes it usable offline
 * and forwardable to a courier or bank.
 */
const InvoiceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const order = route.params?.order;

  const [busy, setBusy] = useState(false);

  const html = useMemo(() => (order ? buildInvoiceHtml(order) : ''), [order]);

  if (!order) {
    return (
      <EmptyState
        icon="document-outline"
        title="No invoice to show"
        actionLabel="Back to orders"
        onAction={() => navigation.navigate(ROUTES.DASHBOARD)}
      />
    );
  }

  const reference = order.orderId || order.bookingId;

  const exportPdf = async share => {
    setBusy(true);
    try {
      const { filePath } = await RNHTMLtoPDF.convert({
        html,
        fileName: `ALG-invoice-${reference}`,
        directory: 'Documents',
      });

      if (!filePath) {
        notifyError('The invoice could not be generated.');
        return;
      }

      const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;

      if (share) {
        await Share.open({
          url,
          type: 'application/pdf',
          filename: `ALG-invoice-${reference}`,
          failOnCancel: false,
        });
      } else {
        notifySuccess('Invoice saved', filePath);
      }
    } catch (error) {
      notifyError(error, 'Could not create the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.preview}
        scalesPageToFit
      />

      <View style={styles.actions}>
        <Button
          title="Share PDF"
          onPress={() => exportPdf(true)}
          loading={busy}
          style={styles.action}
        />
        <Button
          title="Save"
          variant="secondary"
          onPress={() => exportPdf(false)}
          disabled={busy}
          style={styles.action}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  preview: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  action: { flex: 1 },
});

export default InvoiceScreen;
