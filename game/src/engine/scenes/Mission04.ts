/* Mission 4: Star Patterns — immersive Star Cartographer observatory */

import { BaseMissionScene } from './BaseMissionScene';
import { getMissionPalette } from '../missionTheme';
import {
  CONSTELLATIONS,
  scrambleConstellation,
  type ConstellationDefinition,
  type ConstellationStar,
} from '../data/constellations';

type Phase =
  | 'preview'
  | 'tracing'
  | 'revealed'
  | 'challenge'
  | 'complete';

interface StarNode {
  def: ConstellationStar;
  /** Flat-sky screen position */
  flatX: number;
  flatY: number;
  /** Current drawn position */
  x: number;
  y: number;
  radius: number;
  hit: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  nameLabel: Phaser.GameObjects.Text;
}

interface BgStar {
  x: number;
  y: number;
  r: number;
  a: number;
  layer: number;
  drift: number;
}

interface ChallengeCard {
  def: ConstellationDefinition;
  isReal: boolean;
  rect: Phaser.Geom.Rectangle;
  hit: Phaser.GameObjects.Rectangle;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const CONSTELLATION_ART_IDS = [
  'orion',
  'ursa-major',
  'cassiopeia',
  'leo',
  'crux',
  'scorpius',
] as const;

interface ArtPlacement {
  fit: 'width' | 'height' | 'square' | 'axis';
  scale: number;
  from?: string[];
  to?: string[];
  axis: 'horizontal' | 'vertical';
  offsetX?: number;
  offsetY?: number;
  alpha: number;
}

const ART_PLACEMENT: Record<string, ArtPlacement> = {
  orion: {
    fit: 'height',
    scale: 1.3,
    from: ['betelgeuse', 'bellatrix'],
    to: ['rigel', 'saiph'],
    axis: 'vertical',
    offsetY: 0.02,
    alpha: 0.36,
  },
  'ursa-major': {
    fit: 'width',
    scale: 1.28,
    from: ['dubhe', 'merak'],
    to: ['alkaid'],
    axis: 'horizontal',
    alpha: 0.34,
  },
  cassiopeia: {
    fit: 'height',
    scale: 1.45,
    axis: 'vertical',
    offsetY: 0.06,
    alpha: 0.33,
  },
  leo: {
    fit: 'width',
    scale: 1.3,
    from: ['regulus', 'algieba'],
    to: ['denebola'],
    axis: 'horizontal',
    offsetY: 0.02,
    alpha: 0.35,
  },
  crux: {
    fit: 'square',
    scale: 1.18,
    from: ['gacrux'],
    to: ['acrux'],
    axis: 'vertical',
    alpha: 0.4,
  },
  scorpius: {
    // Match the atlas image's horizontal head→stinger axis directly.
    fit: 'axis',
    scale: 1.34,
    from: ['graffias', 'dscribba'],
    to: ['shaula', 'lesath'],
    axis: 'horizontal',
    alpha: 0.34,
  },
};

export class Mission04Scene extends BaseMissionScene {
  private phase: Phase = 'preview';
  private constellationIndex = 0;
  private completedPatterns = 0;
  private isComplete = false;

  private skyGfx!: Phaser.GameObjects.Graphics;
  private nebulaGfx!: Phaser.GameObjects.Graphics;
  private artImage!: Phaser.GameObjects.Image;
  private lineGfx!: Phaser.GameObjects.Graphics;
  private previewGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private dockGfx!: Phaser.GameObjects.Graphics;

  private titleText!: Phaser.GameObjects.Text;
  private locationText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private factText!: Phaser.GameObjects.Text;
  private linkText!: Phaser.GameObjects.Text;
  private undoButton!: Phaser.GameObjects.Text;
  private glyphGfx!: Phaser.GameObjects.Graphics;

  private skyRect = new Phaser.Geom.Rectangle();
  private dockRect = new Phaser.Geom.Rectangle();
  private frameRect = new Phaser.Geom.Rectangle();

  private bgStars: BgStar[] = [];
  private nodes: StarNode[] = [];
  private nodeById = new Map<string, StarNode>();
  private completedEdges = new Set<string>();
  private edgeHistory: string[] = [];
  private selectedId: string | null = null;
  private pointerLineTo: { x: number; y: number } | null = null;
  private previewAlpha = 0;
  private pulseT = 0;
  private reduceMotion = false;
  private artAlpha = 0;
  private visualScale = 1;

  private challengeCards: ChallengeCard[] = [];
  private challengePrompt!: Phaser.GameObjects.Text;

  preload(): void {
    super.preload();
    CONSTELLATION_ART_IDS.forEach((id) => {
      this.load.image(
        `constellation-art-${id}`,
        `/assets/images/constellations/${id}.png`
      );
    });
  }

