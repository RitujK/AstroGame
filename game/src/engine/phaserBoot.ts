/* Phaser Game Boot and Configuration */

import Phaser from 'phaser';
import type { AgeBand } from '../types/profile';

export interface MissionConfig {
  missionId: number;
  ageBand: AgeBand;
  onComplete: (score?: number) => void;
  onPause: () => void;
}

let gameInstance: Phaser.Game | null = null;

export function createMissionGame(config: MissionConfig): Phaser.Game {
  // Destroy existing game if present
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'phaser-container',
    backgroundColor: '#0a0e27',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [], // Scenes will be registered by individual missions
  };

  gameInstance = new Phaser.Game(gameConfig);

  // Store mission config in game registry for scenes to access
  gameInstance.registry.set('missionConfig', config);

  return gameInstance;
}

export function destroyMissionGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

export function getGameInstance(): Phaser.Game | null {
  return gameInstance;
}

