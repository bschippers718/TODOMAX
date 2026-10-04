import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Task } from '../lib/types';
import { useTheme } from '../lib/theme';
import { animateNextLayout } from '../lib/nativeLayout';
import { dayLabel } from './DailyRoute';
import { PressableScale } from './ui/PressableScale';
import { Symbol } from './ui/Symbol';

/** How many struck stops show before "Show N more". */
const PREVIEW = 5;

type DayGroup = { key: string; label: string; tasks: Task[] };

function struckAt(t: Task): number {
  return t.completedAt ?? t.createdAt;
}

/** Newest first, bucketed by the calendar day each stop was struck. */
export function groupByDay(tasks: Task[], now = Date.now()): DayGroup[] {
  const sorted = [...tasks].sort((a, b) => struckAt(b) - struckAt(a));
  const groups: DayGroup[] = [];
  for (const t of sorted) {
    const d = new Date(struckAt(t));
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.tasks.push(t);
    else groups.push({ key, label: dayLabel(struckAt(t), now), tasks: [t] });
  }
  return groups;
}

interface Props {
  tasks: Task[];
  /** Celebrations earned so far; shown beside the struck count. */
  collected: number;
  expanded: boolean;
  reduceMotion?: boolean;
  onToggle: () => void;
  onCollection: () => void;
  onClear: () => void;
}

/**
 * Signal's struck list: an enamel sign, not loose grey text. A one-line
 * summary opens into the day's struck stops, grouped by day and capped so
 * yesterday's errands don't outweigh today's board.
 */
export function StruckList({ tasks, collected, expanded, reduceMotion = false, onToggle, onCollection, onClear }: Props) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!expanded) setShowAll(false);
  }, [expanded]);

  const groups = useMemo(() => {
    const all = groupByDay(tasks);
    if (showAll) return all;
    let left = PREVIEW;
    const preview: DayGroup[] = [];
    for (const g of all) {
      if (left <= 0) break;
      preview.push({ ...g, tasks: g.tasks.slice(0, left) });
      left -= g.tasks.length;
    }
    return preview;
  }, [tasks, showAll]);
  const hidden = Math.max(0, tasks.length - PREVIEW);

  const toggleShowAll = () => {
    animateNextLayout(reduceMotion);
    setShowAll((v) => !v);
  };

  const summary = `${tasks.length} struck${collected > 0 ? `  ·  ${collected} collected` : ''}`;

  return (
    <View
      style={[
        styles.panel,
        theme.shadowCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          borderWidth: theme.borderWidth,
          borderRadius: theme.radiusCard,
        },
      ]}
    >
      <PressableScale
        style={styles.summary}
        onPress={onToggle}
        pressStyle="scale"
        pressedScale={0.985}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${summary}. ${expanded ? 'Hide' : 'Show'} struck stops`}
      >
        <Text style={[styles.summaryText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          {summary}
        </Text>
        <Symbol
          name="chevron.right"
          size={11}
          color={theme.textSecondary}
          weight="bold"
          style={expanded ? styles.chevronOpen : undefined}
        />
      </PressableScale>

      {expanded && (
        <View>
          {groups.map((g) => (
            <View key={g.key}>
              <View style={[styles.dayHead, { borderTopColor: theme.separator }]}>
                <Text style={[styles.dayLabel, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
                  {g.label}
                </Text>
                <Text style={[styles.dayLabel, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
                  {g.tasks.length}
                </Text>
              </View>
              {g.tasks.map((task) => (
                <View key={task.id} style={styles.row}>
                  <View style={[styles.stop, { backgroundColor: theme.green, borderRadius: theme.radiusTag }]} />
                  <Text style={[styles.rowText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3} numberOfLines={2}>
                    {task.text}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {hidden > 0 && (
            <PressableScale style={styles.more} onPress={toggleShowAll} pressStyle="scale" hitSlop={8}>
              <Text style={[styles.moreText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
                {showAll ? 'Show less' : `Show ${hidden} more`}
              </Text>
            </PressableScale>
          )}

          <View style={[styles.actions, { borderTopColor: theme.separator }]}>
            <PressableScale style={styles.action} onPress={onCollection} pressStyle="scale" hitSlop={8}>
              <Text style={[styles.actionText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                Collection ›
              </Text>
            </PressableScale>
            <PressableScale style={styles.action} onPress={onClear} pressStyle="scale" hitSlop={8}>
              <Text style={[styles.actionText, { color: theme.accent }]} maxFontSizeMultiplier={1.3}>
                Clear struck
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 22,
    // Room for the hard shadow so it isn't clipped by the list edge.
    marginRight: 4,
    marginBottom: 4,
    paddingHorizontal: 14,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dayLabel: {
    fontSize: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  stop: {
    width: 7,
    height: 7,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  more: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 4,
  },
  action: {
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
