import { useState, useEffect, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<Settings>(KEYS.SETTINGS);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveJSON(KEYS.SETTINGS, settings);
    }
  }, [settings, loaded]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return { settings, updateSetting, loaded };
}
