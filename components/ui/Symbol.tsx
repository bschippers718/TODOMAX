import React from 'react';
import { Platform, StyleProp, Text, ViewStyle } from 'react-native';
import { SymbolView, SymbolWeight } from 'expo-symbols';

export type SymbolName =
  | 'gearshape.fill'
  | 'xmark'
  | 'xmark.circle.fill'
  | 'plus'
  | 'checkmark'
  | 'checkmark.circle.fill'
  | 'chevron.right'
  | 'chevron.left'
  | 'trash.fill'
  | 'pencil'
  | 'play.fill'
  | 'lock.fill'
  | 'sparkles'
  | 'arrow.clockwise'
  | 'photo.on.rectangle'
  | 'map.fill';

const FALLBACK: Record<SymbolName, string> = {
  'gearshape.fill': '⚙',
  xmark: '✕',
  'xmark.circle.fill': '⊗',
  plus: '+',
  checkmark: '✓',
  'checkmark.circle.fill': '✓',
  'chevron.right': '›',
  'chevron.left': '‹',
  'trash.fill': '🗑',
  pencil: '✎',
  'play.fill': '▶',
  'lock.fill': '🔒',
  sparkles: '✦',
  'arrow.clockwise': '↻',
  'photo.on.rectangle': '🖼',
  'map.fill': '🗺',
};

interface Props {
  /** Any SF Symbol name; the known set gets a text fallback off-iOS. */
  name: SymbolName | (string & {});
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}

/**
 * SF Symbol on iOS, glyph fallback elsewhere. Keeps icons optically aligned
 * with the system's own — the biggest single "feels native" tell.
 */
export function Symbol({ name, size = 18, color, weight = 'semibold', style }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name as any}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={[{ width: size, height: size }, style]}
      />
    );
  }
  return (
    <Text
      style={[{ fontSize: size * 0.9, color, lineHeight: size, textAlign: 'center' }, style as any]}
      allowFontScaling={false}
    >
      {FALLBACK[name as SymbolName] ?? '•'}
    </Text>
  );
}
