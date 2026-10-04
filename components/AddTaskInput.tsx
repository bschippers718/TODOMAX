import { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Platform, PlatformColor } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { useSettings } from '../hooks/useSettings';
import { PressableScale } from './ui/PressableScale';
import { Symbol } from './ui/Symbol';

interface AddTaskInputProps {
  onAdd: (text: string) => void;
  hapticsEnabled?: boolean;
}

// Disabled control tint from the system palette so it matches other apps
// in both appearances; falls back to a static tone off-iOS.
const DISABLED_FILL =
  Platform.OS === 'ios' ? PlatformColor('tertiarySystemFill') : 'rgba(120,120,128,0.24)';
const DISABLED_INK =
  Platform.OS === 'ios' ? PlatformColor('tertiaryLabel') : 'rgba(60,60,67,0.3)';

export function AddTaskInput({ onAdd, hapticsEnabled = true }: AddTaskInputProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const hasText = text.trim().length > 0;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (hapticsEnabled) Haptics.selectionAsync();
    onAdd(trimmed);
    setText('');
  };

  const signal = theme.isSignal;
  const radius = { borderRadius: theme.radiusControl };
  const { settings } = useSettings();
  const hasPhoto = Boolean(settings.customBackgroundUri);

  // Signal: the bar is plain paper, so over a photo it can vanish. A soft lift
  // (not a hard sign shadow) keeps "where you add a stop" findable without
  // making the composer compete with the todos.
  const lift = signal
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: theme.isDark ? (hasPhoto ? 0.6 : 0.4) : hasPhoto ? 0.3 : 0.1,
        shadowRadius: 16,
        elevation: 6,
      }
    : null;

  return (
    // Bottom padding is the real safe-area inset; the screen's keyboard-controller
    // KeyboardAvoidingView subtracts it again so the bar lands flush on the keyboard.
      <View
        style={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            // Over a photo the bar becomes enamel, not more paper.
            backgroundColor: signal ? (hasPhoto ? theme.surface : theme.bg) : theme.composerBg,
            borderTopColor: signal && hasPhoto ? theme.borderStrong : theme.separator,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
          lift,
        ]}
      >
        <View
          style={[
            styles.inputShell,
            radius,
            // Signal: no shell. A rule, a pip and a placeholder — the row only
            // becomes a sign once it's a todo.
            signal
              ? styles.shellSignal
              : [
                  theme.shadowControl,
                  { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, borderWidth: theme.borderWidth },
                  hasText && { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.12 },
                ],
          ]}
        >
          {signal ? (
            // Signal: a stop marker where the next stop goes.
            <View style={[styles.stopPip, { borderColor: hasText ? theme.blue : theme.textTertiary }]} />
          ) : (
            <Symbol name="sparkles" size={16} color={theme.gold} style={styles.promptPip} />
          )}
          <TextInput
            ref={inputRef}
            style={[styles.input, theme.fontTask, { color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder={signal ? 'Add one stop…' : 'Add one thing…'}
            placeholderTextColor={theme.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            submitBehavior="submit"
            enablesReturnKeyAutomatically
            keyboardAppearance={theme.isDark ? 'dark' : 'light'}
            autoCorrect
            autoCapitalize="sentences"
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="New task"
          />
        </View>
        <PressableScale
          style={[
            styles.addButton,
            radius,
            { borderWidth: theme.borderWidth },
            hasText
              ? [theme.shadowControl, { backgroundColor: theme.buttonFill, borderColor: signal ? theme.cardBorder : theme.gold }]
              : signal
                // Idle: just a grey glyph. Colour arrives with the first letter.
                ? { backgroundColor: 'transparent', borderColor: 'transparent', ...theme.shadowNone }
                : { backgroundColor: DISABLED_FILL, borderColor: 'transparent', ...theme.shadowNone },
            signal && styles.addSignal,
          ]}
          onPress={handleSubmit}
          disabled={!hasText}
          pressedScale={0.92}
          accessibilityLabel="Add task"
          accessibilityState={{ disabled: !hasText }}
        >
          <Symbol
            name="plus"
            size={20}
            weight="bold"
            color={hasText ? theme.buttonText : signal ? theme.textTertiary : (DISABLED_INK as unknown as string)}
          />
        </PressableScale>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputShell: {
    flex: 1,
    minHeight: 52,
    paddingLeft: 14,
    paddingRight: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shellSignal: {
    paddingLeft: 6,
    marginRight: 6,
    minHeight: 50,
  },
  promptPip: {
    marginRight: 8,
  },
  stopPip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.5,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 12,
  },
  addButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSignal: {
    width: 46,
    height: 46,
    marginRight: 3,
    marginBottom: 3,
  },
});
