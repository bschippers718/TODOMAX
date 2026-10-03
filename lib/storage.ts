import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TASKS: '@todomax_tasks',
  SETTINGS: '@todomax_settings',
  SHUFFLE_BAG: '@todomax_shuffle_bag',
  STREAK: '@todomax_streak',
  OWNED_PACKS: '@todomax_owned_packs',
  COLLECTION: '@todomax_collection',
  HINT_SHOWN: '@todomax_hint_shown',
} as const;

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail on storage errors
  }
}

export { KEYS };
