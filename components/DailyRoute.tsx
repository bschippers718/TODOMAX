import { useMemo } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Task } from '../lib/types';
import { useTheme, IOS_SPRING } from '../lib/theme';
import { PressableScale } from './ui/PressableScale';
import { Symbol } from './ui/Symbol';

type Stop = 'done' | 'carried' | 'open';

const MAX_INLINE = 14;
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
  const stops: Stop[] = [];
  let done = 0;
  let carried = 0;
  let open = 0;
  for (const t of tasks) {
    if (t.completed) {
      if ((t.completedAt ?? 0) >= dayStart && (t.completedAt ?? 0) <= now) done++;
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

/** Text form of the route, pasteable anywhere — the Wordle trick. */
export function routeShareText(stops: Stop[], streak: number, now = new Date()): string {
  const squares = stops.map((s) => (s === 'done' ? '🟩' : s === 'carried' ? '🟧' : '⬜')).join('');
  const day = `${DAYS[now.getDay()]} ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const streakLine = streak > 0 ? `\n${streak}-day streak` : '';
  return `ToDOMax · ${day}\n${squares}${streakLine}\ntodomax.app`;
}

function summaryOf(done: number, carried: number, open: number): string {
  if (done + carried + open === 0) return 'No stops yet';
  return [done && `Done ${done}`, carried && `Carried ${carried}`, open && `Open ${open}`].filter(Boolean).join(' · ');
}

interface Props {
  tasks: Task[];
  streak: number;
  reduceMotion?: boolean;
  /** `inline`: quiet row of small squares under the headline. `card`: the board-clear artifact. */
  variant?: 'inline' | 'card';
  haptics?: boolean;
}

export function DailyRoute({ tasks, streak, reduceMotion = false, variant = 'inline', haptics = true }: Props) {
  const theme = useTheme();
  const { stops, done, carried, open } = useMemo(() => buildRoute(tasks), [tasks]);
  const layout = reduceMotion ? undefined : LinearTransition.springify().damping(IOS_SPRING.damping).stiffness(IOS_SPRING.stiffness);
  const colorFor = (s: Stop) => (s === 'done' ? theme.green : s === 'carried' ? theme.orange : 'transparent');
  const summary = summaryOf(done, carried, open);

  if (variant === 'inline') {
    const shown = stops.slice(0, MAX_INLINE);
    const overflow = stops.length - shown.length;
    return (
      <View style={styles.inline} accessible accessibilityLabel={`Daily route, ${summary}${streak > 0 ? `, ${streak} day streak` : ''}`}>
        <Animated.View style={styles.inlineRow} layout={layout}>
          {shown.map((s, i) => (
            <Animated.View
              key={`${s}-${i}`}
              layout={layout}
              style={[
                styles.inlineSquare,
                { backgroundColor: colorFor(s), borderColor: s === 'open' ? theme.text : colorFor(s), borderRadius: theme.radiusTag },
              ]}
            />
          ))}
          {overflow > 0 && (
            <Text style={[styles.inlineMore, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
              +{overflow}
            </Text>
          )}
        </Animated.View>
        {streak > 0 && (
          <Text style={[styles.inlineStreak, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.2}>
            {stops.length > 0 ? '·  ' : ''}
            {streak}-day streak
          </Text>
        )}
      </View>
    );
  }

  // ---- Card: the end of the movie -----------------------------------------
  const share = async () => {
    if (haptics) Haptics.selectionAsync();
    try {
      await Share.share({ message: routeShareText(stops, streak) });
    } catch {
      // user dismissed the sheet
    }
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(320)}
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
            key={`${s}-${i}`}
            style={[
              styles.cardSquare,
              { backgroundColor: colorFor(s), borderColor: s === 'open' ? theme.text : colorFor(s), borderRadius: theme.radiusTag },
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
        <PressableScale
          style={[
            styles.shareButton,
            theme.shadowControl,
            { backgroundColor: theme.gold, borderColor: theme.cardBorder, borderWidth: 2, borderRadius: theme.radiusControl },
          ]}
          onPress={share}
          accessibilityLabel="Share route"
        >
          <Symbol name="square.and.arrow.up" size={14} color={theme.onGold} weight="bold" />
          <Text style={[styles.shareText, theme.fontTask, { color: theme.onGold }]} maxFontSizeMultiplier={1.2}>
            Share route
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
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
    flexWrap: 'wrap',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  streak: {
    fontSize: 13,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 3,
    marginBottom: 3,
  },
  shareText: {
    fontSize: 13,
  },
});
