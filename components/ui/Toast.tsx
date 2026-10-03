import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { Symbol, SymbolName } from './Symbol';

export interface ToastMessage {
  title: string;
  subtitle?: string;
  icon?: SymbolName | (string & {});
  tint?: string;
}

const SHOW_MS = 2200;

/**
 * Lightweight HUD that drops from under the status bar, like iOS's own
 * "Saved to Photos" / AirPods banners. Replaces blocking Alert.alert for
 * success feedback.
 */
export function useToast() {
  const [msg, setMsg] = useState<ToastMessage | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(m);
    setKey((k) => k + 1);
    timer.current = setTimeout(() => setMsg(null), SHOW_MS + 500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toast = msg ? <Toast key={key} message={msg} /> : null;
  return { show, toast };
}

function Toast({ message }: { message: ToastMessage }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSequence(
      withSpring(1, { damping: 18, stiffness: 240, mass: 0.8 }),
      withDelay(SHOW_MS, withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) })),
    );
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (progress.value - 1) * 40 },
      { scale: 0.92 + 0.08 * progress.value },
    ],
  }));

  const tint = message.tint ?? theme.green;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        style={[
          styles.pill,
          theme.isSignal ? theme.shadowControl : styles.pillSoft,
          {
            backgroundColor: theme.surface,
            borderColor: theme.isSignal ? theme.cardBorder : theme.borderStrong,
            borderWidth: theme.isSignal ? theme.borderWidth : StyleSheet.hairlineWidth,
            borderRadius: theme.isSignal ? theme.radiusControl : 999,
            shadowColor: theme.shadow,
          },
          style,
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.iconWrap, { backgroundColor: tint, borderRadius: theme.isSignal ? 13 : 13 }]}>
          <Symbol name={message.icon ?? 'checkmark'} size={14} color="#fff" weight="bold" />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
            {message.title}
          </Text>
          {message.subtitle ? (
            <Text
              style={[styles.subtitle, { color: theme.textSecondary }]}
              maxFontSizeMultiplier={1.3}
            >
              {message.subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    maxWidth: '88%',
  },
  pillSoft: {
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flexShrink: 1 },
  title: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  subtitle: { fontSize: 12, marginTop: 1 },
});
