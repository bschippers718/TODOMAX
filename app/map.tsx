import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTasks } from '../hooks/useTasks';
import { useStrikeFlow } from '../hooks/useStrikeFlow';
import { MapCanvas, autoPlace, CARD_WIDTH } from '../components/map/MapCanvas';
import { AddTaskInput } from '../components/AddTaskInput';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { useTheme } from '../lib/theme';

/**
 * The Map: the same stops, laid out however they sit in your head. Hold and
 * drag to arrange, tap one then another to say "this comes after that",
 * double-tap to strike. Nothing here is required; the list is still home.
 */
export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { activeTasks, loaded, addTask, moveTask, placeTasks, toggleLink } = useTasks();
  const { settings, reduceMotion, celebration, celebrationSettings, dismissCelebration, toast, onStrike, onComplete } = useStrikeFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  // First visit (or new stops added from the list): give unplaced stops a spot.
  useEffect(() => {
    if (!loaded) return;
    const placed = autoPlace(activeTasks);
    if (Object.keys(placed).length) placeTasks(placed);
  }, [loaded, activeTasks, placeTasks]);

  // Open fitted to whatever's on the board, once. After that the viewport is yours.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !loaded) return;
    const placed = activeTasks.filter((t) => t.pos);
    if (placed.length === 0 || placed.length < activeTasks.length) return;
    fitted.current = true;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of placed) {
      const w = CARD_WIDTH[t.size ?? 'm'];
      minX = Math.min(minX, t.pos!.x);
      minY = Math.min(minY, t.pos!.y);
      maxX = Math.max(maxX, t.pos!.x + w);
      maxY = Math.max(maxY, t.pos!.y + 90);
    }
    const pad = 20;
    const availW = W - pad * 2;
    const availH = H - insets.top - 160 - pad * 2;
    const s = Math.min(1, Math.max(0.65, Math.min(availW / (maxX - minX), availH / (maxY - minY))));
    scale.value = s;
    tx.value = pad - minX * s + Math.max(0, (availW - (maxX - minX) * s) / 2);
    ty.value = pad - minY * s;
  }, [loaded, activeTasks, W, H, insets.top, scale, tx, ty]);

  // Tap one stop, then another: the second comes after the first.
  const handleSelect = useCallback(
    (id: string | null) => {
      if (id && selectedId && id !== selectedId) {
        if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleLink(selectedId, id);
        setSelectedId(null);
        return;
      }
      setSelectedId(id === selectedId ? null : id);
    },
    [selectedId, toggleLink, settings.hapticsEnabled],
  );

  // New stops land in the middle of whatever you're looking at.
  const handleAdd = useCallback(
    (text: string) => {
      const task = addTask(text);
      const s = scale.value;
      moveTask(task.id, {
        x: (W / 2 - tx.value) / s - CARD_WIDTH.m / 2,
        y: (H / 2 - ty.value) / s - 30,
      });
    },
    [addTask, moveTask, W, H, tx, ty, scale],
  );

  const handleComplete = useCallback(
    (id: string, size: Parameters<typeof onComplete>[1]) => {
      if (selectedId === id) setSelectedId(null);
      onComplete(id, size);
    },
    [onComplete, selectedId],
  );

  if (!loaded) return null;

  const remaining = activeTasks.length;
  const signal = theme.isSignal;
  const selectedTask = selectedId ? activeTasks.find((t) => t.id === selectedId) : undefined;
  const hint = selectedTask
    ? `Tap another stop: it comes after “${selectedTask.text.length > 24 ? selectedTask.text.slice(0, 24) + '…' : selectedTask.text}”`
    : remaining === 0
      ? 'Add a stop and it lands here.'
      : 'Hold to drag · Tap two to connect · Double-tap to strike';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={-insets.bottom}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <PressableScale
            style={styles.back}
            onPress={() => router.back()}
            pressStyle="scale"
            pressedScale={0.94}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to list"
          >
            <Symbol name="chevron.left" size={15} color={theme.textSecondary} weight="bold" />
            <Text style={[styles.backText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
              List
            </Text>
          </PressableScale>
          <View style={styles.headerMid}>
            <Text style={[styles.title, signal ? theme.fontDisplay : styles.titleClassic, { color: theme.text }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {remaining > 0 ? `${remaining} stop${remaining !== 1 ? 's' : ''} to go` : 'End of the line.'}
            </Text>
          </View>
          <View style={styles.back} />
        </View>
        <Text style={[styles.hint, { color: selectedTask ? theme.blue : theme.textTertiary }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {hint}
        </Text>

        <MapCanvas
          tasks={activeTasks}
          theme={theme}
          haptics={settings.hapticsEnabled}
          reduceMotion={reduceMotion}
          selectedId={selectedId}
          onSelect={handleSelect}
          onMove={moveTask}
          onStrike={onStrike}
          onComplete={handleComplete}
          viewport={{ tx, ty, scale }}
        />

        <AddTaskInput onAdd={handleAdd} hapticsEnabled={settings.hapticsEnabled} />
      </KeyboardAvoidingView>

      {toast}
      <CelebrationOverlay celebration={celebration} settings={celebrationSettings} onDismiss={dismissCelebration} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerMid: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.5,
  },
  titleClassic: {
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
});
