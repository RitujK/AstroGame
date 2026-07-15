/* Mission 2: Moon Phases */

import { BaseMissionScene } from './BaseMissionScene';
import { ageBandService } from '../../services/ageBand';

type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Full Moon'
  | 'Waning Crescent';

interface PhaseChallenge {
  name: MoonPhaseName;
  /** Ideal orbit angle in degrees (0 = moon toward sun / new moon side) */
  targetAngle: number;
}

const PHASE_CHALLENGES: PhaseChallenge[] = [
  { name: 'New Moon', targetAngle: 0 },
  { name: 'Waxing Crescent', targetAngle: 45 },
  { name: 'First Quarter', targetAngle: 90 },
  { name: 'Full Moon', targetAngle: 180 },
  { name: 'Waning Crescent', targetAngle: 315 },
];

const ANGLE_TOLERANCE = 18;

export class Mission02Scene extends BaseMissionScene {
  private earth!: Phaser.GameObjects.Image;
  private moonContainer!: Phaser.GameObjects.Container;
  private moonBody!: Phaser.GameObjects.Graphics;
  private moonShadow!: Phaser.GameObjects.Graphics;
  private orbitRing!: Phaser.GameObjects.Graphics;
  private targetText!: Phaser.GameObjects.Text;
  private phasePreview!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private lockButton!: Phaser.GameObjects.Text;
  private sliderTrack!: Phaser.GameObjects.Graphics;
  private sliderKnob!: Phaser.GameObjects.Graphics;

  private centerX = 0;
  private centerY = 0;
  private orbitRadius = 0;
  private moonAngle = 135; // degrees, start away from first target
  private currentChallenge = 0;
  private completedCount = 0;
  private isDraggingSlider = false;
  private isComplete = false;

