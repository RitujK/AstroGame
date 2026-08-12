/**
 * Mission 4 constellation catalog.
 *
 * Stars use J2000 approximate RA/Dec. Screen positions are projected for:
 * - Northern patterns: New Delhi (28.61°N), March evening (LST ≈ 9h)
 * - Southern patterns: Cape Town (33.92°S), September evening (LST ≈ 16.7h)
 */

export type SkyHemisphere = 'northern' | 'southern';

export interface CatalogStar {
  id: string;
  name: string;
  /** Right ascension in degrees (0–360) */
  raDeg: number;
  /** Declination in degrees */
  decDeg: number;
  /** Approximate distance in light-years */
  distance: number;
  /** Apparent magnitude — lower is brighter */
  magnitude: number;
  /** Spectral colour cue */
  color: number;
}

export interface ConstellationStar extends CatalogStar {
  /** 0–1 within the constellation frame after local-sky projection */
  x: number;
  /** 0–1 within the constellation frame after local-sky projection */
  y: number;
}

export interface ConstellationDefinition {
  id: string;
  name: string;
  subtitle: string;
  hemisphere: SkyHemisphere;
  locationLabel: string;
  seasonLabel: string;
  prompt: string;
  fact: string;
  depthFact: string;
  startStarId?: string;
  highlightIds?: string[];
  stars: ConstellationStar[];
  edges: Array<[string, string]>;
}

export interface ObserverSite {
  name: string;
  city: string;
  season: string;
  latitudeDeg: number;
  /** Local sidereal time in degrees for the chosen evening */
  lstDeg: number;
}

export const OBSERVER_NORTHERN: ObserverSite = {
  name: 'northern',
  city: 'New Delhi',
  season: 'March',
  latitudeDeg: 28.6139,
  // ~21:00 local near mid-March — Orion west, Leo high south, Dipper north
  lstDeg: 135,
};

export const OBSERVER_SOUTHERN: ObserverSite = {
  name: 'southern',
  city: 'Cape Town',
  season: 'September',
  latitudeDeg: -33.9249,
  // ~21:00 local near mid-September — Scorpius high, Crux in the south
  lstDeg: 250,
};

interface RawConstellation {
  id: string;
  name: string;
  subtitle: string;
  hemisphere: SkyHemisphere;
  prompt: string;
  fact: string;
  depthFact: string;
  startStarId?: string;
  highlightIds?: string[];
  stars: CatalogStar[];
  edges: Array<[string, string]>;
}

