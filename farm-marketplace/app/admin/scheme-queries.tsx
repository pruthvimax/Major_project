import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { fetchAllSchemeQueries, formatSchemeDate, respondToSchemeQuery } from '../../services/schemes';
import type { SchemeQuery, SchemeQueryStatus } from '../../types/scheme.types';
import AdminHeader from '../../components/admin/AdminHeader';
import SearchBar from '../../components/admin/SearchBar';
import FilterChips from '../../components/admin/FilterChips';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { AdminListSkeleton } from '../../components/admin/AdminSkeleton';
import QueryCard, { QueryStatusBadge } from '../../components/schemes/QueryCard';
import { Button, EmptyState, ErrorState, Input, friendlyError } from '../../components/ui';

type StatusFilter = 'all' | SchemeQueryStatus;

const QUICK_REPLIES = [
  'You are eligible. Please apply on the official website with the listed documents.',
  'Please visit your nearest Raitha Samparka Kendra with your Aadhaar and land records.',
  'This scheme is currently closed for new applications. We will notify you when it reopens.',
];

export default function AdminSchemeQueriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [queries, setQueries] = useState<SchemeQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const [selected, setSelected] = useState<SchemeQuery | null>(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<SchemeQuery | null>(null);
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        list: {
          paddingHorizontal: Layout.spacing.md,
          paddingTop: Layout.spacing.sm,
          paddingBottom: Layout.spacing.xxl,
        },
        summaryRow: { flexDirection: 'row', gap: Layout.spacing.sm, paddingBottom: Layout.spacing.md },
        summaryPill: {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: Layout.spacing.sm + 2,
          alignItems: 'center',
        },
        summaryValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: colors.text },
        summaryLabel: { fontSize: Typography.fontSize.xxs, color: colors.textSecondary, marginTop: 1, letterSpacing: 0.4 },
        cardFooter: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        errorBanner: { paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm },
        // Sheet
        overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
        sheet: {
          backgroundColor: colors.card,
          borderTopLeftRadius: Layout.borderRadius.xxl,
          borderTopRightRadius: Layout.borderRadius.xxl,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.sm,
          maxHeight: '90%',
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
        detailCard: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
        },
        detailRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
        },
        detailLabel: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, flexShrink: 0 },
        detailValue: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          textAlign: 'right',
        },
        sectionLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginTop: Layout.spacing.lg,
          marginBottom: Layout.spacing.sm,
        },
        questionBox: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
        },
        questionText: { fontSize: Typography.fontSize.sm, lineHeight: Typography.leading.md, color: colors.text },
        prevReply: {
          backgroundColor: colors.primarySoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
        },
        prevReplyMeta: { fontSize: Typography.fontSize.xs, color: colors.primaryDark, marginBottom: 4, fontWeight: Typography.fontWeight.semibold },
        quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm, marginBottom: Layout.spacing.sm },
        quick: {
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          maxWidth: '100%',
        },
        quickText: { fontSize: Typography.fontSize.xs, color: colors.text },
        sheetActions: { flexDirection: 'row', gap: Layout.spacing.sm, marginTop: Layout.spacing.sm },
        actionSlot: { flex: 1, minWidth: 0 },
        resolvedNote: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: colors.successSoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginTop: Layout.spacing.md,
        },
        resolvedText: { flex: 1, color: colors.success, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
      }),
    [colors, insets.bottom]
  );

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      setQueries(await fetchAllSchemeQueries('all'));
    } catch (err) {
      logApiError('Admin fetch scheme queries', err);
      setError(friendlyError(err, 'Could not load farmer queries.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const counts = useMemo(
    () => ({
      open: queries.filter((q) => q.status === 'open').length,
      answered: queries.filter((q) => q.status === 'answered').length,
      resolved: queries.filter((q) => q.status === 'resolved').length,
    }),
    [queries]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queries.filter((q) => {
      const matchesStatus = filter === 'all' || q.status === filter;
      const matchesSearch =
        term === '' ||
        q.question.toLowerCase().includes(term) ||
        (q.adminResponse || '').toLowerCase().includes(term) ||
        (q.scheme?.name || '').toLowerCase().includes(term) ||
        (q.farmer?.name || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [queries, search, filter]);

  const replaceQuery = (updated: SchemeQuery) =>
    setQueries((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));

  const openReply = (q: SchemeQuery) => {
    setSelected(q);
    setReply(q.adminResponse || '');
    setReplyError(null);
    setActionError(null);
  };

  const closeReply = () => {
    if (sending) return;
    setSelected(null);
  };

  const handleSendReply = async (alsoResolve = false) => {
    if (!selected) return;
    const trimmed = reply.trim();
    if (trimmed.length < 2) {
      setReplyError('Please write a reply for the farmer.');
      return;
    }
    setSending(true);
    setReplyError(null);
    try {
      const updated = await respondToSchemeQuery(selected._id, {
        adminResponse: trimmed,
        status: alsoResolve ? 'resolved' : 'answered',
      });
      replaceQuery(updated);
      setSelected(null);
    } catch (err) {
      logApiError('Admin reply scheme query', err);
      setReplyError(friendlyError(err, 'Could not send the reply.'));
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    setActionError(null);
    try {
      const updated = await respondToSchemeQuery(resolveTarget._id, { status: 'resolved' });
      replaceQuery(updated);
    } catch (err) {
      logApiError('Admin resolve scheme query', err);
      setActionError(friendlyError(err, 'Could not resolve the query.'));
    } finally {
      setResolving(false);
      setResolveTarget(null);
    }
  };

  const handleReopen = async (q: SchemeQuery) => {
    setActionError(null);
    try {
      const updated = await respondToSchemeQuery(q._id, { status: 'answered' });
      replaceQuery(updated);
    } catch (err) {
      logApiError('Admin reopen scheme query', err);
      setActionError(friendlyError(err, 'Could not reopen the query.'));
    }
  };

  const hasFilters = search.trim() !== '' || filter !== 'all';

  const renderQuery = ({ item }: { item: SchemeQuery }) => (
    <QueryCard
      query={item}
      showFarmer
      onPress={() => openReply(item)}
      footer={
        <View style={styles.cardFooter}>
          {item.status === 'resolved' ? (
            <Button title="Reopen" icon="refresh-outline" variant="ghost" size="sm" fullWidth={false} onPress={() => handleReopen(item)} />
          ) : (
            <>
              {item.adminResponse ? (
                <Button
                  title="Resolve"
                  icon="checkmark-done-outline"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setResolveTarget(item)}
                />
              ) : null}
              <Button
                title={item.adminResponse ? 'Edit reply' : 'Reply'}
                icon="chatbubble-ellipses-outline"
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={() => openReply(item)}
              />
            </>
          )}
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title="Farmer Queries"
        subtitle={`${counts.open} open · ${counts.answered} answered · ${counts.resolved} resolved`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin'))}
        onRefresh={() => load()}
        rightIcon="ribbon-outline"
        onRightPress={() => router.push('/admin/schemes' as any)}
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by question, farmer, scheme..." />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: `Open (${counts.open})`, value: 'open' },
          { label: `Answered (${counts.answered})`, value: 'answered' },
          { label: `Resolved (${counts.resolved})`, value: 'resolved' },
        ]}
        selected={filter}
        onSelect={(v) => setFilter(v as StatusFilter)}
      />

      {actionError && (
        <ErrorState compact icon="alert-circle-outline" title="Action failed" message={actionError} style={styles.errorBanner} />
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : error ? (
        <ErrorState title="Could not load queries" message={error} onRetry={() => load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={hasFilters ? 'No matching queries' : 'No farmer queries yet'}
          description={
            hasFilters
              ? 'Try a different status or search term.'
              : 'Questions farmers ask about government schemes will appear here for you to answer.'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={
            hasFilters
              ? () => {
                  setSearch('');
                  setFilter('all');
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          renderItem={renderQuery}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />}
        />
      )}

      {/* Reply sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={closeReply}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                Reply to farmer
              </Text>
              <TouchableOpacity onPress={closeReply} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selected.farmer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Scheme</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selected.scheme?.name || 'Scheme removed'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Asked on</Text>
                    <Text style={styles.detailValue}>{formatSchemeDate(selected.createdAt)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <QueryStatusBadge status={selected.status} />
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Question</Text>
                <View style={styles.questionBox}>
                  <Text style={styles.questionText}>{selected.question}</Text>
                </View>

                {selected.status === 'resolved' ? (
                  <>
                    <Text style={styles.sectionLabel}>Your reply</Text>
                    <View style={styles.prevReply}>
                      <Text style={styles.prevReplyMeta}>
                        Sent {formatSchemeDate(selected.respondedAt)}
                        {selected.respondedBy?.name ? ` by ${selected.respondedBy.name}` : ''}
                      </Text>
                      <Text style={styles.questionText}>{selected.adminResponse}</Text>
                    </View>
                    <View style={styles.resolvedNote}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                      <Text style={styles.resolvedText}>This query is resolved. Reopen it from the list to edit the reply.</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>Quick replies</Text>
                    <View style={styles.quickWrap}>
                      {QUICK_REPLIES.map((q) => (
                        <TouchableOpacity key={q} style={styles.quick} onPress={() => setReply(q)} activeOpacity={0.7}>
                          <Text style={styles.quickText}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.sectionLabel}>Your reply</Text>
                    <Input
                      placeholder="Write a clear, helpful answer for the farmer…"
                      value={reply}
                      onChangeText={(t) => {
                        setReply(t);
                        if (replyError) setReplyError(null);
                      }}
                      multiline
                      maxLength={3000}
                      error={replyError || undefined}
                      hint={`${reply.trim().length}/3000`}
                    />
                    <View style={styles.sheetActions}>
                      <Button
                        title="Send Reply"
                        icon="send-outline"
                        size="md"
                        loading={sending}
                        disabled={sending || reply.trim().length < 2}
                        onPress={() => handleSendReply(false)}
                        style={styles.actionSlot}
                      />
                      <Button
                        title="Reply & Resolve"
                        icon="checkmark-done-outline"
                        variant="secondary"
                        size="md"
                        disabled={sending || reply.trim().length < 2}
                        onPress={() => handleSendReply(true)}
                        style={styles.actionSlot}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={!!resolveTarget}
        title="Mark as resolved?"
        message="The farmer will see this question as resolved. You can reopen it later if needed."
        confirmLabel="Resolve"
        loading={resolving}
        icon="checkmark-done-outline"
        onConfirm={handleResolve}
        onCancel={() => (resolving ? undefined : setResolveTarget(null))}
      />
    </SafeAreaView>
  );
}
