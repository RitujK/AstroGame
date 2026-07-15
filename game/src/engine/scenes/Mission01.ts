/* Mission 1: Earth's Rotation — Day & Night
 * Clear model: Sun is fixed on the right. Right half of Earth = DAY, left = NIGHT.
 * Cities ride on the spinning globe; a side checklist shows each target vs current state.
 */

import { BaseMissionScene } from './BaseMissionScene';
import { ageBandService } from '../../services/ageBand';

interface City {
  name: string;
  /** Local angle on the globe disc (0 = +X / east / sunward when rotation is 0) */
  angle: number;
  targetState: 'day' | 'night';
  pin?: Phaser.GameObjects.Arc;
  pinLabel?: Phaser.GameObjects.Text;
  checklistRow?: Phaser.GameObjects.Text;
}

export class Mission01Scene extends BaseMissionScene {
  private globeContainer!: Phaser.GameObjects.Container;
  private globeSprite!: Phaser.GameObjects.Image;
  private dayOverlay!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Graphics;
  private terminator!: Phaser.GameObjects.Graphics;
  private cities: City[] = [];
  private globeRotation = 0;
  private isDragging = false;
  private hasInteracted = false;
  private isComplete = false;
  private globeRadius = 0;
  private centerX = 0;
  private centerY = 0;
  private dragStartAngle = 0;
  private dragStartRotation = 0;
  private progressText!: Phaser.GameObjects.Text;
  private instructText!: Phaser.GameObjects.Text;
  private readonly earthTextureKey = 'earthGlobe';

  preload(): void {
    super.preload();
    this.load.image(this.earthTextureKey, '/assets/images/earth-bright.png');
  }

  create(): void {
    this.missionId = 1;
    const { width, height } = this.scale;
    this.centerX = width * 0.58;
    this.centerY = height * 0.52;
    this.globeRadius = Math.min(width, height) * 0.28;

    if (!this.textures.exists(this.earthTextureKey)) {
      this.createEarthTextureFallback();
    }
    this.createHUD();
    this.updateObjective('Spin Earth so every city matches its day or night target.');

    this.drawSkyDecor(width, height);
    this.createSun(width);
    this.createGlobe();
    this.createDayNightOverlays();
    this.createSidePanel(width, height);
    this.createCities();
    this.createDragControls();

    // Start one fixed "scrambled" pose so the puzzle is readable (not pure random chaos)
    this.globeRotation = 140;
    this.updateGlobe();

    if (ageBandService.getHintFrequency() !== 'none') {
      this.hintButton.setVisible(true);
    }
  }

