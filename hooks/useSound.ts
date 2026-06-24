import { useEffect, useRef, useCallback } from 'react';
import { Settings, AnimationId } from '../lib/types';

let Audio: any = null;
try {
  Audio = require('expo-audio');
} catch {
  // expo-audio not available (e.g. Expo Go without native module)
}

const SOUND_MAP: Record<string, any> = {
  complete: require('../assets/sounds/complete.wav'),
  celebrate: require('../assets/sounds/celebrate.wav'),
  stamp: require('../assets/sounds/stamp.wav'),
  whoosh: require('../assets/sounds/whoosh.wav'),
  fanfare: require('../assets/sounds/fanfare.wav'),
  pop: require('../assets/sounds/pop.wav'),
};

const ANIMATION_SOUNDS: Record<AnimationId, string> = {
  touchdown: 'fanfare',
  scorePop: 'pop',
  streakCombo: 'celebrate',
  perfectStamp: 'stamp',
  footballSpike: 'stamp',
  swordSlash: 'whoosh',
  rubberStamp: 'stamp',
  trophyRaise: 'fanfare',
  singleConfetti: 'pop',
  halftimeBand: 'celebrate',
  instantReplay: 'whoosh',
  interception: 'whoosh',
  levelClear: 'fanfare',
  pixelPowerUp: 'pop',
};

const VOLUME_MAP: Record<Settings['soundLevel'], number> = {
  silent: 0,
  subtle: 0.3,
  full: 0.8,
};

export function useSound(settings: Settings) {
  const playersRef = useRef<Map<string, any>>(new Map());
  const audioAvailable = Audio !== null && typeof Audio.createAudioPlayer === 'function';

  useEffect(() => {
    if (!audioAvailable) return;

    try {
      Audio.setAudioModeAsync({ playsInSilentMode: true });
    } catch {
      // ignore if audio mode can't be set
    }

    return () => {
      playersRef.current.forEach((player) => {
        try { player.release(); } catch {}
      });
      playersRef.current.clear();
    };
  }, [audioAvailable]);

  const playSound = useCallback(
    async (name: string) => {
      if (!audioAvailable || settings.soundLevel === 'silent') return;

      try {
        let player = playersRef.current.get(name);
        if (!player) {
          player = Audio.createAudioPlayer(SOUND_MAP[name]);
          playersRef.current.set(name, player);
        }

        player.volume = VOLUME_MAP[settings.soundLevel];
        player.seekTo(0);
        player.play();
      } catch {
        // gracefully handle sound errors
      }
    },
    [settings.soundLevel, audioAvailable]
  );

  const playComplete = useCallback(() => playSound('complete'), [playSound]);

  const playCelebration = useCallback(
    (animationId: AnimationId) => {
      const soundName = ANIMATION_SOUNDS[animationId];
      if (soundName) playSound(soundName);
    },
    [playSound]
  );

  return { playComplete, playCelebration };
}
