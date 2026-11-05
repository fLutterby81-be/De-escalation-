import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';
/** 'auto' follows the device and the time of day; the others are a manual choice. */
export type ThemeMode = 'auto' | Theme;

/** Night runs from 21:00 until 07:00 local time. Keep in sync with index.html. */
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 7;
/** localStorage key for the manual choice. Keep in sync with index.html. */
export const THEME_STORAGE_KEY = 'de-escalation:theme';

/** Browser bar colour per theme; matches --color-canvas in index.css. */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f7f2ec',
  dark: '#1f1a17',
};

export function isNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** The automatic theme: dark when the device asks for it, or at night. */
export function resolveTheme(prefersDark: boolean, date: Date = new Date()): Theme {
  return prefersDark || isNight(date) ? 'dark' : 'light';
}

/**
 * The toggle always flips what is on screen. When the result is what the
 * automatic rule would pick anyway, the app goes back to automatic, so the
 * night mode keeps working unless someone deliberately chose otherwise.
 */
export function nextThemeMode(current: Theme, automatic: Theme): ThemeMode {
  const target: Theme = current === 'dark' ? 'light' : 'dark';
  return target === automatic ? 'auto' : target;
}

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be blocked; fall back to automatic.
  }
  return 'auto';
}

function saveMode(mode: ThemeMode) {
  try {
    if (mode === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Not critical: the choice simply is not remembered.
  }
}

function prefersDarkQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
}

/**
 * Current theme plus a toggle. The automatic theme follows the device's
 * dark mode immediately, but the time is only re-checked when the app comes
 * back into view, so the colours never flip by themselves mid-session.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [automatic, setAutomatic] = useState<Theme>(() => resolveTheme(prefersDarkQuery()?.matches ?? false));
  const theme = mode === 'auto' ? automatic : mode;

  useEffect(() => {
    const query = prefersDarkQuery();
    const update = () => setAutomatic(resolveTheme(query?.matches ?? false));
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };

    query?.addEventListener('change', update);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      query?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Layout effect so the class changes in the same commit as the state,
  // which the view transition below relies on.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = nextThemeMode(theme, automatic);
    const apply = () => {
      flushSync(() => setMode(next));
      saveMode(next);
    };

    // Cross-fade instead of flashing the whole screen, where supported.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if ('startViewTransition' in document && !reduceMotion) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }, [theme, automatic]);

  return { theme, toggleTheme };
}
