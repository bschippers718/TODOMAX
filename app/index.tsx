import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useTasks } from '../hooks/useTasks';
import { useSettings } from '../hooks/useSettings';
import { useCelebration } from '../hooks/useCelebration';
import { useSound } from '../hooks/useSound';
import { usePacks } from '../hooks/usePacks';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useCollection } from '../hooks/useCollection';
import { TaskItem } from '../components/TaskItem';
import { AddTaskInput } from '../components/AddTaskInput';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { AppBackground } from '../components/AppBackground';
import { DailyRoute, buildRoute, todayLabel } from '../components/DailyRoute';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { useToast } from '../components/ui/Toast';
import { ANIMATION_DURATIONS } from '../components/animations';
import { useTheme } from '../lib/theme';
import { CELEBRATION_COOLDOWN_MS, isQuietHour, Settings, Task } from '../lib/types';
import { ANIMATION_META, getAnimationName } from '../lib/collection';
import { getPackForAnimation, packAccent } from '../lib/packs';
import { animateNextLayout } from '../lib/nativeLayout';

// Matches CelebrationOverlay's cap for the minimal variant.
const MINIMAL_VISUAL_MS = 1100;

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const {
    tasks,
    activeTasks,
    completedTasks,
    streak,
    loaded,
    addTask,
    completeTask,
    deleteTask,
    editTask,
    clearCompleted,
  } = useTasks();
  const { settings: rawSettings } = useSettings();
  const { unlockedAnimations } = usePacks();

  // Reduce Motion caps celebrations at "minimal" regardless of the user's pick.
  const settings: Settings = useMemo(
    () =>
      reduceMotion && rawSettings.animationMode === 'full'
        ? { ...rawSettings, animationMode: 'minimal' }
        : rawSettings,
    [rawSettings, reduceMotion],
  );

  // Rapid-fire and late-night protection: the celebration still counts (it's
  // recorded in the Collection) but plays as a glimpse instead of a movie.
  const [damped, setDamped] = useState(false);
  const cooldownUntil = useRef(0);
  const celebrationSettings: Settings = useMemo(
    () => (damped && settings.animationMode === 'full' ? { ...settings, animationMode: 'minimal' } : settings),
    [damped, settings],
  );

  const { celebration, triggerCelebration, dismissCelebration } = useCelebration(settings, unlockedAnimations);
  const { playComplete, playCelebration } = useSound(settings);
  const { recordEarned, hasNew, stats } = useCollection(unlockedAnimations);
  const { show: showToast, toast } = useToast();
  const [showCompleted, setShowCompleted] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // The pen lands: sound now, while the card is still on screen.
  const handleStrike = useCallback(() => {
    playComplete();
  }, [playComplete]);

  // The card has collapsed: commit the state change and roll the celebration.
  const handleComplete = useCallback(
    (id: string) => {
      // The row has already collapsed; this covers the footer/empty-state swap.
      animateNextLayout(reduceMotion);
      completeTask(id);

      const now = Date.now();
      const quiet = isQuietHour(settings) || now < cooldownUntil.current;
      setDamped(quiet);

      const animId = triggerCelebration(streak + 1);
      if (!animId) return;
      playCelebration(animId);

      const fullMs = ANIMATION_DURATIONS[animId];
      const visualMs = quiet || settings.animationMode === 'minimal' ? Math.min(fullMs, MINIMAL_VISUAL_MS) : fullMs;
      cooldownUntil.current = now + visualMs + CELEBRATION_COOLDOWN_MS;

      // Add it to the board. First time? Say so once the movie has finished.
      const isFirst = recordEarned(animId);
      if (isFirst) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
          showToast({
            title: 'New in your Collection',
            subtitle: getAnimationName(animId),
            icon: ANIMATION_META[animId].symbol,
            tint: (() => { const p = getPackForAnimation(animId); return p ? packAccent(p, theme.isSignal) : undefined; })(),
            onPress: () => router.push('/collection'),
          });
        }, visualMs + 450);
      }
    },
    [completeTask, triggerCelebration, streak, playCelebration, recordEarned, showToast, theme.isSignal, settings, router, reduceMotion],
  );

  const toggleCompleted = useCallback(() => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    animateNextLayout(reduceMotion);
    setShowCompleted((v) => !v);
  }, [settings.hapticsEnabled, reduceMotion]);

  const handleAdd = useCallback(
    (text: string) => {
      animateNextLayout(reduceMotion);
      addTask(text);
    },
    [addTask, reduceMotion],
  );

  const handleClearCompleted = useCallback(() => {
    animateNextLayout(reduceMotion);
    clearCompleted();
  }, [clearCompleted, reduceMotion]);

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <TaskItem
        task={item}
        index={index}
        settings={settings}
        reduceMotion={reduceMotion}
        onStrike={handleStrike}
        onComplete={handleComplete}
        onDelete={deleteTask}
        onEdit={editTask}
      />
    ),
    [settings, reduceMotion, handleStrike, handleComplete, deleteTask, editTask],
  );

  const route = useMemo(() => buildRoute(tasks), [tasks]);

  if (!loaded) return null;

  const remaining = activeTasks.length;
  const signal = theme.isSignal;
  const boardClear = remaining === 0 && route.done > 0;

  // ---- Classic chrome (unchanged direction) ---------------------------------
  const control = [
    styles.iconButton,
    theme.shadowControl,
    {
      backgroundColor: theme.surfaceSoft,
      borderColor: theme.cardBorder,
      borderWidth: theme.borderWidth,
      borderRadius: theme.radiusControl,
    },
  ];
  const cardChrome = {
    backgroundColor: theme.surfaceSoft,
    borderColor: theme.separator,
    borderWidth: theme.borderWidth,
    borderRadius: theme.radiusCard,
  };

  const classicHeader = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerLeft}>
        <Text
          style={[styles.eyebrow, styles.eyebrowClassic, { backgroundColor: theme.goldSoft, color: theme.onGold, borderRadius: theme.radiusTag }]}
          maxFontSizeMultiplier={1.2}
        >
          TODAY
        </Text>
        <Text style={[styles.title, theme.fontDisplay, { color: theme.text }]} maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit>
          ToDOMax
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          {remaining > 0
            ? `${remaining} task${remaining !== 1 ? 's' : ''} remaining`
            : 'Your board is clear. Add one thing.'}
        </Text>
      </View>
      <View style={styles.headerRight}>
        <View
          style={[
            styles.streakBadge,
            theme.shadowControl,
            { backgroundColor: theme.surfaceSoft, borderColor: theme.cardBorder, borderWidth: theme.borderWidth, borderRadius: theme.radiusControl },
          ]}
          accessible
          accessibilityLabel={`Streak ${streak}`}
        >
          <Text style={[styles.streakLabel, theme.fontLabel, { color: theme.gold }]} allowFontScaling={false}>
            STREAK
          </Text>
          <Text style={[styles.streakText, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
            {streak}
          </Text>
        </View>
        <PressableScale
          style={control}
          onPress={() => router.push('/collection')}
          pressedScale={0.92}
          accessibilityLabel={hasNew ? 'Collection, new celebrations earned' : 'Collection'}
        >
          <Symbol name="film.fill" size={20} color={theme.textSecondary} />
          {hasNew && <View style={[styles.newDot, { backgroundColor: theme.accent, borderColor: theme.bg }]} />}
        </PressableScale>
        <PressableScale style={control} onPress={() => router.push('/settings')} pressedScale={0.92} accessibilityLabel="Settings">
          <Symbol name="gearshape.fill" size={21} color={theme.textSecondary} />
        </PressableScale>
      </View>
    </View>
  );

  // ---- Signal chrome: typography only. Only a todo gets to be a sign. --------
  const signalHeader = (
    <View style={[styles.header, styles.headerSignal, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.dateLine, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
          {todayLabel()}
        </Text>
        <Text
          style={[styles.headline, theme.fontDisplay, { color: theme.text }]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
        >
          {remaining > 0 ? `${remaining} stop${remaining !== 1 ? 's' : ''} to go` : 'End of the line.'}
        </Text>
        <DailyRoute tasks={tasks} streak={streak} variant="inline" />
      </View>
      <View style={styles.glyphRow}>
        <PressableScale
          style={styles.glyph}
          onPress={() => router.push('/collection')}
          pressStyle="scale"
          pressedScale={0.88}
          hitSlop={6}
          accessibilityLabel={hasNew ? 'Collection, new celebrations earned' : 'Collection'}
        >
          <Symbol name="film" size={21} color={theme.textTertiary} weight="medium" />
          {hasNew && <View style={[styles.newDotQuiet, { backgroundColor: theme.accent, borderColor: theme.bg }]} />}
        </PressableScale>
        <PressableScale
          style={styles.glyph}
          onPress={() => router.push('/settings')}
          pressStyle="scale"
          pressedScale={0.88}
          hitSlop={6}
          accessibilityLabel="Settings"
        >
          <Symbol name="gearshape" size={22} color={theme.textTertiary} weight="medium" />
        </PressableScale>
      </View>
    </View>
  );

  const classicEmpty = (
    <View style={[styles.emptyContainer, cardChrome]}>
      <View
        style={[
          styles.emptyBadge,
          theme.shadowControl,
          { backgroundColor: theme.surface, borderColor: theme.cardBorder, borderWidth: theme.borderWidth, borderRadius: theme.radiusControl },
        ]}
      >
        <Symbol name="checkmark" size={34} color={theme.green} weight="heavy" />
      </View>
      <Text style={[styles.emptyText, theme.fontDisplay, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
        All clear
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
        Add one thing worth crossing off.
      </Text>
      <PressableScale style={styles.packsLink} onPress={() => router.push('/packs')} pressStyle="scale">
        <Text style={[styles.packsLinkText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
          Browse celebration packs
        </Text>
        <Symbol name="chevron.right" size={12} color={theme.blue} weight="bold" />
      </PressableScale>
    </View>
  );

  // Board clear → the one place the route gets a card: it's the day's summary.
  // An empty board with nothing done today stays quiet.
  const signalEmpty = boardClear ? (
    <DailyRoute tasks={tasks} streak={streak} variant="card" />
  ) : (
    <View style={styles.quietEmpty}>
      <Text style={[styles.quietEmptyText, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
        Add one stop to start today's route.
      </Text>
    </View>
  );

  const classicStruck = (
    <View style={[styles.completedSection, cardChrome]}>
      <PressableScale
        style={styles.completedHeader}
        onPress={toggleCompleted}
        pressedScale={0.985}
        pressStyle="scale"
        accessibilityRole="button"
        accessibilityState={{ expanded: showCompleted }}
      >
        <Text style={[styles.completedTitle, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          Completed ({completedTasks.length})
        </Text>
        <Symbol name="chevron.right" size={14} color={theme.textTertiary} weight="bold" style={showCompleted ? styles.chevronOpen : undefined} />
      </PressableScale>
      {showCompleted && (
        <View>
          {completedTasks.map((task) => (
            <View
              key={task.id}
              style={[styles.completedItem, { backgroundColor: theme.surface, borderColor: theme.separator, borderWidth: 1, borderRadius: theme.radiusCard }]}
            >
              <View style={[styles.completedStamp, { borderColor: theme.accent, borderRadius: theme.radiusTag }]}>
                <Text style={[styles.completedStampText, theme.fontLabel, { color: theme.accent }]} allowFontScaling={false}>
                  DONE
                </Text>
              </View>
              <Text style={[styles.completedTaskText, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3} numberOfLines={2}>
                {task.text}
              </Text>
            </View>
          ))}
          <PressableScale style={styles.clearButton} onPress={handleClearCompleted} pressStyle="scale">
            <Text style={[styles.clearButtonText, { color: theme.accent }]} maxFontSizeMultiplier={1.3}>
              Clear completed
            </Text>
          </PressableScale>
        </View>
      )}
    </View>
  );

  // A grey line of text that opens in place. No card, no stamps.
  const signalStruck = (
    <View style={styles.struckSection}>
      <PressableScale
        style={styles.struckLine}
        onPress={toggleCompleted}
        pressStyle="scale"
        pressedScale={0.985}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: showCompleted }}
      >
        <Text style={[styles.struckText, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
          {completedTasks.length} struck
          {stats.earned > 0 ? `  ·  ${stats.earned} collected` : ''}
        </Text>
        <Symbol name="chevron.right" size={11} color={theme.textTertiary} weight="bold" style={showCompleted ? styles.chevronOpen : undefined} />
      </PressableScale>
      {showCompleted && (
        <View>
          {completedTasks.map((task) => (
            <View key={task.id} style={[styles.struckItem, { borderTopColor: theme.separator }]}>
              <View style={[styles.struckDot, { backgroundColor: theme.green }]} />
              <Text style={[styles.struckItemText, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3} numberOfLines={2}>
                {task.text}
              </Text>
            </View>
          ))}
          <View style={[styles.struckActions, { borderTopColor: theme.separator }]}>
            <PressableScale style={styles.struckAction} onPress={() => router.push('/collection')} pressStyle="scale" hitSlop={8}>
              <Text style={[styles.struckActionText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                Collection ›
              </Text>
            </PressableScale>
            <PressableScale style={styles.struckAction} onPress={handleClearCompleted} pressStyle="scale" hitSlop={8}>
              <Text style={[styles.struckActionText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                Clear struck
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AppBackground imageUri={settings.customBackgroundUri} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Only the content column avoids the keyboard; background, celebration
          and toast stay full-bleed so a movie never plays in a cropped frame. */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // The composer already pads for the home indicator; take that back so it
        // sits flush on the keyboard.
        keyboardVerticalOffset={-insets.bottom}
      >
        {signal ? signalHeader : classicHeader}

        <FlatList
          data={activeTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={signal ? signalEmpty : classicEmpty}
          ListFooterComponent={completedTasks.length > 0 ? (signal ? signalStruck : classicStruck) : null}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  headerSignal: {
    paddingBottom: 14,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  // Signal header: a date line, a count, a row of squares. Nothing boxed.
  dateLine: {
    fontSize: 7,
    marginBottom: 10,
  },
  headline: {
    fontSize: 32,
    letterSpacing: -1.4,
  },
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 14,
  },
  glyph: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDotQuiet: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
  },

  // Classic header
  eyebrow: {
    alignSelf: 'flex-start',
    marginBottom: 7,
    overflow: 'hidden',
  },
  eyebrowClassic: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 38,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  streakBadge: {
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  streakLabel: {
    fontSize: 8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  iconButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  newDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  // Empty states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginHorizontal: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyBadge: {
    alignItems: 'center',
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    width: 72,
  },
  emptyText: {
    fontSize: 21,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 15,
    maxWidth: 240,
    textAlign: 'center',
  },
  packsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  packsLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  quietEmpty: {
    paddingTop: 36,
    paddingHorizontal: 4,
  },
  quietEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Classic completed card
  completedSection: {
    marginTop: 28,
    padding: 14,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  completedStamp: {
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
    opacity: 0.75,
  },
  completedStampText: {
    fontSize: 9,
  },
  completedTaskText: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Signal struck line
  struckSection: {
    marginTop: 22,
    paddingHorizontal: 4,
  },
  struckLine: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
  },
  struckText: {
    fontSize: 14,
    fontWeight: '700',
  },
  struckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  struckDot: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
  },
  struckItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  struckActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 4,
  },
  struckAction: {
    paddingVertical: 10,
  },
  struckActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
