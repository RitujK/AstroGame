/* Mission 1: Earth's Rotation — Day & Night
 * Clear model: Sun is fixed on the right. Right half of Earth = DAY, left = NIGHT.
 * Earth turns around its north-south (polar) axis. Horizontal dragging changes
 * longitude while each city stays on its real latitude; the checklist shows each
 * target vs current state.
 */

import { BaseMissionScene } from './BaseMissionScene';
import { ageBandService } from '../../services/ageBand';

interface City {
  name: string;
  /** Short map-pin label (kept explicit so it always reads correctly, unlike a raw slice of the name) */
  abbr: string;
  /** Geographic coordinates in degrees, used for orthographic globe projection. */
  latitude: number;
  longitude: number;
  targetState: 'day' | 'night';
  pin?: Phaser.GameObjects.Arc;
  pinLabel?: Phaser.GameObjects.Text;
  checklistRow?: Phaser.GameObjects.Text;
}

interface Layout {
  isCompact: boolean;
  centerX: number;
  centerY: number;
  globeRadius: number;
  panelX: number;
  panelY: number;
  panelW: number;
  panelH: number;
  sunX: number;
  sunY: number;
  sunRadius: number;
}

export class Mission01Scene extends BaseMissionScene {
  private globeContainer!: Phaser.GameObjects.Container;
  private globeMesh!: Phaser.GameObjects.Mesh;
  private globeRim!: Phaser.GameObjects.Graphics;
  private dayOverlay!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Graphics;
  private terminator!: Phaser.GameObjects.Graphics;
  private dayLabel!: Phaser.GameObjects.Text;
  private nightLabel!: Phaser.GameObjects.Text;
  private starsGfx!: Phaser.GameObjects.Graphics;
  private sunRaysGfx!: Phaser.GameObjects.Graphics;
  private sunCircle!: Phaser.GameObjects.Arc;
  private sunLabel!: Phaser.GameObjects.Text;
  private sunSubLabel!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Graphics;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelInstructions!: Phaser.GameObjects.Text;
  private hitZone!: Phaser.GameObjects.Arc;

  private cities: City[] = [];
  private globeRotation = 0;
  private isDragging = false;
  private hasInteracted = false;
  private isComplete = false;

  private layout!: Layout;
  private dragStartX = 0;
  private dragStartRotation = 0;
  private progressText!: Phaser.GameObjects.Text;
  private instructText!: Phaser.GameObjects.Text;
  private readonly earthTextureKey = 'earthMap';

  preload(): void {
    super.preload();
    this.load.image(this.earthTextureKey, '/assets/images/earth-equirectangular.jpg');
  }

  create(): void {
    this.missionId = 1;

    if (!this.textures.exists(this.earthTextureKey)) {
      this.createEarthTextureFallback();
    }

    this.layout = this.computeLayout(this.scale.width, this.scale.height);

    this.createHUD();
    this.updateObjective('Spin Earth so every city matches its day or night target.');

    this.starsGfx = this.add.graphics().setDepth(0);
    this.createSun();
    this.createGlobe();
    this.createDayNightOverlays();
    this.createSidePanel();
    this.createCities();
    this.createDragControls();

    this.drawSkyDecor();

    // Begin centered on Asia: Delhi and Nairobi are visible but on the night
    // side. A quarter-turn toward Greenwich solves the model.
    this.globeRotation = 270;
    this.updateGlobe();

    if (ageBandService.getHintFrequency() !== 'none') {
      this.hintButton.setVisible(true);
    }
  }

