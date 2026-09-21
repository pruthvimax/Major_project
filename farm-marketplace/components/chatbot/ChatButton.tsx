import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface ChatButtonProps {
  open: boolean;
  onPress: () => void;
  /** Distance from the bottom edge, so it clears tab bars / bottom actions. */
  bottomOffset?: number;
}

/** Floating assistant button with a gentle pulse and an open/close rotation. */
export default function ChatButton({ open, onPress, bottomOffset = 80 }: ChatButtonProps) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (!open) loop.start();
    else pulse.setValue(1);
    return () => loop.stop();
  }, [open, pulse]);

  useEffect(() => {
    Animated.spring(rotate, { toValue: open ? 1 : 0, useNativeDriver: true, friction: 6 }).start();
  }, [open, rotate]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'absolute',
          right: Layout.spacing.lg,
          bottom: bottomOffset,
          zIndex: 999,
        },
        fab: {
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: colors.white,
          ...Layout.shadow.lg,
        },
      }),
    [colors, bottomOffset]
  );

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulse }, { rotate: spin }] }]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close assistant' : 'Open Krishi Assistant'}
      >
        <Ionicons name={open ? 'close' : 'chatbubble-ellipses'} size={26} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}
