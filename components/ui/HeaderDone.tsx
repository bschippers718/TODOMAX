import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { PressableScale } from './PressableScale';

/** Standard iOS sheet dismiss button: bold blue "Done" on the trailing edge. */
export function HeaderDone({ label = 'Done' }: { label?: string }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      pressedScale={0.94}
      pressedOpacity={0.6}
      pressStyle="scale"
      hitSlop={10}
      accessibilityLabel={label}
      style={styles.button}
    >
      <Text style={[styles.text, theme.isSignal && theme.fontTask, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 4, paddingHorizontal: 2 },
  text: { fontSize: 17, fontWeight: '600' },
});
