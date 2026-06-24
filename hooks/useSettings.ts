import { useState, useEffect, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

type SettingsListener = (settings: Settings, loaded: boolean) => void;

let currentSettings: Settings = DEFAULT_SETTINGS;
let currentLoaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<SettingsListener>();

function notifyListeners() {
  listeners.forEach(listener => listener(currentSettings, currentLoaded));
}

function loadSettingsOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const saved = await loadJSON<Settings>(KEYS.SETTINGS);
      currentSettings = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
      currentLoaded = true;
      notifyListeners();
    })();
  }

  return loadPromise;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [loaded, setLoaded] = useState(currentLoaded);

  useEffect(() => {
    const listener: SettingsListener = (nextSettings, nextLoaded) => {
      setSettings(nextSettings);
      setLoaded(nextLoaded);
    };

    listeners.add(listener);
    listener(currentSettings, currentLoaded);
    loadSettingsOnce();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    currentSettings = { ...currentSettings, [key]: value };
    notifyListeners();
    saveJSON(KEYS.SETTINGS, currentSettings);
  }, []);

  return { settings, updateSetting, loaded };
}
