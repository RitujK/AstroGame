/* Phaser Game Boot and Configuration */

import Phaser from 'phaser';
import type { AgeBand } from '../types/profile';
import { getMissionPalette } from './missionTheme';

export interface MissionConfig {
  missionId: number;
  ageBand: AgeBand;
  onComplete: (score?: number) => void;
  onPause: () => void;
}

let gameInstance: Phaser.Game | null = null;

export function createMissionGame(
  config: MissionConfig,
  SceneClass: new (...args: never[]) => Phaser.Scene
): Phaser.Game {
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
    backgroundColor: getMissionPalette().background,
    render: {
      antialias: true,
    },
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
    // Register the scene in the initial config. Adding it immediately after
    // `new Phaser.Game()` races Phaser's async renderer boot on slower/mobile
    // devices and can fail before a canvas is created.
    scene: [SceneClass],
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

