import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { colors, radius, shadow, spacing, typography } from '../theme';

/**
 * Sheet dialog, replacing `react-responsive-modal` and the Bootstrap modals the
 * web app opened by clicking hidden DOM nodes
 * (`document.getElementById('...').click()`). Visibility is plain state here.
 */
const BottomSheet = ({ visible, onClose, title, children, fullHeight = false }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent>
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="Close" />

      <SafeAreaView style={[styles.sheet, fullHeight && styles.sheetFull]}>
        <View style={styles.handle} />

        {title ? (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    ...shadow.sheet,
  },
  sheetFull: { height: '90%', maxHeight: '90%' },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  content: { padding: spacing.lg },
});

export default BottomSheet;
