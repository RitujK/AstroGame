/**
 * Sweeps the Mission 5 orbital formation through a full revolution and reports
 * the tightest gap between any two worlds on screen, for candidate angular
 * offset schemes and a range of viewports. Used to pick a formation where the
 * planets never crowd each other enough to make tapping ambiguous.
 */
const PLANET_RADII = [11, 15, 16, 13, 30, 26, 20, 19];
const N = PLANET_RADII.length;

const DEPTH = {
  compact: { min: 0.42, max: 0.62 },
  wide: { min: 0.34, max: 0.44 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

function geometry(width, height, headerTop) {
  const compact = width < 880 || height < 660;
  const buttonRoom = compact ? 158 : 132;
  const spaceBottom = height - buttonRoom - 10;
  const widthLimit = width * (compact ? 0.45 : 0.42);
  const halfHeight = (spaceBottom - headerTop) * 0.5 * 0.86;
  const range = compact ? DEPTH.compact : DEPTH.wide;
  const depth = clamp(halfHeight / widthLimit, range.min, range.max);
  const maxOrbit = Math.min(widthLimit, halfHeight / depth);
  const systemScale = clamp(maxOrbit / 300, 0.62, 1.2);
  const radii = PLANET_RADII.map((_, i) => lerp(maxOrbit * 0.26, maxOrbit, (i + 1) / N));
  return { compact, depth, systemScale, radii };
}

function minGap(geo, offsets, samples = 720) {
  let worst = Infinity;
  let worstPair = null;
  for (let s = 0; s < samples; s += 1) {
    const phase = (s / samples) * Math.PI * 2;
    const pts = offsets.map((off, i) => {
      const a = phase + off;
      const persp = lerp(0.82, 1.12, (Math.sin(a) + 1) / 2);
      return {
        x: Math.cos(a) * geo.radii[i],
        y: Math.sin(a) * geo.radii[i] * geo.depth,
        r: PLANET_RADII[i] * geo.systemScale * persp,
      };
    });
    for (let i = 0; i < N; i += 1) {
      for (let j = i + 1; j < N; j += 1) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        const gap = d - pts[i].r - pts[j].r;
        if (gap < worst) {
          worst = gap;
          worstPair = [i, j];
        }
      }
    }
  }
  return { worst, worstPair };
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const schemes = {
  'even 45deg': Array.from({ length: N }, (_, i) => (i * Math.PI * 2) / N),
  'golden (shipped)': Array.from({ length: N }, (_, i) => i * GOLDEN),
  'half-turn stagger': Array.from({ length: N }, (_, i) => i * Math.PI + (i % 2) * 0.4),
  'alternating spiral': Array.from({ length: N }, (_, i) => (i * (Math.PI * 2 * 3)) / N),
};

const viewports = [
  ['iPhone SE portrait', 375, 667, 70],
  ['iPhone 14 portrait', 390, 844, 70],
  ['iPhone 14 landscape', 844, 390, 60],
  ['iPad portrait', 820, 1180, 74],
  ['laptop', 1280, 800, 82],
  ['desktop', 1680, 1050, 82],
];

for (const [name, offsets] of Object.entries(schemes)) {
  console.log(`\n== ${name}`);
  for (const [label, w, h, top] of viewports) {
    const geo = geometry(w, h, top);
    const { worst, worstPair } = minGap(geo, offsets);
    // Tap circles add this much padding per world, so gaps below twice it mean
    // two hit areas touch and the front world wins on depth.
    const grab = geo.compact ? 7 : 12;
    console.log(
      `  ${label.padEnd(22)} depth=${geo.depth.toFixed(2)} scale=${geo.systemScale.toFixed(2)} ` +
        `minGap=${worst.toFixed(1)}px  tightest=[${worstPair}]  ` +
        `taps=${worst >= grab * 2 ? 'clear' : 'overlap'}`
    );
  }
}
