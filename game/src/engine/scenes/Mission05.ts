/* Mission 5: Solar System Tour — assemble the system, then scan iconic features.
 *
 * Rendering model: every planet is a textured sphere mesh (equirectangular surface
 * baked at runtime) lit from the Sun. Shading, atmosphere halos and Saturn's rings
 * are drawn per-frame from the Sun direction, and the orbital plane is projected in
 * perspective so worlds pass behind and in front of the star.
 */

import { BaseMissionScene } from './BaseMissionScene';
import { PLANETS, SCAN_FEATURES, getPlanet, type PlanetDef } from '../data/planets';

type Phase = 'assemble' | 'scan' | 'complete';
type ScanState = 'seeking' | 'inspecting';

interface PlanetBody {
  def: PlanetDef;
  mesh: Phaser.GameObjects.Mesh;
  hit: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  /** Orbit index the planet sits on, or -1 while docked */
  slot: number;
  /** Angle along its orbit, radians */
  orbitAngle: number;
  /** Current screen position */
  x: number;
  y: number;
  /** Current drawn radius in px */
  radius: number;
  /** Perspective depth, -1 (far) … 1 (near) */
  depth: number;
  dockX: number;
  dockY: number;
  spin: number;
  /** Decays after a hero close-up so the world glides back to its orbit */
  returnEase: number;
}

interface DustMote {
  x: number;
  y: number;
  r: number;
  a: number;
  layer: number;
  twinkle: number;
}

/**
 * How far the orbital plane is opened toward the viewer (sine of its inclination).
 * The ring spacing a player can actually see is radius-gap × depth, so portrait
 * phones — wide-constrained but tall — are allowed a much steeper view than
 * desktops, which stay flatter and more cinematic.
 */
const ORBIT_DEPTH_RANGE = {
  compact: { min: 0.42, max: 0.62 },
  wide: { min: 0.34, max: 0.44 },
};

/**
 * Angular offset between neighbouring orbits. The whole formation shares one
 * rotation phase and each world sits a fixed step ahead of the one inside it,
 * so the pattern turns rigidly and worlds can never drift into each other.
 * The golden angle spreads the eight of them as far apart as possible — see
 * scripts/check-orbit-spacing.mjs, which measures the tightest on-screen gap.
 */
const FORMATION_STEP = Math.PI * (3 - Math.sqrt(5));

export class Mission05Scene extends BaseMissionScene {
  private phase: Phase = 'assemble';
  private scanState: ScanState = 'seeking';

  private nebula!: Phaser.GameObjects.Image;
  private starGfx!: Phaser.GameObjects.Graphics;
  private orbitGfx!: Phaser.GameObjects.Graphics;
  private haloGfx!: Phaser.GameObjects.Graphics;
  private ringBackGfx!: Phaser.GameObjects.Graphics;
  private ringFrontGfx!: Phaser.GameObjects.Graphics;
  private shadeGfx!: Phaser.GameObjects.Graphics;
  private sunGfx!: Phaser.GameObjects.Graphics;
  private dockGfx!: Phaser.GameObjects.Graphics;
  private cinemaGfx!: Phaser.GameObjects.Graphics;
  private scanGfx!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;
  private cueText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private dockLabel!: Phaser.GameObjects.Text;
  private lockButton!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private factTitle!: Phaser.GameObjects.Text;
  private factBody!: Phaser.GameObjects.Text;
  private targetLabel!: Phaser.GameObjects.Text;
  private targetPrompt!: Phaser.GameObjects.Text;
  private orbitTags: Phaser.GameObjects.Text[] = [];

  private bodies: PlanetBody[] = [];
  private motes: DustMote[] = [];

  private sunX = 0;
  private sunY = 0;
  private sunRadius = 26;
  private orbitRadii: number[] = [];
  private orbitDepth = ORBIT_DEPTH_RANGE.wide.max;
  private systemScale = 1;
  private compactLayout = false;
  private dockY = 0;
  private dockTop = 0;
  private spaceBottom = 0;

  private dragBody: PlanetBody | null = null;
  private hoverSlot = -1;
  private scanIndex = 0;
  private scannedCount = 0;
  private scannedIds = new Set<string>();
  /** Shared rotation of the whole formation, so relative spacing never changes */
  private systemPhase = -Math.PI / 2;
  private bottomBarTop = 0;
  private isComplete = false;
  private reduceMotion = false;
  private clock = 0;
  private sweepT = -1;
  private heroBody: PlanetBody | null = null;
  private cinemaAlpha = 0;

  private readonly mnemonic = 'My Very Educated Mother Just Served Us Noodles';

  preload(): void {
    super.preload();
    PLANETS.forEach((def) => {
      if (def.visual.textureUrl) {
        this.load.image(`m5-surface-${def.id}`, def.visual.textureUrl);
      }
    });
  }

  create(): void {
    this.missionId = 5;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { width, height } = this.scale;

    this.createHUD();
    this.updateObjective('Drag each world onto its orbit — closest to the Sun first.');

    this.nebula = this.add.image(width / 2, height / 2, this.buildNebulaTexture()).setDepth(-2);
    this.starGfx = this.add.graphics().setDepth(-1);
    this.orbitGfx = this.add.graphics().setDepth(4);
    this.haloGfx = this.add.graphics().setDepth(9);
    this.ringBackGfx = this.add.graphics().setDepth(10);
    this.sunGfx = this.add.graphics().setDepth(20);
    this.ringFrontGfx = this.add.graphics().setDepth(41);
    this.shadeGfx = this.add.graphics().setDepth(42);
    this.dockGfx = this.add.graphics().setDepth(6);
    this.cinemaGfx = this.add.graphics().setDepth(60);
    this.scanGfx = this.add.graphics().setDepth(72);

    this.createOverlayText();
    this.createBodies();
    this.seedStarfield(width, height);
    this.layoutMission(width, height);
    this.syncAssembleUI();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', () => this.endDrag());
  }

