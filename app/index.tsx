import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useTasks } from '../hooks/useTasks';
import { useSettings } from '../hooks/useSettings';
import { useStrikeFlow } from '../hooks/useStrikeFlow';
import { useDayTick } from '../hooks/useDayTick';
import { buildSampleTasks } from '../lib/sampleData';
import { TaskItem, DropIntent } from '../components/TaskItem';
import { StruckCard } from '../components/StruckCard';
import { useDragState, ghostDx, DragState } from '../lib/dragList';
import { AddTaskInput } from '../components/AddTaskInput';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { AppBackground } from '../components/AppBackground';
import { DailyRoute, buildRoute, todayLabel } from '../components/DailyRoute';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { useTheme, loudType } from '../lib/theme';
import { Task, Settings, openUpstream } from '../lib/types';
import { animateNextLayout } from '../lib/nativeLayout';

const noop = () => {};

// The held card, drawn above the list where the real row sat, riding the
// finger. The row itself goes clear underneath.
function GhostCard({ drag, task, index, settings }: { drag: DragState; task: Task; index: number; settings: Settings }) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: drag.ghostX.value,
    top: drag.ghostY.value,
    width: drag.ghostW.value,
    transform: [{ translateY: drag.dy.value }, { translateX: ghostDx(drag.dx.value) }],
  }));
  return (
    <Animated.View style={style}>
      <TaskItem ghost task={task} index={index} settings={settings} onComplete={noop} onDelete={noop} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    tasks,
    activeTasks,
    completedTasks,
    streak,
    loaded,
    addTask,
    uncompleteTask,
    deleteTask,
    restoreTask,
    editTask,
    setTaskSize,
    setTaskLine,
    dropInList,
    clearCompleted,
    replaceTasks,
  } = useTasks();
  const { settings: rawSettings, loaded: settingsLoaded } = useSettings();
  const {
    settings,
    reduceMotion,
    celebration,
    celebrationSettings,
    dismissCelebration,
    toast,
    hasNew,
    stats,
    onStrike,
    onComplete,
    showToast,
  } = useStrikeFlow();
  const [showCompleted, setShowCompleted] = useState(false);
  // "Today" moves at midnight and on foregrounding; the header follows.
  const day = useDayTick();

  const handleComplete = useCallback(
    (id: string, size: Parameters<typeof onComplete>[1], ink?: number[]) => {
      // The row has already collapsed; this covers the footer/empty-state swap.
      animateNextLayout(reduceMotion);
      onComplete(id, size, ink);
    },
    [onComplete, reduceMotion],
  );

  // A struck stop goes back on the route with a tap. No confirm; it's a list.
  const handleRestore = useCallback(
    (id: string) => {
      animateNextLayout(reduceMotion);
      uncompleteTask(id);
    },
    [uncompleteTask, reduceMotion],
  );

  // Today's strikes stay in view, newest at the bottom, so the day reads top to
  // bottom: what's left, then what you did. Older ones fold behind the count.
  const { todayStruck, olderStruck } = useMemo(() => {
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const sorted = [...completedTasks].sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
    return {
      todayStruck: sorted.filter((t) => (t.completedAt ?? 0) >= dayStart),
      olderStruck: sorted.filter((t) => (t.completedAt ?? 0) < dayStart).reverse(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTasks, day]);

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
    setShowCompleted(false);
  }, [clearCompleted, reduceMotion]);

  // A swipe is quick and the row is gone; give it a few seconds of regret.
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const handleDelete = useCallback(
    (id: string) => {
      const list = tasksRef.current;
      const index = list.findIndex((t) => t.id === id);
      const task = list[index];
      deleteTask(id);
      if (!task) return;
      const short = task.text.length > 28 ? task.text.slice(0, 28) + '…' : task.text;
      showToast({
        title: 'Deleted',
        subtitle: `${short} · Tap to undo`,
        icon: 'arrow.uturn.backward',
        tint: theme.textSecondary,
        hint: 'Puts the stop back',
        durationMs: 4200,
        onPress: () => {
          animateNextLayout(reduceMotion);
          restoreTask(task, index);
        },
      });
    },
    [deleteTask, restoreTask, showToast, theme.textSecondary, reduceMotion],
  );

  const upstreamFor = useCallback(
    (t: Task) => {
      const open = openUpstream(t, tasks);
      return open.length ? open.map((u) => u.text) : undefined;
    },
    [tasks],
  );

  // Hold a card to lift it. Where it lands is the new order; pushed to the
  // right, it joins the stack under the original stop — several supporters
  // can hang off the same one.
  const listRef = useRef<FlatList<Task>>(null);
  const handleBeginEdit = useCallback((index: number) => {
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index, viewPosition: 0.22, animated: true });
      } catch {
        /* unmeasured row — the keyboard avoider still lifts the composer */
      }
    });
  }, []);
  const drag = useDragState();
  const [heldId, setHeldId] = useState('');
  const handleHold = useCallback((id: string | null) => setHeldId(id ?? ''), []);
  const heldIndex = heldId ? activeTasks.findIndex((t) => t.id === heldId) : -1;
  const heldTask = heldIndex >= 0 ? activeTasks[heldIndex] : null;
  const handleDrop = useCallback(
    (id: string, to: number, intent: DropIntent) => {
      const result = dropInList(id, to, intent);
      if (result.kind === 'nothing-above') {
        showToast({
          title: 'Nothing above',
          subtitle: 'Drop it under a stop to tuck it',
          icon: 'arrow.uturn.backward',
          tint: theme.textSecondary,
          durationMs: 2200,
        });
        return;
      }
      if (result.kind === 'refused') {
        const name = result.parent.length > 28 ? result.parent.slice(0, 28) + '…' : result.parent;
        showToast({
          title: 'Kept apart',
          subtitle: `${name} already waits on this one`,
          icon: 'arrow.triangle.2.circlepath',
          tint: theme.textSecondary,
          durationMs: 2600,
        });
        return;
      }
      if (result.kind === 'tucked' && settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [dropInList, showToast, theme.textSecondary, settings.hapticsEnabled],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => (
      <TaskItem
        task={item}
        index={index}
        count={activeTasks.length}
        drag={drag}
        onHold={handleHold}
        onDrop={handleDrop}
        settings={settings}
        reduceMotion={reduceMotion}
        onStrike={onStrike}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onEdit={editTask}
        onSize={setTaskSize}
        onLine={setTaskLine}
        upstream={upstreamFor(item)}
        onBeginEdit={handleBeginEdit}
      />
    ),
    [
      activeTasks.length,
      drag,
      handleHold,
      handleDrop,
      handleBeginEdit,
      settings,
      reduceMotion,
      onStrike,
      handleComplete,
      handleDelete,
      editTask,
      setTaskSize,
      setTaskLine,
      upstreamFor,
    ],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const route = useMemo(() => buildRoute(tasks), [tasks, day]);

  if (!loaded || !settingsLoaded) return null;
  if (!rawSettings.onboarded) return <Redirect href="/onboarding" />;

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
        <PressableScale style={control} onPress={() => router.push('/map')} pressedScale={0.92} accessibilityLabel="Map view">
          <Symbol name="map" size={19} color={theme.textSecondary} />
        </PressableScale>
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
          style={[styles.headline, theme.fontDisplay, { color: theme.text }, boardClear && loudType(theme)]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
        >
          {remaining > 0 ? `${remaining} stop${remaining !== 1 ? 's' : ''} to go` : boardClear ? 'End of the line.' : 'Where to today?'}
        </Text>
        <DailyRoute tasks={tasks} streak={streak} variant="inline" />
      </View>
      <View style={styles.glyphRow}>
        <PressableScale
          style={styles.glyph}
          onPress={() => router.push('/map')}
          pressStyle="scale"
          pressedScale={0.88}
          hitSlop={6}
          accessibilityLabel="Map view"
        >
          <Symbol name="map" size={21} color={theme.textTertiary} weight="medium" />
        </PressableScale>
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

  // A truly empty board offers a filled-in day, so the app can be judged on a real one.
  const loadSample = () => {
    animateNextLayout(reduceMotion);
    replaceTasks(buildSampleTasks());
  };
  const sampleLink = (
    <PressableScale style={[styles.sampleLink, !signal && styles.sampleLinkCenter]} onPress={loadSample} pressStyle="scale" accessibilityRole="button">
      <Text style={[styles.sampleLinkText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
        Try it with 20 sample stops
      </Text>
    </PressableScale>
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
      {tasks.length === 0 && sampleLink}
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
      {tasks.length === 0 && sampleLink}
    </View>
  );

  const todayCards = todayStruck.length > 0 && (
    <View style={styles.todayStruck}>
      {todayStruck.map((task) => (
        <StruckCard key={task.id} task={task} onRestore={handleRestore} hapticsEnabled={settings.hapticsEnabled} />
      ))}
    </View>
  );

  const classicStruck = (
    <View>
    {todayCards}
    {(olderStruck.length > 0 || todayStruck.length === 0) && (
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
          {olderStruck.length > 0 ? `Earlier (${olderStruck.length})` : `Completed (${completedTasks.length})`}
        </Text>
        <Symbol name="chevron.right" size={14} color={theme.textTertiary} weight="bold" style={showCompleted ? styles.chevronOpen : undefined} />
      </PressableScale>
      {showCompleted && (
        <View>
          {olderStruck.map((task) => (
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
    )}
    </View>
  );

  // A grey line of text that opens in place. No card, no stamps.
  const signalStruck = (
    <View>
    {todayCards}
    <View style={[styles.struckSection, todayStruck.length > 0 && styles.struckSectionTight]}>
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
          {olderStruck.length > 0 ? `${olderStruck.length} struck earlier` : `${completedTasks.length} struck`}
          {stats.earned > 0 ? `  ·  ${stats.earned} collected` : ''}
        </Text>
        <Symbol name="chevron.right" size={11} color={theme.textTertiary} weight="bold" style={showCompleted ? styles.chevronOpen : undefined} />
      </PressableScale>
      {showCompleted && (
        <View>
          {olderStruck.map((task) => (
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
          ref={listRef}
          data={activeTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="always"
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: true });
          }}
          ListEmptyComponent={signal ? signalEmpty : classicEmpty}
          ListFooterComponent={completedTasks.length > 0 ? (signal ? signalStruck : classicStruck) : null}
        />

        <AddTaskInput onAdd={handleAdd} hapticsEnabled={settings.hapticsEnabled} />
      </KeyboardAvoidingView>

      {heldTask && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <GhostCard drag={drag} task={heldTask} index={heldIndex} settings={settings} />
        </View>
      )}

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
  sampleLink: {
    marginTop: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  sampleLinkCenter: {
    alignSelf: 'center',
    marginTop: 6,
  },
  sampleLinkText: {
    fontSize: 14,
    fontWeight: '700',
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

  // Today's struck cards sit right under the route, a little apart from it.
  todayStruck: {
    marginTop: 14,
  },
  // Signal struck line
  struckSection: {
    marginTop: 22,
    paddingHorizontal: 4,
  },
  struckSectionTight: {
    marginTop: 6,
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
