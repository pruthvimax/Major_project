import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Badge from './Badge';
import Rating from './Rating';

interface ProductCardProps {
  name: string;
  price: number | string;
  unit?: string;
  imageUri?: string;
  /** e.g. "by Green Valley Farms" */
  subtitle?: string;
  description?: string;
  location?: string;
  stockLabel?: string;
  isOrganic?: boolean;
  /** Present => on-chain verified badge, undefined/null => database only. */
  blockchainId?: number | null;
  rating?: number;
  reviewCount?: number;
  outOfStock?: boolean;
  onPress?: () => void;
  /** Action area rendered in the card footer, next to the price. */
  footer?: React.ReactNode;
  /** Extra chips rendered under the title (status, category, …). */
  meta?: React.ReactNode;
  style?: ViewStyle;
}

export default function ProductCard({
  name,
  price,
  unit,
  imageUri,
  subtitle,
  description,
  location,
  stockLabel,
  isOrganic,
  blockchainId,
  rating,
  reviewCount,
  outOfStock,
  onPress,
  footer,
  meta,
  style,
}: ProductCardProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          marginBottom: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          ...Layout.shadow.sm,
        },
        media: {
          height: 168,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        image: {
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        },
        placeholderText: {
          fontSize: Typography.fontSize.xxs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
          marginTop: 6,
          letterSpacing: 0.4,
        },
        mediaBadges: {
          position: 'absolute',
          top: Layout.spacing.sm + 2,
          left: Layout.spacing.sm + 2,
          right: Layout.spacing.sm + 2,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        outOfStockVeil: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        },
        outOfStockText: {
          color: '#FFFFFF',
          fontWeight: Typography.fontWeight.bold,
          fontSize: Typography.fontSize.sm,
          letterSpacing: 0.6,
        },
        body: {
          padding: Layout.spacing.md,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        name: {
          flex: 1,
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        subtitle: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        description: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          marginTop: Layout.spacing.sm,
        },
        metaRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.sm + 2,
        },
        metaItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          maxWidth: '100%',
        },
        metaText: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          flexShrink: 1,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
        },
        price: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.primary,
          flexShrink: 1,
        },
        unit: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.medium,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.card, style]}
      {...(onPress ? { onPress, activeOpacity: 0.92 } : {})}
    >
      <View style={styles.media}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <>
            <Ionicons name="leaf-outline" size={38} color={colors.primary} />
            <Text style={styles.placeholderText}>FARM FRESH PRODUCE</Text>
          </>
        )}

        <View style={styles.mediaBadges} pointerEvents="none">
          <View>
            {isOrganic ? <Badge label="ORGANIC" tone="success" icon="leaf" /> : null}
          </View>
          <View>
            {blockchainId !== undefined && blockchainId !== null ? (
              <Badge label={`VERIFIED #${blockchainId}`} tone="info" icon="link" />
            ) : (
              <Badge label="DATABASE ONLY" tone="neutral" icon="server-outline" />
            )}
          </View>
        </View>

        {outOfStock && (
          <View style={styles.outOfStockVeil}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {rating !== undefined && rating > 0 && (
            <Rating value={rating} count={reviewCount} size={14} />
          )}
        </View>

        {!!description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {(location || stockLabel || meta) && (
          <View style={styles.metaRow}>
            {!!location && (
              <View style={[styles.metaItem, { flexShrink: 1 }]}>
                <Ionicons name="location-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            )}
            {!!stockLabel && (
              <View style={styles.metaItem}>
                <Ionicons name="cube-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {stockLabel}
                </Text>
              </View>
            )}
            {meta}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.price} numberOfLines={1}>
            ₹{price}
            {!!unit && <Text style={styles.unit}> / {unit}</Text>}
          </Text>
          {footer}
        </View>
      </View>
    </Wrapper>
  );
}
