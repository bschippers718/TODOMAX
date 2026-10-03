import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
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
import { DailyRoute } from '../components/DailyRoute';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { useToast } from '../components/ui/Toast';
import { ANIMATION_DURATIONS } from '../components/animations';
import { useTheme, IOS_SPRING } from '../lib/theme';
import { Settings, Task } from '../lib/types';
import { ANIMATION_META, getAnimationName } from '../lib/collection';
import { getPackForAnimation, packAccent } from '../lib/packs';

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

  const { celebration, triggerCelebration, dismissCelebration } = useCelebration(settings, unlockedAnimations);
  const { playComplete, playCelebration } = useSound(settings);
  const { recordEarned, hasNew } = useCollection(unlockedAnimations);
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
      completeTask(id);
      const animId = triggerCelebration(streak + 1);
      if (!animId) return;
      playCelebration(animId);

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
          });
        }, ANIMATION_DURATIONS[animId] + 450);
      }
    },
    [completeTask, triggerCelebration, streak, playCelebration, recordEarned, showToast, theme.isSignal],
  );

  const toggleCompleted = useCallback(() => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    setShowCompleted((v) => !v);
  }, [settings.hapticsEnabled]);

  const layout = reduceMotion ? undefined : LinearTransition.springify().damping(IOS_SPRING.damping).stiffness(IOS_SPRING.stiffness);

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

  if (!loaded) return null;

  const remaining = activeTasks.length;
  const signal = theme.isSignal;
  // Signal controls: enamel sign, ink border, hard shadow. Classic: soft card.
  const control = [
    styles.iconButton,
    theme.shadowControl,
    {
      backgroundColor: theme.surfaceSoft,
      borderColor: theme.cardBorder,
      borderWidth: theme.borderWidth,
      borderRadius: theme.radiusControl,
    },
    signal && styles.controlSignal,
  ];
  const cardChrome = {
    backgroundColor: theme.surfaceSoft,
    borderColor: signal ? theme.cardBorder : theme.separator,
    borderWidth: theme.borderWidth,
    borderRadius: theme.radiusCard,
  };

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

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.eyebrow,
              theme.fontLabel,
              signal ? styles.eyebrowSignal : styles.eyebrowClassic,
              { backgroundColor: theme.goldSoft, color: theme.onGold, borderColor: theme.cardBorder, borderRadius: theme.radiusTag },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            TODAY
          </Text>
          <Text
            style={[styles.title, theme.fontDisplay, signal && styles.titleSignal, { color: theme.text }]}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ToDOMax
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
            {remaining > 0
              ? signal
                ? `${remaining} stop${remaining !== 1 ? 's' : ''} remaining`
                : `${remaining} task${remaining !== 1 ? 's' : ''} remaining`
              : signal
                ? 'End of the line. Add one stop.'
                : 'Your board is clear. Add one thing.'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.streakBadge,
              theme.shadowControl,
              {
                backgroundColor: theme.surfaceSoft,
                borderColor: theme.cardBorder,
                borderWidth: theme.borderWidth,
                borderRadius: theme.radiusControl,
              },
              signal && styles.controlSignal,
            ]}
            accessible
            accessibilityLabel={`Streak ${streak}`}
          >
            <Text style={[styles.streakLabel, theme.fontLabel, signal && styles.streakLabelSignal, { color: signal ? theme.textTertiary : theme.gold }]} allowFontScaling={false}>
              STREAK
            </Text>
            <Text style={[styles.streakText, signal && theme.fontDisplay, signal && styles.streakTextSignal, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
              {streak}
            </Text>
          </View>
          <PressableScale
            style={control}
            onPress={() => router.push('/collection')}
            pressedScale={0.92}
            accessibilityLabel={hasNew ? 'Collection, new celebrations earned' : 'Collection'}
          >
            <Symbol name="film.fill" size={20} color={signal ? theme.text : theme.textSecondary} />
            {hasNew && <View style={[styles.newDot, { backgroundColor: theme.accent, borderColor: signal ? theme.cardBorder : theme.bg }]} />}
          </PressableScale>
          <PressableScale
            style={control}
            onPress={() => router.push('/settings')}
            pressedScale={0.92}
            accessibilityLabel="Settings"
          >
            <Symbol name="gearshape.fill" size={21} color={signal ? theme.text : theme.textSecondary} />
          </PressableScale>
        </View>
      </View>

      {signal && <DailyRoute tasks={tasks} reduceMotion={reduceMotion} />}

      <Animated.FlatList
        data={activeTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        itemLayoutAnimation={layout}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(260)}
            style={[styles.emptyContainer, cardChrome, signal && styles.emptySignal]}
          >
            <View
              style={[
                styles.emptyBadge,
                theme.shadowControl,
                {
                  backgroundColor: signal ? theme.green : theme.surface,
                  borderColor: theme.cardBorder,
                  borderWidth: theme.borderWidth,
                  borderRadius: signal ? 36 : theme.radiusControl,
                },
              ]}
            >
              <Symbol name="checkmark" size={34} color={signal ? '#fff' : theme.green} weight="heavy" />
            </View>
            <Text style={[styles.emptyText, theme.fontDisplay, signal && styles.emptyTextSignal, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              {signal ? 'All stops cleared' : 'All clear'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
              {signal ? 'Add one stop worth crossing off.' : 'Add one thing worth crossing off.'}
            </Text>
            <PressableScale style={styles.packsLink} onPress={() => router.push('/packs')} pressStyle="scale">
              <Text style={[styles.packsLinkText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
                Browse celebration packs
              </Text>
              <Symbol name="chevron.right" size={12} color={theme.blue} weight="bold" />
            </PressableScale>
          </Animated.View>
        }
        ListFooterComponent={
          completedTasks.length > 0 ? (
            <Animated.View
              layout={layout}
              style={[styles.completedSection, cardChrome, signal && styles.completedSignal]}
            >
              <PressableScale
                style={styles.completedHeader}
                onPress={toggleCompleted}
                pressedScale={0.985}
                pressStyle="scale"
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompleted }}
              >
                <Text style={[styles.completedTitle, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  {signal ? 'Struck' : 'Completed'} ({completedTasks.length})
                </Text>
                <Symbol
                  name="chevron.right"
                  size={14}
                  color={theme.textTertiary}
                  weight="bold"
                  style={showCompleted ? styles.chevronOpen : undefined}
                />
              </PressableScale>
              {showCompleted && (
                <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} exiting={reduceMotion ? undefined : FadeOut.duration(120)}>
                  {completedTasks.map((task) => (
                    <View
                      key={task.id}
                      style={[
                        styles.completedItem,
                        {
                          backgroundColor: theme.surface,
                          borderColor: signal ? theme.cardBorder : theme.separator,
                          borderWidth: signal ? 2 : 1,
                          borderRadius: theme.radiusCard,
                        },
                      ]}
                    >
                      <View style={[styles.completedStamp, { borderColor: signal ? theme.green : theme.accent, borderRadius: theme.radiusTag }, signal && styles.completedStampSignal]}>
                        <Text style={[styles.completedStampText, theme.fontLabel, signal && styles.completedStampTextSignal, { color: signal ? theme.green : theme.accent }]} allowFontScaling={false}>
                          DONE
                        </Text>
                      </View>
                      <Text
                        style={[styles.completedTaskText, { color: theme.textTertiary }]}
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={2}
                      >
                        {task.text}
                      </Text>
                    </View>
                  ))}
                  <PressableScale style={styles.clearButton} onPress={clearCompleted} pressStyle="scale">
                    <Text style={[styles.clearButtonText, { color: theme.accent }]} maxFontSizeMultiplier={1.3}>
                      Clear completed
                    </Text>
                  </PressableScale>
                </Animated.View>
              )}
            </Animated.View>
          ) : null
        }
      />

        <AddTaskInput onAdd={addTask} hapticsEnabled={settings.hapticsEnabled} />
      </KeyboardAvoidingView>

      {toast}
      <CelebrationOverlay celebration={celebration} settings={settings} onDismiss={dismissCelebration} />
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
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
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
    borderWidth: 0,
  },
  // A bordered yellow stamp, like a service-change sticker.
  eyebrowSignal: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 7,
    borderWidth: 2,
  },
  title: {
    fontSize: 38,
  },
  titleSignal: {
    fontSize: 34,
    letterSpacing: -1.6,
    marginTop: 2,
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
  streakLabelSignal: {
    fontSize: 6,
    marginBottom: 2,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  streakTextSignal: {
    fontSize: 19,
    lineHeight: 21,
    letterSpacing: -0.5,
  },
  iconButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  // Leave room for the 3px hard shadow.
  controlSignal: {
    marginRight: 3,
    marginBottom: 3,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginHorizontal: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptySignal: {
    marginTop: 28,
    marginHorizontal: 0,
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
  emptyTextSignal: {
    fontSize: 24,
    letterSpacing: -0.6,
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
  completedSection: {
    marginTop: 28,
    padding: 14,
  },
  completedSignal: {
    marginRight: 4,
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
  // Signage is never crooked.
  completedStampSignal: {
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    transform: [],
    opacity: 1,
  },
  completedStampText: {
    fontSize: 9,
  },
  completedStampTextSignal: {
    fontSize: 6,
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
});
