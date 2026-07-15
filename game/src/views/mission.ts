import { navigate } from '../router';
import type { Route } from '../router';
import { storage } from '../services/storage';
import { ageBandService } from '../services/ageBand';
import { createMissionGame, destroyMissionGame } from '../engine/phaserBoot';
import { showFeedbackModal } from '../components/FeedbackModal';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';
import type { MissionFeedback } from '../types/profile';

function missionChrome(missionLabel: string): string {
  return diegeticHeaderMarkup({
    trailing: `
      <button id="backHome" type="button" class="nav-btn" aria-label="Back to Mission Map">
        ← Mission Map
      </button>
      <span class="diegetic-mission-label">${missionLabel}</span>
    `,
  });
}

function wireMissionChrome(root: HTMLElement): void {
  bindDiegeticBrand(root, () => destroyMissionGame());
  root.querySelector('#backHome')?.addEventListener('click', () => {
    destroyMissionGame();
    navigate({ name: 'home' });
  });
}

export function renderMission(container: HTMLElement, route: Route): void {
  const id = parseInt(route.params?.id || '1', 10);

  // Clean up any previous Phaser instance
  destroyMissionGame();

  const profile = storage.getProfile();
  if (!profile) {
    navigate({ name: 'onboarding' });
    return;
  }

  ageBandService.setAgeBand(profile.ageBand);

  const root = document.createElement('div');
  root.className = 'screen screen-mission';

  const missionLoaders: Record<number, () => Promise<{ defaultScene: string; SceneClass: new (...args: never[]) => Phaser.Scene }>> = {
    1: () =>
      import('../engine/scenes/Mission01').then((m) => ({
        defaultScene: 'Mission01',
        SceneClass: m.Mission01Scene,
      })),
    2: () =>
      import('../engine/scenes/Mission02').then((m) => ({
        defaultScene: 'Mission02',
        SceneClass: m.Mission02Scene,
      })),
  };

  const loader = missionLoaders[id];
  if (!loader) {
    root.innerHTML = `
      ${missionChrome(`Mission ${id}`)}
      <main>
        <div class="mission-stub">
          <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">Mission ${id} - Coming Soon</p>
          <p class="text-secondary" style="font-size: var(--text-sm);">This mission will be available soon.</p>
        </div>
      </main>
    `;
    container.appendChild(root);
    wireMissionChrome(root);
    return;
  }

  root.innerHTML = `
    ${missionChrome(`Mission ${id}`)}
    <div id="phaser-container"></div>
  `;
  container.appendChild(root);
  wireMissionChrome(root);

  const game = createMissionGame({
    missionId: id,
    ageBand: profile.ageBand,
    onComplete: (score?: number) => handleMissionComplete(id, score),
    onPause: () => handleMissionPause(),
  });

  loader()
    .then(({ defaultScene, SceneClass }) => {
      if (!document.getElementById('phaser-container')) return;
      game.scene.add(defaultScene, SceneClass, true);
    })
    .catch((error) => {
      console.error(`Error loading Mission ${id}:`, error);
      destroyMissionGame();
      root.innerHTML = `
        ${missionChrome(`Mission ${id}`)}
        <main>
          <div class="mission-stub">
            <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">Error loading mission</p>
            <p class="text-secondary" style="font-size: var(--text-sm);">Please try again.</p>
          </div>
        </main>
      `;
      wireMissionChrome(root);
    });
}

function handleMissionComplete(missionId: number, score?: number): void {
  destroyMissionGame();

  storage.updateMissionProgress(missionId, {
    completed: true,
    bestScore: score,
  });

  showFeedbackModal({
    missionId,
    onComplete: (feedback: MissionFeedback) => {
      console.log('Mission complete with feedback:', feedback);
      setTimeout(() => {
        navigate({ name: 'home' });
      }, 500);
    },
  });
}

function handleMissionPause(): void {
  console.log('Mission paused');
}
