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
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { useToast } from '../components/ui/Toast';
import { ANIMATION_DURATIONS } from '../components/animations';
import { useTheme, IOS_SPRING } from '../lib/theme';
import { Settings, Task } from '../lib/types';
import { ANIMATION_META, getAnimationName } from '../lib/collection';
import { getPackForAnimation } from '../lib/packs';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const {
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
            tint: getPackForAnimation(animId)?.accent,
          });
        }, ANIMATION_DURATIONS[animId] + 450);
      }
    },
    [completeTask, triggerCelebration, streak, playCelebration, recordEarned, showToast],
  );

  const toggleCompleted = useCallback(() => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    setShowCompleted((v) => !v);
  }, [settings.hapticsEnabled]);

  const layout = reduceMotion ? undefined : LinearTransition.springify().damping(IOS_SPRING.damping).stiffness(IOS_SPRING.stiffness);

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskItem
        task={item}
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
          <Text style={[styles.eyebrow, { backgroundColor: theme.goldSoft, color: theme.gold }]} maxFontSizeMultiplier={1.2}>
            TODAY
          </Text>
          <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
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
            style={[styles.streakBadge, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, shadowColor: theme.shadow }]}
            accessible
            accessibilityLabel={`Streak ${streak}`}
          >
            <Text style={[styles.streakLabel, { color: theme.gold }]} allowFontScaling={false}>
              STREAK
            </Text>
            <Text style={[styles.streakText, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
              {streak}
            </Text>
          </View>
          <PressableScale
            style={[styles.iconButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, shadowColor: theme.shadow }]}
            onPress={() => router.push('/collection')}
            pressedScale={0.92}
            accessibilityLabel={hasNew ? 'Collection, new celebrations earned' : 'Collection'}
          >
            <Symbol name="film.fill" size={20} color={theme.textSecondary} />
            {hasNew && <View style={[styles.newDot, { backgroundColor: theme.accent, borderColor: theme.bg }]} />}
          </PressableScale>
          <PressableScale
            style={[styles.iconButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border, shadowColor: theme.shadow }]}
            onPress={() => router.push('/settings')}
            pressedScale={0.92}
            accessibilityLabel="Settings"
          >
            <Symbol name="gearshape.fill" size={21} color={theme.textSecondary} />
          </PressableScale>
        </View>
      </View>

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
            style={[styles.emptyContainer, { backgroundColor: theme.surfaceSoft, borderColor: theme.separator }]}
          >
            <View style={[styles.emptyBadge, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
              <Symbol name="checkmark" size={34} color={theme.green} weight="heavy" />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              All clear
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
              Add one thing worth crossing off.
            </Text>
            <PressableScale style={styles.packsLink} onPress={() => router.push('/packs')}>
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
              style={[styles.completedSection, { backgroundColor: theme.surfaceSoft, borderColor: theme.separator }]}
            >
              <PressableScale
                style={styles.completedHeader}
                onPress={toggleCompleted}
                pressedScale={0.985}
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompleted }}
              >
                <Text style={[styles.completedTitle, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  Completed ({completedTasks.length})
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
                      style={[styles.completedItem, { backgroundColor: theme.surface, borderColor: theme.separator }]}
                    >
                      <View style={[styles.completedStamp, { borderColor: theme.accent }]}>
                        <Text style={[styles.completedStampText, { color: theme.accent }]} allowFontScaling={false}>
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
                  <PressableScale style={styles.clearButton} onPress={clearCompleted}>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 7,
    overflow: 'hidden',
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
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
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  streakLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginHorizontal: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  emptyBadge: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 72,
  },
  emptyText: {
    fontSize: 21,
    fontWeight: '800',
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
  completedSection: {
    marginTop: 28,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
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
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  completedStamp: {
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
    opacity: 0.75,
  },
  completedStampText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
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
