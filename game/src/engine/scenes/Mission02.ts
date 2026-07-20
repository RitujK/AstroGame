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
  cue: string;
  realWorldFact: string;
}

const PHASE_CHALLENGES: PhaseChallenge[] = [
  {
    name: 'New Moon',
    targetAngle: 0,
    cue: 'Make the Moon nearly invisible.',
    realWorldFact: 'A new moon is near the Sun in our sky, so its bright side faces away from us.',
  },
  {
    name: 'Waxing Crescent',
    targetAngle: 45,
    cue: 'Make a thin bright curve on the right.',
    realWorldFact: 'A waxing crescent is often visible just after sunset.',
  },
  {
    name: 'First Quarter',
    targetAngle: 90,
    cue: 'Light the right half of the Moon.',
    realWorldFact: 'A first-quarter moon is high in the evening sky.',
  },
  {
    name: 'Full Moon',
    targetAngle: 180,
    cue: 'Light the Moon’s whole near side.',
    realWorldFact: 'A full moon rises around sunset because Earth is between the Sun and Moon.',
  },
  {
    name: 'Waning Crescent',
    targetAngle: 315,
    cue: 'Make a thin bright curve on the left.',
    realWorldFact: 'A waning crescent is easiest to spot before sunrise.',
  },
];

const ANGLE_TOLERANCE = 18;

export class Mission02Scene extends BaseMissionScene {
  private earth!: Phaser.GameObjects.Image;
  private moonContainer!: Phaser.GameObjects.Container;
  private moonBody!: Phaser.GameObjects.Graphics;
  private moonShadow!: Phaser.GameObjects.Graphics;
  private moonMaskGfx!: Phaser.GameObjects.Graphics;
  private orbitRing!: Phaser.GameObjects.Graphics;
  private targetText!: Phaser.GameObjects.Text;
  private phasePreview!: Phaser.GameObjects.Graphics;
  private phasePreviewMaskGfx!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private lockButton!: Phaser.GameObjects.Text;
  private sliderTrack!: Phaser.GameObjects.Graphics;
  private sliderKnob!: Phaser.GameObjects.Graphics;
  private sliderLabel!: Phaser.GameObjects.Text;
  private sliderHitArea!: Phaser.GameObjects.Rectangle;
  private sunText!: Phaser.GameObjects.Text;
  private sliderX = 0;
  private sliderY = 0;
  private sliderWidth = 0;
  private uiPanels!: Phaser.GameObjects.Graphics;
  private sunlightGfx!: Phaser.GameObjects.Graphics;
  private targetCueText!: Phaser.GameObjects.Text;
  private orbitInstructionText!: Phaser.GameObjects.Text;
  private viewTitleText!: Phaser.GameObjects.Text;
  private livePhaseText!: Phaser.GameObjects.Text;
  private phaseFactText!: Phaser.GameObjects.Text;
  private earthLabelText!: Phaser.GameObjects.Text;
  private targetPanel = new Phaser.Geom.Rectangle();
  private orbitPanel = new Phaser.Geom.Rectangle();
  private viewPanel = new Phaser.Geom.Rectangle();

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
    this.updateObjective(
      this.isCompactLayout()
        ? 'Match 5 moon phases. Move the Moon, then Lock In.'
        : 'Match 5 moon phases. Drag the Moon on its orbit or use the slider, then tap Lock In.'
    );

    if (ageBandService.getHintFrequency() !== 'none') {
      this.hintButton.setVisible(true);
    }

    this.uiPanels = this.add.graphics().setScrollFactor(0).setDepth(2);
    this.sunlightGfx = this.add.graphics().setScrollFactor(0).setDepth(5);

