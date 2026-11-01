import React from 'react';
import { toggleTheme } from '../utils/theme';

// Day/night switch drawn as a tab on the terminal's top border. Which side is
// lit comes from Tailwind `dark:` classes (not React state), so the server-
// rendered markup is already correct and nothing flickers on hydration.
export const ThemeToggle = () => (
  <button
    type="button"
    onClick={toggleTheme}
    title="Switch between day and night mode (or type 'theme')"
    aria-label="Toggle day / night theme"
    className="absolute top-0 right-6 -translate-y-1/2 px-2 text-xs md:text-sm leading-none bg-light-background dark:bg-dark-background hover:underline focus:outline-none"
  >
    <span className="text-light-yellow dark:text-dark-gray dark:opacity-60">
      ☼ day
    </span>
    <span className="text-light-gray dark:text-dark-gray"> / </span>
    <span className="text-light-gray opacity-60 dark:text-dark-yellow dark:opacity-100">
      ☾ night
    </span>
  </button>
);

export default ThemeToggle;
