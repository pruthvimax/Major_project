import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { logApiError } from '../../services/apiError';
import {
  createScheme,
  deleteScheme,
  fetchSchemeAnalytics,
  fetchSchemes,
  parseDeadlineInput,
  toDeadlineInput,
  updateScheme,
} from '../../services/schemes';
import {
  SCHEME_CATEGORIES,
  SCHEME_CATEGORY_META,
  SCHEME_LABELS,
  SCHEME_LABEL_META,
  type Scheme,
  type SchemeAnalytics,
  type SchemeCategory,
  type SchemeInput,
  type SchemeLabel,
} from '../../types/scheme.types';
import AdminHeader from '../../components/admin/AdminHeader';
import SearchBar from '../../components/admin/SearchBar';
import FilterChips from '../../components/admin/FilterChips';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { AdminListSkeleton } from '../../components/admin/AdminSkeleton';
import SchemeCard from '../../components/schemes/SchemeCard';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  StatCard,
  StatRowSkeleton,
  friendlyError,
} from '../../components/ui';

type StatusFilter = 'all' | 'active' | 'inactive';
type CategoryFilter = 'all' | SchemeCategory;

interface FormState {
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  requiredDocuments: string;
  applicationDeadline: string;
  officialWebsite: string;
  contactNumber: string;
  category: SchemeCategory;
  labels: SchemeLabel[];
  isActive: boolean;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  benefits: '',
  eligibility: '',
  requiredDocuments: '',
  applicationDeadline: '',
  officialWebsite: '',
  contactNumber: '',
  category: 'PM-KISAN',
  labels: [],
  isActive: true,
};

const schemeToForm = (s: Scheme): FormState => ({
  name: s.name,
  description: s.description,
  benefits: s.benefits || '',
  eligibility: s.eligibility,
  requiredDocuments: (s.requiredDocuments || []).join('\n'),
  applicationDeadline: toDeadlineInput(s.applicationDeadline),
  officialWebsite: s.officialWebsite || '',
  contactNumber: s.contactNumber || '',
  category: s.category,
  labels: s.labels || [],
  isActive: s.isActive,
});

const validateForm = (f: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (f.name.trim().length < 3) errors.name = 'Scheme name must be at least 3 characters.';
  if (f.description.trim().length < 10) errors.description = 'Describe the scheme in at least 10 characters.';
  if (f.eligibility.trim().length < 5) errors.eligibility = 'Please describe who is eligible.';
  if (f.officialWebsite.trim() && !/^https?:\/\/\S+$/i.test(f.officialWebsite.trim())) {
    errors.officialWebsite = 'Must start with http:// or https://';
  }
  if (f.contactNumber.trim() && !/^[+\d][\d\s\-()]{5,19}$/.test(f.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid phone number.';
  }
  if (parseDeadlineInput(f.applicationDeadline) === 'invalid') {
    errors.applicationDeadline = 'Use the format YYYY-MM-DD.';
  }
  return errors;
};

const formToInput = (f: FormState): SchemeInput => {
  const deadline = parseDeadlineInput(f.applicationDeadline);
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    benefits: f.benefits.trim(),
    eligibility: f.eligibility.trim(),
    requiredDocuments: f.requiredDocuments
      .split(/\r?\n/)
      .map((d) => d.trim())
      .filter(Boolean),
    applicationDeadline: deadline === 'invalid' ? null : deadline,
    officialWebsite: f.officialWebsite.trim(),
    contactNumber: f.contactNumber.trim(),
    category: f.category,
    labels: f.labels,
    isActive: f.isActive,
  };
};

