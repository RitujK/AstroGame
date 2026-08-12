/* Mission 3: Seasons & Axial Tilt — Tilt + Orbit Lab with kid-friendly place cards */

import { BaseMissionScene } from './BaseMissionScene';

type SeasonName = 'Winter' | 'Spring' | 'Summer' | 'Fall';
type Hemisphere = 'north' | 'south';

interface SeasonScenario {
  title: string;
  cue: string;
  place: string;
  hemisphere: Hemisphere;
  season: SeasonName;
  /** Ideal orbit angle in degrees (0 = Dec NH-winter, 180 = Jun NH-summer) */
  targetOrbit: number;
  realWorldFact: string;
  hint: string;
}

interface SeasonState {
  season: SeasonName;
  sunHeight: number; // 0 low → 1 high
  dayLength: number; // 0 short → 1 long
}

const SEASON_SCENARIOS: SeasonScenario[] = [
  {
    title: 'WINTER IN THE NORTH',
    cue: 'Brr! It’s cold in New York. Make it winter in the Northern Hemisphere.',
    place: 'New York',
    hemisphere: 'north',
    season: 'Winter',
    targetOrbit: 0,
    realWorldFact:
      'When the North Pole tilts away from the Sun, days are short and the Sun sits low — winter up north, summer down south.',
    hint: 'Move Earth to December (right side of the orbit) and keep the tilt near 23.5°. The North Pole should lean away from the Sun.',
  },
  {
    title: 'SUMMER IN THE NORTH',
    cue: 'Hot summer in Delhi! Make it summer in the Northern Hemisphere.',
    place: 'Delhi',
    hemisphere: 'north',
    season: 'Summer',
    targetOrbit: 180,
    realWorldFact:
      'When the North Pole tilts toward the Sun, days are long and the Sun rides high — summer up north, winter down south.',
    hint: 'Slide the year toward June (left side of the orbit). Keep tilt near 23.5° so the North Pole leans toward the Sun.',
  },
  {
    title: 'WINTER IN THE SOUTH',
    cue: 'Sydney in July — time for a coat! Make it winter in the Southern Hemisphere.',
    place: 'Sydney',
    hemisphere: 'south',
    season: 'Winter',
    targetOrbit: 180,
    realWorldFact:
      'Same orbit spot flips seasons: when it’s summer in Delhi, Sydney is in winter because the South Pole leans away.',
    hint: 'Use the June position again — but this time check the South card. Opposite hemispheres always have opposite seasons.',
  },
  {
    title: 'SUMMER IN THE SOUTH',
    cue: 'Beach weather in Sydney! Make it summer in the Southern Hemisphere.',
    place: 'Sydney',
    hemisphere: 'south',
    season: 'Summer',
    targetOrbit: 0,
    realWorldFact:
      'In December the South Pole tilts toward the Sun — beach weather in Sydney while New York bundles up.',
    hint: 'Go back to December. Watch the South card turn warm while the North card gets cold.',
  },
];

const ORBIT_TOLERANCE = 18;
const TILT_MIN = 15;
const TILT_MAX = 32;
const DEFAULT_TILT = 23.5;

const SEASON_EMOJI: Record<SeasonName, string> = {
  Winter: '❄️',
  Spring: '🌸',
  Summer: '☀️',
  Fall: '🍂',
};

const SEASON_CLOTHES: Record<SeasonName, string> = {
  Winter: '🧥',
  Spring: '🧥',
  Summer: '🩳',
  Fall: '🧥',
};

export class Mission03Scene extends BaseMissionScene {
  private readonly earthTextureKey = 'earthMapM3';
  private uiPanels!: Phaser.GameObjects.Graphics;
  private spaceGfx!: Phaser.GameObjects.Graphics;
  private groundGfx!: Phaser.GameObjects.Graphics;
  private orbitTrack!: Phaser.GameObjects.Graphics;
  private orbitKnob!: Phaser.GameObjects.Graphics;
  private tiltTrack!: Phaser.GameObjects.Graphics;
  private tiltKnob!: Phaser.GameObjects.Graphics;

  private sunText!: Phaser.GameObjects.Image;
  private earthBody!: Phaser.GameObjects.Mesh;
  private earthHitZone!: Phaser.GameObjects.Arc;
  private axisGfx!: Phaser.GameObjects.Graphics;
  private distanceNote!: Phaser.GameObjects.Text;

  private targetText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private orbitLabel!: Phaser.GameObjects.Text;
  private tiltLabel!: Phaser.GameObjects.Text;
  private lockButton!: Phaser.GameObjects.Text;
  private dragInstruction!: Phaser.GameObjects.Text;
  private poleLabel!: Phaser.GameObjects.Text;
  private monthButtons: Phaser.GameObjects.Text[] = [];
  private orbitStopLabels: Phaser.GameObjects.Text[] = [];

  private northTitle!: Phaser.GameObjects.Text;
  private northDetail!: Phaser.GameObjects.Text;
  private southTitle!: Phaser.GameObjects.Text;
  private southDetail!: Phaser.GameObjects.Text;

  private orbitHit!: Phaser.GameObjects.Rectangle;
  private tiltHit!: Phaser.GameObjects.Rectangle;

  private targetPanel = new Phaser.Geom.Rectangle();
  private spacePanel = new Phaser.Geom.Rectangle();
  private northPanel = new Phaser.Geom.Rectangle();
  private southPanel = new Phaser.Geom.Rectangle();
  private controlsPanel = new Phaser.Geom.Rectangle();