  private createOverlayText(): void {
    this.titleText = this.addText(0, 0, 'ASSEMBLE THE SOLAR SYSTEM', {
      fontSize: '16px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 10, y: 6 },
    }).setDepth(100);

    this.cueText = this.addText(0, 0, this.mnemonic, {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    }).setDepth(100);

    this.progressText = this.addText(0, 0, '', {
      fontSize: '15px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textSecondary,
    })
      .setOrigin(1, 0)
      .setDepth(100);

    this.hintText = this.addText(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textTertiary,
      align: 'center',
    })
      .setOrigin(0.5, 1)
      .setDepth(100);

    this.dockLabel = this.addText(0, 0, 'PLANET DOCK', {
      fontSize: '11px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.textTertiary,
    })
      .setOrigin(0.5)
      .setDepth(100);

    this.lockButton = this.addText(0, 0, 'LOCK IN ORDER  →', {
      fontSize: '16px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.btnOnPrimary,
      backgroundColor: this.palette.primary,
      padding: { x: 18, y: 10 },
    })
      .setOrigin(0.5)
      .setDepth(120)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tryLockOrder())
      .on('pointerover', () => this.lockButton.setStyle({ backgroundColor: this.palette.secondary }))
      .on('pointerout', () => this.lockButton.setStyle({ backgroundColor: this.palette.primary }));

    this.factTitle = this.addText(0, 0, '', {
      fontSize: '15px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.accent,
    })
      .setOrigin(0.5, 0)
      .setDepth(90)
      .setVisible(false);

    this.factBody = this.addText(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.textPrimary,
      align: 'center',
      lineSpacing: 4,
    })
      .setOrigin(0.5, 0)
      .setDepth(90)
      .setVisible(false);

    this.targetLabel = this.addText(0, 0, 'SCAN TARGET', {
      fontSize: '11px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.textTertiary,
    })
      .setOrigin(0.5, 0)
      .setDepth(100)
      .setVisible(false);

    this.targetPrompt = this.addText(0, 0, '', {
      fontSize: '16px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.accent,
      align: 'center',
    })
      .setOrigin(0.5, 0)
      .setDepth(100)
      .setVisible(false);

    this.continueButton = this.addText(0, 0, 'CONTINUE  →', {
      fontSize: '15px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.btnOnPrimary,
      backgroundColor: this.palette.primary,
      padding: { x: 16, y: 9 },
    })
      .setOrigin(0.5)
      .setDepth(120)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.advanceScan())
      .on('pointerover', () => this.continueButton.setStyle({ backgroundColor: this.palette.secondary }))
      .on('pointerout', () => this.continueButton.setStyle({ backgroundColor: this.palette.primary }));

    PLANETS.forEach((_, index) => {
      const tag = this.addText(0, 0, `${index + 1}`, {
        fontSize: '10px',
        fontFamily: 'Courier Prime, monospace',
        color: this.palette.textTertiary,
      })
        .setOrigin(0.5)
        .setDepth(8);
      this.orbitTags.push(tag);
    });
  }

  // ---------------------------------------------------------------- textures

  /** Soft deep-space wash so the background is not a flat fill. */
  private buildNebulaTexture(): string {
    const key = 'm5-nebula';
    if (this.textures.exists(key)) return key;

    const W = 1024;
    const H = 576;
    const tex = this.textures.createCanvas(key, W, H);
    if (!tex) return key;
    const ctx = tex.getContext();

    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, W, H);

    const clouds: Array<[number, number, number, string]> = [
      [0.22, 0.3, 0.42, 'rgba(64, 90, 190, 0.5)'],
      [0.78, 0.24, 0.34, 'rgba(140, 70, 190, 0.42)'],
      [0.55, 0.78, 0.46, 'rgba(30, 120, 160, 0.4)'],
      [0.1, 0.8, 0.3, 'rgba(190, 110, 70, 0.28)'],
    ];

    clouds.forEach(([u, v, r, color]) => {
      const grad = ctx.createRadialGradient(u * W, v * H, 0, u * W, v * H, r * W);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(5, 7, 17, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    });

    tex.refresh();
    return key;
  }

  /** Bake an equirectangular surface for a planet from its visual recipe. */
  private buildSurfaceTexture(def: PlanetDef): string {
    const preloaded = `m5-surface-${def.id}`;
    if (def.visual.textureUrl && this.textures.exists(preloaded)) return preloaded;

    const key = `m5-baked-${def.id}`;
    if (this.textures.exists(key)) return key;

    const W = 512;
    const H = 256;
    const tex = this.textures.createCanvas(key, W, H);
    if (!tex) return key;

    const ctx = tex.getContext();
    const v = def.visual;
    const rng = new Phaser.Math.RandomDataGenerator([def.id]);
    const css = (color: number, alpha = 1): string => {
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    ctx.fillStyle = css(v.base);
    ctx.fillRect(0, 0, W, H);

    // Latitude bands, wobbled horizontally so they don't look like printed stripes.
    if (v.bands.length > 0) {
      const rows = 34;
      const rowH = H / rows;
      for (let i = 0; i < rows; i++) {
        const color = v.bands[i % v.bands.length];
        const alpha = 0.18 + v.bandContrast * (0.35 + rng.frac() * 0.3);
        ctx.fillStyle = css(color, alpha);
        const y = i * rowH;
        for (let x = 0; x < W; x += 12) {
          const wobble =
            Math.sin((x / W) * Math.PI * 6 + i * 0.9) * rowH * 0.3 +
            (rng.frac() - 0.5) * rowH * 0.4;
          ctx.fillRect(x, y + wobble, 13, rowH * 1.25);
        }
      }
    }

    // Named markings (Great Red Spot, maria, Neptune's dark spot).
    v.spots?.forEach((spot) => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(spot.u * W, spot.v * H, spot.ru * W, spot.rv * H, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(spot.color, spot.alpha);
      ctx.fill();
      ctx.restore();
    });

    // Impact craters for airless rock.
    for (let i = 0; i < v.craters; i++) {
      const cx = rng.frac() * W;
      const cy = H * 0.12 + rng.frac() * H * 0.76;
      const cr = 3 + rng.frac() * 11;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = css(0x000000, 0.16 + rng.frac() * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - cr * 0.15, cy - cr * 0.2, cr * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = css(0xffffff, 0.07 + rng.frac() * 0.07);
      ctx.fill();
    }

    // Polar caps.
    if (v.polarCaps > 0) {
      const capH = H * 0.06 + v.polarCaps * H * 0.1;
      [0, H - capH].forEach((top) => {
        const grad = ctx.createLinearGradient(0, top, 0, top + capH);
        const fade = top === 0 ? [0.9, 0] : [0, 0.9];
        grad.addColorStop(0, css(0xffffff, v.polarCaps * fade[0]));
        grad.addColorStop(1, css(0xffffff, v.polarCaps * fade[1]));
        ctx.fillStyle = grad;
        ctx.fillRect(0, top, W, capH);
      });
    }

    // Fine grain so the sphere catches light unevenly.
    const grains = Math.floor(v.grain * 5200);
    for (let i = 0; i < grains; i++) {
      const x = rng.frac() * W;
      const y = rng.frac() * H;
      const light = rng.frac() > 0.5;
      ctx.fillStyle = css(light ? 0xffffff : 0x000000, 0.03 + rng.frac() * 0.05);
      ctx.fillRect(x, y, 1 + rng.frac() * 2, 1 + rng.frac() * 2);
    }

    tex.refresh();
    return key;
  }

  private createSphereGeometry(
    latitudeSegments: number,
    longitudeSegments: number
  ): { vertices: number[]; uvs: number[]; indices: number[] } {
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
        indices.push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
      }
    }

    return { vertices, uvs, indices };
  }

  // ------------------------------------------------------------------ bodies

  private createBodies(): void {
    const scrambled = Phaser.Utils.Array.Shuffle([...PLANETS]);

    scrambled.forEach((def) => {
      const detail = def.radius >= 24 ? 22 : 16;
      const sphere = this.createSphereGeometry(detail, detail * 3 / 2);
      const mesh = this.add
        .mesh(0, 0, this.buildSurfaceTexture(def), undefined, sphere.vertices, sphere.uvs, sphere.indices, true)
        .setDepth(30);
      mesh.hideCCW = true;
      mesh.modelRotation.z = Phaser.Math.DegToRad(def.visual.axialTiltDeg);

      const hit = this.add.circle(0, 0, def.radius + 12, 0x000000, 0).setDepth(50);
      hit.setInteractive({ useHandCursor: true });

      const label = this.addText(0, 0, def.name.toUpperCase(), {
        fontSize: '10px',
        fontFamily: 'Courier Prime, monospace',
        color: this.palette.textSecondary,
      })
        .setOrigin(0.5, 0)
        .setDepth(52);

      const body: PlanetBody = {
        def,
        mesh,
        hit,
        label,
        slot: -1,
        orbitAngle: -Math.PI / 2,
        x: 0,
        y: 0,
        radius: def.radius,
        depth: 0,
        dockX: 0,
        dockY: 0,
        spin: Math.random() * Math.PI * 2,
        returnEase: 0,
      };

      hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isComplete) return;
        if (this.phase === 'scan') {
          this.tryScan(body);
          return;
        }
        if (this.phase === 'assemble') this.beginDrag(body, pointer);
      });

      this.bodies.push(body);
    });
  }

  private seedStarfield(width: number, height: number): void {
    this.motes = [];
    const count = width < 700 ? 110 : 180;
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() > 0.86 ? 1.5 + Math.random() : 0.6 + Math.random() * 0.8,
        a: 0.2 + Math.random() * 0.6,
        layer: i % 3,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  // ------------------------------------------------------------------ layout

  protected onSceneResize(width: number, height: number): void {
    if (!this.bodies.length) return;
    this.layoutMission(width, height);
    this.seedStarfield(width, height);
  }

  protected onThemeChange(): void {
    this.titleText.setStyle({ color: this.palette.primary, backgroundColor: this.palette.panelChrome });
    this.cueText.setColor(this.palette.textSecondary);
    this.progressText.setColor(this.palette.textSecondary);
    this.hintText.setColor(this.palette.textTertiary);
    this.dockLabel.setColor(this.palette.textTertiary);
    this.factTitle.setColor(this.palette.accent);
    this.factBody.setColor(this.palette.textPrimary);
    [this.lockButton, this.continueButton].forEach((button) =>
      button.setStyle({ color: this.palette.btnOnPrimary, backgroundColor: this.palette.primary })
    );
    this.targetLabel.setColor(this.palette.textTertiary);
    this.targetPrompt.setColor(this.palette.accent);
    this.orbitTags.forEach((tag) => tag.setColor(this.palette.textTertiary));
    this.bodies.forEach((body) => body.label.setColor(this.palette.textSecondary));
  }

  private isCompact(width = this.scale.width, height = this.scale.height): boolean {
    return width < 880 || height < 660;
  }

  private layoutMission(width: number, height: number): void {
    const compact = this.isCompact(width, height);
    this.compactLayout = compact;

    const dockH = this.phase === 'assemble' ? (compact ? 104 : 96) : 0;
    // The tour keeps its controls in the same bottom band the dock occupied, so
    // the player's attention doesn't jump to the top of the screen mid-mission.
    const buttonRoom =
      this.phase === 'assemble' ? 52 : this.phase === 'scan' ? (compact ? 158 : 132) : 40;

    this.nebula.setPosition(width / 2, height / 2).setDisplaySize(width, height).setAlpha(
      this.palette.theme === 'dark' ? 0.85 : 0.32
    );

    const top = this.layoutHeader(width, compact);

    this.dockTop = height - dockH - buttonRoom;
    this.spaceBottom = this.dockTop - 10;
    this.dockY = this.dockTop + dockH / 2;

    this.sunX = Math.round(width / 2);
    this.sunY = Math.round(top + (this.spaceBottom - top) * 0.5);

    // Width caps how large the system can be; the leftover height is then spent
    // on opening the plane, which is what actually separates the rings on screen.
    const widthLimit = width * (compact ? 0.45 : 0.42);
    const halfHeight = (this.spaceBottom - top) * 0.5 * 0.86;
    const depthRange = compact ? ORBIT_DEPTH_RANGE.compact : ORBIT_DEPTH_RANGE.wide;
    this.orbitDepth = Phaser.Math.Clamp(halfHeight / widthLimit, depthRange.min, depthRange.max);

    const maxOrbit = Math.min(widthLimit, halfHeight / this.orbitDepth);
    this.systemScale = Phaser.Math.Clamp(maxOrbit / 300, 0.62, 1.2);
    this.sunRadius = 26 * this.systemScale;

    this.orbitRadii = PLANETS.map((_, i) =>
      Phaser.Math.Linear(maxOrbit * 0.26, maxOrbit, (i + 1) / PLANETS.length)
    );

    const margin = compact ? 14 : 20;
    this.hintText
      .setPosition(Math.round(width / 2), Math.round(this.spaceBottom - 2))
      .setFontSize(compact ? '12px' : '13px')
      .setStyle({ wordWrap: { width: width - margin * 2 } });
    this.dockLabel
      .setPosition(Math.round(width / 2), Math.round(this.dockTop + 12))
      .setVisible(this.phase === 'assemble');
    this.lockButton
      .setPosition(Math.round(width / 2), Math.round(height - 26))
      .setFontSize(compact ? '15px' : '16px')
      .setVisible(this.phase === 'assemble');

    // Scan-phase controls all live in the bottom band: the target readout while
    // seeking, then the fact card and Continue once a world is scanned.
    this.bottomBarTop = Math.round(this.spaceBottom + 8);
    const centreX = Math.round(width / 2);
    const wrap = Math.min(620, width - margin * 2);

    this.targetLabel
      .setPosition(centreX, this.bottomBarTop + 10)
      .setFontSize(compact ? '10px' : '11px');
    this.targetPrompt
      .setPosition(centreX, this.bottomBarTop + 28)
      .setFontSize(compact ? '14px' : '16px')
      .setStyle({ wordWrap: { width: wrap } });

    this.factTitle.setPosition(centreX, this.bottomBarTop + 8).setFontSize(compact ? '13px' : '15px');
    this.factBody
      .setPosition(centreX, this.bottomBarTop + 30)
      .setFontSize(compact ? '12px' : '13px')
      .setStyle({ wordWrap: { width: wrap } });
    this.continueButton
      .setPosition(centreX, Math.round(height - 24))
      .setFontSize(compact ? '14px' : '15px');

    // Ring numbers ride just outside each orbit on the right, alternating above
    // and below the plane so neighbours can't print on top of each other.
    this.orbitTags.forEach((tag, i) => {
      const lift = i % 2 === 0 ? -9 : 9;
      tag.setPosition(Math.round(this.sunX + this.orbitRadii[i]), Math.round(this.sunY + lift));
      tag.setVisible(this.phase === 'assemble');
    });

    this.bodies.forEach((body) => {
      body.mesh.setSize(width, height);
      body.mesh.setOrtho(width, height);
    });

    this.layoutDock(width);
  }

  /**
   * Stacks the objective, title and cue from measured heights so a wrapped
   * objective can never print over the title. Returns the first free y below.
   * All three share one glyph inset, including the title's panel padding.
   */
  private layoutHeader(width: number, compact: boolean): number {
    const margin = compact ? 14 : 20;
    const panelPadX = 10;
    const glyphX = margin + panelPadX;
    const progressRoom = compact ? 92 : 132;

    this.objectiveText
      .setFontSize(compact ? '14px' : '18px')
      .setStyle({ wordWrap: { width: Math.max(120, width - glyphX - margin - progressRoom) } })
      .setPosition(glyphX, 18);

    this.progressText
      .setFontSize(compact ? '12px' : '15px')
      .setPosition(Math.round(width - margin), 20);

    let y = Math.round(this.objectiveText.y + this.objectiveText.height + 12);

    if (this.titleText.visible) {
      this.titleText.setFontSize(compact ? '13px' : '16px').setPosition(margin, y);
      y = Math.round(y + this.titleText.height + 6);
    }

    if (this.cueText.visible) {
      this.cueText
        .setFontSize(compact ? '12px' : '13px')
        .setStyle({ wordWrap: { width: width - glyphX - margin } })
        .setPosition(glyphX, y);
      y = Math.round(y + this.cueText.height);
    }

    return Math.round(y + 10);
  }

  private layoutDock(width: number): void {
    const docked = this.bodies.filter((b) => b.slot < 0);
    const gap = Math.min(74, (width - 48) / Math.max(docked.length, 1));
    const startX = width / 2 - ((docked.length - 1) * gap) / 2;

    docked.forEach((body, index) => {
      body.dockX = startX + index * gap;
      body.dockY = this.dockY + 6;
    });
  }

  // ------------------------------------------------------------------- input

  private beginDrag(body: PlanetBody, pointer: Phaser.Input.Pointer): void {
    this.dragBody = body;
    body.x = pointer.x;
    body.y = pointer.y;
    body.mesh.setDepth(56);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragBody || this.phase !== 'assemble') return;
    this.dragBody.x = pointer.x;
    this.dragBody.y = pointer.y;
    this.hoverSlot = this.nearestSlot(pointer.x, pointer.y);
  }

  /** Nearest orbit ring in ellipse-normalized space, or -1 when outside the system. */
  private nearestSlot(x: number, y: number): number {
    const dx = x - this.sunX;
    const dy = (y - this.sunY) / this.orbitDepth;
    const dist = Math.hypot(dx, dy);

    const outer = this.orbitRadii[this.orbitRadii.length - 1] * 1.25;
    if (dist > outer || dist < this.sunRadius * 0.8) return -1;

    let best = -1;
    let bestErr = Number.POSITIVE_INFINITY;
    this.orbitRadii.forEach((radius, index) => {
      const err = Math.abs(radius - dist);
      if (err < bestErr) {
        bestErr = err;
        best = index;
      }
    });
    return best;
  }

  private endDrag(): void {
    const body = this.dragBody;
    this.dragBody = null;
    this.hoverSlot = -1;
    if (!body || this.phase !== 'assemble') return;

    const slot = this.nearestSlot(body.x, body.y);
    if (slot < 0) {
      body.slot = -1;
      this.layoutDock(this.scale.width);
      this.syncAssembleUI();
      return;
    }

    // One world per orbit — bump whoever was already there back to the dock.
    this.bodies.forEach((other) => {
      if (other !== body && other.slot === slot) other.slot = -1;
    });

    body.slot = slot;
    body.orbitAngle = this.systemPhase + slot * FORMATION_STEP;
    this.layoutDock(this.scale.width);
    this.syncAssembleUI();
  }

  // ------------------------------------------------------------------- rules

  private correctCount(): number {
    return this.bodies.filter((b) => b.slot === b.def.order).length;
  }

  private allPlaced(): boolean {
    return this.bodies.every((b) => b.slot >= 0);
  }

  private syncAssembleUI(): void {
    if (this.phase !== 'assemble') return;
    const correct = this.correctCount();
    this.progressText.setText(`${correct} / ${PLANETS.length} in orbit`);
    this.lockButton.setAlpha(this.allPlaced() ? 1 : 0.5);

    if (this.allPlaced() && correct === PLANETS.length) {
      this.hintText.setText('Every world is on its true orbit. Lock in to begin the tour.');
    } else if (this.allPlaced()) {
      this.hintText.setText('Close — Mercury hugs the Sun, Neptune rides the outer edge. Keep swapping.');
    } else {
      this.hintText.setText('Rocky worlds ride the inner rings. The giants sweep the outer ones.');
    }
  }

  private tryLockOrder(): void {
    if (this.phase !== 'assemble' || this.isComplete) return;

    if (!this.allPlaced()) {
      this.flashMessage('Every planet needs an orbit before you can lock in.');
      return;
    }

    const correct = this.correctCount();
    if (correct < PLANETS.length) {
      this.flashMessage(`${correct} of ${PLANETS.length} are right. Re-order the rest and try again.`);
      return;
    }

    this.enterScanPhase();
  }

  private enterScanPhase(): void {
    this.phase = 'scan';
    this.scanState = 'seeking';
    this.scanIndex = 0;
    this.scannedCount = 0;
    this.scannedIds.clear();
    this.lockButton.setVisible(false);
    this.dockLabel.setVisible(false);
    this.orbitTags.forEach((tag) => tag.setVisible(false));
    // The header shrinks to the objective and counter; the readout moves down.
    this.titleText.setVisible(false);
    this.cueText.setVisible(false);
    this.updateObjective('Tap the glowing world that matches the scan target.');
    this.showScanPrompt();
  }

  private showScanPrompt(): void {
    const challenge = SCAN_FEATURES[this.scanIndex];
    if (!challenge) return;
    this.scanState = 'seeking';
    this.targetLabel.setVisible(true);
    this.targetPrompt.setText(challenge.feature.prompt.toUpperCase()).setVisible(true);
    this.progressText.setText(`${this.scannedCount} / ${SCAN_FEATURES.length} scanned`);
    this.hintText.setText('');
    this.factTitle.setVisible(false);
    this.factBody.setVisible(false);
    this.continueButton.setVisible(false);
    this.layoutMission(this.scale.width, this.scale.height);
  }

  private tryScan(body: PlanetBody): void {
    if (this.phase !== 'scan' || this.scanState !== 'seeking') return;
    const challenge = SCAN_FEATURES[this.scanIndex];
    if (!challenge) return;

    if (body.def.id !== challenge.planetId) {
      const target = getPlanet(challenge.planetId);
      this.flashMessage(`That's ${body.def.name}. Look for ${target?.name ?? 'the target world'}.`);
      return;
    }

    this.scanState = 'inspecting';
    this.scannedCount += 1;
    this.scannedIds.add(body.def.id);
    this.heroBody = body;
    this.sweepT = 0;
    this.progressText.setText(`${this.scannedCount} / ${SCAN_FEATURES.length} scanned`);
    this.targetLabel.setVisible(false);
    this.targetPrompt.setVisible(false);

    this.tweens.add({
      targets: this,
      cinemaAlpha: 1,
      duration: this.reduceMotion ? 120 : 320,
      ease: 'Sine.easeOut',
    });

    this.time.delayedCall(this.reduceMotion ? 200 : 820, () => {
      if (this.phase !== 'scan') return;
      this.factTitle.setText(challenge.feature.prompt.toUpperCase()).setVisible(true);
      this.factBody.setText(challenge.feature.fact).setVisible(true);
      this.continueButton.setVisible(true);
    });
  }

  private advanceScan(): void {
    if (this.phase !== 'scan' || this.scanState !== 'inspecting') return;

    this.sweepT = -1;
    if (this.heroBody) this.heroBody.returnEase = 1;
    this.heroBody = null;
    this.tweens.add({
      targets: this,
      cinemaAlpha: 0,
      duration: this.reduceMotion ? 100 : 260,
    });

    if (this.scanIndex + 1 >= SCAN_FEATURES.length) {
      this.finishMission();
      return;
    }

    this.scanIndex += 1;
    this.showScanPrompt();
  }

  private finishMission(): void {
    if (this.isComplete) return;
    this.isComplete = true;
    this.phase = 'complete';
    this.scanState = 'seeking';

    this.factTitle.setVisible(false);
    this.factBody.setVisible(false);
    this.continueButton.setVisible(false);
    this.targetLabel.setVisible(false);
    this.targetPrompt.setVisible(false);
    this.updateObjective('Solar System Tour complete!');
    this.titleText.setVisible(true).setText('TOUR COMPLETE');
    this.cueText.setVisible(true).setText('Eight worlds mapped, five features scanned.');
    this.hintText.setText(this.mnemonic);
    this.layoutMission(this.scale.width, this.scale.height);

    const banner = this.addText(this.scale.width / 2, this.scale.height / 2, 'Solar System Mapped!', {
      fontSize: '28px',
      fontFamily: 'Orbitron, monospace',
      color: this.palette.accent,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 22, y: 14 },
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);

    this.tweens.add({ targets: banner, alpha: 1, duration: 300 });

    const score = Math.round(
      55 + (this.correctCount() / PLANETS.length) * 25 + (this.scannedCount / SCAN_FEATURES.length) * 20
    );

    this.time.delayedCall(1700, () => {
      banner.destroy();
      this.completeMission(score);
    });
  }

  private flashMessage(message: string): void {
    const toast = this.addText(this.scale.width / 2, this.spaceBottom - 30, message, {
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: this.palette.alert,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 12, y: 8 },
      align: 'center',
      wordWrap: { width: this.scale.width - 48 },
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => toast.destroy(),
    });
  }

  // ------------------------------------------------------------------ render

  update(_time: number, delta: number): void {
    this.clock += delta;
    this.advanceBodies(delta);
    this.drawStarfield();
    this.drawSystem();
    this.drawCinema(delta);
  }

  private advanceBodies(delta: number): void {
    const hero = this.heroBody;

    if (!this.reduceMotion && this.phase !== 'complete') {
      this.systemPhase += delta * 0.00004;
    }

    this.bodies.forEach((body) => {
      body.spin += delta * body.def.visual.spinSpeed;
      body.mesh.modelRotation.y = body.spin;

      if (body === this.dragBody) {
        body.radius = body.def.radius * this.systemScale * 1.15;
        body.depth = 1;
      } else if (body === hero) {
        // Hero framing for the scan: pull the world forward and centre it.
        const targetX = this.scale.width / 2;
        const targetY = this.sunY;
        const targetR = Math.min(
          this.scale.width * 0.16,
          (this.spaceBottom - 108) * 0.34
        );
        const ease = this.reduceMotion ? 1 : 0.12;
        body.x += (targetX - body.x) * ease;
        body.y += (targetY - body.y) * ease;
        body.radius += (targetR - body.radius) * ease;
        body.depth = 1;
      } else if (body.slot >= 0) {
        body.orbitAngle = this.systemPhase + body.slot * FORMATION_STEP;
        const radius = this.orbitRadii[body.slot];
        const targetX = this.sunX + Math.cos(body.orbitAngle) * radius;
        const targetY = this.sunY + Math.sin(body.orbitAngle) * radius * this.orbitDepth;
        body.depth = Math.sin(body.orbitAngle);
        const perspective = Phaser.Math.Linear(0.82, 1.12, (body.depth + 1) / 2);
        const targetR = body.def.radius * this.systemScale * perspective;

        if (body.returnEase > 0) {
          body.returnEase = Math.max(0, body.returnEase - delta * 0.0025);
          const k = 0.1;
          body.x += (targetX - body.x) * k;
          body.y += (targetY - body.y) * k;
          body.radius += (targetR - body.radius) * k;
        } else {
          body.x = targetX;
          body.y = targetY;
          body.radius = targetR;
        }
      } else {
        body.x = body.dockX;
        body.y = body.dockY;
        body.radius = Math.min(body.def.radius, 20) * 0.86;
        body.depth = 1;
      }

      body.mesh.setPosition(body.x, body.y);
      body.mesh.modelScale.set(body.radius, body.radius, body.radius);
      body.mesh.setDepth(body === hero ? 70 : body === this.dragBody ? 56 : body.depth >= 0 ? 30 : 12);

      // Generous tap targets, trimmed on phones where the plane is tight, and
      // depth-sorted so a tap in a contested spot picks the nearer world.
      const grab = this.compactLayout ? 7 : 12;
      body.hit.setPosition(body.x, body.y).setRadius(body.radius + grab);
      body.hit.setDepth(50 + body.depth * 4);
      // Names crowd into each other once eight worlds share a narrow plane, so
      // phones only label the dock (where the choice is made) and the hero world.
      const showLabel =
        body === hero ||
        (this.phase === 'assemble' &&
          (body.slot < 0 || (!this.compactLayout && body.depth >= -0.2)));
      body.label
        .setPosition(Math.round(body.x), Math.round(body.y + body.radius + 6))
        .setVisible(showLabel && body !== this.dragBody);
    });
  }

  private drawStarfield(): void {
    this.starGfx.clear();
    const bright = this.palette.theme === 'dark' ? 0xffffff : 0x54607a;
    this.motes.forEach((mote) => {
      const flicker = this.reduceMotion
        ? 1
        : 0.7 + 0.3 * Math.sin(this.clock * 0.002 + mote.twinkle);
      // Nearer layers read brighter, giving the field a sense of depth.
      const depthAlpha = 0.55 + mote.layer * 0.22;
      this.starGfx.fillStyle(bright, mote.a * flicker * depthAlpha);
      this.starGfx.fillCircle(mote.x, mote.y, mote.r);
    });
  }

  private drawSystem(): void {
    this.orbitGfx.clear();
    this.haloGfx.clear();
    this.shadeGfx.clear();
    this.ringBackGfx.clear();
    this.ringFrontGfx.clear();
    this.sunGfx.clear();
    this.dockGfx.clear();
    this.scanGfx.clear();
    this.cinemaGfx.clear();

    this.drawOrbits();
    this.drawSun();
    if (this.phase === 'assemble') this.drawDock();
    else if (this.phase === 'scan') this.drawBottomBar();

    // Far side first so nearer worlds overlap correctly.
    [...this.bodies]
      .sort((a, b) => a.depth - b.depth)
      .forEach((body) => this.drawBodyLighting(body));

    this.drawScanHighlights();
  }

  /** Panel behind the scan readout, occupying the band the dock used to fill. */
  private drawBottomBar(): void {
    const top = this.bottomBarTop;
    const h = this.scale.height - top - (this.continueButton.visible ? 44 : 10);
    if (h <= 20) return;
    this.dockGfx.fillStyle(this.palette.panelBgNum, this.palette.theme === 'dark' ? 0.55 : 0.9);
    this.dockGfx.fillRoundedRect(12, top, this.scale.width - 24, h, 14);
    this.dockGfx.lineStyle(1, this.palette.accentNum, this.palette.theme === 'dark' ? 0.3 : 0.22);
    this.dockGfx.strokeRoundedRect(12, top, this.scale.width - 24, h, 14);
  }

  private drawOrbits(): void {
    if (this.phase !== 'assemble') {
      // During the tour the rings recede to faint guides.
      this.orbitRadii.forEach((radius) => {
        this.orbitGfx.lineStyle(1, this.palette.secondaryNum, this.palette.theme === 'dark' ? 0.14 : 0.2);
        this.orbitGfx.strokeEllipse(this.sunX, this.sunY, radius * 2, radius * 2 * this.orbitDepth);
      });
      return;
    }

    this.orbitRadii.forEach((radius, index) => {
      const occupant = this.bodies.find((b) => b.slot === index);
      const correct = occupant?.def.order === index;
      const targeted = this.hoverSlot === index;

      const color = targeted
        ? this.palette.accentNum
        : occupant
          ? correct
            ? this.palette.primaryNum
            : this.palette.alertNum
          : this.palette.secondaryNum;
      const alpha = targeted ? 0.85 : occupant ? (correct ? 0.5 : 0.42) : this.palette.theme === 'dark' ? 0.22 : 0.3;

      this.orbitGfx.lineStyle(targeted ? 3 : 2, color, alpha);
      this.orbitGfx.strokeEllipse(this.sunX, this.sunY, radius * 2, radius * 2 * this.orbitDepth);
    });
  }

  private drawSun(): void {
    const r = this.sunRadius;
    const pulse = this.reduceMotion ? 1 : 1 + Math.sin(this.clock * 0.0016) * 0.03;

    // Layered corona instead of a flat yellow disc.
    for (let i = 6; i >= 1; i--) {
      const t = i / 6;
      this.sunGfx.fillStyle(0xffb347, 0.05 + (1 - t) * 0.06);
      this.sunGfx.fillCircle(this.sunX, this.sunY, r * (1.15 + t * 1.5) * pulse);
    }
    this.sunGfx.fillStyle(0xffd166, 0.55);
    this.sunGfx.fillCircle(this.sunX, this.sunY, r * 1.12 * pulse);
    this.sunGfx.fillStyle(0xfff1b8, 1);
    this.sunGfx.fillCircle(this.sunX, this.sunY, r * pulse);
    this.sunGfx.fillStyle(0xffffff, 0.85);
    this.sunGfx.fillCircle(this.sunX - r * 0.16, this.sunY - r * 0.2, r * 0.42 * pulse);
  }

  private drawDock(): void {
    const docked = this.bodies.filter((b) => b.slot < 0);
    if (docked.length === 0) return;

    const top = this.dockTop;
    const h = this.scale.height - top - 52;
    this.dockGfx.fillStyle(this.palette.panelBgNum, this.palette.theme === 'dark' ? 0.55 : 0.9);
    this.dockGfx.fillRoundedRect(12, top, this.scale.width - 24, h, 14);
    this.dockGfx.lineStyle(1, this.palette.primaryNum, this.palette.theme === 'dark' ? 0.25 : 0.18);
    this.dockGfx.strokeRoundedRect(12, top, this.scale.width - 24, h, 14);

    docked.forEach((body) => {
      if (body === this.dragBody) return;
      this.dockGfx.fillStyle(this.palette.primaryNum, 0.1);
      this.dockGfx.fillEllipse(body.dockX, body.dockY + body.radius + 8, body.radius * 2.4, body.radius * 0.5);
    });
  }

  /** Atmosphere halo, sun-facing rim light, terminator shadow and rings. */
  private drawBodyLighting(body: PlanetBody): void {
    const v = body.def.visual;
    const r = body.radius;
    const isHero = body === this.heroBody;
    const docked = body.slot < 0 && body !== this.dragBody;

    // A world on the far side of its orbit disappears into the Sun's glare; the
    // corona already covers the mesh, so its shading must not float on top.
    if (!isHero && body.depth < 0) {
      const occluded = Math.hypot(body.x - this.sunX, body.y - this.sunY) < this.sunRadius * 1.6 + body.radius;
      if (occluded) return;
    }

    // Direction pointing away from the Sun (light travels outward from centre).
    const lightAngle = docked
      ? Math.PI / 4
      : Math.atan2(body.y - this.sunY, body.x - this.sunX);

    if (v.rings) this.drawRings(body, lightAngle, false);

    // Atmosphere / limb glow.
    if (v.atmosphereStrength > 0.02) {
      const layers = 5;
      for (let i = layers; i >= 1; i--) {
        const t = i / layers;
        this.haloGfx.fillStyle(v.atmosphere, 0.05 * v.atmosphereStrength * (1.2 - t));
        this.haloGfx.fillCircle(body.x, body.y, r * (1 + t * 0.28));
      }
    }

    // Night side: a soft circular segment facing away from the Sun.
    const shadowAlpha = docked ? 0.32 : 0.6;
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const spread = (Math.PI / 2) * (1 - i * 0.12);
      this.shadeGfx.fillStyle(0x03040c, shadowAlpha * (0.34 + i * 0.16));
      this.shadeGfx.beginPath();
      this.shadeGfx.arc(body.x, body.y, r - i * 0.4, lightAngle - spread, lightAngle + spread, false);
      this.shadeGfx.fillPath();
    }

    // Sunward rim light.
    this.shadeGfx.lineStyle(Math.max(1.5, r * 0.09), v.atmosphere, v.atmosphereStrength > 0.2 ? 0.55 : 0.3);
    this.shadeGfx.beginPath();
    this.shadeGfx.arc(body.x, body.y, r * 0.97, lightAngle + Math.PI * 0.55, lightAngle + Math.PI * 1.45, false);
    this.shadeGfx.strokePath();

    if (v.rings) this.drawRings(body, lightAngle, true);
  }

  /**
   * Marks the worlds that still hold an unscanned feature with a breathing ring
   * and an outward sonar pulse, so the player can see at a glance which worlds
   * the scanner will respond to.
   */
  private drawScanHighlights(): void {
    if (this.phase !== 'scan' || this.scanState !== 'seeking') return;

    const breathe = this.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.clock * 0.004);
    const pulse = this.reduceMotion ? 0 : (this.clock % 1800) / 1800;

    this.bodies.forEach((body) => {
      if (body.slot < 0 || !body.def.feature || this.scannedIds.has(body.def.id)) return;

      const r = body.radius;
      this.scanGfx.lineStyle(1.5, this.palette.accentNum, 0.3 + breathe * 0.45);
      this.scanGfx.strokeCircle(body.x, body.y, r + 6 + breathe * 4);

      if (!this.reduceMotion) {
        // Expanding ring that fades as it leaves the planet.
        this.scanGfx.lineStyle(1, this.palette.accentNum, 0.4 * (1 - pulse));
        this.scanGfx.strokeCircle(body.x, body.y, r + 6 + pulse * 22);
      }

      // Four corner ticks read as a scanner bracket without crowding the world.
      const tick = Math.max(4, r * 0.32);
      const reach = r + 12 + breathe * 3;
      this.scanGfx.lineStyle(2, this.palette.accentNum, 0.5 + breathe * 0.3);
      [0.25, 0.75, 1.25, 1.75].forEach((turn) => {
        const a = turn * Math.PI;
        const cx = body.x + Math.cos(a) * reach;
        const cy = body.y + Math.sin(a) * reach;
        this.scanGfx.lineBetween(cx, cy, cx - Math.cos(a) * tick, cy - Math.sin(a) * tick);
      });
    });
  }

  /**
   * Rings lie in a tilted, squashed plane. Half of each band passes behind the
   * planet and half in front, so they are stroked into separate layers.
   */
  private drawRings(body: PlanetBody, lightAngle: number, front: boolean): void {
    const ring = body.def.visual.rings;
    if (!ring) return;

    const gfx = front ? this.ringFrontGfx : this.ringBackGfx;
    const r = body.radius;
    const tilt = Phaser.Math.DegToRad(body.def.visual.axialTiltDeg) * 0.55;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const squash = 0.3;
    const bands = 10;
    const lit = Math.cos(lightAngle) >= 0;
    const segments = 26;

    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const radius = r * Phaser.Math.Linear(ring.inner, ring.outer, t);
      // Cassini-style gap, with the band edges fading out.
      const inGap = t > 0.5 && t < 0.6;
      const edgeFade = 1 - Math.abs(t - 0.5) * 0.8;
      const alpha = ring.alpha * (inGap ? 0.08 : 0.3) * edgeFade * (lit ? 1 : 0.55);
      const color = inGap || i % 4 === 0 ? ring.shadeColor : ring.color;

      gfx.lineStyle(Math.max(1.2, r * 0.07), color, alpha);
      gfx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const a = (front ? 0 : Math.PI) + (s / segments) * Math.PI;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius * squash;
        const x = body.x + px * cosT - py * sinT;
        const y = body.y + px * sinT + py * cosT;
        if (s === 0) gfx.moveTo(x, y);
        else gfx.lineTo(x, y);
      }
      gfx.strokePath();
    }
  }

  /** Vignette, reticle and sweep for the close-up. Draws over drawSystem's layer. */
  private drawCinema(delta: number): void {
    if (this.cinemaAlpha > 0.01) {
      this.cinemaGfx.fillStyle(0x02030a, 0.72 * this.cinemaAlpha);
      this.cinemaGfx.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    const hero = this.heroBody;
    if (!hero) return;

    const r = hero.radius;

    // Targeting reticle.
    this.scanGfx.lineStyle(1.5, this.palette.accentNum, 0.5 * this.cinemaAlpha);
    this.scanGfx.strokeCircle(hero.x, hero.y, r + 26);
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
      const inner = r + 16;
      const outer = r + 34;
      this.scanGfx.lineBetween(
        hero.x + Math.cos(a) * inner,
        hero.y + Math.sin(a) * inner,
        hero.x + Math.cos(a) * outer,
        hero.y + Math.sin(a) * outer
      );
    });

    // Sweep line travelling down the disc.
    if (this.sweepT >= 0) {
      this.sweepT = Math.min(1, this.sweepT + delta * (this.reduceMotion ? 0.004 : 0.0013));
      const y = hero.y - r + this.sweepT * r * 2;
      const halfWidth = Math.sqrt(Math.max(0, r * r - (y - hero.y) * (y - hero.y)));
      this.scanGfx.lineStyle(2, this.palette.accentNum, 0.9 * this.cinemaAlpha);
      this.scanGfx.lineBetween(hero.x - halfWidth, y, hero.x + halfWidth, y);
      this.scanGfx.fillStyle(this.palette.accentNum, 0.12 * this.cinemaAlpha);
      this.scanGfx.fillCircle(hero.x, hero.y, r);
    }
  }
}
