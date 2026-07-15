/* Shared diegetic Cosmic Cadets brand header */

import { navigate } from '../router';

export function diegeticBrandMarkup(): string {
  return `
    <button
      type="button"
      class="diegetic-brand js-to-landing"
      aria-label="Cosmic Cadets — go to landing page"
    >
      🚀 COSMIC CADETS
    </button>
  `;
}

export function diegeticHeaderMarkup(options?: { trailing?: string }): string {
  const trailing = options?.trailing
    ? `<nav class="diegetic-nav">${options.trailing}</nav>`
    : '';

  return `
    <header class="diegetic">
      ${diegeticBrandMarkup()}
      ${trailing}
    </header>
  `;
}

export function bindDiegeticBrand(root: HTMLElement, onLeave?: () => void): void {
  root.querySelectorAll('.js-to-landing').forEach((el) => {
    el.addEventListener('click', () => {
      onLeave?.();
      navigate({ name: 'landing' });
    });
  });
}
