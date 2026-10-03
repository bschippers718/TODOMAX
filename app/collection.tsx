import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePacks } from '../hooks/usePacks';
import { useSettings } from '../hooks/useSettings';
import { useSound } from '../hooks/useSound';
import { useCollection } from '../hooks/useCollection';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { HeaderDone } from '../components/ui/HeaderDone';
import { AnimationId, ALL_ANIMATION_IDS } from '../lib/types';
import { Theme, useTheme } from '../lib/theme';
import { packAccent } from '../lib/packs';
import {
  ANIMATION_META,
  BoardSection,
  CollectionState,
  TileStatus,
  getAnimationName,
  getBoardSections,
  getTileStatus,
} from '../lib/collection';

const PIXEL_FONT = 'PressStart2P';
const GRID_GAP = 10;
const COLUMNS = 3;

export default function CollectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const { unlockedAnimations } = usePacks();
  const { collection, stats, recordPreviewed, markViewed } = useCollection(unlockedAnimations);
  const { playCelebration } = useSound(settings);
  const [preview, setPreview] = useState<AnimationId | null>(null);

  // Anything earned since the last visit wears a NEW tag while you're here;
  // leaving the board clears it.
  useEffect(() => () => markViewed(), [markViewed]);

  const sections = useMemo(
    () => getBoardSections(unlockedAnimations, collection),
    [unlockedAnimations, collection],
  );
  const unlockedSet = useMemo(() => new Set(unlockedAnimations), [unlockedAnimations]);

  const startPreview = (id: AnimationId) => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    recordPreviewed(id);
    setPreview(id);
    playCelebration(id);
  };

  const tileSize = (width - 40 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <>
      <Stack.Screen options={{ title: 'Collection', headerRight: () => <HeaderDone /> }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical
      >
        <SummaryCard theme={theme} stats={stats} collection={collection} unlocked={unlockedSet} />

        {sections.map((section) => (
          <View key={section.pack.id} style={styles.section}>
            <SectionHeader
              theme={theme}
              section={section}
              onUnlock={() => router.push('/packs')}
            />
            <View style={styles.grid}>
              {section.pack.animations.map((id) => (
                <Tile
                  key={id}
                  id={id}
                  size={tileSize}
                  theme={theme}
                  accent={packAccent(section.pack, theme.isSignal)}
                  status={getTileStatus(id, collection, unlockedSet.has(id))}
                  count={collection.earned[id]?.count ?? 0}
                  isNew={(collection.earned[id]?.firstAt ?? 0) > collection.lastViewedAt}
                  onPress={() => startPreview(id)}
                />
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.fineprint, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
          Finish a task to earn the celebration that plays. Tap any tile to preview it — previews reveal the name but don’t count as earned.
        </Text>
      </ScrollView>

      <Modal visible={preview !== null} transparent animationType="none" statusBarTranslucent>
        <CelebrationOverlay
          celebration={{ active: preview !== null, animationId: preview, streak: 7 }}
          settings={{ ...settings, animationMode: 'full' }}
          onDismiss={() => setPreview(null)}
        />
      </Modal>
    </>
  );
}

function SummaryCard({
  theme,
  stats,
  collection,
  unlocked,
}: {
  theme: Theme;
  stats: ReturnType<typeof useCollection>['stats'];
  collection: CollectionState;
  unlocked: Set<AnimationId>;
}) {
  const pct = Math.round((stats.earned / stats.total) * 100);
  const signal = theme.isSignal;
  return (
    <View
      style={[
        styles.summary,
        signal ? theme.shadowCard : styles.summarySoft,
        {
          backgroundColor: theme.surface,
          borderColor: signal ? theme.cardBorder : theme.border,
          borderWidth: signal ? theme.borderWidth : StyleSheet.hairlineWidth,
          borderRadius: theme.radiusCard,
          shadowColor: theme.shadow,
        },
        signal && styles.summarySignal,
      ]}
    >
      <View style={styles.summaryTop}>
        <View>
          <Text style={[styles.eyebrow, { color: signal ? theme.textTertiary : theme.gold }]} allowFontScaling={false}>
            EARNED
          </Text>
          <View style={styles.bigRow}>
            <Text style={[styles.bigNumber, signal && theme.fontDisplay, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
              {stats.earned}
            </Text>
            <Text style={[styles.bigDenom, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
              / {stats.total}
            </Text>
          </View>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: theme.goldSoft, borderRadius: theme.radiusTag, borderWidth: signal ? 2 : 0, borderColor: theme.cardBorder }]}>
          <Text style={[styles.pctText, { color: theme.onGold }]} allowFontScaling={false}>
            {pct}%
          </Text>
        </View>
      </View>

      {/* One block per celebration, coloured by status — reads like a cartridge shelf. */}
      <View style={styles.blocks}>
        {ALL_ANIMATION_IDS.map((id) => {
          const status = getTileStatus(id, collection, unlocked.has(id));
          return (
            <View
              key={id}
              style={[
                styles.block,
                {
                  backgroundColor:
                    status === 'earned'
                      ? theme.green
                      : status === 'previewed'
                        ? theme.gold
                        : status === 'hidden'
                          ? signal ? theme.grey : theme.borderStrong
                          : 'transparent',
                  borderColor: status === 'locked' ? (signal ? theme.text : theme.borderStrong) : 'transparent',
                  borderRadius: theme.radiusTag,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.legend}>
        <Legend theme={theme} color={theme.green} label={`${stats.earned} earned`} />
        <Legend theme={theme} color={theme.gold} label={`${stats.previewed} previewed`} />
        <Legend theme={theme} color={signal ? theme.grey : theme.borderStrong} label={`${stats.total - stats.earned - stats.previewed - stats.locked} unseen`} />
        <Legend theme={theme} color="transparent" border={signal ? theme.text : theme.borderStrong} label={`${stats.locked} locked`} />
      </View>
    </View>
  );
}

function Legend({ theme, color, border, label }: { theme: Theme; color: string; border?: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: border ?? 'transparent' }]} />
      <Text style={[styles.legendText, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ theme, section, onUnlock }: { theme: Theme; section: BoardSection; onUnlock: () => void }) {
  const { pack, unlocked, earnedInPack } = section;
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.glyphBox, { backgroundColor: unlocked ? packAccent(pack, theme.isSignal) : theme.borderStrong, borderRadius: theme.isSignal ? 18 : 9 }]}>
        <Text style={styles.glyph} allowFontScaling={false}>
          {pack.glyph}
        </Text>
      </View>
      <View style={styles.sectionTitleWrap}>
        <Text style={[styles.sectionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
          {pack.name}
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          {unlocked
            ? `${earnedInPack} of ${pack.animations.length} earned`
            : `Locked · ${pack.price}`}
        </Text>
      </View>
      {!unlocked && (
        <PressableScale
          style={[
            styles.unlockLink,
            theme.isSignal && theme.shadowControl,
            { backgroundColor: theme.blue, borderRadius: theme.radiusPill, borderWidth: theme.isSignal ? 2 : 0, borderColor: theme.cardBorder },
            theme.isSignal && styles.unlockSignal,
          ]}
          onPress={onUnlock}
          pressedScale={0.94}
          accessibilityLabel={`Unlock ${pack.name}`}
        >
          <Text style={styles.unlockLinkText} allowFontScaling={false}>
            Unlock
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

function Tile({
  id,
  size,
  theme,
  accent,
  status,
  count,
  isNew,
  onPress,
}: {
  id: AnimationId;
  size: number;
  theme: Theme;
  accent: string;
  status: TileStatus;
  count: number;
  isNew: boolean;
  onPress: () => void;
}) {
  const meta = ANIMATION_META[id];
  const name = getAnimationName(id);
  const revealed = status === 'earned' || status === 'previewed' || status === 'locked';

  const signal = theme.isSignal;
  const borderColor = signal
    ? status === 'earned' ? theme.cardBorder : status === 'locked' ? theme.border : theme.textTertiary
    : status === 'earned' ? accent : status === 'locked' ? theme.border : theme.borderStrong;
  const iconColor =
    status === 'earned' ? accent : status === 'locked' ? theme.textTertiary : theme.textTertiary;
  const caption =
    status === 'earned'
      ? count > 1
        ? `×${count}`
        : 'EARNED'
      : status === 'previewed'
        ? 'PREVIEWED'
        : status === 'locked'
          ? 'LOCKED'
          : 'NOT YET';

  return (
    <PressableScale
      style={[
        styles.tile,
        signal && status === 'earned' ? theme.shadowControl : styles.tileSoft,
        {
          width: signal ? size - 3 : size,
          height: size * 1.12,
          borderRadius: theme.radiusCard,
          backgroundColor: status === 'earned' ? theme.surface : signal ? 'transparent' : theme.surfaceSoft,
          borderColor,
          borderWidth: status === 'earned' ? (signal ? 2.5 : 2) : status === 'locked' ? 1 : (signal ? 2 : 1.5),
          borderStyle: status === 'hidden' || status === 'previewed' ? 'dashed' : 'solid',
          shadowColor: theme.shadow,
          shadowOpacity: signal ? (status === 'earned' ? 1 : 0) : status === 'earned' ? 0.1 : 0,
          opacity: status === 'locked' ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      pressedScale={0.95}
      pressStyle={signal && status === 'earned' ? 'drop' : 'scale'}
      accessibilityLabel={`${revealed ? name : 'Unknown celebration'}, ${caption.toLowerCase()}`}
      accessibilityHint="Previews the celebration"
    >
      <View style={styles.tileIcon}>
        <Symbol
          name={status === 'locked' ? 'lock.fill' : status === 'hidden' ? 'questionmark' : meta.symbol}
          size={status === 'earned' ? 30 : 26}
          color={iconColor}
          weight={status === 'earned' ? 'bold' : 'semibold'}
        />
      </View>
      <Text
        style={[styles.tileName, { color: revealed ? theme.text : theme.textTertiary }]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
      >
        {revealed ? name : '???'}
      </Text>
      <Text
        style={[styles.tileCaption, { color: status === 'earned' ? accent : theme.textTertiary }]}
        allowFontScaling={false}
      >
        {caption}
      </Text>
      {isNew && status === 'earned' && (
        <View style={[styles.newTag, { backgroundColor: signal ? theme.gold : theme.accent, borderRadius: theme.radiusTag, borderWidth: signal ? 2 : 0, borderColor: theme.cardBorder }]}>
          <Text style={[styles.newTagText, { color: signal ? theme.onGold : '#fff' }]} allowFontScaling={false}>
            NEW
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  summary: {
    padding: 18,
    marginBottom: 26,
  },
  summarySoft: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  summarySignal: {
    marginRight: 4,
  },
  unlockSignal: {
    marginRight: 3,
    marginBottom: 3,
  },
  tileSoft: {
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: PIXEL_FONT,
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 8,
  },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigNumber: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5, lineHeight: 48 },
  bigDenom: { fontSize: 20, fontWeight: '600' },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 7 },
  pctText: { fontFamily: PIXEL_FONT, fontSize: 10 },
  blocks: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  block: {
    flex: 1,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5 },
  legendText: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  glyphBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 18, color: '#fff' },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: 1 },
  unlockLink: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  unlockLinkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tileIcon: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
    minHeight: 30,
  },
  tileCaption: {
    fontFamily: PIXEL_FONT,
    fontSize: 6,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  newTag: {
    position: 'absolute',
    top: -6,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newTagText: { fontFamily: PIXEL_FONT, fontSize: 6, color: '#fff' },
  fineprint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    paddingHorizontal: 12,
  },
});
