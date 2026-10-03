import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Task } from '../lib/types';
import { useTheme, IOS_SPRING } from '../lib/theme';

type Stop = 'done' | 'carried' | 'open';

const MAX_SQUARES = 12;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Today's route as a strip of squares — the Wordle-grid idea from the Signal
 * style guide. No task text, so it's safe to share; the colours tell the story.
 *   green  = struck today
 *   orange = carried over from an earlier day and still open
 *   outline = added today, still open
 */
export function buildRoute(tasks: Task[], now = Date.now()): { stops: Stop[]; done: number; carried: number; open: number } {
  const dayStart = startOfToday();
  const stops: Stop[] = [];
  let done = 0;
  let carried = 0;
  let open = 0;
  for (const t of tasks) {
    if (t.completed) {
      if ((t.completedAt ?? 0) >= dayStart && (t.completedAt ?? 0) <= now) {
        done++;
      }
    } else if (t.createdAt < dayStart) {
      carried++;
    } else {
      open++;
    }
  }
  for (let i = 0; i < done; i++) stops.push('done');
  for (let i = 0; i < carried; i++) stops.push('carried');
  for (let i = 0; i < open; i++) stops.push('open');
  return { stops, done, carried, open };
}

export function DailyRoute({ tasks, reduceMotion = false }: { tasks: Task[]; reduceMotion?: boolean }) {
  const theme = useTheme();
  const { stops, done, carried, open } = useMemo(() => buildRoute(tasks), [tasks]);
  const day = DAYS[new Date().getDay()];
  const shown = stops.slice(0, MAX_SQUARES);
  const overflow = stops.length - shown.length;
  const layout = reduceMotion ? undefined : LinearTransition.springify().damping(IOS_SPRING.damping).stiffness(IOS_SPRING.stiffness);

  const colorFor = (s: Stop) => (s === 'done' ? theme.green : s === 'carried' ? theme.orange : 'transparent');

  const summary =
    stops.length === 0
      ? 'No stops yet'
      : [done && `Done ${done}`, carried && `Carried ${carried}`, open && `Open ${open}`].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.sign,
        theme.shadowControl,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          borderWidth: theme.borderWidth,
          borderRadius: theme.radiusCard,
        },
      ]}
      accessible
      accessibilityLabel={`Daily route, ${summary}`}
    >
      <View style={styles.head}>
        <Text style={[styles.label, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
          DAILY ROUTE · {day}
        </Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
          {summary}
        </Text>
      </View>
      <Animated.View style={styles.row} layout={layout}>
        {shown.length === 0 && (
          <View style={[styles.square, styles.squareEmpty, { borderColor: theme.textTertiary }]} />
        )}
        {shown.map((s, i) => (
          <Animated.View
            key={`${s}-${i}`}
            layout={layout}
            style={[
              styles.square,
              {
                backgroundColor: colorFor(s),
                borderColor: s === 'open' ? theme.text : colorFor(s),
                borderRadius: theme.radiusTag,
              },
            ]}
          />
        ))}
        {overflow > 0 && (
          <Text style={[styles.more, theme.fontLabel, { color: theme.textSecondary }]} allowFontScaling={false}>
            +{overflow}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sign: {
    marginHorizontal: 22,
    marginBottom: 14,
    marginRight: 25, // + 3 for the hard shadow
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  label: {
    fontSize: 7,
  },
  summary: {
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  square: {
    width: 20,
    height: 20,
    borderWidth: 2.5,
  },
  squareEmpty: {
    borderStyle: 'dashed',
    borderRadius: 2,
  },
  more: {
    fontSize: 8,
    marginLeft: 4,
  },
});
