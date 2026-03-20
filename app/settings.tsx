import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
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