  /** Responsive layout: side-by-side panel on wide screens, stacked on narrow/short ones. */
  private computeLayout(width: number, height: number): Layout {
    const isCompact = width < 760 || height < 560;
    // The globe is the main interactive element — never shrink it to make room for the
    // checklist. Instead the panel box itself is always sized to fit its own content
    // (title + instructions + progress + one row per city), so text never spills past
    // the drawn border. Keep these in sync with the offsets used in layoutSidePanel/
    // layoutCities below. Compact uses a tighter, single-line instructions blurb so the
    // whole checklist reliably fits below the globe without touching its size.
    const rowExtra = 30;
    const bottomPad = 14;
    // computeLayout runs once before createCities() populates this.cities, so fall
    // back to the fixed roster size (3) for that first call.
    const cityCount = this.cities.length || 3;

    if (isCompact) {
      const headerH = 88;
      const rowSpacing = 28;
      const panelContentH = headerH + cityCount * rowSpacing + bottomPad;

      const topAreaH = height * 0.48;
      const centerX = width / 2;
      const globeRadius = Math.max(70, Math.min(width * 0.34, topAreaH * 0.42));
      // Reserve room below the (possibly two-line) objective heading + DAY label
      // so the globe never rides up under the HUD text.
      const topClearance = 132;
      const centerY = Math.max(120, topAreaH * 0.55, globeRadius + topClearance);
      const panelX = Math.max(14, width * 0.06);
      const panelW = width - panelX * 2;
      const panelY = centerY + globeRadius + 20;
      const panelH = panelContentH;
      const sunRadius = 18;
      // Keep the Sun fully visible above the globe on mobile. Placing it beside
      // a full-size globe leaves no horizontal room and causes Earth to obscure it.
      const sunX = width - sunRadius - 16;
      const sunY = Math.max(96, centerY - globeRadius - 54);
      return { isCompact, centerX, centerY, globeRadius, panelX, panelY, panelW, panelH, sunX, sunY, sunRadius };
    }

    const headerH = 150;
    const rowSpacing = 46;
    const panelContentH = headerH + cityCount * rowSpacing + rowExtra + bottomPad;

    const centerX = width * 0.58;
    const centerY = height * 0.52;
    const globeRadius = Math.min(width, height) * 0.26;
    const panelX = 24;
    const panelY = 90;
    const panelW = Math.max(200, Math.min(280, centerX - globeRadius - 60));
    const panelH = Math.max(panelContentH, Math.min(340, height - 140));
    const sunRadius = 28;
    const sunX = Math.min(width - 70 - sunRadius, centerX + globeRadius + 110);
    const sunY = centerY;
    return { isCompact, centerX, centerY, globeRadius, panelX, panelY, panelW, panelH, sunX, sunY, sunRadius };
  }

  /** Reflow everything for the new canvas size, without resetting puzzle progress. */
  protected onSceneResize(width: number, height: number): void {
    if (!this.layout) return;
    this.layout = this.computeLayout(width, height);
    this.drawSkyDecor();
    this.layoutSun();
    this.layoutGlobe();
    this.layoutDayNightOverlays();
    this.layoutSidePanel();
    this.layoutCities();
    this.layoutHitZone();
    this.updateGlobe();
  }

  protected onThemeChange(): void {
    this.drawSkyDecor();
    this.layoutSun();
    this.updateGlobe();
    this.layoutSidePanel();
    if (this.instructText) {
      this.instructText.setStyle({ backgroundColor: this.palette.panelChrome, color: this.palette.textPrimary });
    }
  }