const RAW: RawConstellation[] = [
  {
    id: 'orion',
    name: 'ORION',
    subtitle: 'The Hunter',
    hemisphere: 'northern',
    prompt: 'Trace Orion — start with the three belt stars.',
    fact: 'Orion’s three middle stars form his famous belt — one of the easiest patterns in the March sky over New Delhi.',
    depthFact:
      'Orion’s stars are not neighbours in space. Betelgeuse, Rigel, and the belt stars sit at very different distances.',
    startStarId: 'mintaka',
    highlightIds: ['mintaka', 'alnilam', 'alnitak'],
    stars: [
      { id: 'betelgeuse', name: 'Betelgeuse', raDeg: 88.7929, decDeg: 7.4071, distance: 548, magnitude: 0.45, color: 0xffb074 },
      { id: 'bellatrix', name: 'Bellatrix', raDeg: 81.2828, decDeg: 6.3497, distance: 250, magnitude: 1.64, color: 0xb8d4ff },
      { id: 'mintaka', name: 'Mintaka', raDeg: 83.0017, decDeg: -0.2991, distance: 916, magnitude: 2.25, color: 0xa8c8ff },
      { id: 'alnilam', name: 'Alnilam', raDeg: 84.0534, decDeg: -1.2019, distance: 2000, magnitude: 1.69, color: 0xb0d0ff },
      { id: 'alnitak', name: 'Alnitak', raDeg: 85.1897, decDeg: -1.9426, distance: 1260, magnitude: 1.74, color: 0xa0c0ff },
      { id: 'rigel', name: 'Rigel', raDeg: 78.6345, decDeg: -8.2016, distance: 860, magnitude: 0.18, color: 0xc8e0ff },
      { id: 'saiph', name: 'Saiph', raDeg: 86.9391, decDeg: -9.6696, distance: 650, magnitude: 2.07, color: 0xb0d0ff },
    ],
    edges: [
      ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'],
      ['bellatrix', 'betelgeuse'],
      ['bellatrix', 'mintaka'],
      ['betelgeuse', 'alnitak'],
      ['mintaka', 'rigel'],
      ['alnitak', 'saiph'],
      ['rigel', 'saiph'],
    ],
  },
  {
    id: 'ursa-major',
    name: 'URSA MAJOR',
    subtitle: 'The Big Dipper',
    hemisphere: 'northern',
    prompt: 'Trace the Big Dipper high in the northern sky.',
    fact: 'The Big Dipper is an asterism inside Ursa Major — from New Delhi in March it hangs high in the north.',
    depthFact:
      'Even the Dipper’s bowl and handle stars are at different distances. The ladle shape exists only from Earth’s viewpoint.',
    startStarId: 'dubhe',
    stars: [
      { id: 'dubhe', name: 'Dubhe', raDeg: 165.4603, decDeg: 61.7511, distance: 123, magnitude: 1.81, color: 0xffd0a0 },
      { id: 'merak', name: 'Merak', raDeg: 165.9329, decDeg: 56.3824, distance: 79, magnitude: 2.34, color: 0xc8dcff },
      { id: 'phecda', name: 'Phecda', raDeg: 178.4577, decDeg: 53.6948, distance: 83, magnitude: 2.41, color: 0xc0d8ff },
      { id: 'megrez', name: 'Megrez', raDeg: 183.8565, decDeg: 57.0326, distance: 81, magnitude: 3.32, color: 0xb8d0ff },
      { id: 'alioth', name: 'Alioth', raDeg: 193.5073, decDeg: 55.9598, distance: 83, magnitude: 1.76, color: 0xc8dcff },
      { id: 'mizar', name: 'Mizar', raDeg: 200.9814, decDeg: 54.9254, distance: 86, magnitude: 2.23, color: 0xc0d8ff },
      { id: 'alkaid', name: 'Alkaid', raDeg: 206.8852, decDeg: 49.3133, distance: 104, magnitude: 1.85, color: 0xb0ccff },
    ],
    edges: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    id: 'cassiopeia',
    name: 'CASSIOPEIA',
    subtitle: 'The Queen',
    hemisphere: 'northern',
    prompt: 'Trace Cassiopeia’s bright W in the northern sky.',
    fact: 'Cassiopeia’s W (or M) is a circumpolar guide for New Delhi — always somewhere in the northern night sky.',
    depthFact:
      'The W looks flat on the sky, but its five bright stars are staggered in depth across tens of light-years.',
    startStarId: 'schedar',
    stars: [
      { id: 'caph', name: 'Caph', raDeg: 2.2945, decDeg: 59.1498, distance: 54, magnitude: 2.28, color: 0xffe0b0 },
      { id: 'schedar', name: 'Schedar', raDeg: 10.1268, decDeg: 56.5373, distance: 228, magnitude: 2.24, color: 0xffb080 },
      { id: 'gamma-cas', name: 'Gamma Cas', raDeg: 14.1772, decDeg: 60.7167, distance: 550, magnitude: 2.15, color: 0xb0d0ff },
      { id: 'ruchbah', name: 'Ruchbah', raDeg: 21.4538, decDeg: 60.2353, distance: 99, magnitude: 2.66, color: 0xc8dcff },
      { id: 'segin', name: 'Segin', raDeg: 28.5989, decDeg: 63.6701, distance: 410, magnitude: 3.35, color: 0xb8d4ff },
    ],
    edges: [
      ['caph', 'schedar'],
      ['schedar', 'gamma-cas'],
      ['gamma-cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
  {
    id: 'leo',
    name: 'LEO',
    subtitle: 'The Lion',
    hemisphere: 'northern',
    prompt: 'Trace Leo — find Regulus, then the sickle and the hindquarters.',
    fact: 'In March from New Delhi, Leo rides high in the south — Regulus marks the lion’s heart.',
    depthFact:
      'Regulus, Denebola, and the sickle stars form one animal on the sky map, but they do not form a physical group in space.',
    startStarId: 'regulus',
    highlightIds: ['regulus'],
    stars: [
      { id: 'regulus', name: 'Regulus', raDeg: 152.0929, decDeg: 11.9672, distance: 79, magnitude: 1.36, color: 0xb0d0ff },
      { id: 'algieba', name: 'Algieba', raDeg: 154.9931, decDeg: 19.8415, distance: 130, magnitude: 2.01, color: 0xffc090 },
      { id: 'adhafera', name: 'Adhafera', raDeg: 154.1725, decDeg: 23.4173, distance: 250, magnitude: 3.43, color: 0xffe0b0 },
      { id: 'rasalased', name: 'Rasalased', raDeg: 148.1906, decDeg: 23.7743, distance: 250, magnitude: 3.52, color: 0xffd0a0 },
      { id: 'zosma', name: 'Zosma', raDeg: 168.5600, decDeg: 20.5237, distance: 58, magnitude: 2.56, color: 0xc8dcff },
      { id: 'chertan', name: 'Chertan', raDeg: 171.9398, decDeg: 15.4299, distance: 165, magnitude: 3.33, color: 0xc0d8ff },
      { id: 'denebola', name: 'Denebola', raDeg: 177.2649, decDeg: 14.5721, distance: 36, magnitude: 2.14, color: 0xc8e0ff },
    ],
    edges: [
      ['rasalased', 'adhafera'],
      ['adhafera', 'algieba'],
      ['algieba', 'regulus'],
      ['regulus', 'chertan'],
      ['chertan', 'zosma'],
      ['zosma', 'denebola'],
      ['chertan', 'denebola'],
    ],
  },
  {
    id: 'crux',
    name: 'CRUX',
    subtitle: 'The Southern Cross',
    hemisphere: 'southern',
    prompt: 'Trace Crux — the Southern Cross over Cape Town.',
    fact: 'Crux is the smallest official constellation. From Cape Town in September it stands in the southern sky.',
    depthFact:
      'The Cross looks compact from Earth, yet Acrux and Gacrux are hundreds of light-years apart in depth.',
    startStarId: 'gacrux',
    stars: [
      { id: 'gacrux', name: 'Gacrux', raDeg: 187.7915, decDeg: -57.1132, distance: 88, magnitude: 1.59, color: 0xffa070 },
      { id: 'acrux', name: 'Acrux', raDeg: 186.6496, decDeg: -63.0991, distance: 320, magnitude: 0.77, color: 0xa8c8ff },
      { id: 'mimosa', name: 'Mimosa', raDeg: 191.9303, decDeg: -59.6888, distance: 280, magnitude: 1.25, color: 0xb0d0ff },
      { id: 'delta', name: 'Delta Crucis', raDeg: 183.7863, decDeg: -58.7489, distance: 345, magnitude: 2.79, color: 0xb8d4ff },
      { id: 'epsilon', name: 'Epsilon Crucis', raDeg: 186.4394, decDeg: -60.4012, distance: 230, magnitude: 3.59, color: 0xffb080 },
    ],
    edges: [
      ['gacrux', 'acrux'],
      ['delta', 'mimosa'],
      ['gacrux', 'delta'],
      ['gacrux', 'mimosa'],
      ['acrux', 'delta'],
      ['acrux', 'mimosa'],
      ['epsilon', 'acrux'],
    ],
  },
  {
    id: 'scorpius',
    name: 'SCORPIUS',
    subtitle: 'The Scorpion',
    hemisphere: 'southern',
    prompt: 'Trace Scorpius — begin at Antares, then follow the curve to the sting.',
    fact: 'In September from Cape Town, Scorpius arches across the evening sky with fiery Antares at its heart.',
    depthFact:
      'Antares and the sting stars (Shaula, Lesath) make one scorpion on the map, but they lie at very different distances.',
    startStarId: 'antares',
    highlightIds: ['antares'],
    stars: [
      { id: 'dscribba', name: 'Dschubba', raDeg: 240.0833, decDeg: -22.6217, distance: 400, magnitude: 2.29, color: 0xb0d0ff },
      { id: 'graffias', name: 'Graffias', raDeg: 241.3591, decDeg: -19.8055, distance: 400, magnitude: 2.56, color: 0xb8d4ff },
      { id: 'pi-sco', name: 'Pi Scorpii', raDeg: 241.7027, decDeg: -26.1141, distance: 590, magnitude: 2.89, color: 0xa8c8ff },
      { id: 'antares', name: 'Antares', raDeg: 247.3519, decDeg: -26.4320, distance: 550, magnitude: 1.06, color: 0xff6b4a },
      { id: 'tau-sco', name: 'Tau Scorpii', raDeg: 248.9707, decDeg: -28.2160, distance: 430, magnitude: 2.82, color: 0xb0d0ff },
      { id: 'epsilon-sco', name: 'Epsilon Scorpii', raDeg: 252.5409, decDeg: -34.2932, distance: 64, magnitude: 2.29, color: 0xffc090 },
      { id: 'zeta-sco', name: 'Zeta Scorpii', raDeg: 254.9992, decDeg: -42.3619, distance: 150, magnitude: 3.62, color: 0xc8dcff },
      { id: 'shaula', name: 'Shaula', raDeg: 263.4022, decDeg: -37.1038, distance: 570, magnitude: 1.62, color: 0xb0d0ff },
      { id: 'lesath', name: 'Lesath', raDeg: 262.6909, decDeg: -37.2958, distance: 500, magnitude: 2.70, color: 0xb8d4ff },
    ],
    edges: [
      ['graffias', 'dscribba'],
      ['dscribba', 'pi-sco'],
      ['pi-sco', 'antares'],
      ['graffias', 'antares'],
      ['antares', 'tau-sco'],
      ['tau-sco', 'epsilon-sco'],
      ['epsilon-sco', 'zeta-sco'],
      ['zeta-sco', 'shaula'],
      ['shaula', 'lesath'],
    ],
  },
];

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Convert equatorial coordinates to altitude / azimuth for an observer. */
export function equatorialToAltAz(
  raDeg: number,
  decDeg: number,
  latitudeDeg: number,
  lstDeg: number
): { altDeg: number; azDeg: number } {
  const ha = toRad(lstDeg - raDeg);
  const dec = toRad(decDeg);
  const lat = toRad(latitudeDeg);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAlt = Math.cos(alt) || 1e-6;

  const sinAz = (-Math.sin(ha) * Math.cos(dec)) / cosAlt;
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (cosAlt * Math.cos(lat) || 1e-6);
  const az = Math.atan2(sinAz, cosAz); // 0 = north, 90° = east

  return { altDeg: (alt * 180) / Math.PI, azDeg: ((az * 180) / Math.PI + 360) % 360 };
}

/**
 * Project a star onto a north-up local sky plane.
 * x increases east, y increases north (before screen flip).
 */
function projectLocal(
  raDeg: number,
  decDeg: number,
  site: ObserverSite
): { x: number; y: number; altDeg: number } {
  const { altDeg, azDeg } = equatorialToAltAz(raDeg, decDeg, site.latitudeDeg, site.lstDeg);
  const az = toRad(azDeg);
  // Zenith distance factor — keeps relative layout readable even when low
  const r = Math.max(0.08, (90 - altDeg) / 90);
  return {
    x: r * Math.sin(az),
    y: r * Math.cos(az),
    altDeg,
  };
}

function fitToUnitSquare(
  points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const span = Math.max(spanX, spanY);
  const pad = 0.12;
  const usable = 1 - pad * 2;

  // Centre the wider axis; flip Y so north (larger y) draws toward the top of the screen.
  return points.map((p) => {
    const nx = (p.x - (minX + maxX) / 2) / span;
    const ny = (p.y - (minY + maxY) / 2) / span;
    return {
      x: clamp(0.5 + nx * usable, 0.06, 0.94),
      // Screen Y grows downward, so invert local north.
      y: clamp(0.5 - ny * usable, 0.06, 0.94),
    };
  });
}

function projectConstellation(raw: RawConstellation): ConstellationDefinition {
  const site = raw.hemisphere === 'northern' ? OBSERVER_NORTHERN : OBSERVER_SOUTHERN;
  const projected = raw.stars.map((star) => projectLocal(star.raDeg, star.decDeg, site));
  const fitted = fitToUnitSquare(projected);

  const stars: ConstellationStar[] = raw.stars.map((star, i) => ({
    ...star,
    x: fitted[i].x,
    y: fitted[i].y,
  }));

  return {
    id: raw.id,
    name: raw.name,
    subtitle: raw.subtitle,
    hemisphere: raw.hemisphere,
    locationLabel: site.city,
    seasonLabel: site.season,
    prompt: raw.prompt,
    fact: raw.fact,
    depthFact: raw.depthFact,
    startStarId: raw.startStarId,
    highlightIds: raw.highlightIds,
    stars,
    edges: raw.edges,
  };
}

export const CONSTELLATIONS: ConstellationDefinition[] = RAW.map(projectConstellation);

/** Warp projected positions for the final recognition challenge. */
export function scrambleConstellation(def: ConstellationDefinition): ConstellationDefinition {
  const stars = def.stars.map((star, index) => {
    const angle = index * 1.7 + 0.55;
    const radius = 0.16 + (index % 3) * 0.07;
    return {
      ...star,
      x: clamp(0.5 + Math.cos(angle) * radius + (index % 2) * 0.04, 0.1, 0.9),
      y: clamp(0.5 + Math.sin(angle) * radius * 1.15, 0.12, 0.9),
    };
  });
  return {
    ...def,
    id: `${def.id}-scramble`,
    name: `${def.name} · FAKE`,
    stars,
  };
}
