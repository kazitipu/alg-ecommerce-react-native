import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../../components/PressableScale';
import { getOrderTotals } from '../../../utils/dashboard';
import { formatPrice } from '../../../utils/format';
import { colors, radius, spacing, typography } from '../../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** The web's refund form options. */
export const REFUND_REASONS = ['Out of stock', 'Forbidden product', 'Fake product/price', 'I don’t want to buy'];
export const REFUND_METHODS = [
  { key: 'Bkash', label: 'bKash', icon: 'phone-portrait', hint: 'Enter your bKash number' },
  { key: 'Bank', label: 'Bank', icon: 'business', hint: 'Account name, number, bank and branch' },
];

/** The refund request the web files ("Quick refund" on orders, `productRequest` on requests). */
export const buildRefundRequest = ({ order, reason, paymentMethod, bankInfo, isRequest, now = Date.now() }) => ({
  reason,
  paymentMethod,
  bankInfo: bankInfo.trim(),
  refundId: now,
  order,
  ...(isRequest ? { productRequest: true } : { quickRefund: true }),
});

/** Bottom sheet asking why and where to send a refund, as the web's refund modal does. */
const RefundSheet = ({ visible, order, isRequest, symbol, submitting, onClose, onSubmit }) => {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (visible) {
      setReason('');
      setMethod('');
      setInfo('');
    }
  }, [visible]);

  const ready = Boolean(reason && method && info.trim());
  const { paid } = getOrderTotals(order);
  const methodLook = REFUND_METHODS.find(m => m.key === method);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Animated.View
              entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
              exiting={SlideOutDown.duration(220)}
              style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Icon name="return-down-back" size={18} color={colors.white} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Quick refund</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    #{String(order?.orderId || order?.bookingId || '')} · paid {formatPrice(paid, symbol)}
                  </Text>
                </View>
                <PressableScale onPress={onClose} scaleTo={0.88} hitSlop={8} style={styles.close} accessibilityLabel="Close">
                  <Icon name="close" size={18} color={colors.text} />
                </PressableScale>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Reason for refund</Text>
                <View style={styles.options}>
                  {REFUND_REASONS.map(option => {
                    const on = option === reason;
                    return (
                      <PressableScale key={option} onPress={() => setReason(option)} scaleTo={0.95} style={[styles.option, on && styles.optionOn]}>
                        <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={16} color={on ? colors.primary : colors.textMuted} />
                        <Text style={[styles.optionText, on && styles.optionTextOn]}>{option}</Text>
                      </PressableScale>
                    );
                  })}
                </View>

                <Text style={styles.label}>Receive the refund by</Text>
                <View style={styles.methods}>
                  {REFUND_METHODS.map(option => {
                    const on = option.key === method;
                    return (
                      <PressableScale key={option.key} onPress={() => setMethod(option.key)} scaleTo={0.95} style={[styles.method, on && styles.methodOn]}>
                        <Icon name={option.icon} size={18} color={on ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.methodText, on && styles.optionTextOn]}>{option.label}</Text>
                      </PressableScale>
                    );
                  })}
                </View>

                <Text style={styles.label}>{method === 'Bank' ? 'Bank information' : 'bKash number'}</Text>
                <TextInput
                  value={info}
                  onChangeText={setInfo}
                  placeholder={methodLook?.hint || 'Enter Your Bkash Number/Bank Information'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={method === 'Bkash' ? 'phone-pad' : 'default'}
                  multiline={method === 'Bank'}
                  style={[styles.input, method === 'Bank' && styles.inputTall]}
                />

                <View style={styles.note}>
                  <Icon name="information-circle" size={14} color={colors.textMuted} />
                  <Text style={styles.noteText}>Our team reviews every request and confirms the amount before paying it out.</Text>
                </View>
              </ScrollView>

              <PressableScale
                onPress={ready && !submitting ? () => onSubmit({ reason, paymentMethod: method, bankInfo: info, isRequest }) : undefined}
                scaleTo={0.96}
                style={[styles.submitShadow, !ready && styles.submitOff]}
              >
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Icon name="send" size={16} color={colors.white} />
                      <Text style={styles.submitText}>Request refund</Text>
                    </>
                  )}
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 22, 38, 0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', paddingHorizontal: spacing.md, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white },
  handle: { alignSelf: 'center', width: 40, height: 4, marginTop: 10, marginBottom: 8, borderRadius: 2, backgroundColor: '#dcdce4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: 10 },
  title: { fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  sub: { marginTop: 1, fontSize: typography.size.xs, color: colors.textMuted },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f3f6', alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 14, marginBottom: 8, fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#ececf1' },
  optionOn: { borderColor: colors.primary, backgroundColor: '#fff8f6' },
  optionText: { fontSize: typography.size.sm, color: colors.text },
  optionTextOn: { fontWeight: typography.weight.bold, color: colors.primary },
  methods: { flexDirection: 'row', gap: 10 },
  method: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#ececf1' },
  methodOn: { borderColor: colors.primary, backgroundColor: '#fff8f6' },
  methodText: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
    fontSize: typography.size.sm + 1,
    color: colors.text,
  },
  inputTall: { minHeight: 90, textAlignVertical: 'top' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, marginBottom: 6 },
  noteText: { flex: 1, fontSize: typography.size.xs, lineHeight: 17, color: colors.textMuted },
  submitShadow: {
    marginTop: 10,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitOff: { opacity: 0.45 },
  submit: { flexDirection: 'row', gap: 8, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
});

export default RefundSheet;
