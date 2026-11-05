import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Night runs from 21:00 until 07:00 local time. Keep in sync with index.html. */
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 7;

/** Browser bar colour per theme; matches --color-canvas in index.css. */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f7f2ec',
  dark: '#1f1a17',
};

export function isNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** Dark when the device asks for it, or at night regardless. */
export function resolveTheme(prefersDark: boolean, date: Date = new Date()): Theme {
  return prefersDark || isNight(date) ? 'dark' : 'light';
}

function prefersDarkQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
}

/**
 * Follows the device's dark mode and the time of day.
 * The time is only re-checked when the app comes back into view, so the
 * colours never flip in the middle of a session.
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(prefersDarkQuery()?.matches ?? false));

  useEffect(() => {
    const query = prefersDarkQuery();
    const update = () => setTheme(resolveTheme(query?.matches ?? false));
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  return theme;
}