export default function AdminSchemesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [analytics, setAnalytics] = useState<SchemeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Editor
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Row actions
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        list: {
          paddingHorizontal: Layout.spacing.md,
          paddingTop: Layout.spacing.sm,
          paddingBottom: Layout.spacing.xxl * 2,
        },
        statsBlock: { gap: Layout.spacing.md, paddingBottom: Layout.spacing.md },
        statsRow: { flexDirection: 'row', gap: Layout.spacing.md },
        mostViewed: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Layout.spacing.md,
          ...Layout.shadow.xs,
        },
        mostViewedIcon: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.tintAmber,
          alignItems: 'center',
          justifyContent: 'center',
        },
        mostViewedLabel: { fontSize: Typography.fontSize.xs, color: colors.textSecondary },
        mostViewedName: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        mostViewedCount: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.accent,
        },
        listTitle: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginBottom: Layout.spacing.sm,
        },
        cardFooter: {
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: Layout.spacing.sm,
        },
        labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm, alignItems: 'center' },
        labelHint: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginRight: 2 },
        actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Layout.spacing.sm },
        toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
        toggleText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.text },
        iconBtn: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
        iconBtnDanger: { backgroundColor: colors.errorSoft },
        fab: {
          position: 'absolute',
          right: Layout.spacing.lg,
          bottom: Layout.spacing.lg + insets.bottom,
        },
        errorBanner: { paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm },
        // Editor sheet
        overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
        sheet: {
          backgroundColor: colors.card,
          borderTopLeftRadius: Layout.borderRadius.xxl,
          borderTopRightRadius: Layout.borderRadius.xxl,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.sm,
          maxHeight: '92%',
          ...Layout.shadow.lg,
        },
        handle: {
          alignSelf: 'center',
          width: 44,
          height: 5,
          borderRadius: Layout.borderRadius.full,
          backgroundColor: colors.lightGray,
          marginBottom: Layout.spacing.sm,
        },
        sheetHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: Layout.spacing.md,
          paddingBottom: Layout.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        sheetTitle: {
          flex: 1,
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sheetBody: { paddingTop: Layout.spacing.md, paddingBottom: Layout.spacing.xl + insets.bottom },
        fieldLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          marginBottom: Layout.spacing.xs + 2,
        },
        chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
        switchRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        },
        switchText: { flex: 1, minWidth: 0 },
        switchTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.text },
        switchSub: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
        formError: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: colors.errorSoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        },
        formErrorText: { flex: 1, color: colors.error, fontSize: Typography.fontSize.sm, lineHeight: Typography.leading.sm },
      }),
    [colors, insets.bottom]
  );

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await fetchSchemeAnalytics());
    } catch (err) {
      logApiError('Admin scheme analytics', err);
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const [data] = await Promise.all([fetchSchemes({ status: 'all' }), loadAnalytics()]);
        setSchemes(data);
      } catch (err) {
        logApiError('Admin fetch schemes', err);
        setError(friendlyError(err, 'Could not load schemes.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadAnalytics]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schemes.filter((s) => {
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? s.isActive : !s.isActive);
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
      const matchesSearch =
        term === '' ||
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term);
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [schemes, search, statusFilter, categoryFilter]);

  const replaceScheme = (updated: Scheme) =>
    setSchemes((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError(null);
    setEditorVisible(true);
  };

  const openEdit = (scheme: Scheme) => {
    setEditing(scheme);
    setForm(schemeToForm(scheme));
    setFormErrors({});
    setFormError(null);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorVisible(false);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next: FormErrors = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleFormLabel = (label: SchemeLabel) =>
    setField(
      'labels',
      form.labels.includes(label) ? form.labels.filter((l) => l !== label) : [...form.labels, label]
    );

  const handleSave = async () => {
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      const input = formToInput(form);
      if (editing) {
        const updated = await updateScheme(editing._id, input);
        replaceScheme(updated);
      } else {
        const created = await createScheme(input);
        setSchemes((prev) => [created, ...prev]);
      }
      setEditorVisible(false);
      loadAnalytics();
    } catch (err) {
      logApiError('Admin save scheme', err);
      setFormError(friendlyError(err, 'Could not save the scheme.'));
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Row actions
  // -------------------------------------------------------------------------

  const patchScheme = async (scheme: Scheme, patch: Partial<SchemeInput>, tag: string) => {
    if (busyId) return;
    setBusyId(scheme._id);
    setActionError(null);
    try {
      const updated = await updateScheme(scheme._id, patch);
      replaceScheme(updated);
      loadAnalytics();
    } catch (err) {
      logApiError(tag, err);
      setActionError(friendlyError(err, 'Could not update the scheme.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = (scheme: Scheme) =>
    patchScheme(scheme, { isActive: !scheme.isActive }, 'Admin toggle scheme active');

  const handleToggleLabel = (scheme: Scheme, label: SchemeLabel) => {
    const labels = scheme.labels.includes(label)
      ? scheme.labels.filter((l) => l !== label)
      : [...scheme.labels, label];
    patchScheme(scheme, { labels }, 'Admin toggle scheme label');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteScheme(deleteTarget._id);
      setSchemes((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      setDeleteTarget(null);
      loadAnalytics();
    } catch (err) {
      logApiError('Admin delete scheme', err);
      setActionError(friendlyError(err, 'Could not delete the scheme.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasFilters = search.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const categoryOptions = useMemo(
    () => [
      { label: 'All categories', value: 'all' },
      ...SCHEME_CATEGORIES.map((c) => ({ label: SCHEME_CATEGORY_META[c].short, value: c })),
    ],
    []
  );

  const renderAnalytics = () => {
    if (!analytics) {
      return (
        <View style={styles.statsBlock}>
          <StatRowSkeleton />
          <StatRowSkeleton />
        </View>
      );
    }
    return (
      <View style={styles.statsBlock}>
        <View style={styles.statsRow}>
          <StatCard icon="ribbon-outline" value={analytics.totalSchemes} label="Total Schemes" accent={colors.primary} tint={colors.primarySoft} />
          <StatCard icon="checkmark-circle-outline" value={analytics.activeSchemes} label="Active Schemes" accent={colors.success} tint={colors.successSoft} />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="chatbubbles-outline"
            value={analytics.totalQueries}
            label={`Farmer Queries${analytics.openQueries ? ` · ${analytics.openQueries} open` : ''}`}
            accent={colors.info}
            tint={colors.tintBlue}
            onPress={() => router.push('/admin/scheme-queries' as any)}
          />
          <StatCard icon="checkmark-done-outline" value={analytics.resolvedQueries} label="Resolved Queries" accent={colors.secondary} tint={colors.secondarySoft} />
        </View>
        <View style={styles.mostViewed}>
          <View style={styles.mostViewedIcon}>
            <Ionicons name="eye-outline" size={19} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.mostViewedLabel}>Most viewed scheme</Text>
            <Text style={styles.mostViewedName} numberOfLines={1}>
              {analytics.mostViewedScheme ? analytics.mostViewedScheme.name : 'No views recorded yet'}
            </Text>
          </View>
          {analytics.mostViewedScheme && (
            <Text style={styles.mostViewedCount}>{analytics.mostViewedScheme.viewCount}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderScheme = ({ item }: { item: Scheme }) => {
    const busy = busyId === item._id;
    return (
      <SchemeCard
        scheme={item}
        adminMeta
        onPress={() => openEdit(item)}
        footer={
          <View style={styles.cardFooter}>
            <View style={styles.labelRow}>
              <Text style={styles.labelHint}>Mark as</Text>
              {SCHEME_LABELS.map((label) => (
                <Chip
                  key={label}
                  label={SCHEME_LABEL_META[label].label}
                  icon={SCHEME_LABEL_META[label].icon}
                  active={item.labels.includes(label)}
                  onPress={() => handleToggleLabel(item, label)}
                />
              ))}
            </View>
            <View style={styles.actionRow}>
              <View style={styles.toggleWrap}>
                <Switch
                  value={item.isActive}
                  disabled={busy}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
                  thumbColor={item.isActive ? colors.primary : colors.white}
                />
                <Text style={styles.toggleText}>{item.isActive ? 'Published' : 'Hidden'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: Layout.spacing.sm }}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit scheme"
                >
                  <Ionicons name="create-outline" size={19} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, styles.iconBtnDanger]}
                  onPress={() => setDeleteTarget(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete scheme"
                >
                  <Ionicons name="trash-outline" size={19} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title="Government Schemes"
        subtitle={`${schemes.length} scheme(s) published`}
        onRefresh={() => load()}
        rightIcon="chatbubbles-outline"
        onRightPress={() => router.push('/admin/scheme-queries' as any)}
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search schemes..." />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ]}
        selected={statusFilter}
        onSelect={(v) => setStatusFilter(v as StatusFilter)}
      />
      <FilterChips options={categoryOptions} selected={categoryFilter} onSelect={(v) => setCategoryFilter(v as CategoryFilter)} />

      {actionError && (
        <ErrorState compact icon="alert-circle-outline" title="Action failed" message={actionError} style={styles.errorBanner} />
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : error ? (
        <ErrorState title="Could not load schemes" message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          renderItem={renderScheme}
          ListHeaderComponent={
            <>
              {renderAnalytics()}
              <Text style={styles.listTitle}>
                {hasFilters ? `${visible.length} matching scheme(s)` : 'All schemes'}
              </Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState
              compact
              icon="ribbon-outline"
              title={hasFilters ? 'No matching schemes' : 'No schemes published yet'}
              description={
                hasFilters
                  ? 'Try a different search, status or category.'
                  : 'Publish the first government scheme so farmers can discover subsidies and benefits.'
              }
              actionLabel={hasFilters ? 'Clear filters' : 'Create scheme'}
              onAction={hasFilters ? clearFilters : openCreate}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />}
        />
      )}

      {!loading && !error && (
        <View style={styles.fab}>
          <Button title="New Scheme" icon="add" size="md" fullWidth={false} onPress={openCreate} />
        </View>
      )}

      {/* Create / edit sheet */}
      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {editing ? 'Edit Scheme' : 'Create Scheme'}
              </Text>
              <TouchableOpacity onPress={closeEditor} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError && (
                <View style={styles.formError}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <Input
                label="Scheme name"
                required
                icon="ribbon-outline"
                placeholder="e.g. PM-KISAN Samman Nidhi"
                value={form.name}
                onChangeText={(t) => setField('name', t)}
                error={formErrors.name}
                maxLength={150}
              />

              <Text style={styles.fieldLabel}>
                Category <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.chipWrap}>
                {SCHEME_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    icon={SCHEME_CATEGORY_META[c].icon}
                    active={form.category === c}
                    onPress={() => setField('category', c)}
                  />
                ))}
              </View>

              <Input
                label="Description"
                required
                placeholder="What the scheme offers and who it is for"
                value={form.description}
                onChangeText={(t) => setField('description', t)}
                error={formErrors.description}
                multiline
                maxLength={4000}
              />
              <Input
                label="Benefits"
                placeholder="e.g. ₹6,000 per year in three instalments"
                value={form.benefits}
                onChangeText={(t) => setField('benefits', t)}
                multiline
                maxLength={3000}
              />
              <Input
                label="Eligibility criteria"
                required
                placeholder="e.g. Small and marginal farmers owning up to 2 hectares"
                value={form.eligibility}
                onChangeText={(t) => setField('eligibility', t)}
                error={formErrors.eligibility}
                multiline
                maxLength={3000}
              />
              <Input
                label="Required documents"
                placeholder={'One per line\nAadhaar card\nLand records\nBank passbook'}
                hint="Enter one document per line."
                value={form.requiredDocuments}
                onChangeText={(t) => setField('requiredDocuments', t)}
                multiline
              />
              <Input
                label="Application deadline"
                icon="calendar-outline"
                placeholder="YYYY-MM-DD (leave blank if open)"
                value={form.applicationDeadline}
                onChangeText={(t) => setField('applicationDeadline', t)}
                error={formErrors.applicationDeadline}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                autoCapitalize="none"
                maxLength={10}
              />
              <Input
                label="Official website"
                icon="globe-outline"
                placeholder="https://pmkisan.gov.in"
                value={form.officialWebsite}
                onChangeText={(t) => setField('officialWebsite', t)}
                error={formErrors.officialWebsite}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Contact number"
                icon="call-outline"
                placeholder="155261 or +91 ..."
                value={form.contactNumber}
                onChangeText={(t) => setField('contactNumber', t)}
                error={formErrors.contactNumber}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Highlight as</Text>
              <View style={styles.chipWrap}>
                {SCHEME_LABELS.map((label) => (
                  <Chip
                    key={label}
                    label={SCHEME_LABEL_META[label].label}
                    icon={SCHEME_LABEL_META[label].icon}
                    active={form.labels.includes(label)}
                    onPress={() => toggleFormLabel(label)}
                  />
                ))}
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>{form.isActive ? 'Published to farmers' : 'Hidden from farmers'}</Text>
                  <Text style={styles.switchSub}>Inactive schemes stay in the admin list only.</Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setField('isActive', v)}
                  trackColor={{ false: colors.lightGray, true: colors.primaryLight }}
                  thumbColor={form.isActive ? colors.primary : colors.white}
                />
              </View>

              <Button
                title={editing ? 'Save Changes' : 'Publish Scheme'}
                icon={editing ? 'save-outline' : 'cloud-upload-outline'}
                size="lg"
                loading={saving}
                disabled={saving}
                onPress={handleSave}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete scheme?"
        message={`"${deleteTarget?.name ?? ''}" and every farmer question about it will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        icon="trash-outline"
        onConfirm={handleDelete}
        onCancel={() => (deleting ? undefined : setDeleteTarget(null))}
      />
    </SafeAreaView>
  );
}
