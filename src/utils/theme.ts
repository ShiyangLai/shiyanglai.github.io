// Day / night theme. Tailwind runs with `darkMode: 'class'`, so night mode is
// the `dark` class on <html>. The class is first set before paint by
// THEME_INIT_SCRIPT (injected in _document.tsx): the visitor's saved choice,
// else their OS setting. Afterwards it is flipped by the toggle button or the
// `theme` command, and components that paint with JS (canvas, inline-style
// palettes) subscribe via useIsDark().

import React from 'react';

export type Theme = 'day' | 'night';

const KEY = 'theme';
const EVENT = 'themechange';

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var n=t?t==='night':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',n);}catch(e){}})();`;

export const getTheme = (): Theme =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('dark')
    ? 'night'
    : 'day';

// `persist: false` is used when following the OS setting, so an explicit
// choice is only stored when the visitor makes one.
export const setTheme = (theme: Theme, persist = true): void => {
  document.documentElement.classList.toggle('dark', theme === 'night');
  if (persist) {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (e) {
      // no-op (storage unavailable, e.g. private mode)
    }
  }
  window.dispatchEvent(new Event(EVENT));
};

export const toggleTheme = (): void =>
  setTheme(getTheme() === 'night' ? 'day' : 'night');

// Keep following the OS setting until the visitor picks a theme explicitly.
// Returns a cleanup function (call from a top-level effect).
export const followSystemTheme = (): (() => void) => {
  if (!window.matchMedia) return () => undefined;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const on = (e: MediaQueryListEvent) => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch (err) {
      // no-op
    }
    if (!saved) setTheme(e.matches ? 'night' : 'day', false);
  };
  mq.addEventListener?.('change', on);
  return () => mq.removeEventListener?.('change', on);
};

export const useIsDark = (): boolean => {
  const [dark, setDark] = React.useState<boolean>(
    () => getTheme() === 'night',
  );
  React.useEffect(() => {
    const on = () => setDark(getTheme() === 'night');
    on();
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return dark;
};
