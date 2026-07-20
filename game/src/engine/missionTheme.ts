/* Mission color palette — mirrors CSS tokens (tokens.css) so Phaser scenes
 * match whichever theme (dark | light) is active on the landing page / Settings.
 * Only UI chrome (HUD, panels, decorative accents) uses this palette —
 * naturalistic renders (Earth photo, Moon shading) stay realistic in both themes.
 */

import { getTheme } from '../services/theme';
import type { ThemeName } from '../services/theme';

export interface MissionPalette {
  theme: ThemeName;
  /** Camera / canvas background */
  background: string;
  backgroundNum: number;
  spaceLightNum: number;
  /** CSS background for HUD buttons/panels (rgba string) */
  panelChrome: string;
  panelChromeHover: string;
  panelChromeActive: string;
  primary: string;
  primaryNum: number;
  secondary: string;
  secondaryNum: number;
  accent: string;
  accentNum: number;
  alert: string;
  alertNum: number;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  panelBgNum: number;
  panelBgAlpha: number;
  panelBorderNum: number;
  panelBorderAlpha: number;
  borderNum: number;
  borderAlpha: number;
  btnOnPrimary: string;
}

const DARK: MissionPalette = {
  theme: 'dark',
  background: '#0a0e27',
  backgroundNum: 0x0a0e27,
  spaceLightNum: 0x1a1a2e,
  panelChrome: 'rgba(26, 26, 46, 0.85)',
  panelChromeHover: 'rgba(42, 42, 62, 0.95)',
  panelChromeActive: 'rgba(26, 26, 46, 0.6)',
  primary: '#64ffda',
  primaryNum: 0x64ffda,
  secondary: '#4fc3f7',
  secondaryNum: 0x4fc3f7,
  accent: '#ffd54f',
  accentNum: 0xffd54f,
  alert: '#ff6b6b',
  alertNum: 0xff6b6b,
  textPrimary: '#ffffff',
  textSecondary: '#b0bec5',
  textTertiary: '#78909c',
  panelBgNum: 0x0a0e27,
  panelBgAlpha: 0.88,
  panelBorderNum: 0x64ffda,
  panelBorderAlpha: 0.35,
  borderNum: 0xffffff,
  borderAlpha: 0.1,
  btnOnPrimary: '#050711',
};

const LIGHT: MissionPalette = {
  theme: 'light',
  background: '#fafafa',
  backgroundNum: 0xfafafa,
  spaceLightNum: 0xf3f4f8,
  panelChrome: 'rgba(255, 255, 255, 0.9)',
  panelChromeHover: 'rgba(255, 236, 214, 0.95)',
  panelChromeActive: 'rgba(255, 255, 255, 0.7)',
  primary: '#ff6b00',
  primaryNum: 0xff6b00,
  secondary: '#e11845',
  secondaryNum: 0xe11845,
  accent: '#ffcc00',
  accentNum: 0xffcc00,
  alert: '#d50000',
  alertNum: 0xd50000,
  textPrimary: '#141028',
  textSecondary: '#4a4560',
  textTertiary: '#6e6888',
  panelBgNum: 0xffffff,
  panelBgAlpha: 0.92,
  panelBorderNum: 0xe11845,
  panelBorderAlpha: 0.18,
  borderNum: 0x141028,
  borderAlpha: 0.12,
  btnOnPrimary: '#ffffff',
};

export function getMissionPalette(theme: ThemeName = getTheme()): MissionPalette {
  return theme === 'light' ? LIGHT : DARK;
}
