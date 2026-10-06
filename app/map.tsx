import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTasks } from '../hooks/useTasks';
import { useStrikeFlow } from '../hooks/useStrikeFlow';
import { MapCanvas, autoPlace, CARD_WIDTH, CARD_HEIGHT } from '../components/map/MapCanvas';
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
  const { activeTasks, completedTasks, loaded, addTask, moveTask, placeTasks, toggleLink } = useTasks();
  const { settings, reduceMotion, celebration, celebrationSettings, dismissCelebration, toast, onStrike, onComplete } = useStrikeFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  // The board's on-screen size (below the header, above the composer).
  const board = useRef({ width: W, height: H - insets.top - 160 });

  // First visit (or new stops added from the list): give unplaced stops a spot.
  useEffect(() => {
    if (!loaded) return;
    const placed = autoPlace(activeTasks);
    if (Object.keys(placed).length) placeTasks(placed);
  }, [loaded, activeTasks, placeTasks]);

  // Bring every placed stop into view. Instant on open, animated from the button.
  const fitToBoard = useCallback(
    (animated: boolean) => {
      const placed = activeTasks.filter((t) => t.pos);
      if (placed.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const t of placed) {
        const size = t.size ?? 'm';
        const w = CARD_WIDTH[size];
        const h = CARD_HEIGHT[size];
        minX = Math.min(minX, t.pos!.x);
        minY = Math.min(minY, t.pos!.y);
        maxX = Math.max(maxX, t.pos!.x + w);
        maxY = Math.max(maxY, t.pos!.y + h);
      }
      const pad = 20;
      const availW = board.current.width - pad * 2;
      const availH = board.current.height - pad * 2;
      const s = Math.min(1, Math.max(0.5, Math.min(availW / (maxX - minX), availH / (maxY - minY))));
      const nextTx = pad - minX * s + Math.max(0, (availW - (maxX - minX) * s) / 2);
      const nextTy = pad - minY * s + Math.max(0, (availH - (maxY - minY) * s) / 2);
      if (animated && !reduceMotion) {
        const cfg = { duration: 360, easing: Easing.out(Easing.cubic) };
        scale.value = withTiming(s, cfg);
        tx.value = withTiming(nextTx, cfg);
        ty.value = withTiming(nextTy, cfg);
      } else {
        scale.value = s;
        tx.value = nextTx;
        ty.value = nextTy;
      }
    },
    [activeTasks, reduceMotion, scale, tx, ty],
  );

  // Open fitted to whatever's on the board, once. After that the viewport is yours.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !loaded) return;
    const placed = activeTasks.filter((t) => t.pos);
    if (placed.length === 0 || placed.length < activeTasks.length) return;
    fitted.current = true;
    fitToBoard(false);
  }, [loaded, activeTasks, fitToBoard]);

  // A selected stop that gets struck or deleted elsewhere shouldn't stay "selected".
  useEffect(() => {
    if (selectedId && !activeTasks.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [activeTasks, selectedId]);

  // Tap one stop, then another: the second comes after the first.
  const handleSelect = useCallback(
    (id: string | null) => {
      if (id && selectedId && id !== selectedId) {
        const result = toggleLink(selectedId, id);
        if (settings.hapticsEnabled) {
          if (result === 'refused') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
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
        x: (board.current.width / 2 - tx.value) / s - CARD_WIDTH.m / 2,
        y: (board.current.height / 2 - ty.value) / s - 30,
      });
    },
    [addTask, moveTask, tx, ty, scale],
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
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
              {remaining > 0 ? `${remaining} stop${remaining !== 1 ? 's' : ''} to go` : completedTasks.length > 0 ? 'End of the line.' : 'Where to today?'}
            </Text>
          </View>
          <PressableScale
            style={[styles.back, styles.fit]}
            onPress={() => {
              if (settings.hapticsEnabled) Haptics.selectionAsync();
              fitToBoard(true);
            }}
            pressStyle="scale"
            pressedScale={0.94}
            hitSlop={8}
            disabled={remaining === 0}
            accessibilityRole="button"
            accessibilityLabel="Show all stops"
            accessibilityHint="Zooms the Map so every stop is on screen"
          >
            <Symbol name="arrow.down.left.and.arrow.up.right" size={15} color={remaining === 0 ? theme.textTertiary : theme.textSecondary} weight="bold" />
          </PressableScale>
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
          onViewportLayout={(size) => {
            board.current = size;
          }}
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
  fit: {
    justifyContent: 'flex-end',
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