    // Sun indicator (fixed to the right)
    this.sunText = this.addText(this.centerX + this.orbitRadius + 80, this.centerY, '☀️ Sun', {
        fontSize: '22px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.accent,
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
    this.earthLabelText = this.addText(this.centerX, this.centerY + 58, 'YOU ARE HERE', {
      fontSize: '10px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(30);

    // Moon (container for body + shadow)
    this.moonContainer = this.add.container(0, 0);
    this.moonBody = this.add.graphics();
    this.moonShadow = this.add.graphics();
    this.moonMaskGfx = this.make.graphics({ x: 0, y: 0 });
    this.moonMaskGfx.fillStyle(0xffffff).fillCircle(0, 0, 22);
    this.moonShadow.setMask(this.moonMaskGfx.createGeometryMask());
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
    this.targetText = this.addText(20, 70, '', {
        fontSize: '18px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.primary,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.phasePreview = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.phasePreviewMaskGfx = this.make.graphics({ x: 0, y: 0 });
    this.phasePreview.setMask(this.phasePreviewMaskGfx.createGeometryMask());

    this.progressText = this.addText(width - 20, 70, '', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.textSecondary,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.targetCueText = this.addText(20, 106, '', {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    }).setScrollFactor(0).setDepth(100);

    this.orbitInstructionText = this.addText(this.centerX, 140, 'Drag the Moon around Earth', {
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.viewTitleText = this.addText(0, 0, 'VIEW FROM EARTH', {
      fontSize: '12px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
    }).setScrollFactor(0).setDepth(100);

    this.livePhaseText = this.addText(0, 0, '', {
      fontSize: '17px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.textPrimary,
    }).setScrollFactor(0).setDepth(100);

    this.phaseFactText = this.addText(0, 0, 'Move the Moon to see its phase change.', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
      lineSpacing: 2,
    }).setScrollFactor(0).setDepth(100);

    // Lock in button
    this.lockButton = this.addText(this.centerX, height - 120, '🔒 Lock In Phase', {
        fontSize: '20px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.btnOnPrimary,
        backgroundColor: this.palette.primary,
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tryLockIn())
      .on('pointerover', () => this.lockButton.setStyle({ backgroundColor: this.palette.secondary }))
      .on('pointerout', () => this.lockButton.setStyle({ backgroundColor: this.palette.primary }));

    // Orbit slider
    this.sliderY = height - 55;
    this.sliderWidth = Math.min(width - 80, 400);
    this.sliderX = (width - this.sliderWidth) / 2;

    this.sliderTrack = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.sliderKnob = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.sliderLabel = this.addText(width / 2, this.sliderY - 22, 'Orbit slider', {
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.textTertiary,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.drawSlider(this.sliderX, this.sliderY, this.sliderWidth);

    this.sliderHitArea = this.add
      .rectangle(this.sliderX + this.sliderWidth / 2, this.sliderY, this.sliderWidth, 30, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    this.sliderHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.isDraggingSlider = true;
      this.setAngleFromSliderX(pointer.x);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingSlider || this.isComplete) return;
      this.setAngleFromSliderX(pointer.x);
    });

    this.input.on('pointerup', () => {
      this.isDraggingSlider = false;
    });

    this.layoutMission(width, height);
    this.updateChallengeUI();
  }

  private isCompactLayout(width = this.scale.width, height = this.scale.height): boolean {
    return width < 760 || height < 560;
  }

  protected onSceneResize(width: number, height: number): void {
    if (!this.earth) return;
    this.layoutMission(width, height);
    this.updateChallengeUI();
  }

  private layoutMission(width: number, height: number): void {
    const isCompact = this.isCompactLayout(width, height);

    if (isCompact) {
      const viewHeight = height < 700 ? 100 : 120;
      const orbitHeight = Math.max(190, Math.min(326, height - 158 - 12 - viewHeight - 140));
      this.targetPanel.setTo(16, 70, width - 32, 78);
      this.orbitPanel.setTo(16, 158, width - 32, orbitHeight);
      this.viewPanel.setTo(16, this.orbitPanel.bottom + 12, width - 32, viewHeight);
    } else {
      const gap = 20;
      const contentTop = 150;
      const contentBottom = height - 150;
      const orbitWidth = width * 0.6 - 30;
      this.targetPanel.setTo(20, 70, width - 40, 66);
      this.orbitPanel.setTo(20, contentTop, orbitWidth, contentBottom - contentTop);
      this.viewPanel.setTo(
        this.orbitPanel.right + gap,
        contentTop,
        width - this.orbitPanel.right - gap - 20,
        Math.min(300, contentBottom - contentTop)
      );
    }

    this.centerX = this.orbitPanel.centerX;
    this.centerY = this.orbitPanel.centerY + (isCompact ? 6 : 10);
    this.orbitRadius = Math.min(
      isCompact ? this.orbitPanel.width * 0.315 : this.orbitPanel.width * 0.28,
      isCompact ? (this.orbitPanel.height - 70) * 0.5 : (this.orbitPanel.height - 80) * 0.42
    );

    this.updateObjective(
      isCompact
        ? 'Move the Moon. Watch what it looks like from Earth.'
        : 'Move the Moon around Earth and match the phase seen in the night sky.'
    );

    this.targetText.setPosition(this.targetPanel.x + 12, this.targetPanel.y + 8);
    this.targetCueText
      .setPosition(this.targetPanel.x + 12, this.targetPanel.y + 44)
      .setStyle({ wordWrap: { width: this.targetPanel.width - 120 } });
    this.progressText.setPosition(this.targetPanel.right - 12, this.targetPanel.y + 13);
    this.orbitInstructionText.setPosition(this.orbitPanel.centerX, this.orbitPanel.y + 12);

    this.earth.setPosition(this.centerX, this.centerY);
    this.earth.setDisplaySize(isCompact ? 90 : 100, isCompact ? 90 : 100);
    this.earthLabelText.setPosition(this.centerX, this.centerY + (isCompact ? 50 : 58));

    this.sunText
      .setText(isCompact ? '☀️' : '☀️ SUNLIGHT')
      .setPosition(
        this.orbitPanel.right - (isCompact ? 26 : 60),
        this.centerY
      );

    const viewMoonX = this.viewPanel.x + (isCompact ? 54 : 80);
    const viewMoonY = this.viewPanel.centerY + 7;
    this.viewTitleText.setPosition(this.viewPanel.x + 12, this.viewPanel.y + 10);
    this.livePhaseText.setPosition(
      this.viewPanel.x + (isCompact ? 106 : 155),
      this.viewPanel.y + 36
    );
    this.phaseFactText
      .setPosition(this.viewPanel.x + (isCompact ? 106 : 155), this.viewPanel.y + 65)
      .setStyle({ wordWrap: { width: this.viewPanel.width - (isCompact ? 120 : 175) } });
    this.phasePreview.setPosition(viewMoonX, viewMoonY);
    const previewRadius = isCompact ? 38 : 58;
    this.phasePreviewMaskGfx
      .clear()
      .fillStyle(0xffffff)
      .fillCircle(0, 0, previewRadius)
      .setPosition(viewMoonX, viewMoonY);

    this.lockButton.setPosition(width / 2, height - 112);

    this.sliderY = height - 44;
    this.sliderWidth = Math.min(width - 80, 400);
    this.sliderX = (width - this.sliderWidth) / 2;
    this.sliderLabel.setPosition(width / 2, this.sliderY - 20);
    this.sliderHitArea
      .setPosition(this.sliderX + this.sliderWidth / 2, this.sliderY)
      .setSize(this.sliderWidth, 30)
      .setDisplaySize(this.sliderWidth, 30);

    this.hintButton.setPosition(
      this.viewPanel.right - this.hintButton.displayWidth - 10,
      this.viewPanel.y + 8
    );

    this.drawUIPanels();
    this.drawOrbitRing();
    this.drawSlider(this.sliderX, this.sliderY, this.sliderWidth);
    this.syncMoonPosition();
  }

  private drawUIPanels(): void {
    this.uiPanels.clear();

    const drawPanel = (
      rect: Phaser.Geom.Rectangle,
      fill: number,
      fillAlpha: number,
      border: number,
      borderAlpha: number
    ): void => {
      this.uiPanels.fillStyle(fill, fillAlpha);
      this.uiPanels.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 14);
      this.uiPanels.lineStyle(1, border, borderAlpha);
      this.uiPanels.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 14);
    };

    drawPanel(
      this.targetPanel,
      this.palette.panelBgNum,
      this.palette.theme === 'dark' ? 0.82 : 0.96,
      this.palette.primaryNum,
      this.palette.theme === 'dark' ? 0.35 : 0.22
    );
    drawPanel(
      this.orbitPanel,
      this.palette.spaceLightNum,
      this.palette.theme === 'dark' ? 0.78 : 0.92,
      this.palette.secondaryNum,
      this.palette.theme === 'dark' ? 0.28 : 0.2
    );
    drawPanel(
      this.viewPanel,
      this.palette.panelBgNum,
      this.palette.theme === 'dark' ? 0.9 : 1,
      this.palette.accentNum,
      this.palette.theme === 'dark' ? 0.4 : 0.35
    );

    this.sunlightGfx.clear();
    this.sunlightGfx.lineStyle(2, this.palette.accentNum, this.palette.theme === 'dark' ? 0.48 : 0.62);
    const sunX = this.sunText.x - 18;
    const endX = this.centerX + this.orbitRadius * 0.45;
    for (let offset = -14; offset <= 14; offset += 14) {
      this.sunlightGfx.lineBetween(sunX, this.centerY + offset, endX, this.centerY + offset);
    }
    this.sunlightGfx.fillStyle(this.palette.accentNum, 0.8);
    this.sunlightGfx.fillTriangle(
      endX - 8,
      this.centerY - 7,
      endX,
      this.centerY,
      endX - 8,
      this.centerY + 7
    );
  }

  protected onThemeChange(): void {
    if (!this.uiPanels) return;
    this.drawUIPanels();
    this.drawOrbitRing();
    this.drawSlider(this.sliderX, this.sliderY, this.sliderWidth);
    this.targetText.setStyle({ backgroundColor: this.palette.panelChrome });
    this.targetCueText.setColor(this.palette.textSecondary);
    this.orbitInstructionText.setColor(this.palette.textSecondary);
    this.viewTitleText.setColor(this.palette.primary);
    this.livePhaseText.setColor(this.palette.textPrimary);
    this.phaseFactText.setColor(this.palette.textSecondary);
    this.earthLabelText.setStyle({
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
    });
    this.progressText.setColor(this.palette.textSecondary);
    this.lockButton.setStyle({
      backgroundColor: this.palette.primary,
      color: this.palette.btnOnPrimary,
    });
    this.updateEarthView();
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
    this.orbitRing.lineStyle(2, this.palette.primaryNum, this.palette.theme === 'dark' ? 0.35 : 0.58);
    this.orbitRing.strokeCircle(this.centerX, this.centerY, this.orbitRadius);
  }

  private drawSlider(sliderX: number, sliderY: number, sliderWidth: number): void {
    this.sliderTrack.clear();
    this.sliderTrack.fillStyle(this.palette.spaceLightNum, 0.9);
    this.sliderTrack.fillRoundedRect(sliderX, sliderY - 6, sliderWidth, 12, 6);
    this.sliderTrack.lineStyle(1, this.palette.primaryNum, 0.5);
    this.sliderTrack.strokeRoundedRect(sliderX, sliderY - 6, sliderWidth, 12, 6);
    this.updateSliderKnob(sliderX, sliderY, sliderWidth);
  }

  private updateSliderKnob(sliderX?: number, sliderY?: number, sliderWidth?: number): void {
    const sx = sliderX ?? this.sliderX;
    const sy = sliderY ?? this.sliderY;
    const sw = sliderWidth ?? this.sliderWidth;

    const t = this.moonAngle / 360;
    const knobX = sx + t * sw;
    const knobStroke = this.palette.theme === 'dark' ? 0xffffff : 0x141028;

    this.sliderKnob.clear();
    this.sliderKnob.fillStyle(this.palette.primaryNum, 1);
    this.sliderKnob.fillCircle(knobX, sy, 14);
    this.sliderKnob.lineStyle(2, knobStroke, 0.8);
    this.sliderKnob.strokeCircle(knobX, sy, 14);
  }

  private setAngleFromSliderX(pointerX: number): void {
    const t = Phaser.Math.Clamp((pointerX - this.sliderX) / this.sliderWidth, 0, 1);
    this.moonAngle = t * 360;
    this.syncMoonPosition();
    this.updateSliderKnob();
  }

  private syncMoonPosition(): void {
    const rad = Phaser.Math.DegToRad(this.moonAngle);
    const x = this.centerX + Math.cos(rad) * this.orbitRadius;
    const y = this.centerY + Math.sin(rad) * this.orbitRadius;
    this.moonContainer.setPosition(x, y);
    this.moonMaskGfx.setPosition(x, y);
    this.drawMoonPhase();
    this.updateEarthView();
  }

  /** Draw moon disc with lit/shadow based on sun from the right (+X) */
  private drawMoonPhase(): void {
    const moonR = 22;
    this.moonBody.clear();
    this.moonShadow.clear();
    this.drawPhaseDisc(this.moonBody, 0, 0, moonR, this.moonAngle);
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
    this.targetText.setText(`MAKE A ${challenge.name.toUpperCase()}`);
    this.targetCueText.setText(challenge.cue);
    this.progressText.setText(`${this.completedCount} / ${PHASE_CHALLENGES.length} matched`);
    this.updateEarthView();
  }

  private getVisiblePhaseName(): string {
    const angle = ((this.moonAngle % 360) + 360) % 360;
    if (angle < 22.5 || angle >= 337.5) return 'New Moon';
    if (angle < 67.5) return 'Waxing Crescent';
    if (angle < 112.5) return 'First Quarter';
    if (angle < 157.5) return 'Waxing Gibbous';
    if (angle < 202.5) return 'Full Moon';
    if (angle < 247.5) return 'Waning Gibbous';
    if (angle < 292.5) return 'Last Quarter';
    return 'Waning Crescent';
  }

  private updateEarthView(): void {
    if (!this.phasePreview || this.viewPanel.width === 0) return;
    this.phasePreview.clear();
    const pr = this.isCompactLayout() ? 38 : 58;
    this.drawPhaseDisc(this.phasePreview, 0, 0, pr, this.moonAngle);

    this.livePhaseText.setText(this.getVisiblePhaseName());
  }

  /**
   * Render the illuminated portion scanline-by-scanline from spherical lighting.
   * Unlike overlapping circles, this correctly distinguishes crescent from
   * gibbous phases and naturally keeps every pixel inside the lunar disc.
   */
  private drawPhaseDisc(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    angle: number
  ): void {
    const normalized = ((angle % 360) + 360) % 360;
    const radians = Phaser.Math.DegToRad(normalized);
    const litColor = this.palette.theme === 'dark' ? 0xe8e8e8 : 0xf4f1df;
    const shadowColor = this.palette.theme === 'dark' ? 0x151827 : 0x3b4053;
    graphics.fillStyle(shadowColor, 1);
    graphics.fillCircle(cx, cy, radius);

    if (normalized > 0.5 && normalized < 359.5) {
      graphics.fillStyle(litColor, 1);
      if (Math.abs(normalized - 180) < 0.5) {
        graphics.fillCircle(cx, cy, radius);
      } else {
        const waxing = normalized < 180;
        const cosAngle = Math.cos(radians);
        for (let y = -radius; y <= radius; y += 1.5) {
          const halfWidth = Math.sqrt(Math.max(0, radius * radius - y * y));
          const boundary = waxing ? halfWidth * cosAngle : -halfWidth * cosAngle;
          const startX = waxing ? boundary : -halfWidth;
          const endX = waxing ? halfWidth : boundary;
          graphics.fillRect(cx + startX, cy + y, Math.max(0, endX - startX), 1.75);
        }
      }
    }

    graphics.lineStyle(1.5, this.palette.borderNum, 0.35);
    graphics.strokeCircle(cx, cy, radius);
  }

  private tryLockIn(): void {
    if (this.isComplete) return;

    const challenge = this.getCurrentChallenge();
    if (!this.angleMatchesTarget(challenge.targetAngle)) {
      this.phaseFactText.setText('Compare this view with the target clue, then move the Moon again.');
      this.showMismatchFeedback();
      return;
    }

    this.completedCount++;
    this.currentChallenge++;

    if (this.currentChallenge >= PHASE_CHALLENGES.length) {
      this.isComplete = true;
      this.phaseFactText.setText(challenge.realWorldFact);
      this.showSuccess();
      this.time.delayedCall(2000, () => this.completeMission(this.completedCount * 20));
      return;
    }

    this.updateChallengeUI();
    this.phaseFactText.setText(challenge.realWorldFact);
    this.showMatchFeedback();
    // Nudge to a new starting angle away from next target
    const next = this.getCurrentChallenge();
    this.moonAngle = (next.targetAngle + 120) % 360;
    this.syncMoonPosition();
    this.updateSliderKnob();
  }

  private showMatchFeedback(): void {
    const successColor = this.palette.theme === 'dark' ? '#00ff88' : '#1b8a4b';
    const flash = this.addText(this.centerX, this.centerY - this.orbitRadius - 50, '✓ Correct!', {
        fontSize: '24px',
        fontFamily: 'Orbitron, monospace',
        color: successColor,
        backgroundColor: this.palette.panelChrome,
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
    const flash = this.addText(this.centerX, this.centerY - this.orbitRadius - 50, 'Not quite — adjust orbit & try again', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.alert,
        backgroundColor: this.palette.panelChrome,
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
    const successText = this.addText(this.centerX, this.centerY, 'All 5 Phases Matched!', {
        fontSize: '28px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.primary,
        backgroundColor: this.palette.panelChrome,
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
    const hintText = this.addText(
        this.scale.width / 2,
        this.scale.height / 2,
        `Move the Moon around Earth so sunlight (from the right) hits it like a "${challenge.name}".\nUse the slider for fine control, then Lock In!`,
        {
          fontSize: '17px',
          fontFamily: 'Inter, sans-serif',
          color: this.palette.accent,
          backgroundColor: this.palette.panelChrome,
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
