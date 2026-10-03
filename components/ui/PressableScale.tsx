import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. 0.97 reads like a UIKit button; 0.9 like an icon. */
  pressedScale?: number;
  /** Opacity while pressed. */
  pressedOpacity?: number;
  /**
   * `scale` squashes (Classic). `drop` slides the control onto its hard shadow
   * and flattens the shadow (Signal). Defaults to the theme's preference; pass
   * `pressStyle="scale"` for text-only buttons that have no shadow to drop onto.
   */
  pressStyle?: 'scale' | 'drop' | 'auto';
  /** How far a `drop` press travels. Should match the hard-shadow offset. */
  dropDistance?: number;
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
  pressStyle = 'auto',
  dropDistance = 3,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: Props) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const mode = pressStyle === 'auto' ? theme.pressStyle : pressStyle;

  const handleIn = useCallback(
    (e: any) => {
      pressed.value = withTiming(1, { duration: mode === 'drop' ? 70 : 90 });
      onPressIn?.(e);
    },
    [onPressIn, pressed, mode]
  );
  const handleOut = useCallback(
    (e: any) => {
      pressed.value =
        mode === 'drop'
          ? withTiming(0, { duration: 90 })
          : withSpring(0, { damping: 16, stiffness: 320, mass: 0.6 });
      onPressOut?.(e);
    },
    [onPressOut, pressed, mode]
  );

  const animStyle = useAnimatedStyle(() => {
    if (mode === 'drop') {
      const d = dropDistance * pressed.value;
      return {
        transform: [{ translateX: d }, { translateY: d }],
        shadowOffset: { width: dropDistance - d, height: dropDistance - d },
      };
    }
    return {
      transform: [{ scale: 1 - (1 - pressedScale) * pressed.value }],
      opacity: 1 - (1 - pressedOpacity) * pressed.value,
    };
  });

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
