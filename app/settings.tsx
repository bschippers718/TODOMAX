import { Alert, Image, View, Text, StyleSheet, Switch, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../hooks/useSettings';
import { usePacks } from '../hooks/usePacks';
import { useCollection } from '../hooks/useCollection';
import { PACKS } from '../lib/packs';
import { useTheme, Theme } from '../lib/theme';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { HeaderDone } from '../components/ui/HeaderDone';

function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  theme,
  haptics,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  theme: Theme;
  haptics: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <SegmentedControl
        values={options.map((o) => o.label)}
        selectedIndex={index}
        appearance={theme.isDark ? 'dark' : 'light'}
        onChange={(e) => {
          const next = options[e.nativeEvent.selectedSegmentIndex];
          if (!next) return;
          if (haptics) Haptics.selectionAsync();
          onChange(next.key);
        }}
        style={styles.segmented}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const { isOwned, unlockedAnimations } = usePacks();
  const { stats } = useCollection(unlockedAnimations);
  const ownedCount = PACKS.filter((p) => isOwned(p.id)).length;

  const pickBackground = async () => {
    let ImagePicker: typeof import('expo-image-picker');
    let FileSystem: typeof import('expo-file-system/legacy');

    try {
      [ImagePicker, FileSystem] = await Promise.all([
        import('expo-image-picker'),
        import('expo-file-system/legacy'),
      ]);
    } catch {
      Alert.alert(
        'Rebuild needed',
        'The photo picker was added as a native module. Rebuild the iOS app once, then try choosing a background again.',
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to choose a custom ToDOMax background.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      try {
        const sourceUri = result.assets[0].uri;
        const rawExtension =
          result.assets[0].fileName?.split('.').pop() ??
          sourceUri.split('?')[0]?.split('.').pop();
        const extension = rawExtension?.match(/^[a-zA-Z0-9]+$/)
          ? rawExtension.toLowerCase()
          : 'jpg';
        if (!FileSystem.documentDirectory) {
          throw new Error('Document directory unavailable');
        }

        const directory = `${FileSystem.documentDirectory}backgrounds/`;
        const destination = `${directory}custom-background.${extension}`;

        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        await FileSystem.deleteAsync(destination, { idempotent: true });
        await FileSystem.copyAsync({ from: sourceUri, to: destination });
        updateSetting('customBackgroundUri', destination);
      } catch {
        Alert.alert(
          'Background not saved',
          'ToDOMax could not save that photo. Try choosing a different image.',
        );
      }
    }
  };

  const signal = theme.isSignal;
  const card = [
    styles.sectionCard,
    signal && theme.shadowControl,
    {
      backgroundColor: theme.surface,
      borderColor: signal ? theme.cardBorder : theme.border,
      borderWidth: signal ? theme.borderWidth : StyleSheet.hairlineWidth,
      borderRadius: theme.radiusCard,
    },
    signal && styles.sectionCardSignal,
  ];
  const sectionTitle = [styles.sectionTitle, signal && theme.fontLabel, signal && styles.sectionTitleSignal, { color: theme.textSecondary }];
  const controlRadius = { borderRadius: theme.radiusControl };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerRight: () => <HeaderDone />,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical
      >
        <View style={styles.section}>
          <Text style={sectionTitle}>Style</Text>
          <View style={card}>
            <OptionRow
              label="Look"
              value={settings.style}
              onChange={(val) => updateSetting('style', val)}
              theme={theme}
              haptics={settings.hapticsEnabled}
              options={[
                { key: 'signal', label: 'Signal' },
                { key: 'classic', label: 'Classic' },
              ]}
            />
            <Text style={[styles.styleHint, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
              {signal
                ? 'Signal: subway signage. Paper, ink, one yellow, and a Daily Route strip that shows your day as coloured stops.'
                : 'Classic: warm paper over pixel Manhattan, soft cards and gold accents.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sectionTitle}>Background</Text>
          <View style={card}>
            <Text style={[styles.backgroundText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
              {signal
                ? 'Signal runs on plain paper by default. You can still put a photo behind it; it will be washed back so the signs stay legible.'
                : 'Choose a photo from your camera roll. ToDOMax will soften it behind the paper surface so tasks stay readable.'}
            </Text>
            {settings.customBackgroundUri ? (
              <Image
                source={{ uri: settings.customBackgroundUri }}
                style={[styles.backgroundPreview, { borderColor: signal ? theme.cardBorder : theme.border, borderWidth: signal ? 2 : StyleSheet.hairlineWidth, borderRadius: theme.radiusCard }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.defaultPreview, { borderColor: signal ? theme.cardBorder : theme.border, borderWidth: signal ? 2 : StyleSheet.hairlineWidth, borderRadius: theme.radiusCard, backgroundColor: theme.bg }]}>
                {theme.showMap && <Image source={theme.mapAsset} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                <View style={[styles.defaultPreviewLabel, { backgroundColor: theme.surface, borderRadius: theme.radiusPill, borderWidth: signal ? 2 : 0, borderColor: theme.cardBorder }]}>
                  <Symbol name={theme.showMap ? 'map.fill' : 'doc.plaintext'} size={13} color={theme.textSecondary} />
                  <Text style={[styles.defaultPreviewText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                    {theme.showMap ? 'Pixel Manhattan' : 'Paper'}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.backgroundActions}>
              <PressableScale
                style={[
                  styles.backgroundButton,
                  controlRadius,
                  signal && theme.shadowControl,
                  { backgroundColor: theme.buttonFill, borderColor: signal ? theme.cardBorder : theme.buttonFill, borderWidth: signal ? theme.borderWidth : 1 },
                  signal && styles.buttonSignal,
                ]}
                onPress={pickBackground}
              >
                <Text style={[styles.backgroundButtonPrimaryText, { color: theme.buttonText }]} maxFontSizeMultiplier={1.3}>
                  {settings.customBackgroundUri ? 'Change photo' : 'Choose photo'}
                </Text>
              </PressableScale>
              {settings.customBackgroundUri && (
                <PressableScale
                  style={[
                    styles.backgroundButton,
                    controlRadius,
                    signal && theme.shadowControl,
                    { borderColor: signal ? theme.cardBorder : theme.borderStrong, borderWidth: signal ? theme.borderWidth : 1, backgroundColor: signal ? theme.surface : 'transparent' },
                    signal && styles.buttonSignal,
                  ]}
                  onPress={() => updateSetting('customBackgroundUri', null)}
                >
                  <Text style={[styles.backgroundButtonText, { color: theme.accent }]} maxFontSizeMultiplier={1.3}>
                    Remove
                  </Text>
                </PressableScale>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sectionTitle}>Celebrations</Text>
          <View style={card}>
            <PressableScale
              style={styles.linkRow}
              onPress={() => router.push('/collection')}
              pressedScale={0.985}
              pressStyle="scale"
              accessibilityRole="link"
            >
              <View style={styles.linkTextWrap}>
                <Text style={[styles.linkTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                  Collection
                </Text>
                <Text style={[styles.linkSub, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  {stats.earned} of {stats.total} celebrations earned
                  {stats.fresh > 0 ? ` · ${stats.fresh} new` : ''}
                </Text>
              </View>
              <Symbol name="chevron.right" size={14} color={theme.textTertiary} weight="bold" />
            </PressableScale>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <PressableScale
              style={styles.linkRow}
              onPress={() => router.push('/packs')}
              pressedScale={0.985}
              pressStyle="scale"
              accessibilityRole="link"
            >
              <View style={styles.linkTextWrap}>
                <Text style={[styles.linkTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                  Celebration Packs
                </Text>
                <Text style={[styles.linkSub, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
                  {ownedCount} of {PACKS.length} packs unlocked · browse & preview
                </Text>
              </View>
              <Symbol name="chevron.right" size={14} color={theme.textTertiary} weight="bold" />
            </PressableScale>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <OptionRow
              label="Animation mode"
              value={settings.animationMode}
              onChange={(val) => updateSetting('animationMode', val)}
              theme={theme}
              haptics={settings.hapticsEnabled}
              options={[
                { key: 'full', label: 'Full' },
                { key: 'minimal', label: 'Minimal' },
                { key: 'quiet', label: 'Off' },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sectionTitle}>Sound</Text>
          <View style={card}>
            <OptionRow
              label="Volume"
              value={settings.soundLevel}
              onChange={(val) => updateSetting('soundLevel', val)}
              theme={theme}
              haptics={settings.hapticsEnabled}
              options={[
                { key: 'silent', label: 'Off' },
                { key: 'subtle', label: 'Low' },
                { key: 'full', label: 'Full' },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={sectionTitle}>Haptics</Text>
          <View style={card}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                Vibration feedback
              </Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(val) => updateSetting('hapticsEnabled', val)}
                {...(Platform.OS !== 'ios' && { trackColor: { false: theme.separator, true: theme.green } })}
              />
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: signal ? 'transparent' : theme.surfaceSoft, borderRadius: theme.radiusCard }]}>
          <Text style={[styles.infoText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
            Full mode plays a random celebration when you complete a task. Minimal reduces the effect. Off keeps the cross-out but skips the celebration. Reduce Motion in iOS Settings caps celebrations at Minimal.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>ToDOMax v1.0</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    padding: 16,
  },
  sectionCardSignal: {
    marginRight: 3,
  },
  sectionTitleSignal: {
    fontSize: 7,
    letterSpacing: 0,
    marginBottom: 10,
  },
  styleHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  buttonSignal: {
    marginRight: 3,
    marginBottom: 3,
  },
  backgroundText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  backgroundPreview: {
    height: 140,
    marginBottom: 12,
  },
  defaultPreview: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  defaultPreviewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  defaultPreviewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backgroundButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  backgroundButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backgroundButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkSub: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  optionRow: {
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  segmented: {
    height: 34,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
  },
  infoCard: {
    padding: 16,
    marginBottom: 28,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
  },
});
