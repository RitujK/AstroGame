import { navigate } from '../router';
import { bindThemeToggle, themeToggleMarkup } from '../components/themeToggle';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';
import { storage } from '../services/storage';

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

        <section class="settings-privacy" aria-labelledby="privacyHeading">
          <h3 id="privacyHeading" class="settings-section-title">Parent &amp; Privacy</h3>
          <p class="settings-section-lede">
            Export or delete all cadet progress stored on this device. No data is sent to third parties.
          </p>
          <div class="settings-privacy-actions">
            <button type="button" id="exportData" class="settings-action-btn">Export save data</button>
            <button type="button" id="deleteData" class="settings-action-btn settings-action-btn--danger">
              Delete all data
            </button>
          </div>
        </section>
      </div>
    </main>
  `;
  bindDiegeticBrand(root);
  root.querySelector('#backHome')?.addEventListener('click', () => navigate({ name: 'home' }));
  bindThemeToggle(root);

  root.querySelector('#exportData')?.addEventListener('click', () => {
    const json = storage.exportData();
    if (!json || json === 'null') {
      alert('No save data found on this device.');
      return;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cosmic-cadets-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  root.querySelector('#deleteData')?.addEventListener('click', () => {
    const confirmed = window.confirm(
      'Delete all Cosmic Cadets data on this device? This removes your profile, mission progress, and feedback. This cannot be undone.',
    );
    if (!confirmed) return;

    storage.deleteAll();
    navigate({ name: 'landing' });
  });

  container.appendChild(root);
}
