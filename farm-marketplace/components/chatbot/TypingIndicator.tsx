import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';

/** Three bouncing dots shown while the assistant "thinks". */
export default function TypingIndicator() {
  const colors = useColors();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(450 - i * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: Layout.spacing.xs,
          marginBottom: Layout.spacing.sm,
        },
        avatar: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        bubble: {
          flexDirection: 'row',
          gap: 5,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.md,
          borderRadius: Layout.borderRadius.lg,
          borderBottomLeftRadius: 4,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        },
        dot: {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.primary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="leaf" size={15} color={colors.primary} />
      </View>
      <View style={styles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}
