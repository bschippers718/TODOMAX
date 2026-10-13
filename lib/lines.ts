import { LineId } from './types';
import { Theme } from './theme';

/**
 * Route lines: colour as category. The names are deliberately plain — the
 * user decides what "Red" means. Each one is a theme colour, so a line
 * never picks a one-off hue.
 */
export const LINES: { id: LineId; name: string }[] = [
  { id: 'red', name: 'Red' },
  { id: 'blue', name: 'Blue' },
  { id: 'green', name: 'Green' },
  { id: 'orange', name: 'Orange' },
  { id: 'purple', name: 'Purple' },
  { id: 'baby', name: 'Baby Blue' },
  { id: 'yellow', name: 'Yellow' },
  { id: 'grey', name: 'Grey' },
];

export function lineColor(line: LineId, theme: Theme): string {
  switch (line) {
    case 'red':
      return theme.accent;
    case 'blue':
      return theme.blue;
    case 'green':
      return theme.green;
    case 'orange':
      return theme.orange;
    case 'purple':
      return theme.purple;
    case 'baby':
      return theme.baby;
    case 'yellow':
      return theme.gold;
    case 'grey':
      return theme.grey;
  }
}

/** Ink colour for a numeral sitting on a line swatch. */
export function onLineColor(line: LineId, theme: Theme): string {
  if (line === 'yellow') return theme.onGold;
  // Baby blue is a light fill in every theme, so the numeral stays dark.
  if (line === 'baby') return '#102028';
  return '#fff';
}
