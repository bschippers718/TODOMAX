import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTasks } from '../hooks/useTasks';
import { useSettings } from '../hooks/useSettings';
import { useCelebration } from '../hooks/useCelebration';
import { useSound } from '../hooks/useSound';
import { TaskItem } from '../components/TaskItem';
import { AddTaskInput } from '../components/AddTaskInput';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { COLORS, Task } from '../lib/types';

const TROPHY_EMOJIS = ['🏆', '⭐', '🎖️', '👑', '💎', '🥇', '🎯', '🔥', '💪', '🌟', '✨', '🏅'];

function getTrophyEmoji(task: Task): string {
  let hash = 0;
  for (let i = 0; i < task.id.length; i++) {
    hash = ((hash << 5) - hash + task.id.charCodeAt(i)) | 0;
  }
  return TROPHY_EMOJIS[Math.abs(hash) % TROPHY_EMOJIS.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const { activeTasks, completedTasks, streak, loaded, addTask, completeTask, deleteTask, clearCompleted } = useTasks();
  const { settings } = useSettings();
  const { celebration, triggerCelebration, dismissCelebration } = useCelebration(settings);
  const { playComplete, playCelebration } = useSound(settings);
  const [showCompleted, setShowCompleted] = useState(false);

  const handleComplete = (id: string) => {
    completeTask(id);
    playComplete();
    const animId = triggerCelebration(streak + 1);
    if (animId) {
      playCelebration(animId);
    }
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ToDOMax</Text>
          {activeTasks.length > 0 && (
            <Text style={styles.subtitle}>
              {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} remaining
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{streak} streak</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={12}>
            <Text style={styles.gearIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            settings={settings}
            onComplete={handleComplete}
            onDelete={deleteTask}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>All clear</Text>
            <Text style={styles.emptySubtext}>Add a task to get started</Text>
          </View>
        }
        ListFooterComponent={
          completedTasks.length > 0 ? (
            <View style={styles.completedSection}>
              <TouchableOpacity
                style={styles.completedHeader}
                onPress={() => setShowCompleted(!showCompleted)}
                activeOpacity={0.7}
              >
                <Text style={styles.completedTitle}>
                  Completed ({completedTasks.length})
                </Text>
                <Text style={styles.chevron}>{showCompleted ? '▾' : '›'}</Text>
              </TouchableOpacity>
              {showCompleted && (
                <View>
                  {completedTasks.map((task) => (
                    <View key={task.id} style={styles.completedItem}>
                      <Text style={styles.completedEmoji}>{getTrophyEmoji(task)}</Text>
                      <Text style={styles.completedTaskText}>{task.text}</Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearCompleted}
                  >
                    <Text style={styles.clearButtonText}>Clear completed</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null
        }
      />

      <AddTaskInput onAdd={addTask} />

      <CelebrationOverlay
        celebration={celebration}
        settings={settings}
        onDismiss={dismissCelebration}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  streakBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  gearIcon: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 40,
    color: COLORS.dimmed,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.dimmed,
  },
  completedSection: {
    marginTop: 24,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.dimmed,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  completedEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  completedTaskText: {
    color: COLORS.dimmed,
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
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.red,
  },
});
