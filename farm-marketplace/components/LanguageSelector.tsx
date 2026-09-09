import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { LanguageCode } from '../constants/i18n';
import useColors from '../constants/Colors';
import Layout from '../constants/Layout';
import Typography from '../constants/Typography';

export default function LanguageSelector() {
  const { language, setLanguage, languages, t } = useLanguage();
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        toggleBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: Layout.spacing.sm,
          paddingVertical: 6,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.surfaceAlt,
        },
        toggleText: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.lg,
        },
        modalContent: {
          width: '100%',
          maxWidth: 340,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.lg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6,
        },
        modalTitle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginBottom: Layout.spacing.md,
          textAlign: 'center',
        },
        optionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: Layout.spacing.md,
          paddingHorizontal: Layout.spacing.sm,
          borderRadius: Layout.borderRadius.md,
          marginBottom: Layout.spacing.xs,
        },
        optionSelected: {
          backgroundColor: colors.primarySoft,
        },
        optionText: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.medium,
          color: colors.text,
        },
        optionNativeText: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
        },
        closeBtn: {
          marginTop: Layout.spacing.md,
          alignItems: 'center',
          paddingVertical: Layout.spacing.sm,
        },
        closeText: {
          color: colors.textSecondary,
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
        },
      }),
    [colors]
  );

  const activeLang = languages.find((l) => l.code === language);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Select language"
      >
        <Ionicons name="language-outline" size={18} color={colors.primary} />
        <Text style={styles.toggleText}>{activeLang?.nativeLabel || 'EN'}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{t('common.selectLanguage')}</Text>

                {languages.map((item) => {
                  const isSelected = item.code === language;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.optionRow, isSelected && styles.optionSelected]}
                      onPress={() => handleSelect(item.code)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.optionNativeText}>{item.nativeLabel}</Text>
                        <Text style={styles.optionText}>{item.label}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