  create(): void {
    this.missionId = 2;
    const { width, height } = this.scale;
    this.centerX = width / 2;
    this.centerY = height / 2 - 30;
    this.orbitRadius = Math.min(width, height) * 0.28;

    this.createEarthTexture();
    this.createHUD();
    this.updateObjective('Match 5 moon phases. Drag the Moon on its orbit or use the slider, then tap Lock In.');

    if (ageBandService.getHintFrequency() !== 'none') {
      this.hintButton.setVisible(true);
    }

    // Sun indicator (fixed to the right)
    this.add
      .text(this.centerX + this.orbitRadius + 80, this.centerY, '☀️ Sun', {
        fontSize: '22px',
        fontFamily: 'Inter, sans-serif',
        color: '#ffd54f',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);

    // Orbit path
    this.orbitRing = this.add.graphics();
    this.drawOrbitRing();

    // Earth
    this.earth = this.add.image(this.centerX, this.centerY, 'earth_m2');
    this.earth.setDisplaySize(100, 100);
    this.earth.setDepth(10);

    // Moon (container for body + shadow)
    this.moonContainer = this.add.container(0, 0);
    this.moonBody = this.add.graphics();
    this.moonShadow = this.add.graphics();
    this.moonContainer.add([this.moonBody, this.moonShadow]);
    this.moonContainer.setDepth(20);
    this.moonContainer.setSize(40, 40);
    this.moonContainer.setInteractive(
      new Phaser.Geom.Circle(0, 0, 28),
      Phaser.Geom.Circle.Contains
    );
    this.input.setDraggable(this.moonContainer);

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject !== this.moonContainer || this.isComplete) return;
      const container = gameObject as Phaser.GameObjects.Container;
      const dx = container.x - this.centerX;
      const dy = container.y - this.centerY;
      this.moonAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      if (this.moonAngle < 0) this.moonAngle += 360;
      this.syncMoonPosition();
      this.updateSliderKnob();
    });

    // Target panel
    this.targetText = this.add
      .text(20, 70, '', {
        fontSize: '18px',
        fontFamily: 'Orbitron, monospace',
        color: '#64ffda',
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.phasePreview = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.progressText = this.add
      .text(width - 20, 70, '', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: '#b0bec5',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // Lock in button
    this.lockButton = this.add
      .text(this.centerX, height - 120, '🔒 Lock In Phase', {
        fontSize: '20px',
        fontFamily: 'Orbitron, monospace',
        color: '#0a0e27',
        backgroundColor: '#64ffda',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tryLockIn())
      .on('pointerover', () => this.lockButton.setStyle({ backgroundColor: '#4fc3f7' }))
      .on('pointerout', () => this.lockButton.setStyle({ backgroundColor: '#64ffda' }));

    // Orbit slider
    const sliderY = height - 55;
    const sliderWidth = Math.min(width - 80, 400);
    const sliderX = (width - sliderWidth) / 2;

    this.sliderTrack = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.sliderKnob = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.add
      .text(width / 2, sliderY - 22, 'Orbit slider', {
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        color: '#78909c',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.drawSlider(sliderX, sliderY, sliderWidth);

    const sliderHitArea = this.add
      .rectangle(sliderX + sliderWidth / 2, sliderY, sliderWidth, 30, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    sliderHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.isDraggingSlider = true;
      this.setAngleFromSliderX(pointer.x, sliderX, sliderWidth);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingSlider || this.isComplete) return;
      this.setAngleFromSliderX(pointer.x, sliderX, sliderWidth);
    });

    this.input.on('pointerup', () => {
      this.isDraggingSlider = false;
    });

    this.syncMoonPosition();
    this.updateChallengeUI();
  }

  private createEarthTexture(): void {
    if (this.textures.exists('earth_m2')) return;

    const size = 128;
    const canvas = this.textures.createCanvas('earth_m2', size, size);
    if (!canvas) return;

    const ctx = canvas.getContext();
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    const grad = ctx.createRadialGradient(cx - 10, cy - 10, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(0.5, '#1a5490');
    grad.addColorStop(1, '#0a2a50');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#2d5016';
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy - 10, 22, 18, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20, cy + 15, 18, 14, -0.2, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private drawOrbitRing(): void {
    this.orbitRing.clear();
    this.orbitRing.lineStyle(2, 0x64ffda, 0.35);
    this.orbitRing.strokeCircle(this.centerX, this.centerY, this.orbitRadius);
  }

  private drawSlider(sliderX: number, sliderY: number, sliderWidth: number): void {
    this.sliderTrack.clear();
    this.sliderTrack.fillStyle(0x1a1a2e, 0.9);
    this.sliderTrack.fillRoundedRect(sliderX, sliderY - 6, sliderWidth, 12, 6);
    this.sliderTrack.lineStyle(1, 0x64ffda, 0.5);
    this.sliderTrack.strokeRoundedRect(sliderX, sliderY - 6, sliderWidth, 12, 6);
    this.updateSliderKnob(sliderX, sliderY, sliderWidth);
  }

  private updateSliderKnob(sliderX?: number, sliderY?: number, sliderWidth?: number): void {
    const { width, height } = this.scale;
    const sx = sliderX ?? (width - Math.min(width - 80, 400)) / 2;
    const sy = sliderY ?? height - 55;
    const sw = sliderWidth ?? Math.min(width - 80, 400);

    const t = this.moonAngle / 360;
    const knobX = sx + t * sw;

    this.sliderKnob.clear();
    this.sliderKnob.fillStyle(0x64ffda, 1);
    this.sliderKnob.fillCircle(knobX, sy, 14);
    this.sliderKnob.lineStyle(2, 0xffffff, 0.8);
    this.sliderKnob.strokeCircle(knobX, sy, 14);
  }

  private setAngleFromSliderX(pointerX: number, sliderX: number, sliderWidth: number): void {
    const t = Phaser.Math.Clamp((pointerX - sliderX) / sliderWidth, 0, 1);
    this.moonAngle = t * 360;
    this.syncMoonPosition();
    this.updateSliderKnob(sliderX, this.scale.height - 55, sliderWidth);
  }

  private syncMoonPosition(): void {
    const rad = Phaser.Math.DegToRad(this.moonAngle);
    const x = this.centerX + Math.cos(rad) * this.orbitRadius;
    const y = this.centerY + Math.sin(rad) * this.orbitRadius;
    this.moonContainer.setPosition(x, y);
    this.drawMoonPhase();
  }

  /** Draw moon disc with lit/shadow based on sun from the right (+X) */
  private drawMoonPhase(): void {
    const moonR = 22;
    this.moonBody.clear();
    this.moonShadow.clear();

    // Moon base (grey)
    this.moonBody.fillStyle(0xc0c0c0, 1);
    this.moonBody.fillCircle(0, 0, moonR);
    this.moonBody.lineStyle(1, 0x888888, 0.5);
    this.moonBody.strokeCircle(0, 0, moonR);

    // Sun is to the right of Earth; moon lit side faces sun direction from moon's position
    // Phase angle: 0=new (dark facing earth), 180=full (all lit facing earth)
    const phaseAngle = Phaser.Math.DegToRad(this.moonAngle);
    const litDirection = Math.cos(phaseAngle); // -1 to 1

    if (Math.abs(litDirection) > 0.95) {
      // Near new or full
      if (litDirection > 0) {
        // New moon — mostly dark (sun side away from earth viewer... simplified: dark disk)
        this.moonShadow.fillStyle(0x1a1a2e, 0.92);
        this.moonShadow.fillCircle(0, 0, moonR);
      }
      // Full moon — no shadow overlay
      return;
    }

    // Draw shadow as half-plane clip approximation using overlapping circle
    const shadowOffset = -litDirection * moonR * 0.85;
    this.moonShadow.fillStyle(0x1a1a2e, 0.88);
    this.moonShadow.fillCircle(shadowOffset, 0, moonR * 0.98);
  }

  private getCurrentChallenge(): PhaseChallenge {
    return PHASE_CHALLENGES[this.currentChallenge];
  }

  private angleMatchesTarget(target: number): boolean {
    let diff = Math.abs(this.moonAngle - target);
    if (diff > 180) diff = 360 - diff;
    return diff <= ANGLE_TOLERANCE;
  }

  private updateChallengeUI(): void {
    const challenge = this.getCurrentChallenge();
    this.targetText.setText(`Target: ${challenge.name}`);
    this.progressText.setText(`${this.completedCount} / ${PHASE_CHALLENGES.length} matched`);

    // Mini preview of target phase
    this.phasePreview.clear();
    const px = 20;
    const py = 120;
    const pr = 28;
    this.phasePreview.fillStyle(0xc0c0c0, 1);
    this.phasePreview.fillCircle(px + pr, py + pr, pr);
    this.drawPhasePreviewAt(px + pr, py + pr, pr, challenge.targetAngle);
  }

  private drawPhasePreviewAt(cx: number, cy: number, r: number, angle: number): void {
    const litDirection = Math.cos(Phaser.Math.DegToRad(angle));
    if (Math.abs(litDirection) > 0.95 && litDirection > 0) {
      this.phasePreview.fillStyle(0x1a1a2e, 0.9);
      this.phasePreview.fillCircle(cx, cy, r);
      return;
    }
    if (Math.abs(litDirection) <= 0.95) {
      const shadowOffset = -litDirection * r * 0.85;
      this.phasePreview.fillStyle(0x1a1a2e, 0.88);
      this.phasePreview.fillCircle(cx + shadowOffset, cy, r * 0.98);
    }
  }

  private tryLockIn(): void {
    if (this.isComplete) return;

    const challenge = this.getCurrentChallenge();
    if (!this.angleMatchesTarget(challenge.targetAngle)) {
      this.showMismatchFeedback();
      return;
    }

    this.completedCount++;
    this.currentChallenge++;

    if (this.currentChallenge >= PHASE_CHALLENGES.length) {
      this.isComplete = true;
      this.showSuccess();
      this.time.delayedCall(2000, () => this.completeMission(this.completedCount * 20));
      return;
    }

    this.updateChallengeUI();
    this.showMatchFeedback();
    // Nudge to a new starting angle away from next target
    const next = this.getCurrentChallenge();
    this.moonAngle = (next.targetAngle + 120) % 360;
    this.syncMoonPosition();
    this.updateSliderKnob();
  }

  private showMatchFeedback(): void {
    const flash = this.add
      .text(this.centerX, this.centerY - this.orbitRadius - 50, '✓ Correct!', {
        fontSize: '24px',
        fontFamily: 'Orbitron, monospace',
        color: '#00ff88',
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      y: flash.y - 30,
      duration: 1200,
      onComplete: () => flash.destroy(),
    });
  }

  private showMismatchFeedback(): void {
    const flash = this.add
      .text(this.centerX, this.centerY - this.orbitRadius - 50, 'Not quite — adjust orbit & try again', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: '#ff6b6b',
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        padding: { x: 12, y: 8 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 2000,
      onComplete: () => flash.destroy(),
    });
  }

  private showSuccess(): void {
    const successText = this.add
      .text(this.centerX, this.centerY, 'All 5 Phases Matched!', {
        fontSize: '28px',
        fontFamily: 'Orbitron, monospace',
        color: '#64ffda',
        backgroundColor: '#1a1a2e',
        padding: { x: 20, y: 15 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: successText,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  protected showHint(): void {
    const challenge = this.getCurrentChallenge();
    const hintText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        `Move the Moon around Earth so sunlight (from the right) hits it like a "${challenge.name}".\nUse the slider for fine control, then Lock In!`,
        {
          fontSize: '17px',
          fontFamily: 'Inter, sans-serif',
          color: '#ffd54f',
          backgroundColor: '#1a1a2e',
          padding: { x: 20, y: 15 },
          align: 'center',
          wordWrap: { width: this.scale.width - 80 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.tweens.add({
      targets: hintText,
      alpha: 0,
      duration: 5000,
      onComplete: () => hintText.destroy(),
    });
  }
}
