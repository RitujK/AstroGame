import { navigate } from '../router';
import { bindThemeToggle, themeToggleMarkup } from '../components/themeToggle';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';

export function renderSettings(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'screen screen-settings';
  root.innerHTML = `
    ${diegeticHeaderMarkup({
      trailing: `
        <button id="backHome" type="button" class="nav-btn" aria-label="Back to Map">← Mission Map</button>
        <span class="diegetic-mission-label">⚙️ Settings</span>
      `,
    })}
    <main>
      <div class="settings-list">
        <div class="settings-row settings-row--theme">
          <span>Color theme</span>
          ${themeToggleMarkup()}
        </div>
        <label>
          <span>Subtitles</span>
          <input type="checkbox" id="subtitles" aria-label="Enable subtitles">
        </label>
        <label>
          <span>Text-to-Speech</span>
          <input type="checkbox" id="tts" aria-label="Enable text-to-speech">
        </label>
        <label>
          <span>Master Volume</span>
          <input type="range" min="0" max="1" step="0.05" id="volume" value="0.8" aria-label="Master volume">
        </label>
      </div>
    </main>
  `;
  bindDiegeticBrand(root);
  root.querySelector('#backHome')?.addEventListener('click', () => navigate({ name: 'home' }));
  bindThemeToggle(root);
  container.appendChild(root);
}
