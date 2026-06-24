import { ComponentType } from 'react';
import { AnimationId, CelebrationAnimationProps } from '../../lib/types';
import { Touchdown } from './Touchdown';
import { ScorePop } from './ScorePop';
import { StreakCombo } from './StreakCombo';
import { PerfectStamp } from './PerfectStamp';
import { FootballSpike } from './FootballSpike';
import { SwordSlash } from './SwordSlash';
import { RubberStamp } from './RubberStamp';
import { TrophyRaise } from './TrophyRaise';
import { SingleConfetti } from './SingleConfetti';
import { HalftimeBand } from './HalftimeBand';
import { InstantReplay } from './InstantReplay';
import { Interception } from './Interception';
import { LevelClear } from './LevelClear';
import { PixelPowerUp } from './PixelPowerUp';

export const animationRegistry: Record<
  AnimationId,
  ComponentType<CelebrationAnimationProps>
> = {
  touchdown: Touchdown,
  scorePop: ScorePop,
  streakCombo: StreakCombo,
  perfectStamp: PerfectStamp,
  footballSpike: FootballSpike,
  swordSlash: SwordSlash,
  rubberStamp: RubberStamp,
  trophyRaise: TrophyRaise,
  singleConfetti: SingleConfetti,
  halftimeBand: HalftimeBand,
  instantReplay: InstantReplay,
  interception: Interception,
  levelClear: LevelClear,
  pixelPowerUp: PixelPowerUp,
};