  create(): void {
    this.missionId = 4;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.createHUD();
    this.objectiveText.setVisible(false);
    this.lockNightPalette();

    this.nebulaGfx = this.add.graphics().setDepth(0);
    this.skyGfx = this.add.graphics().setDepth(1);
    this.artImage = this.add
      .image(0, 0, 'constellation-art-orion')
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false);
    this.previewGfx = this.add.graphics().setDepth(8);
    this.lineGfx = this.add.graphics().setDepth(10);
    this.fxGfx = this.add.graphics().setDepth(30);
    this.dockGfx = this.add.graphics().setDepth(40);
    this.glyphGfx = this.add.graphics().setDepth(45);

    this.titleText = this.addText(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'Orbitron, monospace',
      fontStyle: 'bold',
      color: this.palette.primary,
      letterSpacing: 1,
    }).setDepth(50);

    this.locationText = this.addText(0, 0, '', {
      fontSize: '11px',
      fontFamily: 'Courier Prime, monospace',
      color: this.palette.textTertiary,
    }).setDepth(50);

    this.progressText = this.addText(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Courier Prime, monospace',
      color: this.palette.textSecondary,
    })
      .setOrigin(1, 0)
      .setDepth(50);

    this.promptText = this.addText(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: this.palette.textSecondary,
    })
      .setOrigin(0.5, 0)
      .setDepth(50);

    this.factText = this.addText(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: this.palette.textPrimary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 14, y: 10 },
      align: 'center',
    })
      .setOrigin(0.5, 0)
      .setDepth(60)
      .setVisible(false);

    this.linkText = this.addText(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Courier Prime, monospace',
      color: this.palette.textSecondary,
    })
      .setOrigin(0.5)
      .setDepth(50);

    this.undoButton = this.addText(0, 0, 'UNDO', {
      fontSize: '13px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontStyle: '500',
      color: this.palette.textPrimary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 14, y: 8 },
    })
      .setOrigin(1, 0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.undoLastEdge())
      .on('pointerover', () => this.undoButton.setStyle({ backgroundColor: this.palette.panelChromeHover }))
      .on('pointerout', () => this.undoButton.setStyle({ backgroundColor: this.palette.panelChrome }));

    this.challengePrompt = this.addText(0, 0, '', {
      fontSize: '16px',
      fontFamily: 'Orbitron, monospace',
      fontStyle: 'bold',
      color: this.palette.primary,
      align: 'center',
    })
      .setOrigin(0.5)
      .setDepth(70)
      .setVisible(false);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'tracing' || !this.selectedId) return;
      this.pointerLineTo = { x: pointer.x, y: pointer.y };
      this.redrawLines();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'tracing' || !this.selectedId) return;
      const target = this.findNearestNode(pointer.x, pointer.y, 36);
      if (target && target.def.id !== this.selectedId) {
        this.tryConnect(this.selectedId, target.def.id);
      }
      this.selectedId = null;
      this.pointerLineTo = null;
      this.redrawLines();
      this.paintStars();
    });

    this.seedBackgroundStars(this.scale.width, this.scale.height);
    this.layoutMission(this.scale.width, this.scale.height);
    this.startConstellation(0);
  }

  update(_time: number, delta: number): void {
    this.pulseT += delta;
    if (!this.reduceMotion) {
      this.driftBackground(delta);
    }
    if (this.phase === 'preview' || this.phase === 'tracing') {
      this.redrawPreviewOverlay();
      this.paintStars();
    }
  }

  protected onSceneResize(width: number, height: number): void {
    if (!this.skyGfx) return;
    this.seedBackgroundStars(width, height);
    this.layoutMission(width, height);
    if (this.phase === 'challenge') {
      this.layoutChallengeCards();
      this.drawChallengeCards();
    } else if (this.nodes.length) {
      this.layoutConstellationStars();
      this.redrawAll();
    }
  }

  protected onThemeChange(): void {
    // Night observatory always uses the dark mission palette — ignore app bright mode.
    this.lockNightPalette();
    if (!this.titleText) return;
    this.titleText.setColor(this.palette.primary);
    this.locationText.setColor(this.palette.textTertiary);
    this.progressText.setColor(this.palette.textSecondary);
    this.promptText.setColor(this.palette.textSecondary);
    this.linkText.setColor(this.palette.textSecondary);
    this.factText.setStyle({
      color: this.palette.textPrimary,
      backgroundColor: this.palette.panelChrome,
    });
    this.undoButton.setStyle({
      color: this.palette.textPrimary,
      backgroundColor: this.palette.panelChrome,
    });
    this.challengePrompt.setColor(this.palette.primary);
    this.nodes.forEach((node) => {
      node.nameLabel.setStyle({
        color: this.palette.accent,
        backgroundColor: this.palette.panelChrome,
      });
    });
    this.drawDock();
    this.drawNebula();
    this.redrawAll();
    if (this.phase === 'revealed') this.renderConstellationArt();
    if (this.phase === 'challenge') this.drawChallengeCards();
  }

  /** Mission 4 is a night-sky observatory — always render with dark chrome. */
  private lockNightPalette(): void {
    this.palette = getMissionPalette('dark');
    this.cameras.main.setBackgroundColor('#050711');
  }

  private getCurrent(): ConstellationDefinition {
    return CONSTELLATIONS[this.constellationIndex];
  }

  private layoutMission(width: number, height: number): void {
    const dockH = Math.max(72, Math.min(96, height * 0.12));
    this.dockRect.setTo(16, height - dockH - 12, width - 32, dockH);
    this.skyRect.setTo(0, 0, width, this.dockRect.y - 8);

    const framePadTop = 86;
    const framePadBottom = 28;
    const availableHeight = Math.max(
      180,
      this.skyRect.height - framePadTop - framePadBottom
    );
    const maxFrameWidth = width < 700 ? width - 28 : width * 0.72;
    const frameSize = Math.max(180, Math.min(maxFrameWidth, availableHeight));
    this.visualScale = Phaser.Math.Clamp(frameSize / 520, 0.72, 1.2);
    this.frameRect.setTo(
      (width - frameSize) / 2,
      framePadTop,
      frameSize,
      frameSize
    );

    this.titleText.setPosition(24, 16);
    this.locationText.setPosition(24, 40);
    this.progressText.setPosition(width - 24, 20);
    this.promptText
      .setPosition(width / 2, 58)
      .setStyle({ wordWrap: { width: width - 80 } });
    this.factText
      .setPosition(width / 2, 78)
      .setStyle({ wordWrap: { width: Math.min(540, width - 80) } });
    this.linkText.setPosition(this.dockRect.centerX, this.dockRect.centerY);
    this.undoButton.setPosition(this.dockRect.right - 16, this.dockRect.centerY);
    this.challengePrompt.setPosition(width / 2, 56);

    this.drawNebula();
    this.drawBackgroundStars();
    this.drawDock();
    this.drawReferenceGlyph();
  }

  private seedBackgroundStars(width: number, height: number): void {
    this.bgStars = [];
    const count = width < 700 ? 90 : 140;
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      this.bgStars.push({
        x: Math.random() * width,
        y: 40 + Math.random() * (height - 60),
        r: layer === 0 ? 0.8 + Math.random() : layer === 1 ? 1.2 + Math.random() * 1.2 : 1.6 + Math.random() * 1.6,
        a: layer === 0 ? 0.25 + Math.random() * 0.25 : 0.4 + Math.random() * 0.4,
        layer,
        drift: (layer + 1) * 0.004,
      });
    }
  }

  private driftBackground(delta: number): void {
    const w = this.scale.width;
    for (const star of this.bgStars) {
      star.x += star.drift * delta * 0.06;
      if (star.x > w + 4) star.x = -4;
    }
    this.drawBackgroundStars();
  }

  private drawNebula(): void {
    this.nebulaGfx.clear();
    const { width, height } = this.scale;
    // Flat deep-space wash. Previous ellipse/circle primitives exposed their
    // boundaries as visible ovals, especially on high-contrast displays.
    this.nebulaGfx.fillStyle(0x071127, 1);
    this.nebulaGfx.fillRect(0, 0, width, height);
  }

  private drawBackgroundStars(): void {
    this.skyGfx.clear();
    for (const star of this.bgStars) {
      this.skyGfx.fillStyle(0xffffff, star.a);
      this.skyGfx.fillCircle(star.x, star.y, star.r);
    }
  }

  private drawDock(): void {
    this.dockGfx.clear();
    this.dockGfx.fillStyle(this.palette.panelBgNum, 0.78);
    this.dockGfx.fillRoundedRect(
      this.dockRect.x,
      this.dockRect.y,
      this.dockRect.width,
      this.dockRect.height,
      14
    );
    this.dockGfx.lineStyle(1, this.palette.primaryNum, 0.35);
    this.dockGfx.strokeRoundedRect(
      this.dockRect.x,
      this.dockRect.y,
      this.dockRect.width,
      this.dockRect.height,
      14
    );
  }

  private drawReferenceGlyph(): void {
    this.glyphGfx.clear();
    if (this.phase === 'challenge' || this.phase === 'complete') return;
    const def = this.getCurrent();
    const boxX = this.dockRect.x + 18;
    const boxY = this.dockRect.y + 14;
    const boxW = 56;
    const boxH = this.dockRect.height - 28;

    this.glyphGfx.lineStyle(1, this.palette.secondaryNum, 0.45);
    this.glyphGfx.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

    const pad = 8;
    const mapStar = (s: ConstellationStar) => ({
      x: boxX + pad + s.x * (boxW - pad * 2),
      y: boxY + pad + s.y * (boxH - pad * 2),
    });

    this.glyphGfx.lineStyle(1.5, this.palette.primaryNum, 0.7);
    for (const [a, b] of def.edges) {
      const sa = def.stars.find((s) => s.id === a);
      const sb = def.stars.find((s) => s.id === b);
      if (!sa || !sb) continue;
      const pa = mapStar(sa);
      const pb = mapStar(sb);
      this.glyphGfx.lineBetween(pa.x, pa.y, pb.x, pb.y);
    }
    for (const star of def.stars) {
      const p = mapStar(star);
      this.glyphGfx.fillStyle(0xffffff, 0.9);
      this.glyphGfx.fillCircle(p.x, p.y, 2);
    }
  }

  private clearNodes(): void {
    this.nodes.forEach((n) => {
      n.hit.destroy();
      n.core.destroy();
      n.glow.destroy();
      n.nameLabel.destroy();
    });
    this.nodes = [];
    this.nodeById.clear();
    this.completedEdges.clear();
    this.edgeHistory = [];
    this.selectedId = null;
    this.pointerLineTo = null;
    this.artAlpha = 0;
  }

  private startConstellation(index: number): void {
    this.constellationIndex = index;
    this.phase = 'preview';
    this.artAlpha = 0;
    this.clearNodes();
    this.clearChallenge();
    this.artImage.setVisible(false).setAlpha(0).setRotation(0);
    this.factText.setVisible(false);
    this.undoButton.setVisible(true);
    this.linkText.setVisible(true);
    this.promptText.setVisible(true);
    this.titleText.setVisible(true);
    this.locationText.setVisible(true);
    this.progressText.setVisible(true);

    const def = this.getCurrent();
    this.titleText.setText(def.name);
    this.locationText.setText(
      `${def.locationLabel.toUpperCase()} · ${def.seasonLabel.toUpperCase()} · ${
        def.hemisphere === 'northern' ? 'NORTHERN SKY' : 'SOUTHERN SKY'
      }`
    );
    this.progressText.setText(`SIGNAL ${index + 1} / ${CONSTELLATIONS.length}`);
    this.promptText.setText(def.prompt);
    this.updateLinkLabel();
    this.drawReferenceGlyph();

    this.spawnConstellationStars(def);
    this.layoutConstellationStars();
    this.setStarNamesVisible(false);
    this.redrawAll();

    // Preview: fade in constellation ghost, then hand control to player.
    this.previewAlpha = 0;
    this.tweens.add({
      targets: this,
      previewAlpha: 1,
      duration: this.reduceMotion ? 200 : 700,
      yoyo: true,
      hold: this.reduceMotion ? 400 : 1200,
      onComplete: () => {
        this.previewAlpha = 0;
        this.phase = 'tracing';
        this.promptText.setText(def.prompt);
        this.redrawPreviewOverlay();
        // Soft auto-demo first Orion belt link once
        if (def.id === 'orion' && this.completedEdges.size === 0) {
          this.time.delayedCall(400, () => {
            if (this.phase === 'tracing' && this.completedEdges.size === 0) {
              this.tryConnect('mintaka', 'alnilam', true);
            }
          });
        }
      },
    });
  }

  private spawnConstellationStars(def: ConstellationDefinition): void {
    for (const star of def.stars) {
      const radius = this.starRadius(star);
      const glow = this.add.circle(0, 0, radius * 2.4, star.color, 0.18).setDepth(18);
      const core = this.add.circle(0, 0, radius, star.color, 1).setDepth(20);
      const hit = this.add
        .circle(0, 0, Math.max(26, radius + 18), 0x000000, 0)
        .setDepth(25)
        .setInteractive({ useHandCursor: true });

      const nameLabel = this.addText(0, 0, star.name, {
        fontSize: '11px',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: this.palette.accent,
        backgroundColor: this.palette.panelChrome,
        padding: { x: 5, y: 2 },
      })
        .setOrigin(0.5, 1)
        .setDepth(26)
        .setVisible(false);

      hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.phase !== 'tracing') return;
        pointer.event?.stopPropagation?.();
        if (this.selectedId && this.selectedId !== star.id) {
          this.tryConnect(this.selectedId, star.id);
          this.selectedId = null;
          this.pointerLineTo = null;
        } else {
          this.selectedId = star.id;
          this.pointerLineTo = { x: pointer.x, y: pointer.y };
        }
        this.paintStars();
        this.redrawLines();
      });

      const node: StarNode = {
        def: star,
        flatX: 0,
        flatY: 0,
        x: 0,
        y: 0,
        radius,
        hit,
        core,
        glow,
        nameLabel,
      };
      this.nodes.push(node);
      this.nodeById.set(star.id, node);
    }
  }

  private starRadius(star: ConstellationStar): number {
    // Brighter (lower magnitude) → larger
    return Phaser.Math.Clamp(
      (7.5 - star.magnitude * 1.1) * this.visualScale,
      3.2,
      10
    );
  }

  private layoutConstellationStars(): void {
    this.nodes.forEach((node, index) => {
      const radius = this.starRadius(node.def);
      node.radius = radius;
      const flatX = this.frameRect.x + node.def.x * this.frameRect.width;
      const flatY = this.frameRect.y + node.def.y * this.frameRect.height;
      node.flatX = flatX;
      node.flatY = flatY;
      node.x = flatX;
      node.y = flatY;

      node.core.setPosition(node.x, node.y).setRadius(radius).setScale(1);
      node.glow
        .setPosition(node.x, node.y)
        .setRadius(radius * 2.4)
        .setScale(1);
      node.hit
        .setPosition(node.x, node.y)
        .setRadius(Math.max(24, radius + 17 * this.visualScale));
      // Stagger labels so compact groups (notably Orion's Belt and Crux) remain legible.
      const side = index % 2 === 0 ? -1 : 1;
      const row = index % 3;
      node.nameLabel
        .setFontSize(`${Math.round(Phaser.Math.Clamp(11 * this.visualScale, 10, 13))}px`)
        .setPosition(
          node.x + side * 8 * this.visualScale,
          node.y - radius - 7 * this.visualScale - row * 8 * this.visualScale
        )
        .setOrigin(side < 0 ? 1 : 0, 1);
    });

    if (this.phase === 'revealed') {
      this.renderConstellationArt();
    }
  }

  private setStarNamesVisible(visible: boolean): void {
    this.nodes.forEach((node) => node.nameLabel.setVisible(visible));
  }

  private updateLinkLabel(): void {
    const def = this.getCurrent();
    this.linkText.setText(`${this.completedEdges.size} / ${def.edges.length} links`);
  }

  private findNearestNode(x: number, y: number, maxDist: number): StarNode | null {
    let best: StarNode | null = null;
    let bestD = maxDist;
    for (const node of this.nodes) {
      const d = Phaser.Math.Distance.Between(x, y, node.x, node.y);
      if (d < bestD) {
        bestD = d;
        best = node;
      }
    }
    return best;
  }

  private isValidEdge(a: string, b: string): boolean {
    const key = edgeKey(a, b);
    return this.getCurrent().edges.some(([x, y]) => edgeKey(x, y) === key);
  }

  private tryConnect(a: string, b: string, silent = false): void {
    if (this.phase !== 'tracing' && !silent) return;
    const key = edgeKey(a, b);
    if (this.completedEdges.has(key)) return;

    if (!this.isValidEdge(a, b)) {
      if (!silent) this.flashMismatch(a, b);
      return;
    }

    this.completedEdges.add(key);
    this.edgeHistory.push(key);
    this.updateLinkLabel();
    this.spawnConnectionPulse(a, b);
    this.redrawLines();
    this.paintStars();

    if (this.completedEdges.size >= this.getCurrent().edges.length) {
      this.onPatternComplete();
    }
  }

  private undoLastEdge(): void {
    if (this.phase !== 'tracing' || this.edgeHistory.length === 0) return;
    const key = this.edgeHistory.pop();
    if (!key) return;
    this.completedEdges.delete(key);
    this.updateLinkLabel();
    this.redrawLines();
    this.paintStars();
  }

  private flashMismatch(a: string, b: string): void {
    const na = this.nodeById.get(a);
    const nb = this.nodeById.get(b);
    if (!na || !nb) return;
    this.fxGfx.clear();
    this.fxGfx.lineStyle(2, this.palette.alertNum, 0.85);
    this.fxGfx.lineBetween(na.x, na.y, nb.x, nb.y);
    this.tweens.add({
      targets: { t: 1 },
      t: 0,
      duration: 450,
      onUpdate: (tw) => {
        const alpha = (tw.targets[0] as { t: number }).t;
        this.fxGfx.clear();
        this.fxGfx.lineStyle(2, this.palette.alertNum, alpha * 0.85);
        this.fxGfx.lineBetween(na.x, na.y, nb.x, nb.y);
      },
      onComplete: () => this.fxGfx.clear(),
    });
  }

  private spawnConnectionPulse(a: string, b: string): void {
    const na = this.nodeById.get(a);
    const nb = this.nodeById.get(b);
    if (!na || !nb) return;
    const marker = this.add.circle(na.x, na.y, 3, this.palette.accentNum, 1).setDepth(28);
    this.tweens.add({
      targets: marker,
      x: nb.x,
      y: nb.y,
      duration: this.reduceMotion ? 180 : 420,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        marker.destroy();
        this.fxGfx.fillStyle(this.palette.primaryNum, 0.5);
        this.fxGfx.fillCircle(nb.x, nb.y, nb.radius + 6);
        this.time.delayedCall(180, () => this.fxGfx.clear());
      },
    });
  }

  private onPatternComplete(): void {
    this.phase = 'revealed';
    this.selectedId = null;
    this.pointerLineTo = null;
    this.completedPatterns++;
    const def = this.getCurrent();

    this.promptText.setText(`${def.name}  ·  ${def.subtitle}`);
    this.factText.setText(def.fact).setVisible(true);
    this.undoButton.setVisible(false);
    this.setStarNamesVisible(true);
    this.redrawLines();
    this.paintStars();

    // Reveal the atlas figure immediately; completed star geometry stays untouched.
    this.artAlpha = 1;
    this.renderConstellationArt();

    this.time.delayedCall(3800, () => {
      if (this.constellationIndex + 1 < CONSTELLATIONS.length) {
        this.startConstellation(this.constellationIndex + 1);
      } else {
        this.beginFinalChallenge();
      }
    });
  }

  private renderConstellationArt(): void {
    if (this.phase !== 'revealed' || this.nodes.length === 0) {
      this.artImage.setVisible(false);
      return;
    }

    const def = this.getCurrent();
    const placement = ART_PLACEMENT[def.id];
    if (!placement) {
      this.artImage.setVisible(false);
      return;
    }

    const xs = this.nodes.map((n) => n.x);
    const ys = this.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const shapeW = Math.max(80, maxX - minX);
    const shapeH = Math.max(80, maxY - minY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.artImage.setTexture(`constellation-art-${def.id}`);
    const sourceAspect = this.artImage.width / Math.max(1, this.artImage.height);
    const from = this.averageNodePosition(placement.from);
    const to = this.averageNodePosition(placement.to);

    let displayW: number;
    let displayH: number;
    if (placement.fit === 'axis' && from && to) {
      const axisLength = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      displayW = axisLength * placement.scale;
      displayH = displayW / sourceAspect;
    } else if (placement.fit === 'height') {
      displayH = shapeH * placement.scale;
      displayW = displayH * sourceAspect;
    } else if (placement.fit === 'square') {
      displayW = Math.max(shapeW, shapeH) * placement.scale;
      displayH = displayW / sourceAspect;
    } else {
      displayW = shapeW * placement.scale;
      displayH = displayW / sourceAspect;
    }

    // Keep detailed art inside the observable sky frame on every viewport.
    const fitScale = Math.min(
      1,
      (this.frameRect.width * 0.96) / displayW,
      (this.frameRect.height * 0.96) / displayH
    );
    displayW *= fitScale;
    displayH *= fitScale;

    let rotation = 0;
    if (from && to) {
      rotation = Math.atan2(to.y - from.y, to.x - from.x);
      if (placement.axis === 'vertical') rotation -= Math.PI / 2;
    }

    // Axis-fitted art is centred on its defining anatomy (e.g. scorpion
    // head-to-stinger), not on outlying claws or decorative star bounds.
    const artCenterX =
      placement.fit === 'axis' && from && to ? (from.x + to.x) / 2 : centerX;
    const artCenterY =
      placement.fit === 'axis' && from && to ? (from.y + to.y) / 2 : centerY;

    this.artImage
      .setPosition(
        artCenterX + (placement.offsetX ?? 0) * shapeW,
        artCenterY + (placement.offsetY ?? 0) * shapeH
      )
      .setDisplaySize(displayW, displayH)
      .setRotation(rotation)
      .setAlpha(placement.alpha * this.artAlpha)
      .setVisible(true);
  }

  private averageNodePosition(ids?: string[]): { x: number; y: number } | null {
    if (!ids?.length) return null;
    const matches = ids
      .map((id) => this.nodeById.get(id))
      .filter((node): node is StarNode => Boolean(node));
    if (!matches.length) return null;
    return {
      x: matches.reduce((sum, node) => sum + node.x, 0) / matches.length,
      y: matches.reduce((sum, node) => sum + node.y, 0) / matches.length,
    };
  }

  private beginFinalChallenge(): void {
    this.phase = 'challenge';
    this.clearNodes();
    this.artImage.setVisible(false);
    this.lineGfx.clear();
    this.previewGfx.clear();
    this.fxGfx.clear();
    this.factText.setVisible(false);
    this.undoButton.setVisible(false);
    this.linkText.setVisible(false);
    this.promptText.setVisible(false);
    this.locationText.setText('NEW DELHI · MARCH · FIND THE REAL ORION');
    this.titleText.setText('SIGNAL CHECK');
    this.progressText.setText('FINAL');
    this.challengePrompt
      .setText('Which signal matches the real sky pattern?')
      .setVisible(true);
    this.drawReferenceGlyph();

    const real = CONSTELLATIONS.find((c) => c.id === 'orion') ?? CONSTELLATIONS[0];
    const fake = scrambleConstellation(real);
    const realLeft = Math.random() > 0.5;

    this.challengeCards = [
      {
        def: realLeft ? real : fake,
        isReal: realLeft,
        rect: new Phaser.Geom.Rectangle(),
        hit: this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setDepth(65).setInteractive({ useHandCursor: true }),
      },
      {
        def: realLeft ? fake : real,
        isReal: !realLeft,
        rect: new Phaser.Geom.Rectangle(),
        hit: this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setDepth(65).setInteractive({ useHandCursor: true }),
      },
    ];

    this.challengeCards.forEach((card) => {
      card.hit.on('pointerdown', () => this.resolveChallenge(card));
      card.hit.on('pointerover', () => {
        card.hit.setStrokeStyle(2, this.palette.accentNum, 0.8);
      });
      card.hit.on('pointerout', () => {
        card.hit.setStrokeStyle();
        this.drawChallengeCards();
      });
    });

    this.layoutChallengeCards();
    this.drawChallengeCards();
  }

  private layoutChallengeCards(): void {
    const { width } = this.scale;
    const cardW = Math.min(280, (width - 72) / 2);
    const cardH = Math.min(260, this.skyRect.height * 0.55);
    const gap = 24;
    const total = cardW * 2 + gap;
    const left = (width - total) / 2;
    const top = this.skyRect.centerY - cardH / 2 + 10;

    this.challengeCards.forEach((card, i) => {
      card.rect.setTo(left + i * (cardW + gap), top, cardW, cardH);
      card.hit
        .setPosition(card.rect.centerX, card.rect.centerY)
        .setSize(card.rect.width, card.rect.height)
        .setDisplaySize(card.rect.width, card.rect.height);
    });
  }

  private drawChallengeCards(): void {
    this.lineGfx.clear();
    this.previewGfx.clear();
    for (const card of this.challengeCards) {
      this.lineGfx.fillStyle(this.palette.panelBgNum, 0.62);
      this.lineGfx.fillRoundedRect(card.rect.x, card.rect.y, card.rect.width, card.rect.height, 14);
      this.lineGfx.lineStyle(1, this.palette.primaryNum, 0.35);
      this.lineGfx.strokeRoundedRect(card.rect.x, card.rect.y, card.rect.width, card.rect.height, 14);

      const pad = 28;
      const map = (s: ConstellationStar) => ({
        x: card.rect.x + pad + s.x * (card.rect.width - pad * 2),
        y: card.rect.y + pad + s.y * (card.rect.height - pad * 2 - 20),
      });

      this.previewGfx.lineStyle(2, this.palette.primaryNum, 0.75);
      for (const [a, b] of card.def.edges) {
        const sa = card.def.stars.find((s) => s.id === a);
        const sb = card.def.stars.find((s) => s.id === b);
        if (!sa || !sb) continue;
        const pa = map(sa);
        const pb = map(sb);
        this.previewGfx.lineBetween(pa.x, pa.y, pb.x, pb.y);
      }
      for (const star of card.def.stars) {
        const p = map(star);
        this.previewGfx.fillStyle(star.color, 1);
        this.previewGfx.fillCircle(p.x, p.y, this.starRadius(star) * 0.85);
      }
    }

    this.ensureChallengeLabels();
  }

  private challengeLabels: Phaser.GameObjects.Text[] = [];

  private ensureChallengeLabels(): void {
    while (this.challengeLabels.length < this.challengeCards.length) {
      this.challengeLabels.push(
        this.addText(0, 0, '', {
          fontSize: '12px',
          fontFamily: 'Courier Prime, monospace',
          color: this.palette.textSecondary,
        })
          .setOrigin(0.5)
          .setDepth(66)
      );
    }
    this.challengeCards.forEach((card, i) => {
      this.challengeLabels[i]
        .setText(i === 0 ? 'SIGNAL A' : 'SIGNAL B')
        .setPosition(card.rect.centerX, card.rect.bottom - 18)
        .setColor(this.palette.textSecondary)
        .setVisible(true);
    });
  }

  private resolveChallenge(card: ChallengeCard): void {
    if (this.phase !== 'challenge' || this.isComplete) return;
    if (!card.isReal) {
      this.challengePrompt.setText('Not that one — look for Orion’s belt.');
      this.challengePrompt.setColor(this.palette.alert);
      this.time.delayedCall(1400, () => {
        if (this.phase === 'challenge') {
          this.challengePrompt.setText('Which signal matches the real sky pattern?');
          this.challengePrompt.setColor(this.palette.primary);
        }
      });
      return;
    }

    this.phase = 'complete';
    this.isComplete = true;
    this.challengePrompt.setText('Correct — that is the real Orion pattern.');
    this.challengePrompt.setColor(this.palette.primary);

    const success = this.addText(this.scale.width / 2, this.scale.height / 2, 'Star Patterns Charted!', {
      fontSize: '26px',
      fontFamily: 'Orbitron, monospace',
      fontStyle: 'bold',
      color: this.palette.primary,
      backgroundColor: this.palette.panelChrome,
      padding: { x: 20, y: 14 },
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);

    this.tweens.add({
      targets: success,
      alpha: 1,
      duration: 300,
    });

    this.time.delayedCall(2200, () => this.completeMission(100));
  }

  private clearChallenge(): void {
    this.challengeCards.forEach((c) => c.hit.destroy());
    this.challengeCards = [];
    this.challengeLabels.forEach((t) => t.setVisible(false));
    this.challengePrompt.setVisible(false);
  }

  private redrawAll(): void {
    this.redrawPreviewOverlay();
    this.redrawLines();
    this.paintStars();
  }

  private redrawPreviewOverlay(): void {
    this.previewGfx.clear();
    if (this.previewAlpha <= 0.01) return;
    const def = this.getCurrent();
    const highlight = new Set(def.highlightIds ?? []);

    this.previewGfx.lineStyle(2, this.palette.primaryNum, this.previewAlpha * 0.55);
    for (const [a, b] of def.edges) {
      const na = this.nodeById.get(a);
      const nb = this.nodeById.get(b);
      if (!na || !nb) continue;
      this.previewGfx.lineBetween(na.flatX, na.flatY, nb.flatX, nb.flatY);
    }

    for (const node of this.nodes) {
      const boost = highlight.has(node.def.id) ? 1.4 : 1;
      this.previewGfx.fillStyle(this.palette.accentNum, this.previewAlpha * 0.35 * boost);
      this.previewGfx.fillCircle(node.flatX, node.flatY, node.radius * 2.2 * boost);
    }
  }

  private redrawLines(): void {
    this.lineGfx.clear();
    const completedColor = this.phase === 'revealed' ? this.palette.accentNum : this.palette.primaryNum;

    this.lineGfx.lineStyle(2.5, completedColor, 0.9);
    for (const key of this.completedEdges) {
      const [a, b] = key.split('|');
      const na = this.nodeById.get(a);
      const nb = this.nodeById.get(b);
      if (!na || !nb) continue;
      this.lineGfx.lineBetween(na.x, na.y, nb.x, nb.y);
    }

    if (this.phase === 'tracing' && this.selectedId && this.pointerLineTo) {
      const from = this.nodeById.get(this.selectedId);
      if (from) {
        this.lineGfx.lineStyle(2, this.palette.secondaryNum, 0.55);
        this.lineGfx.lineBetween(from.x, from.y, this.pointerLineTo.x, this.pointerLineTo.y);
      }
    }
  }

  private paintStars(): void {
    const def = this.getCurrent();
    const startId = def.startStarId;
    const pulse = 0.55 + Math.sin(this.pulseT * 0.005) * 0.45;

    for (const node of this.nodes) {
      const selected = this.selectedId === node.def.id;
      const isStart =
        this.phase === 'tracing' &&
        this.completedEdges.size === 0 &&
        startId === node.def.id;

      let glowAlpha = 0.18;
      let glowScale = 1;
      if (selected) {
        glowAlpha = 0.45;
        glowScale = 1.35;
      } else if (isStart) {
        glowAlpha = 0.2 + pulse * 0.35;
        glowScale = 1 + pulse * 0.25;
      } else if (this.phase === 'revealed') {
        glowAlpha = 0.34;
        glowScale = 1.18;
      }

      node.glow.setFillStyle(node.def.color, glowAlpha);
      node.glow.setRadius(node.radius * 2.4 * glowScale);
      node.core.setFillStyle(node.def.color, 1);
      node.core.setStrokeStyle(selected ? 2 : 0, 0xffffff, selected ? 0.8 : 0);
    }
  }
}
