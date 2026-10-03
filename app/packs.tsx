import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePacks } from '../hooks/usePacks';
import { useSettings } from '../hooks/useSettings';
import { useSound } from '../hooks/useSound';
import { useCollection } from '../hooks/useCollection';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { PressableScale } from '../components/ui/PressableScale';
import { Symbol } from '../components/ui/Symbol';
import { HeaderDone } from '../components/ui/HeaderDone';
import { useToast } from '../components/ui/Toast';
import { AnimationPack, PACKS, packAccent } from '../lib/packs';
import { ALL_ANIMATION_IDS, AnimationId } from '../lib/types';
import { Theme, useTheme } from '../lib/theme';
import { CollectionState } from '../lib/collection';

export default function PacksScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { isOwned, purchasePack, revokePack, pending, unlockedAnimations } = usePacks();
  const { collection, recordPreviewed } = useCollection(unlockedAnimations);
  const { playCelebration } = useSound(settings);
  const { show: showToast, toast } = useToast();
  const params = useLocalSearchParams<{ preview?: string }>();
  const [preview, setPreview] = useState<AnimationId | null>(null);

  // `todomax://packs?preview=errandComplete` opens straight into a preview.
  useEffect(() => {
    const id = params.preview;
    if (id && ALL_ANIMATION_IDS.includes(id as AnimationId)) {
      const t = setTimeout(() => startPreview(id as AnimationId), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.preview]);

  const startPreview = (id: AnimationId) => {
    if (settings.hapticsEnabled) Haptics.selectionAsync();
    recordPreviewed(id);
    setPreview(id);
    playCelebration(id);
  };

  const buy = async (pack: AnimationPack) => {
    const result = await purchasePack(pack.id);
    if (result === 'purchased') {
      if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: `${pack.name} unlocked`,
        subtitle: 'Its celebrations are now in the rotation.',
        icon: 'sparkles',
        tint: packAccent(pack, theme.isSignal),
      });
    }
  };

  const restore = () => {
    // Hook point for StoreKit restorePurchases / RevenueCat restore.
    showToast({ title: 'Purchases restored', subtitle: 'Nothing new to restore in this build.', icon: 'arrow.clockwise', tint: theme.blue });
  };

  const confirmRevoke = (pack: AnimationPack) => {
    Alert.alert(`Lock ${pack.name} again?`, 'Test helper — puts the pack back behind the paywall.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', style: 'destructive', onPress: () => revokePack(pack.id) },
    ]);
  };

  const featured = PACKS.find((p) => p.featured);
  const rest = PACKS.filter((p) => !p.featured);

  return (
    <>
      <Stack.Screen options={{ title: 'Celebration Packs', headerRight: () => <HeaderDone /> }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical
      >
        <Text style={[styles.lede, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          Every pack adds new ways to cross something off. Tap any celebration to preview it, locked or not.
        </Text>

        {featured && (
          <PackCard
            pack={featured}
            theme={theme}
            earned={collection.earned}
            owned={isOwned(featured.id)}
            pending={pending === featured.id}
            onBuy={() => buy(featured)}
            onPreview={startPreview}
            onLongPress={() => {}}
            hero
          />
        )}

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>More packs</Text>
        {rest.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            theme={theme}
            earned={collection.earned}
            owned={isOwned(pack.id)}
            pending={pending === pack.id}
            onBuy={() => buy(pack)}
            onPreview={startPreview}
            onLongPress={() => pack.price && isOwned(pack.id) && confirmRevoke(pack)}
          />
        ))}

        <PressableScale style={styles.restore} onPress={restore} pressedOpacity={0.6} pressStyle="scale">
          <Text style={[styles.restoreText, { color: theme.blue }]} maxFontSizeMultiplier={1.3}>
            Restore Purchases
          </Text>
        </PressableScale>
        <Text style={[styles.fineprint, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.3}>
          Purchases in this build are simulated. Long-press an unlocked paid pack to lock it again for testing.
        </Text>
      </ScrollView>

      {toast}

      {/* Modal so the preview covers the nav header, exactly like the real celebration. */}
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

function PackCard({
  pack,
  theme,
  earned,
  owned,
  pending,
  hero,
  onBuy,
  onPreview,
  onLongPress,
}: {
  pack: AnimationPack;
  theme: Theme;
  earned: CollectionState['earned'];
  owned: boolean;
  pending: boolean;
  hero?: boolean;
  onBuy: () => void;
  onPreview: (id: AnimationId) => void;
  onLongPress: () => void;
}) {
  const isFree = pack.price === null;
  const count = pack.animations.length;
  const signal = theme.isSignal;
  const accent = packAccent(pack, signal);
  const pillRadius = { borderRadius: theme.radiusPill };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={600}
      style={[
        styles.card,
        signal ? theme.shadowCard : null,
        {
          backgroundColor: theme.surface,
          borderColor: signal ? theme.cardBorder : hero ? accent : theme.border,
          borderWidth: signal ? theme.borderWidth : hero ? 2 : StyleSheet.hairlineWidth,
          borderRadius: theme.radiusCard,
          shadowColor: theme.shadow,
        },
        !signal && hero && styles.cardHero,
        signal && styles.cardSignal,
      ]}
    >
      {/* Signal: the pack's line colour runs along the top edge, like a route strip. */}
      {signal && <View style={[styles.lineStrip, { backgroundColor: accent }]} />}
      <View style={styles.cardHead}>
        <View style={[styles.glyphBox, { backgroundColor: accent, borderRadius: signal ? 24 : 11 }]}>
          <Text style={styles.glyph} allowFontScaling={false}>
            {pack.glyph}
          </Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, signal && theme.fontDisplay, signal && styles.cardTitleSignal, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              {pack.name}
            </Text>
            {hero && (
              <Text style={[styles.heroTag, { backgroundColor: accent, borderRadius: theme.radiusTag }]} allowFontScaling={false}>
                SIGNATURE
              </Text>
            )}
          </View>
          <Text style={[styles.cardTagline, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
            {pack.tagline}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardDesc, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
        {pack.description}
      </Text>

      <View style={styles.chips}>
        {pack.animations.map((id) => (
          <PressableScale
            key={id}
            style={[styles.chip, pillRadius, { borderColor: signal ? theme.cardBorder : accent, borderWidth: signal ? 2 : 1, backgroundColor: theme.surfaceSoft }]}
            onPress={() => onPreview(id)}
            pressedScale={0.94}
            pressStyle="scale"
            accessibilityLabel={`Preview ${pack.animationNames[id] ?? id}`}
          >
            <Symbol name={earned[id] ? 'checkmark.circle.fill' : 'play.fill'} size={earned[id] ? 12 : 9} color={earned[id] && signal ? theme.green : accent} />
            <Text style={[styles.chipText, { color: theme.text }]} maxFontSizeMultiplier={1.2}>
              {pack.animationNames[id] ?? id}
            </Text>
          </PressableScale>
        ))}
        {pack.comingSoon ? (
          <View style={[styles.chip, styles.chipGhost, pillRadius, { borderColor: signal ? theme.textTertiary : theme.borderStrong }]}>
            <Text style={[styles.chipGhostText, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.2}>
              +{pack.comingSoon} coming
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFoot}>
        <Text style={[styles.count, { color: theme.textSecondary }]} maxFontSizeMultiplier={1.3}>
          {count} celebration{count === 1 ? '' : 's'}
        </Text>
        {isFree ? (
          <View style={[styles.pill, pillRadius, { backgroundColor: theme.goldSoft, borderWidth: signal ? 2 : 0, borderColor: theme.cardBorder }]}>
            <Text style={[styles.pillText, { color: theme.onGold }]} allowFontScaling={false}>
              INCLUDED
            </Text>
          </View>
        ) : owned ? (
          <View style={[styles.pill, styles.pillOwned, pillRadius, { borderColor: theme.green, borderWidth: signal ? 2 : 1 }]}>
            <Symbol name="checkmark.circle.fill" size={13} color={theme.green} />
            <Text style={[styles.pillText, { color: theme.green }]} allowFontScaling={false}>
              UNLOCKED
            </Text>
          </View>
        ) : (
          // App Store–style price capsule: blue, pill-shaped, price only.
          // Signal: an Express Blue sign with an ink border and hard shadow.
          <PressableScale
            style={[
              styles.buy,
              pillRadius,
              signal && theme.shadowControl,
              { backgroundColor: theme.blue, borderWidth: signal ? 2 : 0, borderColor: theme.cardBorder },
              signal && styles.buySignal,
            ]}
            onPress={onBuy}
            disabled={pending}
            pressedScale={0.94}
            accessibilityLabel={`Unlock ${pack.name} for ${pack.price}`}
          >
            {pending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buyText} allowFontScaling={false}>
                {pack.price}
              </Text>
            )}
          </PressableScale>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  lede: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    padding: 16,
    marginBottom: 14,
    overflow: 'visible',
  },
  cardHero: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  cardSignal: {
    marginRight: 4,
    marginBottom: 18,
    paddingTop: 22,
  },
  lineStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  cardTitleSignal: {
    fontSize: 20,
    letterSpacing: -0.5,
  },
  buySignal: {
    marginRight: 3,
    marginBottom: 3,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glyphBox: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 24,
    color: '#fff',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  heroTag: {
    fontFamily: 'PressStart2P',
    fontSize: 6,
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardTagline: {
    fontSize: 13,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipGhost: {
    borderStyle: 'dashed',
  },
  chipGhostText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOwned: {
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'PressStart2P',
    fontSize: 7,
  },
  buy: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  buyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  restore: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  restoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fineprint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    paddingHorizontal: 12,
  },
});
