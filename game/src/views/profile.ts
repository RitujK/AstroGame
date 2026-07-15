import { navigate } from '../router';
import { storage } from '../services/storage';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';

export function renderProfile(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'screen screen-profile';
  
  const profile = storage.getProfile();
  
  root.innerHTML = `
    ${diegeticHeaderMarkup({
      trailing: `
        <button id="backHome" type="button" class="nav-btn" aria-label="Back to Map">← Mission Map</button>
        <span class="diegetic-mission-label">📋 Cadet ID</span>
      `,
    })}
    <main>
      <div class="cadet-card" aria-label="Cosmic Cadet ID">
        <div class="avatar" aria-hidden="true"></div>
        <div class="fields">
          <div>
            <strong>Callsign:</strong> 
            <span id="callsign" class="text-secondary">${profile?.callsign || '—'}</span>
          </div>
          <div>
            <strong>Age Band:</strong> 
            <span id="ageBand" class="text-secondary">${profile?.ageBand ? getAgeBandLabel(profile.ageBand) : '—'}</span>
          </div>
          <div>
            <strong>Email:</strong> 
            <span class="text-secondary">${profile?.email || '—'}</span>
          </div>
          <div style="margin-top: var(--space-lg);">
            <strong style="display: block; margin-bottom: var(--space-md);">Mission Badges:</strong>
            <div class="badges" aria-label="Mission Badges">
              ${Array.from({ length: 10 }, (_, i) => i + 1)
                .map((n) => {
                  const earned = profile?.badges.includes(n) || false;
                  return `<div class="badge ${earned ? 'earned' : ''}" aria-label="Mission ${n} badge ${earned ? 'earned' : 'not earned'}">${earned ? '✓' : n}</div>`;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
  bindDiegeticBrand(root);
  root.querySelector('#backHome')?.addEventListener('click', () => navigate({ name: 'home' }));
  container.appendChild(root);
}

function getAgeBandLabel(ageBand: string): string {
  const labels: Record<string, string> = {
    '5-7': 'Little Sparks (5-7)',
    '8-11': 'Star Gazers (8-11)',
    '12-15': 'Galaxy Explorers (12-15)',
  };
  return labels[ageBand] || ageBand;
}


