/* Base Mission Scene - Template for all missions */

import Phaser from 'phaser';
import type { MissionConfig } from '../phaserBoot';
import type { AgeBand } from '../../types/profile';
import { getMissionPalette, type MissionPalette } from '../missionTheme';

export abstract class BaseMissionScene extends Phaser.Scene {
  protected missionId!: number;
  protected ageBand!: AgeBand;
  protected onComplete!: (score?: number) => void;
  protected onPause!: () => void;

  /** Current theme palette (dark | light), mirrors the app-wide theme toggle. */
  protected palette!: MissionPalette;

  protected objectiveText!: Phaser.GameObjects.Text;
  protected hintButton!: Phaser.GameObjects.Text;
  protected pauseButton!: Phaser.GameObjects.Text;
  
  protected isPaused: boolean = false;
  protected missionStartTime: number = 0;

  private themeChangeHandler = (): void => this.refreshTheme();

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

    this.palette = getMissionPalette();
    this.missionStartTime = Date.now();

    window.addEventListener('themechange', this.themeChangeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('themechange', this.themeChangeHandler);
      this.scale.off('resize', this.handleBaseResize, this);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      window.removeEventListener('themechange', this.themeChangeHandler);
      this.scale.off('resize', this.handleBaseResize, this);
    });
  }

  /** Re-reads the active theme and repaints shared chrome; missions can override onThemeChange for their own visuals. */
  protected refreshTheme(): void {
    this.palette = getMissionPalette();
    this.cameras.main.setBackgroundColor(this.palette.background);
    if (this.pauseButton) {
      this.pauseButton.setStyle({ backgroundColor: this.palette.panelChrome, color: this.palette.textPrimary });
    }
    if (this.hintButton) {
      this.hintButton.setStyle({ color: this.palette.accent });
    }
    if (this.objectiveText) {
      this.objectiveText.setColor(this.palette.primary);
    }
    this.onThemeChange();
  }

  /** Override to repaint mission-specific visuals when the theme changes live. */
  protected onThemeChange(): void {}

  /** Override to reflow mission-specific layout when the canvas resizes. */
  protected onSceneResize(_width: number, _height: number): void {}

  /**
   * Use instead of `this.add.text` everywhere. Renders the text's backing canvas at the
   * display's real pixel ratio — without this, text looks pixelated/frayed at the edges
   * (most visible against light/white backgrounds where soft blur has nowhere to hide).
   */
  protected addText(
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      resolution: window.devicePixelRatio || 1,
      ...style,
    });
  }

  // Create HUD elements
  protected createHUD(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor(this.palette.background);

    // Objective text (top-left)
    this.objectiveText = this.addText(20, 20, '', {
      fontSize: '18px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
      wordWrap: { width: width - 40 },
    }).setScrollFactor(0);

    // Pause button — disabled for now (not needed yet). Re-enable by uncommenting
    // this block and moving the Hint button back down to its original y (60).
    // this.pauseButton = this.addText(width - 100, 20, '⏸ Pause', {
    //   fontSize: '16px',
    //   fontFamily: 'Inter, sans-serif',
    //   color: this.palette.textPrimary,
    //   backgroundColor: this.palette.panelChrome,
    //   padding: { x: 12, y: 8 },
    // })
    //   .setScrollFactor(0)
    //   .setInteractive({ useHandCursor: true })
    //   .on('pointerdown', () => this.togglePause())
    //   .on('pointerover', () => this.pauseButton.setStyle({ backgroundColor: this.palette.panelChromeHover }))
    //   .on('pointerout', () => this.pauseButton.setStyle({ backgroundColor: this.palette.panelChrome }));

    // Hint button (top-right; takes the Pause button's slot while pause is disabled)
    this.hintButton = this.addText(width - 100, 20, '💡 Hint', {
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.accent,
      backgroundColor: this.palette.panelChromeActive,
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showHint())
      .on('pointerover', () => this.hintButton.setStyle({ backgroundColor: this.palette.panelChromeHover }))
      .on('pointerout', () => this.hintButton.setStyle({ backgroundColor: this.palette.panelChromeActive }))
      .setVisible(false); // Hidden by default, missions can show it if needed

    this.scale.on('resize', this.handleBaseResize, this);
  }

  private handleBaseResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    if (this.objectiveText) {
      this.objectiveText.setStyle({ wordWrap: { width: width - 40 } });
    }
    if (this.pauseButton) {
      this.pauseButton.setPosition(width - 100, 20);
    }
    if (this.hintButton) {
      this.hintButton.setPosition(width - 100, 20);
    }
    this.onSceneResize(width, height);
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
    const hintText = this.addText(this.scale.width / 2, this.scale.height / 2, 
      'Think carefully about the concept you\'re learning!', {
      fontSize: '20px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.accent,
      backgroundColor: this.palette.panelChrome,
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
