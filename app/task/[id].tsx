import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTasks } from '../../hooks/useTasks';
import { useSettings } from '../../hooks/useSettings';
import { useTheme, Theme } from '../../lib/theme';
import { LINES, lineColor } from '../../lib/lines';
import { TASK_SIZES, TASK_SIZE_LABEL, taskSize } from '../../lib/types';
import { addDays, dueLabel, hrefFor, startOfLocalDay } from '../../lib/taskMeta';
import { HeaderDone } from '../../components/ui/HeaderDone';
import { PressableScale } from '../../components/ui/PressableScale';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function TaskScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const theme = useTheme();
  const { settings } = useSettings();
  const { tasks, loaded, updateTask } = useTasks();
  const task = tasks.find((t) => t.id === id);

  const [text, setText] = useState(task?.text ?? '');
  const [url, setUrl] = useState(task?.url ?? '');
  const textRef = useRef(text);
  const urlRef = useRef(url);
  const savedText = useRef(task?.text ?? '');
  const savedUrl = useRef(task?.url ?? '');
  textRef.current = text;
  urlRef.current = url;

  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setUrl(task.url ?? '');
    savedText.current = task.text;
    savedUrl.current = task.url ?? '';
    // Only when a different stop opens. Typing must not reset the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const commit = useCallback(() => {
    if (!id) return;
    const nextText = textRef.current.trim();
    if (nextText && nextText !== savedText.current) {
      updateTask(id, { text: nextText });
      savedText.current = nextText;
    }
    const nextUrl = urlRef.current.trim();
    if (nextUrl !== savedUrl.current) {
      updateTask(id, { url: nextUrl || null });
      savedUrl.current = nextUrl;
    }
  }, [id, updateTask]);

  useEffect(() => commit, [commit]);

  const signal = theme.isSignal;
  const sectionTitle = [styles.sectionTitle, signal && theme.fontLabel, signal && styles.sectionTitleSignal, { color: theme.textSecondary }];
  const card = [
    styles.card,
    signal && theme.shadowCard,
    signal && styles.cardSignal,
    {
      backgroundColor: signal ? theme.surface : theme.surfaceSoft,
      borderColor: theme.cardBorder,
      borderWidth: theme.borderWidth,
      borderRadius: theme.radiusCard,
    },
  ];

  if (!loaded) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Stop', headerRight: () => <HeaderDone /> }} />
      {!task ? (
        <View style={[styles.missing, { backgroundColor: theme.bg }]}>
          <Text style={[styles.missingText, { color: theme.textSecondary }]}>This stop is gone.</Text>
          <PressableScale onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} pressStyle="scale">
            <Text style={[styles.missingBack, { color: theme.blue }]}>Back</Text>
          </PressableScale>
        </View>
      ) : (
        <ScrollView
          style={[styles.container, { backgroundColor: theme.bg }]}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          alwaysBounceVertical
        >
          <TextInput
            style={[
              styles.text,
              theme.fontTask,
              {
                color: theme.text,
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                borderWidth: theme.borderWidth,
                borderRadius: theme.radiusCard,
              },
              signal && theme.shadowCard,
              signal && styles.cardSignal,
            ]}
            value={text}
            onChangeText={setText}
            onBlur={() => {
              if (!textRef.current.trim()) setText(savedText.current);
              commit();
            }}
            multiline
            scrollEnabled={false}
            placeholder="What needs doing"
            placeholderTextColor={theme.textTertiary}
            keyboardAppearance={theme.isDark ? 'dark' : 'light'}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Stop"
          />

          <View style={styles.section}>
            <Text style={sectionTitle}>Due</Text>
            <View style={card}>
              <DuePicker
                theme={theme}
                due={task.due}
                haptics={settings.hapticsEnabled}
                onChange={(due) => updateTask(task.id, { due })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={sectionTitle}>Link</Text>
            <View style={card}>
              <TextInput
                style={[styles.linkInput, { color: theme.text }]}
                value={url}
                onChangeText={setUrl}
                onBlur={commit}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://"
                placeholderTextColor={theme.textTertiary}
                keyboardAppearance={theme.isDark ? 'dark' : 'light'}
                maxFontSizeMultiplier={1.3}
                accessibilityLabel="Link"
              />
              <OpenLink theme={theme} url={url} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={sectionTitle}>Size</Text>
            <View style={[card, styles.rowCard]}>
              {TASK_SIZES.map((s) => {
                const on = s === taskSize(task);
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      if (settings.hapticsEnabled) Haptics.selectionAsync();
                      updateTask(task.id, { size: s });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={TASK_SIZE_LABEL[s]}
                    style={[
                      styles.sizeChip,
                      {
                        borderColor: on ? theme.text : theme.textTertiary,
                        backgroundColor: on ? theme.text : 'transparent',
                        borderRadius: theme.radiusTag,
                      },
                    ]}
                  >
                    <Text style={[styles.sizeText, signal && theme.fontLabel, { color: on ? theme.bg : theme.textSecondary }]} allowFontScaling={false}>
                      {TASK_SIZE_LABEL[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={sectionTitle}>Line</Text>
            <View style={[card, styles.rowCard]}>
              <Pressable
                onPress={() => {
                  if (settings.hapticsEnabled) Haptics.selectionAsync();
                  updateTask(task.id, { line: null });
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: !task.line }}
                accessibilityLabel="No line"
                style={[styles.swatch, styles.swatchNone, { borderColor: !task.line ? theme.text : theme.textTertiary, borderRadius: signal ? 3 : 12 }]}
              >
                <View style={[styles.swatchSlash, { backgroundColor: !task.line ? theme.text : theme.textTertiary }]} />
              </Pressable>
              {LINES.map((l) => {
                const on = l.id === task.line;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      if (settings.hapticsEnabled) Haptics.selectionAsync();
                      updateTask(task.id, { line: l.id });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${l.name} line`}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: lineColor(l.id, theme),
                        borderColor: on ? theme.text : 'transparent',
                        borderRadius: signal ? 3 : 12,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </>
  );
}

function OpenLink({ theme, url }: { theme: Theme; url: string }) {
  const href = hrefFor(url);
  if (!href) return null;
  return (
    <PressableScale
      onPress={() => Linking.openURL(href)}
      pressStyle="scale"
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel="Open link"
      style={[styles.openLink, { borderTopColor: theme.separator }]}
    >
      <Text style={[styles.openLinkText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
        Open
      </Text>
    </PressableScale>
  );
}

function DuePicker({
  theme,
  due,
  haptics,
  onChange,
}: {
  theme: Theme;
  due?: number;
  haptics: boolean;
  onChange: (due: number | null) => void;
}) {
  const today = startOfLocalDay(Date.now());
  const selected = due != null ? startOfLocalDay(due) : null;
  const [cursor, setCursor] = useState(() => new Date(selected ?? today));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const days: ({ ms: number; n: number } | null)[] = Array.from({ length: first }, () => null);
    for (let n = 1; n <= count; n++) days.push({ n, ms: new Date(year, month, n).getTime() });
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const pick = (ms: number | null) => {
    if (haptics) Haptics.selectionAsync();
    onChange(ms);
  };
  const shiftMonth = (delta: number) => {
    if (haptics) Haptics.selectionAsync();
    setCursor(new Date(year, month + delta, 1));
  };

  const signal = theme.isSignal;
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={styles.dueHead}>
        <Text style={[styles.dueValue, theme.fontTask, { color: selected ? theme.text : theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
          {selected ? dueLabel(selected) : 'No date'}
        </Text>
        {selected != null && (
          <Pressable onPress={() => pick(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear date">
            <Text style={[styles.clear, { color: theme.blue }]} maxFontSizeMultiplier={1.2}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.quick}>
        <QuickDate theme={theme} label="Today" on={selected === today} onPress={() => pick(today)} />
        <QuickDate theme={theme} label="Tomorrow" on={selected === addDays(today, 1)} onPress={() => pick(addDays(today, 1))} />
      </View>
      <View style={styles.monthHead}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous month">
          <Text style={[styles.monthStep, { color: theme.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, signal && theme.fontTask, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
          {monthLabel}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next month">
          <Text style={[styles.monthStep, { color: theme.text }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}${i}`} style={[styles.weekday, { color: theme.textTertiary }]} allowFontScaling={false}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={`e${i}`} style={styles.day} />;
          const on = cell.ms === selected;
          const isToday = cell.ms === today;
          return (
            <Pressable
              key={cell.ms}
              onPress={() => pick(cell.ms)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={new Date(cell.ms).toDateString()}
              style={[
                styles.day,
                {
                  backgroundColor: on ? theme.text : 'transparent',
                  borderRadius: theme.radiusTag,
                  borderWidth: isToday && !on ? 1.5 : 0,
                  borderColor: theme.text,
                },
              ]}
            >
              <Text style={[styles.dayText, { color: on ? theme.bg : theme.text }]} allowFontScaling={false}>
                {cell.n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function QuickDate({ theme, label, on, onPress }: { theme: Theme; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[
        styles.quickChip,
        {
          borderColor: on ? theme.text : theme.textTertiary,
          backgroundColor: on ? theme.text : 'transparent',
          borderRadius: theme.radiusTag,
        },
      ]}
    >
      <Text style={[styles.quickText, { color: on ? theme.bg : theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  missingText: { fontSize: 16 },
  missingBack: { fontSize: 17, fontWeight: '600' },
  text: {
    fontSize: 22,
    lineHeight: 28,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 28,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionTitleSignal: { fontSize: 7, letterSpacing: 0, marginBottom: 10 },
  card: { padding: 16 },
  cardSignal: { marginRight: 3, marginBottom: 3 },
  rowCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  dueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dueValue: { fontSize: 17, flex: 1, paddingRight: 12 },
  clear: { fontSize: 16, fontWeight: '600' },
  quick: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5 },
  quickText: { fontSize: 14, fontWeight: '700' },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  monthStep: { fontSize: 28, lineHeight: 30, width: 36, textAlign: 'center' },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '600' },
  linkInput: { fontSize: 17, paddingVertical: 2 },
  openLink: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  openLinkText: { fontSize: 16, fontWeight: '700' },
  sizeChip: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5 },
  sizeText: { fontSize: 12, fontWeight: '800' },
  swatch: { width: 28, height: 28, borderWidth: 2 },
  swatchNone: { alignItems: 'center', justifyContent: 'center' },
  swatchSlash: { width: 14, height: 2, transform: [{ rotate: '-45deg' }] },
});
