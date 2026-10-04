import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Task, TaskSize, taskSize } from '../lib/types';
import { useTheme } from '../lib/theme';

type StopKind = 'done' | 'carried' | 'open';
type Stop = { kind: StopKind; size: TaskSize };

const MAX_INLINE = 10;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "SATURDAY · OCT 3" — the header date line. */
export function todayLabel(now = new Date()): string {
  return `${DAYS_LONG[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

/**
 * Today's route as a strip of squares — the Wordle-grid idea from the Signal
 * style guide. No task text, so it's safe to share; the colours tell the story.
 *   green   = struck today
 *   orange  = carried over from an earlier day and still open
 *   outline = added today, still open
 */
export function buildRoute(tasks: Task[], now = Date.now()): { stops: Stop[]; done: number; carried: number; open: number } {
  const dayStart = startOfToday();
  const groups: Record<StopKind, Stop[]> = { done: [], carried: [], open: [] };
  for (const t of tasks) {
    const size = taskSize(t);
    if (t.completed) {
      if ((t.completedAt ?? 0) >= dayStart && (t.completedAt ?? 0) <= now) groups.done.push({ kind: 'done', size });
    } else if (t.createdAt < dayStart) {
      groups.carried.push({ kind: 'carried', size });
    } else {
      groups.open.push({ kind: 'open', size });
    }
  }
  const stops = [...groups.done, ...groups.carried, ...groups.open];
  return { stops, done: groups.done.length, carried: groups.carried.length, open: groups.open.length };
}

function summaryOf(done: number, carried: number, open: number): string {
  if (done + carried + open === 0) return 'No stops yet';
  return [done && `Done ${done}`, carried && `Carried ${carried}`, open && `Open ${open}`].filter(Boolean).join(' · ');
}

interface Props {
  tasks: Task[];
  streak: number;
  /** `inline`: quiet row of small squares under the headline. `card`: the board-clear summary. */
  variant?: 'inline' | 'card';
}

export function DailyRoute({ tasks, streak, variant = 'inline' }: Props) {
  const theme = useTheme();
  const { stops, done, carried, open } = useMemo(() => buildRoute(tasks), [tasks]);
  const colorFor = (s: Stop) => (s.kind === 'done' ? theme.green : s.kind === 'carried' ? theme.orange : 'transparent');
  // A big stop is a wider square; a small one is a little narrower.
  const widthFor = (s: Stop, base: number) => (s.size === 'l' ? Math.round(base * 1.7) : s.size === 's' ? Math.round(base * 0.75) : base);
  const summary = summaryOf(done, carried, open);

  if (variant === 'inline') {
    const shown = stops.slice(0, MAX_INLINE);
    const overflow = stops.length - shown.length;
    return (
      <View style={styles.inline} accessible accessibilityLabel={`Daily route, ${summary}${streak > 0 ? `, ${streak} day streak` : ''}`}>
        <View style={styles.inlineRow}>
          {shown.map((s, i) => (
            <View
              key={`${s.kind}-${i}`}
              style={[
                styles.inlineSquare,
                { width: widthFor(s, 11), backgroundColor: colorFor(s), borderColor: s.kind === 'open' ? theme.text : colorFor(s), borderRadius: theme.radiusTag },
              ]}
            />
          ))}
          {overflow > 0 && (
            <Text style={[styles.inlineMore, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
              +{overflow}
            </Text>
          )}
        </View>
        {streak > 0 && (
          <Text style={[styles.inlineStreak, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.2}>
            {stops.length > 0 ? '·  ' : ''}
            {streak}-day streak
          </Text>
        )}
      </View>
    );
  }

  // ---- Card: the board-clear summary ---------------------------------------
  return (
    <View
      style={[
        styles.card,
        theme.shadowCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          borderWidth: theme.borderWidth,
          borderRadius: theme.radiusCard,
        },
      ]}
      accessible
      accessibilityLabel={`Daily route card, ${summary}`}
    >
      <View style={styles.cardHead}>
        <Text style={[styles.cardLabel, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
          DAILY ROUTE
        </Text>
        <Text style={[styles.cardDate, theme.fontLabel, { color: theme.onGold, backgroundColor: theme.gold, borderColor: theme.cardBorder, borderRadius: theme.radiusTag }]} allowFontScaling={false}>
          {DAYS[new Date().getDay()]} · {MONTHS[new Date().getMonth()]} {new Date().getDate()}
        </Text>
      </View>

      <View style={styles.cardSquares}>
        {stops.map((s, i) => (
          <View
            key={`${s.kind}-${i}`}
            style={[
              styles.cardSquare,
              { width: widthFor(s, 26), backgroundColor: colorFor(s), borderColor: s.kind === 'open' ? theme.text : colorFor(s), borderRadius: theme.radiusTag },
            ]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {done > 0 && <Legend color={theme.green} label={`Done ${done}`} text={theme.text} />}
        {carried > 0 && <Legend color={theme.orange} label={`Carried ${carried}`} text={theme.text} />}
        {open > 0 && <Legend color="transparent" border={theme.text} label={`Open ${open}`} text={theme.text} />}
      </View>

      <View style={[styles.cardFoot, { borderTopColor: theme.separator }]}>
        <Text style={[styles.streak, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
          {streak > 0 ? `${streak}-day streak` : 'First stop of a streak'}
        </Text>
      </View>
    </View>
  );
}

function Legend({ color, border, label, text }: { color: string; border?: string; label: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: border ?? color }]} />
      <Text style={[styles.legendText, { color: text }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineSquare: {
    width: 11,
    height: 11,
    borderWidth: 2,
  },
  inlineMore: {
    fontSize: 7,
    marginLeft: 3,
  },
  inlineStreak: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    flexShrink: 0,
  },

  card: {
    marginTop: 18,
    marginRight: 4,
    padding: 16,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 7,
  },
  cardDate: {
    fontSize: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardSquares: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  cardSquare: {
    width: 26,
    height: 26,
    borderWidth: 2.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFoot: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  streak: {
    fontSize: 13,
    fontWeight: '700',
  },
});