  private sunX = 0;
  private sunY = 0;
  private orbitRadius = 0;
  private orbitDepthRadius = 0;
  private earthRadius = 28;

  /** 0 = Dec NH-winter, 180 = Jun NH-summer */
  private orbitAngle = 90;
  private tiltDeg = 8;

  private orbitSlider = { x: 0, y: 0, w: 0 };
  private tiltSlider = { x: 0, y: 0, w: 0 };

  private currentScenario = 0;
  private completedCount = 0;
  private isComplete = false;
  private draggingEarth = false;
  private draggingOrbit = false;
  private draggingTilt = false;

  preload(): void {
    super.preload();
    this.load.image(this.earthTextureKey, '/assets/images/earth-equirectangular.jpg');
  }

  create(): void {
    this.missionId = 3;
    const { width, height } = this.scale;

    this.createEarthTexture();
    this.createSunTexture();
    this.createHUD();
    this.updateObjective('Move Earth around the Sun and set the tilt. Match 4 seasons, then Lock In.');

    this.uiPanels = this.add.graphics().setScrollFactor(0).setDepth(2);
    this.spaceGfx = this.add.graphics().setScrollFactor(0).setDepth(5);
    this.groundGfx = this.add.graphics().setScrollFactor(0).setDepth(6);
    this.axisGfx = this.add.graphics().setScrollFactor(0).setDepth(25);

    this.sunText = this.add.image(0, 0, 'sun_m3').setOrigin(0.5).setDepth(20);

    const earthTexture = this.textures.exists(this.earthTextureKey) ? this.earthTextureKey : 'earth_m3';
    const sphere = this.createSphereGeometry(24, 36);
    this.earthBody = this.add
      .mesh(0, 0, earthTexture, undefined, sphere.vertices, sphere.uvs, sphere.indices, true)
      .setDepth(22);
    this.earthBody.hideCCW = true;
    this.earthHitZone = this.add.circle(0, 0, this.earthRadius + 12, 0x000000, 0).setDepth(120);
    this.earthHitZone.setInteractive({ useHandCursor: true });

    this.earthHitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.draggingEarth = true;
      this.setOrbitFromPoint(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      if (this.draggingEarth) this.setOrbitFromPoint(pointer.x, pointer.y);
      if (this.draggingOrbit) this.setOrbitFromPointerX(pointer.x);
      if (this.draggingTilt) this.setTiltFromPointerX(pointer.x);
    });
    this.input.on('pointerup', () => {
      if (this.draggingEarth) this.snapOrbitToNearestStop();
      if (this.draggingOrbit) this.snapOrbitToNearestStop();
      this.draggingEarth = false;
      this.draggingOrbit = false;
      this.draggingTilt = false;
    });

