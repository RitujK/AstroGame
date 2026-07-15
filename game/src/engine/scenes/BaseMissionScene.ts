/* Base Mission Scene - Template for all missions */

import Phaser from 'phaser';
import type { MissionConfig } from '../phaserBoot';
import type { AgeBand } from '../../types/profile';

export abstract class BaseMissionScene extends Phaser.Scene {
  protected missionId!: number;
  protected ageBand!: AgeBand;
  protected onComplete!: (score?: number) => void;
  protected onPause!: () => void;

  protected objectiveText!: Phaser.GameObjects.Text;
  protected hintButton!: Phaser.GameObjects.Text;
  protected pauseButton!: Phaser.GameObjects.Text;
  
  protected isPaused: boolean = false;
  protected missionStartTime: number = 0;

  // Abstract methods that must be implemented by missions
  abstract create(): void;

  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  // Called by Phaser when scene starts
  preload(): void {
    // Load mission config
    const config = this.registry.get('missionConfig') as MissionConfig;
    if (config) {
      this.missionId = config.missionId;
      this.ageBand = config.ageBand;
      this.onComplete = config.onComplete;
      this.onPause = config.onPause;
    }

    this.missionStartTime = Date.now();
  }

  // Create HUD elements
  protected createHUD(): void {
    const { width } = this.scale;

    // Objective text (top-left)
    this.objectiveText = this.add.text(20, 20, '', {
      fontSize: '18px',
      fontFamily: 'Orbitron, monospace',
      color: '#64ffda',
      wordWrap: { width: width - 40 },
    }).setScrollFactor(0);

    // Pause button (top-right)
    this.pauseButton = this.add.text(width - 100, 20, '⏸ Pause', {
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
      backgroundColor: '#1a1a2e',
      padding: { x: 12, y: 8 },
    })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePause())
      .on('pointerover', () => this.pauseButton.setStyle({ backgroundColor: '#2a2a3e' }))
      .on('pointerout', () => this.pauseButton.setStyle({ backgroundColor: '#1a1a2e' }));

    // Hint button (below pause, if hints are available for age band)
    this.hintButton = this.add.text(width - 100, 60, '💡 Hint', {
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: '#ffd54f',
      backgroundColor: 'rgba(26, 26, 46, 0.8)',
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showHint())
      .on('pointerover', () => this.hintButton.setStyle({ backgroundColor: 'rgba(26, 26, 46, 1)' }))
      .on('pointerout', () => this.hintButton.setStyle({ backgroundColor: 'rgba(26, 26, 46, 0.8)' }))
      .setVisible(false); // Hidden by default, missions can show it if needed
  }

  protected updateObjective(text: string): void {
    if (this.objectiveText) {
      this.objectiveText.setText(text);
    }
  }

  protected togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.scene.pause();
      this.onPause();
    } else {
      this.scene.resume();
    }
  }

  protected showHint(): void {
    // Override in mission scenes to provide specific hints
    this.showGenericHint();
  }

  protected showGenericHint(): void {
    // Default generic hint display
    const hintText = this.add.text(this.scale.width / 2, this.scale.height / 2, 
      'Think carefully about the concept you\'re learning!', {
      fontSize: '20px',
      fontFamily: 'Inter, sans-serif',
      color: '#ffd54f',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 15 },
      align: 'center',
    }).setScrollFactor(0).setDepth(1000);

    this.tweens.add({
      targets: hintText,
      alpha: 0,
      duration: 3000,
      onComplete: () => hintText.destroy(),
    });
  }

  protected completeMission(score?: number): void {
    const duration = Date.now() - this.missionStartTime;
    console.log(`Mission ${this.missionId} completed in ${duration}ms`, score);
    
    this.onComplete(score);
    this.scene.stop();
  }

  protected getElapsedTime(): number {
    return Date.now() - this.missionStartTime;
  }
}

