import { useState, useEffect, useCallback, useMemo } from 'react';
import { PackId, FREE_PACK_IDS, PACKS_BY_ID, getUnlockedAnimationIds } from '../lib/packs';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

type Listener = (owned: PackId[], loaded: boolean) => void;

let ownedPacks: PackId[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(ownedPacks, loaded));
}

function loadOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const saved = await loadJSON<PackId[]>(KEYS.OWNED_PACKS);
      ownedPacks = (saved ?? []).filter((id) => PACKS_BY_ID[id]);
      loaded = true;
      notify();
    })();
  }
  return loadPromise;
}

/**
 * Mock store. Swap the body of `purchasePack` for a StoreKit / RevenueCat call;
 * everything else (ownership persistence, UI, shuffle bag filtering) stays as is.
 */
async function mockPurchase(_id: PackId): Promise<'purchased' | 'cancelled'> {
  await new Promise((r) => setTimeout(r, 900));
  return 'purchased';
}

export function usePacks() {
  const [owned, setOwned] = useState<PackId[]>(ownedPacks);
  const [isLoaded, setIsLoaded] = useState(loaded);
  const [pending, setPending] = useState<PackId | null>(null);

  useEffect(() => {
    const listener: Listener = (next, nextLoaded) => {
      setOwned(next);
      setIsLoaded(nextLoaded);
    };
    listeners.add(listener);
    listener(ownedPacks, loaded);
    loadOnce();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isOwned = useCallback(
    (id: PackId) => FREE_PACK_IDS.includes(id) || owned.includes(id),
    [owned],
  );

  const purchasePack = useCallback(async (id: PackId) => {
    if (FREE_PACK_IDS.includes(id) || ownedPacks.includes(id)) return 'purchased' as const;
    setPending(id);
    try {
      const result = await mockPurchase(id);
      if (result === 'purchased') {
        ownedPacks = [...ownedPacks, id];
        notify();
        saveJSON(KEYS.OWNED_PACKS, ownedPacks);
      }
      return result;
    } finally {
      setPending(null);
    }
  }, []);

  /** Dev/test helper: puts a pack back behind the paywall. */
  const revokePack = useCallback((id: PackId) => {
    ownedPacks = ownedPacks.filter((p) => p !== id);
    notify();
    saveJSON(KEYS.OWNED_PACKS, ownedPacks);
  }, []);

  const unlockedAnimations = useMemo(() => getUnlockedAnimationIds(owned), [owned]);

  return { owned, isOwned, purchasePack, revokePack, pending, unlockedAnimations, loaded: isLoaded };
}