  private drawSkyDecor(): void {
    const { width, height } = this.scale;
    this.starsGfx.clear();
    if (this.palette.theme === 'dark') {
      this.starsGfx.fillStyle(0xffffff, 0.35);
      for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(20, width - 20);
        const y = Phaser.Math.Between(80, height - 40);
        this.starsGfx.fillCircle(x, y, Phaser.Math.Between(1, 2));
      }
    } else {
      this.starsGfx.fillStyle(this.palette.secondaryNum, 0.12);
      for (let i = 0; i < 24; i++) {
        const x = Phaser.Math.Between(20, width - 20);
        const y = Phaser.Math.Between(80, height - 40);
        this.starsGfx.fillCircle(x, y, Phaser.Math.Between(1, 2));
      }
    }
  }

  private createSun(): void {
    this.sunRaysGfx = this.add.graphics().setDepth(4);
    this.sunCircle = this.add.circle(0, 0, this.layout.sunRadius, this.palette.accentNum, 1).setDepth(5);
    this.sunLabel = this.addText(0, 0, 'SUN', {
        fontSize: '14px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.accent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.sunSubLabel = this.addText(0, 0, 'Light comes\nfrom here →', {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.textSecondary,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    this.layoutSun();
  }

  private layoutSun(): void {
    const { sunX, sunY, sunRadius } = this.layout;

    this.sunRaysGfx.clear();
    this.sunRaysGfx.lineStyle(2, this.palette.accentNum, 0.35);
    const rayCount = this.layout.isCompact ? 3 : 5;
    for (let i = -Math.floor(rayCount / 2); i <= Math.floor(rayCount / 2); i++) {
      const y = sunY + i * (sunRadius * 1.0);
      this.sunRaysGfx.lineBetween(
        sunX - sunRadius * 1.8,
        y,
        this.layout.centerX + this.layout.globeRadius * 0.2,
        this.layout.centerY + i * (sunRadius * 0.42)
      );
    }

    this.sunCircle.setPosition(sunX, sunY);
    this.sunCircle.setRadius(sunRadius);
    this.sunCircle.setFillStyle(this.palette.accentNum, 1);
    this.sunCircle.setStrokeStyle(4, this.palette.accentNum, 0.9);

    this.sunLabel.setPosition(sunX, sunY + sunRadius + 20);
    this.sunLabel.setColor(this.palette.accent);
    this.sunLabel.setVisible(!this.layout.isCompact);
    this.sunSubLabel.setPosition(sunX, sunY + sunRadius + 40);
    this.sunSubLabel.setColor(this.palette.textSecondary);
    this.sunSubLabel.setVisible(!this.layout.isCompact);
  }

  private createGlobe(): void {
    const key = this.textures.exists(this.earthTextureKey) ? this.earthTextureKey : 'earth';
    const { vertices, uvs, indices } = this.createSphereGeometry(32, 48);
    this.globeMesh = this.add
      .mesh(this.layout.centerX, this.layout.centerY, key, undefined, vertices, uvs, indices, true)
      .setDepth(8);
    this.globeMesh.hideCCW = true;

    // Rim and city pins remain 2D overlays, but their positions are projected
    // from the same latitude/longitude rotation as the textured sphere.
    this.globeContainer = this.add.container(this.layout.centerX, this.layout.centerY).setDepth(10);

    this.globeRim = this.add.graphics();
    this.globeContainer.add(this.globeRim);

    this.layoutGlobe();
  }

  private layoutGlobe(): void {
    const { centerX, centerY, globeRadius } = this.layout;
    const { width, height } = this.scale;

    this.globeContainer.setPosition(centerX, centerY);
    this.globeMesh.setPosition(centerX, centerY);
    this.globeMesh.setSize(width, height);
    this.globeMesh.setOrtho(width, height);
    this.globeMesh.modelScale.set(globeRadius, globeRadius, globeRadius);

    this.globeRim.clear();
    this.globeRim.lineStyle(3, this.palette.secondaryNum, 0.55);
    this.globeRim.strokeCircle(0, 0, globeRadius);
  }

  private createDayNightOverlays(): void {
    this.dayOverlay = this.add.graphics().setDepth(9);
    this.nightOverlay = this.add.graphics().setDepth(9);
    this.terminator = this.add.graphics().setDepth(10);

    this.dayLabel = this.addText(0, 0, '☀️ DAY', {
        fontSize: '16px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.accent,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.nightLabel = this.addText(0, 0, '🌙 NIGHT', {
        fontSize: '16px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.secondary,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.layoutDayNightOverlays();
  }

  private layoutDayNightOverlays(): void {
    const { centerX, centerY, globeRadius } = this.layout;
    const labelY = Math.max(centerY - globeRadius - 28, 92);

    this.dayLabel.setPosition(centerX + globeRadius * 0.55, labelY);
    this.dayLabel.setColor(this.palette.accent);
    this.dayLabel.setStyle({ backgroundColor: this.palette.panelChrome });

    this.nightLabel.setPosition(centerX - globeRadius * 0.55, labelY);
    this.nightLabel.setColor(this.palette.secondary);
    this.nightLabel.setStyle({ backgroundColor: this.palette.panelChrome });
  }

  private createSidePanel(): void {
    this.panelBg = this.add.graphics().setDepth(20);

    this.panelTitle = this.addText(0, 0, 'CITY CHECKLIST', {
        fontSize: '13px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.primary,
      })
      .setDepth(21);

    this.panelInstructions = this.addText(0, 0, '', {
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.textSecondary,
        lineSpacing: 4,
      })
      .setDepth(21);

    this.progressText = this.addText(0, 0, 'Correct: 0 / 3', {
        fontSize: '15px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.accent,
      })
      .setDepth(21);

    this.instructText = this.addText(0, 0, '👆 Drag the Earth to spin it', {
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        color: this.palette.textPrimary,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.layoutSidePanel();
  }

  private layoutSidePanel(): void {
    const { panelX, panelY, panelW, panelH, isCompact } = this.layout;
    const { width, height } = this.scale;

    this.panelBg.clear();
    this.panelBg.fillStyle(this.palette.panelBgNum, this.palette.panelBgAlpha);
    this.panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    this.panelBg.lineStyle(1, this.palette.primaryNum, 0.35);
    this.panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    this.panelTitle.setPosition(panelX + 16, panelY + 14);
    this.panelTitle.setColor(this.palette.primary);

    // Compact keeps the globe full-size and instead uses a shorter, single-line
    // blurb so the checklist below still fits without touching the globe's size.
    this.panelInstructions.setText(
      isCompact ? 'Drag Earth · Right = DAY · Left = NIGHT' : 'Right side faces the Sun = DAY.\nLeft side is in shadow = NIGHT.\n\nSpin until every city matches.'
    );
    this.panelInstructions.setPosition(panelX + 16, panelY + 34);
    this.panelInstructions.setColor(this.palette.textSecondary);
    this.panelInstructions.setStyle({ wordWrap: { width: panelW - 32 } });

    this.progressText.setPosition(panelX + 16, panelY + (isCompact ? 60 : 118));

    // Compact instructions already say to drag Earth; hiding this duplicate
    // banner leaves room for the complete checklist on short phones.
    this.instructText.setVisible(!isCompact);
    this.instructText.setPosition(width / 2, isCompact ? panelY + panelH - 30 : height - 30);
    this.instructText.setStyle({ backgroundColor: this.palette.panelChrome, color: this.palette.textPrimary });

    // The objective needs the full canvas width on mobile. Move Hint into the
    // checklist header where it remains easy to reach without covering text.
    if (this.hintButton) {
      if (isCompact) {
        this.hintButton.setPosition(panelX + panelW - this.hintButton.displayWidth - 14, panelY + 10);
      } else {
        this.hintButton.setPosition(width - 100, 20);
      }
    }
  }

  private createCities(): void {
    // Approximate geographic coordinates. At 0° rotation these project onto
    // the matching landmasses in the Africa/Europe-facing Earth render.
    this.cities = [
      { name: 'New York', abbr: 'NY', latitude: 40.7, longitude: -74.0, targetState: 'night' },
      { name: 'Delhi', abbr: 'DEL', latitude: 28.6, longitude: 77.2, targetState: 'day' },
      { name: 'Nairobi', abbr: 'NBO', latitude: -1.3, longitude: 36.8, targetState: 'day' },
    ];

    const pinStrokeNum = this.palette.theme === 'dark' ? 0xffffff : 0x141028;
    this.cities.forEach((city) => {
      city.pin = this.add.circle(0, 0, 9, this.palette.alertNum, 1).setStrokeStyle(2, pinStrokeNum, 0.9);
      city.pinLabel = this.addText(0, 0, city.abbr, {
          fontSize: '10px',
          fontFamily: 'Orbitron, monospace',
          color: this.palette.textPrimary,
        })
        .setOrigin(0.5);

      this.globeContainer.add(city.pin);
      this.globeContainer.add(city.pinLabel);

      city.checklistRow = this.addText(0, 0, '', {
          fontSize: '13px',
          fontFamily: 'Inter, sans-serif',
          color: this.palette.textPrimary,
          lineSpacing: 2,
        })
        .setDepth(21);
    });

    this.layoutCities();
  }

  private layoutCities(): void {
    const { panelX, panelY, isCompact } = this.layout;
    const rowSpacing = isCompact ? 28 : 46;
    const rowStartY = panelY + (isCompact ? 88 : 150);

    this.cities.forEach((city, index) => {
      city.checklistRow?.setPosition(panelX + 16, rowStartY + index * rowSpacing);
    });

    this.updateCityPositions();
  }

  private createDragControls(): void {
    this.hitZone = this.add
      .circle(this.layout.centerX, this.layout.centerY, this.layout.globeRadius + 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(15);

    this.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.isDragging = true;
      this.hasInteracted = true;
      this.dragStartX = pointer.x;
      this.dragStartRotation = this.globeRotation;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isComplete) return;
      // One globe diameter of horizontal travel equals a half-turn. Vertical
      // movement does not tilt Earth away from its north-south polar axis.
      const delta = ((pointer.x - this.dragStartX) / (this.layout.globeRadius * 2)) * 180;
      this.globeRotation = this.dragStartRotation + delta;
      this.updateGlobe();
      this.checkCompletion();
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.checkCompletion();
    });
  }

  private layoutHitZone(): void {
    this.hitZone.setPosition(this.layout.centerX, this.layout.centerY);
    this.hitZone.setRadius(this.layout.globeRadius + 24);
  }

  /** Build a UV sphere for the equirectangular NASA Earth texture. */
  private createSphereGeometry(latitudeSegments: number, longitudeSegments: number): {
    vertices: number[];
    uvs: number[];
    indices: number[];
  } {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let latIndex = 0; latIndex <= latitudeSegments; latIndex++) {
      const v = latIndex / latitudeSegments;
      const latitude = Math.PI / 2 - v * Math.PI;
      const cosLatitude = Math.cos(latitude);

      for (let lonIndex = 0; lonIndex <= longitudeSegments; lonIndex++) {
        const u = lonIndex / longitudeSegments;
        const longitude = u * Math.PI * 2 - Math.PI;

        vertices.push(
          Math.sin(longitude) * cosLatitude,
          Math.sin(latitude),
          -Math.cos(longitude) * cosLatitude
        );
        // NASA's map follows west-to-east longitude; mirror U to match
        // Phaser Mesh's camera orientation so east remains screen-right.
        uvs.push(1 - u, v);
      }
    }

    const stride = longitudeSegments + 1;
    for (let latIndex = 0; latIndex < latitudeSegments; latIndex++) {
      for (let lonIndex = 0; lonIndex < longitudeSegments; lonIndex++) {
        const topLeft = latIndex * stride + lonIndex;
        const bottomLeft = (latIndex + 1) * stride + lonIndex;
        const topRight = topLeft + 1;
        const bottomRight = bottomLeft + 1;

        indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
      }
    }

    return { vertices, uvs, indices };
  }

  private createEarthTextureFallback(): void {
    if (this.textures.exists('earth')) return;

    const size = 512;
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0x1565c0);
    g.fillCircle(cx, cy, r);

    g.fillStyle(0x43a047, 0.95);
    g.fillEllipse(cx - r * 0.38, cy - r * 0.02, r * 0.26, r * 0.4);
    g.fillEllipse(cx + r * 0.05, cy - r * 0.05, r * 0.16, r * 0.28);
    g.fillEllipse(cx + r * 0.32, cy - r * 0.12, r * 0.22, r * 0.2);
    g.fillEllipse(cx + r * 0.38, cy + r * 0.28, r * 0.09, r * 0.08);

    g.fillStyle(0xe3f2fd, 0.55);
    g.fillEllipse(cx, cy - r * 0.78, r * 0.28, r * 0.1);
    g.fillEllipse(cx, cy + r * 0.78, r * 0.26, r * 0.09);

    g.lineStyle(5, 0x81d4fa, 0.5);
    g.strokeCircle(cx, cy, r - 3);

    g.generateTexture('earth', size, size);
    g.destroy();
  }

  /** Longitude after rotating Earth around its vertical north-south axis. */
  private cityWorldLongitude(city: City): number {
    return Phaser.Math.DegToRad(city.longitude - this.globeRotation + 180);
  }

  private getCityState(city: City): 'day' | 'night' {
    const latitude = Phaser.Math.DegToRad(city.latitude);
    const sunwardX = Math.sin(this.cityWorldLongitude(city)) * Math.cos(latitude);
    return sunwardX > 0.08 ? 'day' : 'night';
  }

  /**
   * Orthographic projection for rotation around the polar axis:
   * longitude changes horizontal position, latitude keeps vertical position.
   * Pins on the far hemisphere are hidden until they rotate back into view.
   */
  private updateCityPositions(): void {
    // Match the sphere surface closely; a slight inset keeps the pin stroke
    // inside the rim at near-horizon longitudes.
    const projectionRadius = this.layout.globeRadius * 0.95;

    this.cities.forEach((city) => {
      const latitude = Phaser.Math.DegToRad(city.latitude);
      const longitude = this.cityWorldLongitude(city);
      const cosLatitude = Math.cos(latitude);
      const x = Math.sin(longitude) * cosLatitude * projectionRadius;
      const y = -Math.sin(latitude) * projectionRadius;
      const isFrontFacing = Math.cos(longitude) * cosLatitude >= 0;

      city.pin?.setPosition(x, y).setVisible(isFrontFacing);
      city.pinLabel?.setPosition(x, y - 18).setVisible(isFrontFacing);
    });
  }

  private updateGlobe(): void {
    // Rotate the textured sphere and city coordinates by the same longitude.
    // The north-south axis remains vertical; continents and pins stay attached.
    this.globeContainer.setRotation(0);
    // Phaser views the mesh along negative Z; the mirrored UV convention keeps
    // east on screen-right as this value turns through longitude.
    this.globeMesh.modelRotation.y = Phaser.Math.DegToRad(-this.globeRotation);
    this.updateCityPositions();
    this.drawDayNight();
    this.updateChecklist();
  }

  private drawDayNight(): void {
    const { centerX: cx, centerY: cy, globeRadius: r } = this.layout;

    this.dayOverlay.clear();
    this.nightOverlay.clear();
    this.terminator.clear();

    this.dayOverlay.fillStyle(this.palette.accentNum, this.palette.theme === 'dark' ? 0.16 : 0.1);
    this.dayOverlay.beginPath();
    this.dayOverlay.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    this.dayOverlay.lineTo(cx, cy);
    this.dayOverlay.closePath();
    this.dayOverlay.fillPath();

    this.nightOverlay.fillStyle(0x0d1b3e, this.palette.theme === 'dark' ? 0.42 : 0.28);
    this.nightOverlay.beginPath();
    this.nightOverlay.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    this.nightOverlay.lineTo(cx, cy);
    this.nightOverlay.closePath();
    this.nightOverlay.fillPath();

    this.terminator.lineStyle(3, this.palette.theme === 'dark' ? 0xffffff : 0x141028, 0.9);
    this.terminator.lineBetween(cx, cy - r, cx, cy + r);
    this.terminator.lineStyle(1, this.palette.primaryNum, 0.7);
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
        city.pin.setFillStyle(isCorrect ? this.palette.primaryNum : this.palette.alertNum, 1);
      }

      if (city.checklistRow) {
        city.checklistRow.setColor(isCorrect ? this.palette.primary : this.palette.textPrimary);
        city.checklistRow.setText(this.layout.isCompact
          ? `${isCorrect ? '✓' : '○'} ${city.name} · Need ${targetEmoji} · Now ${nowEmoji}`
          : `${isCorrect ? '✓' : '○'} ${city.name}\n   Need ${targetEmoji} ${city.targetState} · Now ${nowEmoji}`
        );
      }
    });

    this.progressText.setText(`Correct: ${correct} / ${this.cities.length}`);
    this.progressText.setColor(correct === this.cities.length ? this.palette.primary : this.palette.accent);
  }

  private checkCompletion(): void {
    if (this.isComplete || !this.hasInteracted) return;

    const allCorrect = this.cities.every((city) => this.getCityState(city) === city.targetState);
    if (!allCorrect) return;

    this.isComplete = true;
    this.hitZone.disableInteractive();

    // Let the player see the fully-matched checklist before anything else changes.
    this.time.delayedCall(900, () => {
      this.instructText.setText('All cities match — great spinning, Cadet!');
      this.instructText.setColor(this.palette.primary);
    });

    this.time.delayedCall(2100, () => this.showSuccess());
    this.time.delayedCall(3600, () => this.completeMission(100));
  }

  private showSuccess(): void {
    const successText = this.addText(this.layout.centerX, this.layout.centerY, '🎉 Mission Complete!', {
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
    const hintText = this.addText(
        this.scale.width / 2,
        this.scale.height / 2,
        'The Sun is on the RIGHT.\nCities on the right half are in DAY.\nCities on the left half are in NIGHT.\n\nSpin until New York is on the night side,\nand Delhi + Nairobi face the Sun.',
        {
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          color: this.palette.accent,
          backgroundColor: this.palette.panelChrome,
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
