import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../hooks/useSettings';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { Theme, StyleId, themeFor, useTheme, loudType } from '../lib/theme';
import { PACKS, PackId, packAccent } from '../lib/packs';

const LOOKS: { id: StyleId; name: string; blurb: string }[] = [
  { id: 'signal', name: 'Signal', blurb: 'Paper, ink and one yellow. Your day as stops on a line.' },
  { id: 'classic', name: 'Classic', blurb: 'Soft cards over a city map. Warm and familiar.' },
];

/**
 * Two choices, then you're in: how it looks, and what plays when you finish
 * something. Both can be changed later in Settings and Packs; this just makes
 * sure nobody meets a touchdown they didn't ask for.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { settings, updateSetting } = useSettings();
  const freePacks = PACKS.filter((p) => p.price === null);
  const paidPacks = PACKS.filter((p) => p.price !== null);
  const [picked, setPicked] = useState<PackId[]>(freePacks.map((p) => p.id));
  const haptic = () => settings.hapticsEnabled && Haptics.selectionAsync();

  const chooseLook = (id: StyleId) => {
    haptic();
    updateSetting('style', id);
  };

  const togglePack = (id: PackId) => {
    // The last pack stays: something has to play. Say so instead of pretending.
    if (picked.includes(id) && picked.length === 1) {
      if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    haptic();
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const start = () => {
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const all = freePacks.every((p) => picked.includes(p.id));
    updateSetting('enabledPacks', all ? null : picked);
    updateSetting('onboarded', true);
    router.replace('/');
  };

  const signal = theme.isSignal;

  // Already set up (reached by a link): there's nothing to redo here.
  if (settings.onboarded) return <Redirect href="/" />;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, theme.fontLabel, { color: theme.textTertiary }]} allowFontScaling={false}>
          {signal ? 'WELCOME ABOARD' : 'WELCOME'}
        </Text>
        <Text style={[styles.headline, theme.fontDisplay, { color: theme.text }, loudType(theme)]} maxFontSizeMultiplier={1.2}>
          Pick a look.
        </Text>

        <View style={styles.looks}>
          {LOOKS.map((look) => (
            <LookCard
              key={look.id}
              name={look.name}
              blurb={look.blurb}
              preview={themeFor(look.id, scheme)}
              frame={theme}
              selected={settings.style === look.id}
              onPress={() => chooseLook(look.id)}
            />
          ))}
        </View>

        <Text style={[styles.headline, styles.headlineSecond, theme.fontDisplay, { color: theme.text }, loudType(theme)]} maxFontSizeMultiplier={1.2}>
          Pick your celebrations.
        </Text>
        <Text style={[styles.lede, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          Something plays every time you cross a stop off. Choose where it comes from.
        </Text>

        <View style={styles.packs}>
          {freePacks.map((pack) => {
            const on = picked.includes(pack.id);
            const accent = packAccent(pack, signal);
            return (
              <PressableScale
                key={pack.id}
                onPress={() => togglePack(pack.id)}
                pressStyle="scale"
                pressedScale={0.985}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={pack.name}
                style={[
                  styles.packRow,
                  signal && theme.shadowCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: on ? (signal ? theme.cardBorder : accent) : signal ? theme.cardBorder : theme.border,
                    borderWidth: signal ? theme.borderWidth : on ? 2 : StyleSheet.hairlineWidth,
                    borderRadius: theme.radiusCard,
                  },
                  signal && styles.packRowSignal,
                  !on && styles.packRowOff,
                ]}
              >
                {signal && <View style={[styles.lineStrip, { backgroundColor: accent }]} />}
                <View style={[styles.glyphBox, { backgroundColor: accent, borderRadius: signal ? 22 : 10 }]}>
                  <Text style={styles.glyph} allowFontScaling={false}>
                    {pack.glyph}
                  </Text>
                </View>
                <View style={styles.packText}>
                  <Text style={[styles.packName, signal && theme.fontDisplay, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                    {pack.name}
                  </Text>
                  <Text style={[styles.packTagline, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3} numberOfLines={2}>
                    {pack.tagline}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: on ? theme.green : 'transparent',
                      borderColor: on ? theme.green : theme.textTertiary,
                      borderRadius: signal ? 4 : 12,
                    },
                  ]}
                >
                  {on && <Symbol name="checkmark" size={13} color="#fff" weight="heavy" />}
                </View>
              </PressableScale>
            );
          })}

          <Text style={[styles.storeNote, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
            {paidPacks.map((p) => p.name).join(', ')} are in the Packs store. Anything you unlock later can be switched in or
            out of rotation.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.bg }]}>
        <PressableScale
          style={[
            styles.start,
            theme.shadowControl,
            {
              backgroundColor: signal ? theme.gold : theme.buttonFill,
              borderColor: theme.cardBorder,
              borderWidth: signal ? theme.borderWidth : 0,
              borderRadius: theme.radiusControl,
            },
            signal && styles.startSignal,
          ]}
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel="Start"
        >
          <Text style={[styles.startText, signal && theme.fontDisplay, { color: signal ? theme.onGold : theme.buttonText }]} maxFontSizeMultiplier={1.2}>
            {signal ? 'Board' : 'Start'}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

/** A look, shown as a tiny slice of its own home screen. */
function LookCard({
  name,
  blurb,
  preview,
  frame,
  selected,
  onPress,
}: {
  name: string;
  blurb: string;
  preview: Theme;
  frame: Theme;
  selected: boolean;
  onPress: () => void;
}) {
  const signal = frame.isSignal;
  return (
    <PressableScale
      onPress={onPress}
      pressStyle="scale"
      pressedScale={0.985}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name} look`}
      style={[
        styles.look,
        signal && frame.shadowCard,
        {
          backgroundColor: frame.surface,
          borderColor: selected ? (signal ? frame.cardBorder : frame.blue) : signal ? frame.cardBorder : frame.border,
          borderWidth: signal ? frame.borderWidth : selected ? 2 : StyleSheet.hairlineWidth,
          borderRadius: frame.radiusCard,
        },
        signal && styles.lookSignal,
        !selected && styles.lookOff,
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: preview.bg, borderRadius: Math.max(0, frame.radiusCard - 4) }]}>
        {!preview.showMap ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: preview.mapWash, opacity: 0.5 }]} />}
        <View
          style={[
            styles.swatchRow,
            preview.shadowCard,
            {
              backgroundColor: preview.surface,
              borderColor: preview.cardBorder,
              borderWidth: preview.borderWidth,
              borderRadius: preview.radiusCard,
            },
          ]}
        >
          {preview.isSignal && (
            <View style={[styles.swatchBullet, { backgroundColor: preview.blue }]}>
              <Text style={styles.swatchBulletText} allowFontScaling={false}>
                1
              </Text>
            </View>
          )}
          <Text style={[styles.swatchText, preview.fontTask, { color: preview.text }]} numberOfLines={1} allowFontScaling={false}>
            Pick up dry cleaning
          </Text>
        </View>
        <View style={[styles.swatchRow, styles.swatchRowSecond, preview.shadowCard, { backgroundColor: preview.surface, borderColor: preview.cardBorder, borderWidth: preview.borderWidth, borderRadius: preview.radiusCard }]}>
          {preview.isSignal && (
            <View style={[styles.swatchBullet, { backgroundColor: preview.text }]}>
              <Text style={[styles.swatchBulletText, { color: preview.bg }]} allowFontScaling={false}>
                2
              </Text>
            </View>
          )}
          <Text style={[styles.swatchText, preview.fontTask, { color: preview.text }]} numberOfLines={1} allowFontScaling={false}>
            Call the dentist
          </Text>
        </View>
      </View>
      <View style={styles.lookText}>
        <View style={styles.lookTitleRow}>
          <Text style={[styles.lookName, signal && frame.fontDisplay, { color: frame.text }]} maxFontSizeMultiplier={1.3}>
            {name}
          </Text>
          {selected && <Symbol name="checkmark.circle.fill" size={18} color={signal ? frame.green : frame.blue} />}
        </View>
        <Text style={[styles.lookBlurb, { color: frame.textSecondary }]} maxFontSizeMultiplier={1.3}>
          {blurb}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
  },
  eyebrow: {
    fontSize: 7,
    marginBottom: 10,
  },
  headline: {
    fontSize: 32,
    letterSpacing: -1.2,
  },
  headlineSecond: {
    marginTop: 36,
  },
  lede: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },

  looks: {
    marginTop: 18,
    gap: 14,
  },
  look: {
    overflow: 'visible',
  },
  lookSignal: {
    marginRight: 4,
    marginBottom: 4,
  },
  lookOff: {
    opacity: 0.82,
  },
  swatch: {
    margin: 4,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 4,
    gap: 10,
  },
  swatchRowSecond: {
    marginTop: 8,
    width: '82%',
  },
  swatchBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchBulletText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  swatchText: {
    fontSize: 13,
    flexShrink: 1,
  },
  lookText: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  lookTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lookName: {
    fontSize: 18,
    fontWeight: '800',
  },
  lookBlurb: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },

  packs: {
    marginTop: 16,
    gap: 12,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  packRowSignal: {
    marginRight: 4,
    marginBottom: 4,
  },
  packRowOff: {
    opacity: 0.72,
  },
  lineStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  glyphBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    color: '#fff',
  },
  packText: {
    flex: 1,
  },
  packName: {
    fontSize: 16,
    fontWeight: '800',
  },
  packTagline: {
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeNote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 2,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  start: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startSignal: {
    marginRight: 3,
    marginBottom: 3,
  },
  startText: {
    fontSize: 18,
    fontWeight: '800',
  },
});
