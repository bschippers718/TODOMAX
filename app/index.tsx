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
import { AppBackground } from '../components/AppBackground';
import { COLORS } from '../lib/types';

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
      <AppBackground imageUri={settings.customBackgroundUri} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.title}>ToDOMax</Text>
          <Text style={styles.subtitle}>
            {activeTasks.length > 0
              ? `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} remaining`
              : 'Your board is clear. Add one thing.'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakLabel}>STREAK</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            hitSlop={12}
          >
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
            <View style={styles.emptyBadge}>
              <Text style={styles.emptyIcon}>✓</Text>
            </View>
            <Text style={styles.emptyText}>All clear</Text>
            <Text style={styles.emptySubtext}>Add one thing worth crossing off.</Text>
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
                      <View style={styles.completedStamp}>
                        <Text style={styles.completedStampText}>DONE</Text>
                      </View>
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
    backgroundColor: '#F7F1E4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 64,
    paddingBottom: 16,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(217, 154, 33, 0.14)',
    color: '#7A5517',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 7,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#221F1A',
    letterSpacing: -1.1,
  },
  subtitle: {
    fontSize: 14,
    color: '#68707A',
    marginTop: 4,
    maxWidth: 220,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(34, 31, 26, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  streakLabel: {
    color: '#9A6A20',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#221F1A',
    lineHeight: 20,
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderColor: 'rgba(34, 31, 26, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    width: 42,
  },
  gearIcon: {
    fontSize: 23,
    color: '#3E382F',
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 92,
  },
  emptyBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderColor: 'rgba(34, 31, 26, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 72,
  },
  emptyIcon: {
    fontSize: 39,
    color: '#178C55',
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#221F1A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#68707A',
    maxWidth: 240,
    textAlign: 'center',
  },
  completedSection: {
    marginTop: 28,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(34, 31, 26, 0.08)',
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
    color: '#68707A',
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
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 31, 26, 0.08)',
  },
  completedStamp: {
    borderColor: 'rgba(229, 57, 45, 0.55)',
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
  },
  completedStampText: {
    color: '#B93228',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
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
    fontWeight: '800',
    color: COLORS.red,
  },
});
