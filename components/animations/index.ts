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
import { ErrandComplete, ERRAND_COMPLETE_DURATION } from './kit/ErrandComplete';
import { RouteDrawn, ROUTE_DRAWN_DURATION } from './kit/RouteDrawn';
import { StopwatchStop, STOPWATCH_STOP_DURATION } from './kit/StopwatchStop';
import { CarDash, CAR_DASH_DURATION } from './kit/CarDash';
import { CashRegister, CASH_REGISTER_DURATION } from './kit/CashRegister';

/** How long each celebration runs before the overlay auto-dismisses. */
export const ANIMATION_DURATIONS: Record<AnimationId, number> = {
  touchdown: 3800,
  scorePop: 2650,
  streakCombo: 2600,
  perfectStamp: 2600,
  footballSpike: 2950,
  swordSlash: 2800,
  rubberStamp: 2800,
  trophyRaise: 3300,
  singleConfetti: 3150,
  halftimeBand: 3350,
  instantReplay: 3200,
  interception: 3050,
  levelClear: 3500,
  pixelPowerUp: 3200,
  errandComplete: ERRAND_COMPLETE_DURATION,
  routeDrawn: ROUTE_DRAWN_DURATION,
  stopwatchStop: STOPWATCH_STOP_DURATION,
  carDash: CAR_DASH_DURATION,
  cashRegister: CASH_REGISTER_DURATION,
};

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
  errandComplete: ErrandComplete,
  routeDrawn: RouteDrawn,
  stopwatchStop: StopwatchStop,
  carDash: CarDash,
  cashRegister: CashRegister,
};