    this.distanceNote = this.addText(0, 0, 'Same distance. Different sunlight angle.', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textTertiary,
    })
      .setOrigin(0.5)
      .setDepth(30);

    this.targetText = this.addText(0, 0, '', {
      fontSize: '16px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 10, y: 6 },
    }).setDepth(100);

    this.progressText = this.addText(0, 0, '', {
      fontSize: '15px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    })
      .setOrigin(1, 0)
      .setDepth(100);

    this.dragInstruction = this.addText(0, 0, 'DRAG THE GLOBE AROUND THE SUN', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    })
      .setOrigin(0.5)
      .setDepth(100);

    this.poleLabel = this.addText(0, 0, 'N', {
      fontSize: '12px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.alert,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 4, y: 2 },
    })
      .setOrigin(0.5)
      .setDepth(110);

    this.northTitle = this.addText(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
    }).setDepth(100);

    this.northDetail = this.addText(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textPrimary,
      lineSpacing: 3,
    }).setDepth(100);

    this.southTitle = this.addText(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
    }).setDepth(100);

    this.southDetail = this.addText(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textPrimary,
      lineSpacing: 3,
    }).setDepth(100);

    this.lockButton = this.addText(width / 2, height - 118, 'LOCK IN MY ANSWER  →', {
      fontSize: '18px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.btnOnPrimary,
      backgroundColor: this.palette.primary,
      padding: { x: 22, y: 11 },
    })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tryLockIn())
      .on('pointerover', () => this.lockButton.setStyle({ backgroundColor: this.palette.secondary }))
      .on('pointerout', () => this.lockButton.setStyle({ backgroundColor: this.palette.primary }));

    this.orbitTrack = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.orbitKnob = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.tiltTrack = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.tiltKnob = this.add.graphics().setScrollFactor(0).setDepth(101);

    this.orbitLabel = this.addText(0, 0, 'TIME OF YEAR', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textTertiary,
    })
      .setOrigin(0.5)
      .setDepth(100);

    this.tiltLabel = this.addText(0, 0, 'EARTH’S TILT · 23.5°', {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textTertiary,
    })
      .setOrigin(0.5)
      .setDepth(100);

    ['DEC', 'MAR', 'JUN', 'SEP'].forEach((month, index) => {
      const button = this.addText(0, 0, month, {
        fontSize: '11px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.textSecondary,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 9, y: 5 },
      })
        .setOrigin(0.5)
        .setDepth(105)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.isComplete) return;
          this.orbitAngle = index * 90;
          this.syncVisuals();
        });
      this.monthButtons.push(button);

      const orbitLabel = this.addText(0, 0, month, {
        fontSize: '10px',
        fontFamily: 'Orbitron, monospace',
        color: this.palette.textTertiary,
      })
        .setOrigin(0.5)
        .setDepth(90);
      this.orbitStopLabels.push(orbitLabel);
    });

    this.orbitHit = this.add
      .rectangle(0, 0, 10, 30, 0x000000, 0)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    this.tiltHit = this.add
      .rectangle(0, 0, 10, 30, 0x000000, 0)
      .setDepth(102)
      .setInteractive({ useHandCursor: true });

    this.orbitHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.draggingOrbit = true;
      this.setOrbitFromPointerX(pointer.x);
    });
    this.tiltHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isComplete) return;
      this.draggingTilt = true;
      this.setTiltFromPointerX(pointer.x);
    });

    this.layoutMission(width, height);
    this.updateScenarioUI();
    this.syncVisuals();
  }

  private isCompactLayout(width = this.scale.width, height = this.scale.height): boolean {
    return width < 900 || height < 620;
  }

  protected onSceneResize(width: number, height: number): void {
    if (!this.earthBody) return;
    this.layoutMission(width, height);
    this.updateScenarioUI();
    this.syncVisuals();
  }

  private layoutMission(width: number, height: number): void {
    const isCompact = this.isCompactLayout(width, height);

    if (isCompact) {
      this.controlsPanel.setTo(14, height - 170, width - 28, 156);
      const groundH = height < 700 ? 112 : 138;
      const spaceH = Math.max(
        190,
        Math.min(310, this.controlsPanel.y - 138 - groundH - 20)
      );
      this.targetPanel.setTo(14, 68, width - 28, 58);
      this.spacePanel.setTo(14, 138, width - 28, spaceH);
      const groundY = this.spacePanel.bottom + 10;
      const half = (width - 28 - 10) / 2;
      this.northPanel.setTo(14, groundY, half, groundH);
      this.southPanel.setTo(14 + half + 10, groundY, half, groundH);
    } else {
      this.controlsPanel.setTo(20, height - 150, width - 40, 130);
      this.targetPanel.setTo(20, 68, width - 40, 58);
      const contentTop = 138;
      const contentBottom = this.controlsPanel.y - 12;
      const availableWidth = width - 40;
      const spaceW = Math.round((availableWidth - 16) * 0.64);
      this.spacePanel.setTo(20, contentTop, spaceW, contentBottom - contentTop);
      const cardGap = 16;
      const cardW = width - this.spacePanel.right - cardGap - 20;
      const cardH = Math.floor((contentBottom - contentTop - cardGap) / 2);
      this.northPanel.setTo(this.spacePanel.right + cardGap, contentTop, cardW, cardH);
      this.southPanel.setTo(
        this.spacePanel.right + cardGap,
        this.northPanel.bottom + cardGap,
        cardW,
        cardH
      );
    }

    this.sunX = this.spacePanel.centerX;
    this.sunY = this.spacePanel.centerY + (isCompact ? 8 : 12);
    this.orbitRadius = Math.min(
      this.spacePanel.width * (isCompact ? 0.38 : 0.4),
      (this.spacePanel.height - 68) * 0.7
    );
    this.orbitDepthRadius = Math.max(42, this.orbitRadius * (isCompact ? 0.38 : 0.44));
    this.earthRadius = isCompact ? 30 : 42;
    this.earthBody.setSize(width, height);
    this.earthBody.setOrtho(width, height);
    this.sunText.setDisplaySize(isCompact ? 54 : 72, isCompact ? 54 : 72);

    this.updateObjective(
      isCompact
        ? 'Drag Earth. Watch the place cards. Lock in.'
        : 'Drag Earth around the Sun. Watch the place cards change, then lock in your answer.'
    );

    this.targetText.setPosition(this.targetPanel.x + 10, this.targetPanel.y + 10);
    this.progressText.setPosition(this.targetPanel.right - 12, this.targetPanel.y + 15);
    this.dragInstruction.setPosition(this.spacePanel.centerX, this.spacePanel.y + 16);
    this.distanceNote.setPosition(this.spacePanel.centerX, this.spacePanel.bottom - 12);

    this.northTitle.setPosition(this.northPanel.x + 12, this.northPanel.y + 10);
    this.northDetail
      .setPosition(this.northPanel.x + 12, this.northPanel.y + 32)
      .setFontSize(isCompact ? '12px' : '15px')
      .setStyle({ wordWrap: { width: this.northPanel.width - 24 } });
    this.southTitle.setPosition(this.southPanel.x + 12, this.southPanel.y + 10);
    this.southDetail
      .setPosition(this.southPanel.x + 12, this.southPanel.y + 32)
      .setFontSize(isCompact ? '12px' : '15px')
      .setStyle({ wordWrap: { width: this.southPanel.width - 24 } });

    if (isCompact) {
      this.lockButton.setPosition(this.controlsPanel.centerX, this.controlsPanel.y + 20);
      this.lockButton.setFontSize('16px');
      const sliderW = this.controlsPanel.width - 34;
      this.orbitSlider = {
        x: this.controlsPanel.x + 17,
        y: this.controlsPanel.y + 82,
        w: sliderW,
      };
      this.tiltSlider = {
        x: this.controlsPanel.x + 17,
        y: this.controlsPanel.y + 132,
        w: sliderW,
      };
      this.orbitLabel.setPosition(this.controlsPanel.centerX, this.orbitSlider.y - 23);
      this.tiltLabel.setPosition(this.controlsPanel.centerX, this.tiltSlider.y - 21);
    } else {
      this.orbitSlider = {
        x: this.controlsPanel.x + 24,
        y: this.controlsPanel.centerY + 18,
        w: this.controlsPanel.width * 0.36,
      };
      this.tiltSlider = {
        x: this.orbitSlider.x + this.orbitSlider.w + 34,
        y: this.controlsPanel.centerY + 18,
        w: this.controlsPanel.width * 0.22,
      };
      const lockAreaLeft = this.tiltSlider.x + this.tiltSlider.w + 20;
      this.lockButton.setPosition(
        lockAreaLeft + (this.controlsPanel.right - lockAreaLeft) / 2,
        this.controlsPanel.centerY + 8
      );
      this.lockButton.setFontSize('16px');
      this.orbitLabel.setPosition(
        this.orbitSlider.x + this.orbitSlider.w / 2,
        this.orbitSlider.y - 23
      );
      this.tiltLabel.setPosition(
        this.tiltSlider.x + this.tiltSlider.w / 2,
        this.tiltSlider.y - 21
      );
    }

    this.monthButtons.forEach((button, index) => {
      button.setPosition(this.orbitSlider.x + (index / 3) * this.orbitSlider.w, this.orbitSlider.y);
    });

    this.orbitHit
      .setPosition(this.orbitSlider.x + this.orbitSlider.w / 2, this.orbitSlider.y)
      .setSize(this.orbitSlider.w, 28)
      .setDisplaySize(this.orbitSlider.w, 28);
    this.tiltHit
      .setPosition(this.tiltSlider.x + this.tiltSlider.w / 2, this.tiltSlider.y)
      .setSize(this.tiltSlider.w, 28)
      .setDisplaySize(this.tiltSlider.w, 28);

    this.drawUIPanels();
    this.drawSliders();
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
      this.spacePanel,
      this.palette.spaceLightNum,
      this.palette.theme === 'dark' ? 0.78 : 0.92,
      this.palette.secondaryNum,
      this.palette.theme === 'dark' ? 0.28 : 0.2
    );
    drawPanel(
      this.northPanel,
      this.palette.panelBgNum,
      this.palette.theme === 'dark' ? 0.9 : 1,
      this.palette.accentNum,
      this.palette.theme === 'dark' ? 0.4 : 0.3
    );
    drawPanel(
      this.southPanel,
      this.palette.panelBgNum,
      this.palette.theme === 'dark' ? 0.9 : 1,
      this.palette.accentNum,
      this.palette.theme === 'dark' ? 0.4 : 0.3
    );
    drawPanel(
      this.controlsPanel,
      this.palette.panelBgNum,
      this.palette.theme === 'dark' ? 0.9 : 1,
      this.palette.primaryNum,
      this.palette.theme === 'dark' ? 0.28 : 0.2
    );
  }

  private drawSliders(): void {
    this.drawSliderTrack(this.orbitTrack, this.orbitSlider.x, this.orbitSlider.y, this.orbitSlider.w);
    this.drawSliderTrack(this.tiltTrack, this.tiltSlider.x, this.tiltSlider.y, this.tiltSlider.w);
    const idealX = this.tiltSlider.x + (TILT_MIN / 45) * this.tiltSlider.w;
    const idealW = ((TILT_MAX - TILT_MIN) / 45) * this.tiltSlider.w;
    this.tiltTrack.fillStyle(this.palette.accentNum, 0.28);
    this.tiltTrack.fillRoundedRect(idealX, this.tiltSlider.y - 6, idealW, 12, 6);
    const earthTiltX = this.tiltSlider.x + (DEFAULT_TILT / 45) * this.tiltSlider.w;
    this.tiltTrack.lineStyle(2, this.palette.accentNum, 0.9);
    this.tiltTrack.lineBetween(earthTiltX, this.tiltSlider.y - 10, earthTiltX, this.tiltSlider.y + 10);
    this.updateOrbitKnob();
    this.updateTiltKnob();
  }

  private drawSliderTrack(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number
  ): void {
    gfx.clear();
    gfx.fillStyle(this.palette.spaceLightNum, 0.9);
    gfx.fillRoundedRect(x, y - 6, w, 12, 6);
    gfx.lineStyle(1, this.palette.primaryNum, 0.5);
    gfx.strokeRoundedRect(x, y - 6, w, 12, 6);
  }

  private updateOrbitKnob(): void {
    const stopIndex = Math.round(this.orbitAngle / 90) % 4;
    const t = stopIndex / 3;
    const knobX = this.orbitSlider.x + t * this.orbitSlider.w;
    const stroke = this.palette.theme === 'dark' ? 0xffffff : 0x141028;
    this.orbitKnob.clear();
    this.orbitKnob.fillStyle(this.palette.primaryNum, 1);
    this.orbitKnob.fillCircle(knobX, this.orbitSlider.y, 12);
    this.orbitKnob.lineStyle(2, stroke, 0.8);
    this.orbitKnob.strokeCircle(knobX, this.orbitSlider.y, 12);
  }

  private updateTiltKnob(): void {
    const t = (this.tiltDeg - 0) / 45;
    const knobX = this.tiltSlider.x + Phaser.Math.Clamp(t, 0, 1) * this.tiltSlider.w;
    const stroke = this.palette.theme === 'dark' ? 0xffffff : 0x141028;
    this.tiltKnob.clear();
    this.tiltKnob.fillStyle(this.palette.accentNum, 1);
    this.tiltKnob.fillCircle(knobX, this.tiltSlider.y, 12);
    this.tiltKnob.lineStyle(2, stroke, 0.8);
    this.tiltKnob.strokeCircle(knobX, this.tiltSlider.y, 12);
  }

  private setOrbitFromPointerX(pointerX: number): void {
    const t = Phaser.Math.Clamp((pointerX - this.orbitSlider.x) / this.orbitSlider.w, 0, 1);
    this.orbitAngle = Math.round(t * 3) * 90;
    this.syncVisuals();
  }

  private setOrbitFromPoint(pointerX: number, pointerY: number): void {
    // Angle of the pointer around the Sun (ellipse-normalized). Earth stays on
    // the same ray so it tracks the cursor instead of orbiting against it.
    const angle = Phaser.Math.RadToDeg(
      Math.atan2(
        (pointerY - this.sunY) / Math.max(this.orbitDepthRadius, 1),
        (pointerX - this.sunX) / Math.max(this.orbitRadius, 1)
      )
    );
    this.orbitAngle = (angle + 360) % 360;
    this.syncVisuals();
  }

  private snapOrbitToNearestStop(): void {
    this.orbitAngle = (Math.round(this.orbitAngle / 90) * 90) % 360;
    this.syncVisuals();
  }

  private setTiltFromPointerX(pointerX: number): void {
    const t = Phaser.Math.Clamp((pointerX - this.tiltSlider.x) / this.tiltSlider.w, 0, 1);
    this.tiltDeg = t * 45;
    this.syncVisuals();
  }

  update(_time: number, delta: number): void {
    if (this.earthBody) {
      this.earthBody.modelRotation.y += delta * 0.00008;
    }
  }

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

  private createSunTexture(): void {
    if (this.textures.exists('sun_m3')) return;
    const size = 128;
    const canvas = this.textures.createCanvas('sun_m3', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 6, center, center, center);
    gradient.addColorStop(0, '#fffde7');
    gradient.addColorStop(0.24, '#fff176');
    gradient.addColorStop(0.52, '#ffb300');
    gradient.addColorStop(0.72, 'rgba(255, 107, 0, 0.72)');
    gradient.addColorStop(1, 'rgba(255, 107, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  private createEarthTexture(): void {
    if (this.textures.exists('earth_m3')) return;
    const size = 96;
    const canvas = this.textures.createCanvas('earth_m3', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 3;
    const grad = ctx.createRadialGradient(cx - 8, cy - 8, r * 0.2, cx, cy, r);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(0.55, '#1a5490');
    grad.addColorStop(1, '#0a2a50');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = '#2d5016';
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 8, 18, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 16, cy + 12, 14, 11, -0.2, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();
  }

  private syncVisuals(): void {
    this.drawSpaceView();
    this.drawGroundCards();
    this.updateOrbitKnob();
    this.updateTiltKnob();
    this.orbitLabel.setText(`TIME OF YEAR · ${this.monthLabel(this.orbitAngle).toUpperCase()}`);
    const tiltReady = this.tiltMatches();
    this.tiltLabel.setText(
      `EARTH’S TILT · ${this.tiltDeg.toFixed(1)}°  ${tiltReady ? '✓ EARTH-LIKE' : '→ aim near 23.5°'}`
    );
    const scenario = this.getScenario();
    const ready =
      tiltReady && this.orbitMatches(scenario.targetOrbit) && this.seasonMatches(scenario);
    this.lockButton.setText(ready ? '✓ READY — LOCK IN' : 'LOCK IN MY ANSWER  →');
    const activeStop = Math.round(this.orbitAngle / 90) % 4;
    this.monthButtons.forEach((button, index) => {
      const active = index === activeStop;
      button.setStyle({
        color: active ? this.palette.btnOnPrimary : this.palette.textSecondary,
        backgroundColor: active ? this.palette.primary : this.palette.panelChrome,
      });
    });
  }

  private monthLabel(angle: number): string {
    const a = ((angle % 360) + 360) % 360;
    if (a < 45 || a >= 315) return 'December';
    if (a < 135) return 'March';
    if (a < 225) return 'June';
    return 'September';
  }

  private drawSpaceView(): void {
    this.spaceGfx.clear();
    this.axisGfx.clear();

    // Orbital plane projected in perspective. The upper half is behind the Sun;
    // the lower half is closer to the viewer.
    const orbitPoints = 72;
    for (let i = 0; i < orbitPoints; i++) {
      const a1 = (i / orbitPoints) * Math.PI * 2;
      const a2 = ((i + 1) / orbitPoints) * Math.PI * 2;
      const front = Math.sin((a1 + a2) / 2) >= 0;
      this.spaceGfx.lineStyle(
        front ? 3 : 2,
        this.palette.primaryNum,
        front
          ? this.palette.theme === 'dark'
            ? 0.62
            : 0.72
          : this.palette.theme === 'dark'
            ? 0.2
            : 0.3
      );
      this.spaceGfx.lineBetween(
        this.sunX + Math.cos(a1) * this.orbitRadius,
        this.sunY + Math.sin(a1) * this.orbitDepthRadius,
        this.sunX + Math.cos(a2) * this.orbitRadius,
        this.sunY + Math.sin(a2) * this.orbitDepthRadius
      );
    }

    // Solstice markers
    const markers: Array<{ angle: number; label: string }> = [
      { angle: 0, label: 'Dec' },
      { angle: 90, label: 'Mar' },
      { angle: 180, label: 'Jun' },
      { angle: 270, label: 'Sep' },
    ];
    markers.forEach(({ angle }, index) => {
      const rad = Phaser.Math.DegToRad(angle);
      const mx = this.sunX + Math.cos(rad) * this.orbitRadius;
      const my = this.sunY + Math.sin(rad) * this.orbitDepthRadius;
      this.spaceGfx.fillStyle(this.palette.secondaryNum, 0.7);
      this.spaceGfx.fillCircle(mx, my, 4);
      const labelOffsetX = angle === 0 ? 22 : angle === 180 ? -22 : 0;
      const labelOffsetY = angle === 90 ? 15 : angle === 270 ? -15 : 0;
      this.orbitStopLabels[index].setPosition(mx + labelOffsetX, my + labelOffsetY);
    });

    // Sun rays (sun is center of orbit diagram)
    this.sunText.setPosition(this.sunX, this.sunY);
    this.spaceGfx.fillStyle(this.palette.accentNum, 0.2);
    this.spaceGfx.fillCircle(this.sunX, this.sunY, 22);

    const earthPos = this.earthPosition();
    this.earthBody.setPosition(earthPos.x, earthPos.y);
    this.earthHitZone.setPosition(earthPos.x, earthPos.y);
    const depth = Math.sin(Phaser.Math.DegToRad(this.orbitAngle));
    const perspectiveScale = Phaser.Math.Linear(0.78, 1.08, (depth + 1) / 2);
    const globeScale = this.earthRadius * perspectiveScale;
    this.earthBody.modelScale.set(globeScale, globeScale, globeScale);
    this.earthHitZone.setRadius(globeScale + 12);
    const earthDepth = depth >= 0 ? 24 : 4;
    this.earthBody.setDepth(earthDepth);
    this.earthHitZone.setDepth(120);

    // Sunlight toward Earth — three parallel rays make direction obvious.
    this.spaceGfx.lineStyle(2, this.palette.accentNum, this.palette.theme === 'dark' ? 0.45 : 0.6);
    const dx = earthPos.x - this.sunX;
    const dy = earthPos.y - this.sunY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const startX = this.sunX + ux * 26;
    const startY = this.sunY + uy * 26;
    const endX = earthPos.x - ux * (globeScale + 4);
    const endY = earthPos.y - uy * (globeScale + 4);
    const px = -uy;
    const py = ux;
    [-8, 0, 8].forEach((offset) => {
      this.spaceGfx.lineBetween(
        startX + px * offset,
        startY + py * offset,
        endX + px * offset,
        endY + py * offset
      );
    });

    // Drag affordance around Earth.
    this.spaceGfx.lineStyle(2, this.palette.primaryNum, 0.55);
    this.spaceGfx.strokeCircle(earthPos.x, earthPos.y, globeScale + 7);

    // Tilt axis stays parallel through the orbit. The N endpoint leans right:
    // at December (Earth right of Sun) that is AWAY from the Sun; at June
    // (Earth left of Sun) it is TOWARD the Sun.
    const lean = Phaser.Math.DegToRad(this.tiltDeg) * 0.9;
    const axisAngle = -Math.PI / 2 + lean;
    const axisLen = globeScale + 18;
    const ax = Math.cos(axisAngle);
    const ay = Math.sin(axisAngle);
    this.axisGfx.lineStyle(3, this.palette.alertNum, 0.95);
    this.axisGfx.lineBetween(
      earthPos.x - ax * axisLen,
      earthPos.y - ay * axisLen,
      earthPos.x + ax * axisLen,
      earthPos.y + ay * axisLen
    );
    // N pole marker
    this.axisGfx.fillStyle(this.palette.alertNum, 1);
    this.axisGfx.fillTriangle(
      earthPos.x + ax * axisLen,
      earthPos.y + ay * axisLen,
      earthPos.x + ax * (axisLen - 10) + ay * 5,
      earthPos.y + ay * (axisLen - 10) - ax * 5,
      earthPos.x + ax * (axisLen - 10) - ay * 5,
      earthPos.y + ay * (axisLen - 10) + ax * 5
    );
    this.poleLabel.setPosition(earthPos.x + ax * (axisLen + 12), earthPos.y + ay * (axisLen + 12));
  }

  private earthPosition(): { x: number; y: number } {
    const rad = Phaser.Math.DegToRad(this.orbitAngle);
    return {
      x: this.sunX + Math.cos(rad) * this.orbitRadius,
      y: this.sunY + Math.sin(rad) * this.orbitDepthRadius,
    };
  }

  /**
   * Educational season model:
   * NH sun score peaks at June (orbit 180°) and bottoms at December (orbit 0°).
   * Stronger tilt strengthens seasons; near-zero tilt → mild / equinox-like.
   */
  private computeHemisphere(hemisphere: Hemisphere): SeasonState {
    const tiltStrength = Phaser.Math.Clamp(this.tiltDeg / DEFAULT_TILT, 0, 1.4);
    const nhScore = -Math.cos(Phaser.Math.DegToRad(this.orbitAngle)) * tiltStrength;
    const score = hemisphere === 'north' ? nhScore : -nhScore;

    let season: SeasonName;
    if (score < -0.55) season = 'Winter';
    else if (score < -0.12) season = 'Fall';
    else if (score < 0.12) season = Math.sin(Phaser.Math.DegToRad(this.orbitAngle)) >= 0 ? 'Spring' : 'Fall';
    else if (score < 0.55) season = 'Spring';
    else season = 'Summer';

    const sunHeight = Phaser.Math.Clamp((score + 1) / 2, 0.12, 0.95);
    const dayLength = Phaser.Math.Clamp((score + 1) / 2, 0.18, 0.95);
    return { season, sunHeight, dayLength };
  }

  private drawGroundCards(): void {
    this.groundGfx.clear();
    const scenario = this.getScenario();
    const north = this.computeHemisphere('north');
    const south = this.computeHemisphere('south');

    this.paintCardScene(this.northPanel, north);
    this.paintCardScene(this.southPanel, south);
    const targetRect = scenario.hemisphere === 'north' ? this.northPanel : this.southPanel;
    this.groundGfx.lineStyle(3, this.palette.accentNum, 0.95);
    this.groundGfx.strokeRoundedRect(
      targetRect.x + 2,
      targetRect.y + 2,
      targetRect.width - 4,
      targetRect.height - 4,
      12
    );

    this.northTitle.setText(
      scenario.hemisphere === 'north' ? `🎯 ${scenario.place.toUpperCase()} · NORTH` : 'NORTH'
    );
    this.southTitle.setText(
      scenario.hemisphere === 'south' ? `🎯 ${scenario.place.toUpperCase()} · SOUTH` : 'SOUTH'
    );

    this.northDetail.setText(this.cardDetailText(north, scenario.hemisphere === 'north'));
    this.southDetail.setText(this.cardDetailText(south, scenario.hemisphere === 'south'));
  }

  private cardDetailText(state: SeasonState, spotlight: boolean): string {
    const sunWord = state.sunHeight > 0.66 ? 'high' : state.sunHeight > 0.4 ? 'mid' : 'low';
    const dayWord = state.dayLength > 0.66 ? 'long' : state.dayLength > 0.4 ? 'medium' : 'short';
    const focus = spotlight ? '  YOUR TARGET' : '';
    return `${SEASON_EMOJI[state.season]}  ${state.season.toUpperCase()}${focus}\n${SEASON_CLOTHES[state.season]}  ${dayWord} days · ${sunWord} Sun`;
  }

  private paintCardScene(rect: Phaser.Geom.Rectangle, state: SeasonState): void {
    const pad = 10;
    const sceneX = rect.x + pad;
    const sceneY = rect.y + Math.min(80, rect.height * 0.48);
    const sceneW = rect.width - pad * 2;
    const sceneH = Math.max(36, rect.bottom - sceneY - pad);

    const sky = this.seasonSkyColor(state.season);
    const ground = this.seasonGroundColor(state.season);
    this.groundGfx.fillStyle(sky, 0.55);
    this.groundGfx.fillRoundedRect(sceneX, sceneY, sceneW, sceneH, 8);
    this.groundGfx.fillStyle(ground, 0.9);
    this.groundGfx.fillRect(sceneX, sceneY + sceneH * 0.68, sceneW, sceneH * 0.32);

    // Sun position: visibly lower in winter and higher in summer.
    const arcPeak = sceneY + 7 + (1 - state.sunHeight) * (sceneH * 0.48);
    const sunX = sceneX + sceneW * 0.77;
    this.groundGfx.fillStyle(this.palette.accentNum, 0.9);
    this.groundGfx.fillCircle(sunX, arcPeak, Math.min(8, sceneH * 0.1));

    // Simple kid silhouette with seasonal clothing color.
    const kidX = sceneX + sceneW * 0.25;
    const groundY = sceneY + sceneH * 0.72;
    const kidColor = state.season === 'Winter' ? 0xe11845 : 0x4932a8;
    this.groundGfx.fillStyle(0xf0b38a, 1);
    this.groundGfx.fillCircle(kidX, groundY - 20, 6);
    this.groundGfx.lineStyle(state.season === 'Winter' ? 8 : 5, kidColor, 1);
    this.groundGfx.lineBetween(kidX, groundY - 13, kidX, groundY + 3);
    this.groundGfx.lineStyle(3, kidColor, 1);
    this.groundGfx.lineBetween(kidX, groundY - 6, kidX - 8, groundY);
    this.groundGfx.lineBetween(kidX, groundY - 6, kidX + 8, groundY);
    this.groundGfx.lineBetween(kidX, groundY + 2, kidX - 6, groundY + 12);
    this.groundGfx.lineBetween(kidX, groundY + 2, kidX + 6, groundY + 12);

    // Tree changes from bare/snowy to leafy.
    const treeX = sceneX + sceneW * 0.52;
    this.groundGfx.lineStyle(4, 0x77513a, 1);
    this.groundGfx.lineBetween(treeX, groundY + 8, treeX, groundY - 18);
    if (state.season !== 'Winter') {
      this.groundGfx.fillStyle(state.season === 'Fall' ? 0xd9772a : 0x4f9b45, 0.95);
      this.groundGfx.fillCircle(treeX, groundY - 22, 12);
    } else {
      this.groundGfx.fillStyle(0xffffff, 0.9);
      this.groundGfx.fillCircle(treeX, groundY - 18, 7);
    }

    // Day length bar
    const barX = sceneX + 8;
    const barY = sceneY + sceneH - 7;
    const barW = sceneW - 16;
    this.groundGfx.fillStyle(this.palette.borderNum, 0.2);
    this.groundGfx.fillRoundedRect(barX, barY, barW, 4, 2);
    this.groundGfx.fillStyle(this.palette.primaryNum, 0.85);
    this.groundGfx.fillRoundedRect(barX, barY, barW * state.dayLength, 4, 2);
  }

  private seasonSkyColor(season: SeasonName): number {
    switch (season) {
      case 'Winter':
        return 0x9eb6c8;
      case 'Spring':
        return 0x8ec5e8;
      case 'Summer':
        return 0x4aa3e0;
      case 'Fall':
        return 0xd4a574;
    }
  }

  private seasonGroundColor(season: SeasonName): number {
    switch (season) {
      case 'Winter':
        return 0xe8eef5;
      case 'Spring':
        return 0x7cb342;
      case 'Summer':
        return 0x558b2f;
      case 'Fall':
        return 0xc67c3b;
    }
  }

  private getScenario(): SeasonScenario {
    return SEASON_SCENARIOS[this.currentScenario];
  }

  private updateScenarioUI(): void {
    const scenario = this.getScenario();
    this.targetText.setText(`MISSION: ${scenario.place.toUpperCase()} NEEDS ${scenario.season.toUpperCase()}`);
    this.progressText.setText(`${this.completedCount + 1} / ${SEASON_SCENARIOS.length}`);
  }

  private orbitMatches(target: number): boolean {
    let diff = Math.abs(this.orbitAngle - target);
    if (diff > 180) diff = 360 - diff;
    return diff <= ORBIT_TOLERANCE;
  }

  private tiltMatches(): boolean {
    return this.tiltDeg >= TILT_MIN && this.tiltDeg <= TILT_MAX;
  }

  private seasonMatches(scenario: SeasonScenario): boolean {
    const state = this.computeHemisphere(scenario.hemisphere);
    return state.season === scenario.season;
  }

  private tryLockIn(): void {
    if (this.isComplete) return;
    const scenario = this.getScenario();

    if (!this.tiltMatches()) {
      this.showMismatchFeedback('Nudge tilt closer to ~23.5°, then try again.');
      return;
    }
    if (!this.orbitMatches(scenario.targetOrbit) || !this.seasonMatches(scenario)) {
      this.showMismatchFeedback('Not quite — adjust the year orbit and check the ground cards.');
      return;
    }

    this.completedCount++;
    this.currentScenario++;

    if (this.currentScenario >= SEASON_SCENARIOS.length) {
      this.isComplete = true;
      this.showMatchFeedback();
      this.showFactToast(scenario.realWorldFact);
      this.showSuccess();
      this.time.delayedCall(2200, () => this.completeMission(this.completedCount * 25));
      return;
    }

    this.showMatchFeedback();
    this.showFactToast(scenario.realWorldFact);
    this.updateScenarioUI();

    // Nudge away from the next target so players must re-solve
    const next = this.getScenario();
    this.orbitAngle = (next.targetOrbit + 110) % 360;
    this.syncVisuals();
  }

  private showFactToast(fact: string): void {
    const toast = this.addText(this.scale.width / 2, this.spacePanel.y + 36, fact, {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textPrimary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 14, y: 10 },
      align: 'center',
      wordWrap: { width: Math.min(this.spacePanel.width - 24, 420) },
    })
      .setOrigin(0.5, 0)
      .setDepth(250);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 2200,
      duration: 600,
      onComplete: () => toast.destroy(),
    });
  }

  private showMatchFeedback(): void {
    const successColor = this.palette.theme === 'dark' ? '#00ff88' : '#1b8a4b';
    const flash = this.addText(this.sunX, this.sunY - this.orbitDepthRadius - 36, '✓ Correct!', {
      fontSize: '22px',
      fontFamily: 'Orbitron, monospace',
      color: successColor,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 14, y: 8 },
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      y: flash.y - 28,
      duration: 1200,
      onComplete: () => flash.destroy(),
    });
  }

  private showMismatchFeedback(message: string): void {
    const flash = this.addText(this.sunX, this.sunY - this.orbitDepthRadius - 36, message, {
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.alert,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 12, y: 8 },
      align: 'center',
      wordWrap: { width: this.spacePanel.width - 40 },
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
    const successText = this.addText(this.scale.width / 2, this.scale.height / 2, 'All 4 Seasons Matched!', {
      fontSize: '26px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 20, y: 14 },
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);

    this.tweens.add({
      targets: successText,
      alpha: 1,
      duration: 300,
    });
  }

  protected onThemeChange(): void {
    if (!this.uiPanels) return;
    this.drawUIPanels();
    this.drawSliders();
    this.syncVisuals();
    this.targetText.setStyle({ backgroundColor: this.palette.panelChrome });
    this.progressText.setColor(this.palette.textSecondary);
    this.dragInstruction.setColor(this.palette.textSecondary);
    this.poleLabel.setStyle({
      color: this.palette.alert,
      backgroundColor: this.palette.panelChrome,
    });
    this.distanceNote.setColor(this.palette.textTertiary);
    this.northTitle.setColor(this.palette.primary);
    this.southTitle.setColor(this.palette.primary);
    this.northDetail.setColor(this.palette.textPrimary);
    this.southDetail.setColor(this.palette.textPrimary);
    this.orbitLabel.setColor(this.palette.textTertiary);
    this.tiltLabel.setColor(this.palette.textTertiary);
    this.orbitStopLabels.forEach((label) => label.setColor(this.palette.textTertiary));
    this.lockButton.setStyle({
      backgroundColor: this.palette.primary,
      color: this.palette.btnOnPrimary,
    });
  }

  protected showHint(): void {
    const scenario = this.getScenario();
    const hintText = this.addText(this.scale.width / 2, this.scale.height / 2, scenario.hint, {
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.accent,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 18, y: 14 },
      align: 'center',
      wordWrap: { width: this.scale.width - 80 },
    })
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
