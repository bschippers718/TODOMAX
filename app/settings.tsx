import { Alert, Image, View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '../hooks/useSettings';
import { COLORS, Settings } from '../lib/types';

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (val: any) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map((opt) => (
          <TouchableOpacity
            key={String(opt.key)}
            style={[
              styles.optionButton,
              value === opt.key && styles.optionButtonActive,
            ]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionButtonText,
                value === opt.key && styles.optionButtonTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();

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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.backgroundText}>
              Choose a photo from your camera roll. ToDOMax will soften it behind the paper surface so tasks stay readable.
            </Text>
            {settings.customBackgroundUri ? (
              <Image
                source={{ uri: settings.customBackgroundUri }}
                style={styles.backgroundPreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.defaultPreview}>
                <Text style={styles.defaultPreviewText}>Paper background</Text>
              </View>
            )}
            <View style={styles.backgroundActions}>
              <TouchableOpacity
                style={[styles.backgroundButton, styles.backgroundButtonPrimary]}
                onPress={pickBackground}
                activeOpacity={0.75}
              >
                <Text style={styles.backgroundButtonPrimaryText}>
                  {settings.customBackgroundUri ? 'Change photo' : 'Choose photo'}
                </Text>
              </TouchableOpacity>
              {settings.customBackgroundUri && (
                <TouchableOpacity
                  style={styles.backgroundButton}
                  onPress={() => updateSetting('customBackgroundUri', null)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.backgroundButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Celebrations</Text>
          <View style={styles.sectionCard}>
            <OptionRow
              label="Animation mode"
              value={settings.animationMode}
              onChange={(val) => updateSetting('animationMode', val)}
              options={[
                { key: 'full', label: 'Full' },
                { key: 'minimal', label: 'Minimal' },
                { key: 'quiet', label: 'Off' },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound</Text>
          <View style={styles.sectionCard}>
            <OptionRow
              label="Volume"
              value={settings.soundLevel}
              onChange={(val) => updateSetting('soundLevel', val)}
              options={[
                { key: 'silent', label: 'Off' },
                { key: 'subtle', label: 'Low' },
                { key: 'full', label: 'Full' },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haptics</Text>
          <View style={styles.sectionCard}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Vibration feedback</Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(val) => updateSetting('hapticsEnabled', val)}
                trackColor={{ false: COLORS.separator, true: COLORS.green }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Full mode plays a random celebration when you complete a task. Minimal reduces the effect. Off keeps the cross-out but skips the celebration.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ToDOMax v1.0</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  backgroundText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  backgroundPreview: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  defaultPreview: {
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: '#F7F1E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  defaultPreviewText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backgroundButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 11,
    backgroundColor: COLORS.bg,
  },
  backgroundButtonPrimary: {
    backgroundColor: '#221F1A',
    borderColor: '#221F1A',
  },
  backgroundButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  backgroundButtonPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  optionRow: {
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 10,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  optionButtonTextActive: {
    color: COLORS.blue,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  infoCard: {
    padding: 16,
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    marginBottom: 28,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.dimmed,
  },
});
