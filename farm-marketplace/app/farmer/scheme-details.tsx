import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { logApiError } from '../../services/apiError';
import {
  describeDeadline,
  fetchMySchemeQueries,
  fetchSchemeById,
  formatSchemeDate,
  submitSchemeQuery,
  toggleSaveScheme,
} from '../../services/schemes';
import { SCHEME_CATEGORY_META, type Scheme, type SchemeQuery } from '../../types/scheme.types';
import { GovernmentBadge, SchemeLabelBadges } from '../../components/schemes/SchemeCard';
import QueryCard from '../../components/schemes/QueryCard';
import {
  Button,
  Card,
  ErrorState,
  Input,
  Loading,
  ScreenHeader,
  SectionHeader,
  friendlyError,
} from '../../components/ui';

const SUGGESTED_QUESTIONS = [
  'How do I apply for this scheme?',
  'Am I eligible?',
  'What documents are needed?',
];

export default function FarmerSchemeDetailsScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [queries, setQueries] = useState<SchemeQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xxl * 2 },
        heroCard: { marginBottom: Layout.spacing.lg },
        heroTop: { flexDirection: 'row', gap: Layout.spacing.md, alignItems: 'flex-start' },
        heroIcon: {
          width: 56,
          height: 56,
          borderRadius: Layout.borderRadius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        heroText: { flex: 1, minWidth: 0, gap: 6 },
        name: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        category: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          fontWeight: Typography.fontWeight.medium,
        },
        labels: { marginTop: Layout.spacing.sm },
        deadlineStrip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        deadlineLabel: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
        },
        deadlineValue: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        heroActions: { flexDirection: 'row', gap: Layout.spacing.sm, marginTop: Layout.spacing.md },
        actionSlot: { flex: 1, minWidth: 0 },
        section: { marginBottom: Layout.spacing.md },
        sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, marginBottom: Layout.spacing.sm },
        sectionIcon: {
          width: 32,
          height: 32,
          borderRadius: Layout.borderRadius.sm,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionTitle: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          flex: 1,
        },
        body: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.md,
          color: colors.text,
        },
        muted: { color: colors.textSecondary, fontStyle: 'italic' },
        docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Layout.spacing.sm, paddingVertical: 4 },
        docText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.leading.sm, color: colors.text },
        contactRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm + 2,
        },
        contactDivider: { height: 1, backgroundColor: colors.border },
        contactIcon: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        contactLabel: { fontSize: Typography.fontSize.xs, color: colors.textSecondary },
        contactValue: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.primary,
        },
        suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
        suggestion: {
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          borderRadius: Layout.borderRadius.full,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        },
        suggestionText: { fontSize: Typography.fontSize.xs, color: colors.text, fontWeight: Typography.fontWeight.medium },
        notice: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: colors.successSoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        },
        noticeText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.leading.sm, color: colors.success },
        emptyThread: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          paddingVertical: Layout.spacing.md,
        },
      }),
    [colors]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!id) {
        setError('Scheme not found.');
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        setError(null);
        const [schemeData, myQueries] = await Promise.all([
          fetchSchemeById(id),
          fetchMySchemeQueries(id).catch((err) => {
            logApiError('Farmer scheme queries', err);
            return [] as SchemeQuery[];
          }),
        ]);
        if (!schemeData) {
          setError('This scheme is no longer available.');
        } else {
          setScheme(schemeData);
          setQueries(myQueries);
        }
      } catch (err) {
        logApiError('Farmer scheme details', err);
        setError(friendlyError(err, 'We could not load this scheme right now.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleToggleSave = async () => {
    if (!scheme || saving) return;
    setSaving(true);
    const previous = scheme;
    setScheme({ ...scheme, isSaved: !scheme.isSaved, savedCount: scheme.savedCount + (scheme.isSaved ? -1 : 1) });
    try {
      await toggleSaveScheme(scheme._id);
    } catch (err) {
      logApiError('Farmer toggle save scheme', err);
      setScheme(previous);
    } finally {
      setSaving(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => logApiError('Open scheme website', err));
  };

  const callNumber = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch((err) => logApiError('Dial scheme contact', err));
  };

  const handleSubmitQuestion = async () => {
    if (!scheme) return;
    const trimmed = question.trim();
    if (trimmed.length < 5) {
      setQuestionError('Please write a question of at least 5 characters.');
      return;
    }
    setQuestionError(null);
    setSubmitNotice(null);
    setSubmitting(true);
    try {
      const created = await submitSchemeQuery(scheme._id, trimmed);
      setQueries((prev) => [created, ...prev]);
      setQuestion('');
      setSubmitNotice('Your question has been sent. An administrator will reply here.');
    } catch (err) {
      logApiError('Farmer submit scheme query', err);
      setQuestionError(friendlyError(err, 'We could not send your question. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <ScreenHeader
      title="Scheme Details"
      align="left"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/farmer/schemes' as any))}
      iconActions={
        scheme
          ? [
              {
                icon: scheme.isSaved ? 'bookmark' : 'bookmark-outline',
                onPress: handleToggleSave,
                color: scheme.isSaved ? colors.primary : colors.text,
                accessibilityLabel: scheme.isSaved ? 'Remove from saved' : 'Save scheme',
              },
            ]
          : undefined
      }
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {header}
        <Loading label="Loading scheme…" />
      </SafeAreaView>
    );
  }

  if (error || !scheme) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {header}
        <ErrorState
          icon="ribbon-outline"
          title="Scheme unavailable"
          message={error || 'This scheme could not be found.'}
          onRetry={() => load()}
        />
      </SafeAreaView>
    );
  }

  const category = SCHEME_CATEGORY_META[scheme.category] || SCHEME_CATEGORY_META.Other;

  const renderSection = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    children: React.ReactNode
  ) => (
    <Card style={styles.section} elevation="xs">
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {header}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* Hero */}
          <Card style={styles.heroCard} elevation="sm">
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name={category.icon} size={26} color={colors.primary} />
              </View>
              <View style={styles.heroText}>
                <GovernmentBadge />
                <Text style={styles.name}>{scheme.name}</Text>
                <Text style={styles.category}>{scheme.category}</Text>
              </View>
            </View>
            {scheme.labels.length > 0 && <SchemeLabelBadges labels={scheme.labels} style={styles.labels} />}
            <View style={styles.deadlineStrip}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deadlineLabel}>Application deadline</Text>
                <Text style={styles.deadlineValue}>
                  {scheme.applicationDeadline
                    ? `${formatSchemeDate(scheme.applicationDeadline)} · ${describeDeadline(scheme.applicationDeadline)}`
                    : 'Open — no fixed deadline'}
                </Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              {!!scheme.officialWebsite && (
                <Button
                  title="Official Website"
                  icon="open-outline"
                  size="sm"
                  onPress={() => openLink(scheme.officialWebsite)}
                  style={styles.actionSlot}
                />
              )}
              <Button
                title={scheme.isSaved ? 'Saved' : 'Save Scheme'}
                icon={scheme.isSaved ? 'bookmark' : 'bookmark-outline'}
                variant={scheme.isSaved ? 'ghost' : 'outline'}
                size="sm"
                loading={saving}
                onPress={handleToggleSave}
                style={styles.actionSlot}
              />
            </View>
          </Card>

          {renderSection('information-circle-outline', 'About this scheme', (
            <Text style={styles.body}>{scheme.description}</Text>
          ))}

          {renderSection('gift-outline', 'Benefits', (
            <Text style={[styles.body, !scheme.benefits && styles.muted]}>
              {scheme.benefits || 'Benefit details will be updated soon.'}
            </Text>
          ))}

          {renderSection('checkmark-done-outline', 'Eligibility', (
            <Text style={styles.body}>{scheme.eligibility}</Text>
          ))}

          {renderSection('documents-outline', 'Required documents', (
            scheme.requiredDocuments.length > 0 ? (
              scheme.requiredDocuments.map((doc, idx) => (
                <View key={`${doc}-${idx}`} style={styles.docRow}>
                  <Ionicons name="document-attach-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.docText}>{doc}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.body, styles.muted]}>No specific documents listed.</Text>
            )
          ))}

          {renderSection('call-outline', 'Contact & apply', (
            <>
              {!!scheme.contactNumber && (
                <TouchableOpacity style={styles.contactRow} onPress={() => callNumber(scheme.contactNumber)} activeOpacity={0.7}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>Helpline</Text>
                    <Text style={styles.contactValue}>{scheme.contactNumber}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
              {!!scheme.contactNumber && !!scheme.officialWebsite && <View style={styles.contactDivider} />}
              {!!scheme.officialWebsite && (
                <TouchableOpacity style={styles.contactRow} onPress={() => openLink(scheme.officialWebsite)} activeOpacity={0.7}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="globe-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactLabel}>Official website</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {scheme.officialWebsite}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
              {!scheme.contactNumber && !scheme.officialWebsite && (
                <Text style={[styles.body, styles.muted]}>
                  Contact details are not available. Ask a question below and our team will guide you.
                </Text>
              )}
            </>
          ))}

          {/* Ask a question */}
          <SectionHeader
            title="Ask a question"
            subtitle="Our team replies inside the app"
            style={{ marginTop: Layout.spacing.md }}
          />
          <Card style={styles.section} elevation="xs">
            <View style={styles.suggestions}>
              {SUGGESTED_QUESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestion} onPress={() => setQuestion(s)} activeOpacity={0.7}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {submitNotice && (
              <View style={styles.notice}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text style={styles.noticeText}>{submitNotice}</Text>
              </View>
            )}
            <Input
              placeholder="Type your question about this scheme…"
              value={question}
              onChangeText={(t) => {
                setQuestion(t);
                if (questionError) setQuestionError(null);
              }}
              multiline
              maxLength={1000}
              error={questionError || undefined}
              hint={`${question.trim().length}/1000`}
            />
            <Button
              title="Send Question"
              icon="send-outline"
              loading={submitting}
              disabled={submitting || question.trim().length < 5}
              onPress={handleSubmitQuestion}
            />
          </Card>

          {/* Farmer's own thread for this scheme */}
          <SectionHeader
            title="Your questions"
            subtitle={queries.length ? `${queries.length} on this scheme` : undefined}
            actionLabel="View all"
            onAction={() => router.push('/farmer/scheme-queries' as any)}
            style={{ marginTop: Layout.spacing.md }}
          />
          {queries.length === 0 ? (
            <Card elevation="xs">
              <Text style={styles.emptyThread}>You have not asked anything about this scheme yet.</Text>
            </Card>
          ) : (
            queries.map((q) => <QueryCard key={q._id} query={q} showScheme={false} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
