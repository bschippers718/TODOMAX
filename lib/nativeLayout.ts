import { LayoutAnimation, LayoutAnimationConfig, Platform } from 'react-native';

/**
 * Animate the next layout pass with the system's own UIKit animation.
 * No springs, no fades we author ourselves: the list reflows the way a
 * native table view does. Call it right before the state change.
 */
export function animateNextLayout(reduceMotion = false) {
  if (reduceMotion || Platform.OS !== 'ios') return;
  LayoutAnimation.configureNext(REFLOW);
}

// Update-only: rows that already exist slide to their new frames. New rows
// simply take their place (task rows animate their own opacity, so letting
// UIKit fade them too would fight over the same property).
const REFLOW: LayoutAnimationConfig = {
  duration: 300,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};
