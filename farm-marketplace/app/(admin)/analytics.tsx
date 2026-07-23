import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';

const BAR_MAX = Dimensions.get('window').width - 80;

export default function AdminAnalyticsScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Platform.OS === 'android' ? 40 : 20,
          paddingBottom: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
        },
        content: { padding: Layout.spacing.md },
        sectionTitle: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
          marginBottom: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: Layout.spacing.sm,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        name: { color: colors.black, fontWeight: '600', flex: 1 },
        value: { color: colors.primary, fontWeight: '700' },
        barTrack: {
          height: 10,
          backgroundColor: colors.lighterGray,
          borderRadius: 6,
          marginTop: 8,
          overflow: 'hidden',
        },
        barFill: { height: 10, borderRadius: 6, backgroundColor: colors.primary },
        monthLabel: { fontSize: 11, color: colors.gray, marginTop: 4 },
        activity: { color: colors.gray, fontSize: 12, marginTop: 2 },
      } as any),
    [colors]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/analytics');
        if (res.data.success) setAnalytics(res.data.analytics);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxRevenue = Math.max(
    ...(analytics?.monthlyRevenue?.map((m: any) => m.revenue) || [1]),
    1
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.admin} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.admin} />
        </View>
      ) : !analytics ? (
        <EmptyState title="No analytics data" description="Place some orders to see insights." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Revenue (last months)</Text>
          {(analytics.monthlyRevenue || []).map((m: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>
                  {m._id.month}/{m._id.year}
                </Text>
                <Text style={styles.value}>₹{m.revenue.toFixed(0)}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: Math.max(8, (m.revenue / maxRevenue) * BAR_MAX) },
                  ]}
                />
              </View>
              <Text style={styles.monthLabel}>{m.orders} orders</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Most Sold Products</Text>
          {(analytics.mostSoldProducts || []).map((p: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{p.name || 'Product'}</Text>
                <Text style={styles.value}>{p.soldQty} sold</Text>
              </View>
              <Text style={styles.activity}>Revenue ₹{(p.revenue || 0).toFixed(0)}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Top Farmers</Text>
          {(analytics.topFarmers || []).map((f: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{f.name || 'Farmer'}</Text>
                <Text style={styles.value}>₹{(f.revenue || 0).toFixed(0)}</Text>
              </View>
              <Text style={styles.activity}>{f.orderCount} orders</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Top Buyers</Text>
          {(analytics.topBuyers || []).map((b: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{b.name || 'Buyer'}</Text>
                <Text style={styles.value}>₹{(b.spent || 0).toFixed(0)}</Text>
              </View>
              <Text style={styles.activity}>{b.orderCount} orders</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Latest Activities</Text>
          {(analytics.latestActivities || []).map((a: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.name}>{a.message}</Text>
              <Text style={styles.activity}>
                {a.type} · {new Date(a.createdAt).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
