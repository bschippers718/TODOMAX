import { LineId } from './types';
import { Theme } from './theme';

/**
 * Route lines: colour as category. The names are deliberately plain — the
 * user decides what "Red" means. Every colour already exists in the theme,
 * so lines never introduce a new hue to the screen.
 */
export const LINES: { id: LineId; name: string }[] = [
  { id: 'red', name: 'Red' },
  { id: 'blue', name: 'Blue' },
  { id: 'green', name: 'Green' },
  { id: 'orange', name: 'Orange' },
  { id: 'purple', name: 'Purple' },
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
    case 'yellow':
      return theme.gold;
    case 'grey':
      return theme.grey;
  }
}

/** Ink colour for a numeral sitting on a line swatch. */
export function onLineColor(line: LineId, theme: Theme): string {
  return line === 'yellow' ? theme.onGold : '#fff';
}
