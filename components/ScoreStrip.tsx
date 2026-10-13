import { StyleSheet, Text, View } from 'react-native';
import { useScore } from '../hooks/useScore';
import { formatScore } from '../lib/scoring';
import { useTheme } from '../lib/theme';

type Props = {
  /** `inline` under the Signal route; `badge` for Classic header chrome. */
  variant?: 'inline' | 'badge';
};

/**
 * Today's score, today's high, this week's score, and the weekly high.
 * Quiet chrome — the squares still own the route; this is the tally.
 */
export function ScoreStrip({ variant = 'inline' }: Props) {
  const theme = useTheme();
  const { score, loaded } = useScore();
  if (!loaded) return null;

  const today = formatScore(score.dayScore);
  const dayHi = formatScore(score.dayHigh);
  const week = formatScore(score.weekScore);
  const weekHi = formatScore(score.weekHigh);
  const label = `Today ${today}, high ${dayHi}, week ${week}, week high ${weekHi}`;

  if (variant === 'badge') {
    return (
      <View
        style={[
          styles.badge,
          theme.shadowControl,
          {
            backgroundColor: theme.surfaceSoft,
            borderColor: theme.cardBorder,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radiusControl,
          },
        ]}
        accessible
        accessibilityLabel={label}
      >
        <Text style={[styles.badgeEyebrow, theme.fontLabel, { color: theme.gold }]} allowFontScaling={false}>
          TODAY
        </Text>
        <Text style={[styles.badgeNum, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
          {today}
        </Text>
        <Text style={[styles.badgeSub, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.2}>
          HI {dayHi}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inline} accessible accessibilityLabel={label}>
      <Text style={[styles.inlineText, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false} numberOfLines={1}>
        TODAY {today}
        <Text style={{ color: theme.textSecondary }}> · </Text>
        HI {dayHi}
        <Text style={{ color: theme.textSecondary }}> · </Text>
        WEEK {week}
        <Text style={{ color: theme.textSecondary }}> · </Text>
        HI {weekHi}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    marginTop: 8,
    flexShrink: 1,
  },
  inlineText: {
    fontSize: 7,
    letterSpacing: 0.2,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 58,
  },
  badgeEyebrow: {
    fontSize: 7,
    marginBottom: 2,
  },
  badgeNum: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  badgeSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
