/* Theme preference — Cosmic Cadets */

export type ThemeName = 'dark' | 'light';

const THEME_KEY = 'cosmic-cadets-theme';
const DEFAULT_THEME: ThemeName = 'dark';

export function getTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function toggleTheme(): ThemeName {
  const next: ThemeName = getTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

/** Apply saved theme as early as possible (call from main boot). */
export function initTheme(): ThemeName {
  const theme = getTheme();
  applyTheme(theme);
  return theme;
}