  private drawSkyDecor(width: number, height: number): void {
    const stars = this.add.graphics().setDepth(0);
    stars.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(80, height - 40);
      stars.fillCircle(x, y, Phaser.Math.Between(1, 2));
    }
  }

  private createSun(width: number): void {
    const sunX = Math.min(width - 70, this.centerX + this.globeRadius + 110);
    const sunY = this.centerY;

    const rays = this.add.graphics().setDepth(4);
    rays.lineStyle(2, 0xffd54f, 0.35);
    for (let i = -2; i <= 2; i++) {
      const y = sunY + i * 28;
      rays.lineBetween(sunX - 50, y, this.centerX + this.globeRadius * 0.2, this.centerY + i * 12);
    }

    this.add
      .circle(sunX, sunY, 28, 0xffd54f, 1)
      .setDepth(5)
      .setStrokeStyle(4, 0xfff3a0, 0.9);

    this.add
      .text(sunX, sunY + 48, 'SUN', {
        fontSize: '14px',
        fontFamily: 'Orbitron, monospace',
        color: '#ffd54f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.add
      .text(sunX, sunY + 68, 'Light comes\nfrom here →', {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        color: '#b0bec5',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(5);
  }

  private createGlobe(): void {
    this.globeContainer = this.add.container(this.centerX, this.centerY).setDepth(8);

    const key = this.textures.exists(this.earthTextureKey) ? this.earthTextureKey : 'earth';
    this.globeSprite = this.add.image(0, 0, key);
    this.globeSprite.setDisplaySize(this.globeRadius * 2, this.globeRadius * 2);

    // Clip square PNG to a disc so it reads as a planet
    const maskShape = this.make.graphics({ x: this.centerX, y: this.centerY });
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(0, 0, this.globeRadius);
    this.globeSprite.setMask(maskShape.createGeometryMask());

    this.globeContainer.add(this.globeSprite);

    // Edge ring so the disc reads as a planet
    const rim = this.add.graphics();
    rim.lineStyle(3, 0x4fc3f7, 0.55);
    rim.strokeCircle(0, 0, this.globeRadius);
    this.globeContainer.add(rim);
  }

  private createDayNightOverlays(): void {
    this.dayOverlay = this.add.graphics().setDepth(9);
    this.nightOverlay = this.add.graphics().setDepth(9);
    this.terminator = this.add.graphics().setDepth(10);

    // Fixed spatial labels (do not rotate)
    this.add
      .text(this.centerX + this.globeRadius * 0.55, this.centerY - this.globeRadius - 28, '☀️ DAY', {
        fontSize: '16px',
        fontFamily: 'Orbitron, monospace',
        color: '#ffd54f',
        backgroundColor: 'rgba(10, 14, 39, 0.75)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.add
      .text(this.centerX - this.globeRadius * 0.55, this.centerY - this.globeRadius - 28, '🌙 NIGHT', {
        fontSize: '16px',
        fontFamily: 'Orbitron, monospace',
        color: '#90caf9',
        backgroundColor: 'rgba(10, 14, 39, 0.75)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.add
      .text(this.centerX + 12, this.centerY - this.globeRadius + 8, 'day/night line', {
        fontSize: '11px',
        fontFamily: 'Inter, sans-serif',
        color: '#ffffff',
        backgroundColor: 'rgba(10,14,39,0.7)',
        padding: { x: 6, y: 3 },
      })
      .setDepth(12);
  }

  private createSidePanel(_width: number, height: number): void {
    const panelX = 24;
    const panelY = 90;
    const panelW = Math.min(280, this.centerX - this.globeRadius - 60);

    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x0a0e27, 0.88);
    bg.fillRoundedRect(panelX, panelY, panelW, Math.min(340, height - 140), 12);
    bg.lineStyle(1, 0x64ffda, 0.35);
    bg.strokeRoundedRect(panelX, panelY, panelW, Math.min(340, height - 140), 12);

    this.add
      .text(panelX + 16, panelY + 16, 'CITY CHECKLIST', {
        fontSize: '13px',
        fontFamily: 'Orbitron, monospace',
        color: '#64ffda',
      })
      .setDepth(21);

    this.add
      .text(
        panelX + 16,
        panelY + 42,
        'Right side faces the Sun = DAY.\nLeft side is in shadow = NIGHT.\n\nSpin until every city matches.',
        {
          fontSize: '13px',
          fontFamily: 'Inter, sans-serif',
          color: '#b0bec5',
          wordWrap: { width: panelW - 32 },
          lineSpacing: 4,
        }
      )
      .setDepth(21);

    this.progressText = this.add
      .text(panelX + 16, panelY + 130, 'Correct: 0 / 3', {
        fontSize: '15px',
        fontFamily: 'Orbitron, monospace',
        color: '#ffd54f',
      })
      .setDepth(21);

    this.instructText = this.add
      .text(this.centerX, height - 44, '👆 Drag the Earth to spin it', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: '#ffffff',
        backgroundColor: 'rgba(26, 26, 46, 0.85)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  private createCities(): void {
    // Angles on the disc: 0 = sunward (right), π = far side (left)
    this.cities = [
      { name: 'New York', angle: Math.PI * 0.85, targetState: 'night' },
      { name: 'Delhi', angle: -Math.PI * 0.2, targetState: 'day' },
      { name: 'Nairobi', angle: Math.PI * 0.15, targetState: 'day' },
    ];

    const panelX = 40;
    let rowY = 250;

    this.cities.forEach((city, index) => {
      const dist = this.globeRadius * 0.72;
      const lx = Math.cos(city.angle) * dist;
      const ly = Math.sin(city.angle) * dist;

      city.pin = this.add.circle(lx, ly, 9, 0xff6b6b, 1).setStrokeStyle(2, 0xffffff, 0.9);
      city.pinLabel = this.add
        .text(lx, ly - 18, city.name.slice(0, 2).toUpperCase(), {
          fontSize: '10px',
          fontFamily: 'Orbitron, monospace',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      this.globeContainer.add(city.pin);
      this.globeContainer.add(city.pinLabel);

      city.checklistRow = this.add
        .text(panelX, rowY + index * 48, '', {
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
          lineSpacing: 2,
        })
        .setDepth(21);
    });
  }

  private createDragControls(): void {
    const hitZone = this.add
      .circle(this.centerX, this.centerY, this.globeRadius + 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.hasInteracted = true;
      this.dragStartAngle = Phaser.Math.Angle.Between(this.centerX, this.centerY, pointer.x, pointer.y);
      this.dragStartRotation = this.globeRotation;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const currentAngle = Phaser.Math.Angle.Between(this.centerX, this.centerY, pointer.x, pointer.y);
      const delta = Phaser.Math.RadToDeg(currentAngle - this.dragStartAngle);
      this.globeRotation = this.dragStartRotation + delta;
      this.updateGlobe();
      this.checkCompletion();
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.checkCompletion();
    });
  }

  private createEarthTextureFallback(): void {
    if (this.textures.exists('earth')) return;

    const size = 512;
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    // Ocean
    g.fillStyle(0x1565c0);
    g.fillCircle(cx, cy, r);

    // Continents — simple readable blotches
    g.fillStyle(0x43a047, 0.95);
    g.fillEllipse(cx - r * 0.38, cy - r * 0.02, r * 0.26, r * 0.4); // Americas
    g.fillEllipse(cx + r * 0.05, cy - r * 0.05, r * 0.16, r * 0.28); // Africa/Europe
    g.fillEllipse(cx + r * 0.32, cy - r * 0.12, r * 0.22, r * 0.2); // Asia
    g.fillEllipse(cx + r * 0.38, cy + r * 0.28, r * 0.09, r * 0.08); // Australia

    // Polar ice hint
    g.fillStyle(0xe3f2fd, 0.55);
    g.fillEllipse(cx, cy - r * 0.78, r * 0.28, r * 0.1);
    g.fillEllipse(cx, cy + r * 0.78, r * 0.26, r * 0.09);

    g.lineStyle(5, 0x81d4fa, 0.5);
    g.strokeCircle(cx, cy, r - 3);

    g.generateTexture('earth', size, size);
    g.destroy();
  }

  /** World angle of a city after globe spin (0 = facing sun / +X). */
  private cityWorldAngle(city: City): number {
    return city.angle + Phaser.Math.DegToRad(this.globeRotation);
  }

  private getCityState(city: City): 'day' | 'night' {
    // Facing the Sun (right half) is day
    return Math.cos(this.cityWorldAngle(city)) > 0.08 ? 'day' : 'night';
  }

  private updateGlobe(): void {
    this.globeContainer.setRotation(Phaser.Math.DegToRad(this.globeRotation));
    this.drawDayNight();
    this.updateChecklist();
  }

  private drawDayNight(): void {
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.globeRadius;

    this.dayOverlay.clear();
    this.nightOverlay.clear();
    this.terminator.clear();

    // Soft day wash (right)
    this.dayOverlay.fillStyle(0xffd54f, 0.16);
    this.dayOverlay.beginPath();
    this.dayOverlay.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    this.dayOverlay.lineTo(cx, cy);
    this.dayOverlay.closePath();
    this.dayOverlay.fillPath();

    // Night wash (left)
    this.nightOverlay.fillStyle(0x0d1b3e, 0.42);
    this.nightOverlay.beginPath();
    this.nightOverlay.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    this.nightOverlay.lineTo(cx, cy);
    this.nightOverlay.closePath();
    this.nightOverlay.fillPath();

    // Terminator
    this.terminator.lineStyle(3, 0xffffff, 0.95);
    this.terminator.lineBetween(cx, cy - r, cx, cy + r);
    this.terminator.lineStyle(1, 0x64ffda, 0.7);
    this.terminator.lineBetween(cx - 8, cy - 12, cx + 8, cy - 12);
  }

  private updateChecklist(): void {
    let correct = 0;

    this.cities.forEach((city) => {
      const current = this.getCityState(city);
      const isCorrect = current === city.targetState;
      if (isCorrect) correct += 1;

      const targetEmoji = city.targetState === 'day' ? '☀️' : '🌙';
      const nowEmoji = current === 'day' ? '☀️' : '🌙';

      if (city.pin) {
        city.pin.setFillStyle(isCorrect ? 0x64ffda : 0xff6b6b, 1);
      }

      if (city.checklistRow) {
        city.checklistRow.setColor(isCorrect ? '#64ffda' : '#ffffff');
        city.checklistRow.setText(
          `${isCorrect ? '✓' : '○'} ${city.name}\n   Need ${targetEmoji} ${city.targetState} · Now ${nowEmoji}`
        );
      }
    });

    this.progressText.setText(`Correct: ${correct} / ${this.cities.length}`);
    this.progressText.setColor(correct === this.cities.length ? '#64ffda' : '#ffd54f');
  }

  private checkCompletion(): void {
    if (this.isComplete || !this.hasInteracted) return;

    const allCorrect = this.cities.every((city) => this.getCityState(city) === city.targetState);
    if (!allCorrect) return;

    this.isComplete = true;
    this.instructText.setText('All cities match — great spinning, Cadet!');
    this.instructText.setColor('#64ffda');
    this.showSuccess();
    this.time.delayedCall(1800, () => this.completeMission(100));
  }

  private showSuccess(): void {
    const successText = this.add
      .text(this.centerX, this.centerY, '🎉 Mission Complete!', {
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
    const hintText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        'The Sun is on the RIGHT.\nCities on the right half are in DAY.\nCities on the left half are in NIGHT.\n\nSpin until New York is on the night side,\nand Delhi + Nairobi face the Sun.',
        {
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          color: '#ffd54f',
          backgroundColor: '#1a1a2e',
          padding: { x: 20, y: 15 },
          align: 'center',
          wordWrap: { width: this.scale.width - 100 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.tweens.add({
      targets: hintText,
      alpha: 0,
      delay: 4500,
      duration: 600,
      onComplete: () => hintText.destroy(),
    });
  }
}
