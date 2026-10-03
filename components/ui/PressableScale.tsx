import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. 0.97 reads like a UIKit button; 0.9 like an icon. */
  pressedScale?: number;
  /** Opacity while pressed. */
  pressedOpacity?: number;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for TouchableOpacity that squashes slightly on press,
 * springing back on release — the way native iOS controls respond.
 */
export function PressableScale({
  style,
  pressedScale = 0.97,
  pressedOpacity = 0.85,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const handleIn = useCallback(
    (e: any) => {
      pressed.value = withTiming(1, { duration: 90 });
      onPressIn?.(e);
    },
    [onPressIn, pressed]
  );
  const handleOut = useCallback(
    (e: any) => {
      pressed.value = withSpring(0, { damping: 16, stiffness: 320, mass: 0.6 });
      onPressOut?.(e);
    },
    [onPressOut, pressed]
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressedScale) * pressed.value }],
    opacity: 1 - (1 - pressedOpacity) * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animStyle]}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      hitSlop={rest.hitSlop ?? 6}
    >
      {children}
    </AnimatedPressable>
  );
}
