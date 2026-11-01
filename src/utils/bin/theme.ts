import { getTheme, setTheme, toggleTheme } from '../theme';

// `theme` toggles, `theme day` / `theme night` sets (same as the border switch).
export const theme = async (args: string[]): Promise<string> => {
  const arg = (args[0] ?? '').toLowerCase();
  if (arg === 'day' || arg === 'light') setTheme('day');
  else if (arg === 'night' || arg === 'dark') setTheme('night');
  else if (arg === '' || arg === 'toggle') toggleTheme();
  else return `theme: unknown mode '${args[0]}'. usage: theme [day|night]`;
  return getTheme() === 'night'
    ? 'Lights off. Switched to night mode.'
    : 'Good morning! Switched to day mode.';
};
