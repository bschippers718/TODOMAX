import { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Platform, PlatformColor } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
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

  return (
    // Bottom padding is the real safe-area inset; the screen's keyboard-controller
    // KeyboardAvoidingView subtracts it again so the bar lands flush on the keyboard.
      <View
        style={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.composerBg,
            borderTopColor: theme.separator,
          },
        ]}
      >
        <View
          style={[
            styles.inputShell,
            { backgroundColor: theme.inputBg, borderColor: theme.borderStrong, shadowColor: theme.shadow },
            hasText && { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.12 },
          ]}
        >
          <Symbol name="sparkles" size={16} color={theme.gold} style={styles.promptPip} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder="Add one thing…"
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
            hasText
              ? { backgroundColor: theme.buttonFill, borderColor: theme.gold, shadowColor: theme.shadow }
              : { backgroundColor: DISABLED_FILL, borderColor: 'transparent', shadowOpacity: 0 },
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
            color={hasText ? theme.buttonText : (DISABLED_INK as unknown as string)}
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
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  promptPip: {
    marginRight: 8,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
});
