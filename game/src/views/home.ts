import { navigate } from '../router';
import { storage } from '../services/storage';
import { MISSIONS, isMissionUnlocked, padMissionId } from '../data/missions';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';

export function renderHome(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'screen screen-home';

  const profile = storage.getProfile();
  const callsign = profile?.callsign || 'Cadet ID';
  const save = storage.getSaveData();

  const isMissionComplete = (id: number): boolean => Boolean(save?.missions[id]?.completed);

  const stops = MISSIONS.map((mission, index) => {
    const progress = save?.missions[mission.id];
    const completed = Boolean(progress?.completed);
    const unlocked = isMissionUnlocked(mission.id, isMissionComplete);
    const bestScore = progress?.bestScore;
    const side = index % 2 === 0 ? 'left' : 'right';

    let statusLabel: string;
    if (completed) {
      statusLabel = bestScore != null ? `Badge earned · Best ${bestScore}` : 'Badge earned';
    } else if (unlocked) {
      statusLabel = 'Tap to launch';
    } else {
      statusLabel = `Complete Mission ${padMissionId(mission.id - 1)} to unlock`;
    }

    const stateClasses = [
      completed ? 'is-complete' : '',
      !unlocked ? 'is-locked' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const stopInner = `
          <span class="mission-stop-connector" aria-hidden="true"></span>
          <span class="mission-stop-art-wrap">
            <img
              class="mission-stop-art"
              src="${mission.art}"
              alt=""
              width="280"
              height="280"
              loading="${index < 3 ? 'eager' : 'lazy'}"
            />
            <span class="mission-stop-num">${padMissionId(mission.id)}</span>
            ${completed ? '<span class="mission-stop-badge" aria-hidden="true">✦</span>' : ''}
            ${!unlocked ? '<span class="mission-stop-lock" aria-hidden="true">🔒</span>' : ''}
          </span>
          <span class="mission-stop-meta">
            <span class="mission-stop-concept">${mission.concept}</span>
            <span class="mission-stop-title">${mission.title}</span>
            <span class="mission-stop-teaser">${mission.teaser}</span>
            <span class="mission-stop-status">${statusLabel}</span>
          </span>`;

    if (unlocked) {
      return `
      <li class="mission-stop mission-stop--${side}${stateClasses ? ` ${stateClasses}` : ''}">
        <button
          type="button"
          class="mission-stop-btn"
          data-mission="${mission.id}"
          aria-label="Open Mission ${mission.id}: ${mission.title}"
        >
          ${stopInner}
        </button>
      </li>`;
    }

    return `
      <li class="mission-stop mission-stop--${side}${stateClasses ? ` ${stateClasses}` : ''}">
        <div class="mission-stop-btn mission-stop-btn--locked" aria-label="Mission ${mission.id}: ${mission.title} — locked">
          ${stopInner}
        </div>
      </li>`;
  }).join('');

  root.innerHTML = `
    ${diegeticHeaderMarkup({
      trailing: `
        <button id="toProfile" type="button" aria-label="Open Profile" class="nav-btn">📋 ${callsign}</button>
        <button id="toSettings" type="button" aria-label="Open Settings" class="nav-btn">⚙️ Settings</button>
      `,
    })}
    <main class="mission-map-main">
      <div class="mission-map-intro">
        <p class="mission-map-eyebrow">Starlight Saga</p>
        <h2 class="mission-map-heading">Mission Map</h2>
        <p class="mission-map-sub">Ten flights. One cosmos. Follow the glowing trail — each stop unlocks after the last.</p>
      </div>
      <section class="mission-map" aria-label="Mission Map">
        <div class="mission-map-nebula" aria-hidden="true"></div>
        <div class="mission-map-stars" aria-hidden="true"></div>
        <div class="mission-map-spine" aria-hidden="true"></div>
        <ol class="mission-map-trail">
          ${stops}
        </ol>
      </section>
    </main>
  `;

  bindDiegeticBrand(root);

  root.querySelector('#toProfile')?.addEventListener('click', () => {
    navigate({ name: 'profile' });
  });

  root.querySelector('#toSettings')?.addEventListener('click', () => {
    navigate({ name: 'settings' });
  });

  root.querySelectorAll('.mission-stop-btn[data-mission]').forEach((el) => {
    el.addEventListener('click', () => {
      const missionId = (el as HTMLElement).getAttribute('data-mission') || '1';
      navigate({ name: 'mission', params: { id: missionId } });
    });
  });

  container.appendChild(root);
}
