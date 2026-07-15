/** Shared theme toggle control (landing + settings). */

import { getTheme, toggleTheme, type ThemeName } from '../services/theme';

export function themeToggleMarkup(extraClass = ''): string {
  return `
    <button
      type="button"
      class="theme-toggle js-theme-toggle ${extraClass}"
      aria-label="Switch color theme"
      aria-pressed="false"
    >
      <span class="theme-toggle-track" aria-hidden="true">
        <span class="theme-toggle-thumb"></span>
      </span>
      <span class="theme-toggle-label">
        <span class="theme-toggle-label-dark">Dark</span>
        <span class="theme-toggle-label-light">Bright</span>
      </span>
    </button>
  `;
}

export function syncThemeToggle(root: ParentNode = document): void {
  const theme = getTheme();
  root.querySelectorAll('.js-theme-toggle').forEach((el) => {
    const btn = el as HTMLButtonElement;
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    btn.dataset.theme = theme;
    btn.title = theme === 'light' ? 'Switch to dark theme' : 'Switch to bright theme';
  });
}

export function bindThemeToggle(root: ParentNode): void {
  syncThemeToggle(root);
  root.querySelectorAll('.js-theme-toggle').forEach((el) => {
    el.addEventListener('click', () => {
      toggleTheme();
      syncThemeToggle(root);
    });
  });
}

export function themeLabel(theme: ThemeName): string {
  return theme === 'light' ? 'Bright' : 'Dark';
}
