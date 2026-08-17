/**
 * Mission 5 — Solar System Tour catalog.
 *
 * Each planet carries a "visual recipe" used to bake an equirectangular surface
 * texture at runtime, which is then wrapped on a sphere mesh and lit from the Sun.
 * Sizes are kid-readable rather than true scale (Jupiter would be ~11x Earth).
 */

export interface PlanetFeature {
  id: string;
  /** Short HUD prompt, e.g. "Saturn's rings" */
  prompt: string;
  /** Kid-friendly fact after a successful scan */
  fact: string;
}

export interface RingRecipe {
  /** Multiples of planet radius */
  inner: number;
  outer: number;
  color: number;
  shadeColor: number;
  alpha: number;
}

export interface SurfaceSpot {
  /** Centre in texture space (0–1) */
  u: number;
  v: number;
  /** Radii in texture space (0–1) */
  ru: number;
  rv: number;
  color: number;
  alpha: number;
}

export interface PlanetVisual {
  /** Base surface colour */
  base: number;
  /** Latitude band colours, sampled top → bottom and repeated */
  bands: number[];
  /** 0 = smooth, 1 = hard-edged banding */
  bandContrast: number;
  /** Number of impact craters to stamp (0 for gas/ice giants) */
  craters: number;
  /** Bright polar cap strength, 0 = none */
  polarCaps: number;
  /** Fine surface grain, 0–1 */
  grain: number;
  /** Rim / halo colour for the atmosphere glow */
  atmosphere: number;
  /** 0 = airless rock, 1 = thick hazy shell */
  atmosphereStrength: number;
  /** Named surface markings (storms, maria) */
  spots?: SurfaceSpot[];
  rings?: RingRecipe;
  /** Visual axis lean in degrees (Uranus rolls on its side) */
  axialTiltDeg: number;
  /** Spin rate in radians per millisecond */
  spinSpeed: number;
  /** Optional pre-made equirectangular texture instead of a baked one */
  textureUrl?: string;
}

export interface PlanetDef {
  id: string;
  name: string;
  /** 0 = Mercury … 7 = Neptune */
  order: number;
  /** Display radius in px at reference layout */
  radius: number;
  /** Short dock / map label */
  abbr: string;
  /** One-line teaser shown on the dock pedestal */
  blurb: string;
  visual: PlanetVisual;
  /** Optional scan target for phase 2 */
  feature?: PlanetFeature;
}

/** Classic mnemonic order — eight planets (no Pluto for this mission). */
export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    order: 0,
    radius: 11,
    abbr: 'MER',
    blurb: 'Small, rocky, closest to the Sun.',
    visual: {
      base: 0x8c8378,
      bands: [0x9a9186, 0x7d7469, 0x8f8679],
      bandContrast: 0.18,
      craters: 46,
      polarCaps: 0,
      grain: 0.55,
      atmosphere: 0xbfb6a8,
      atmosphereStrength: 0.08,
      axialTiltDeg: 0,
      spinSpeed: 0.00004,
    },
    feature: {
      id: 'mercury-close',
      prompt: 'Mercury — closest to the Sun',
      fact: 'Mercury races around the Sun in just 88 Earth days. With almost no air, its craters have stayed sharp for billions of years.',
    },
  },
  {
    id: 'venus',
    name: 'Venus',
    order: 1,
    radius: 15,
    abbr: 'VEN',
    blurb: 'Bright, cloudy, and scorching hot.',
    visual: {
      base: 0xe3c98a,
      bands: [0xf2dda6, 0xd8bc78, 0xeed396],
      bandContrast: 0.3,
      craters: 0,
      polarCaps: 0.15,
      grain: 0.3,
      atmosphere: 0xffe9b0,
      atmosphereStrength: 0.9,
      spots: [
        { u: 0.3, v: 0.45, ru: 0.18, rv: 0.1, color: 0xfff0c4, alpha: 0.35 },
        { u: 0.72, v: 0.6, ru: 0.14, rv: 0.08, color: 0xd0b070, alpha: 0.3 },
      ],
      axialTiltDeg: 2,
      spinSpeed: 0.000018,
    },
  },
  {
    id: 'earth',
    name: 'Earth',
    order: 2,
    radius: 16,
    abbr: 'EAR',
    blurb: 'Our blue home with oceans and air.',
    visual: {
      base: 0x1f5fa8,
      bands: [],
      bandContrast: 0,
      craters: 0,
      polarCaps: 0.35,
      grain: 0.15,
      atmosphere: 0x7ec8ff,
      atmosphereStrength: 0.85,
      axialTiltDeg: 23.5,
      spinSpeed: 0.00007,
      textureUrl: '/assets/images/earth-equirectangular.jpg',
    },
    feature: {
      id: 'earth-oceans',
      prompt: 'Earth — blue oceans and life',
      fact: 'Earth is the only world we know with liquid oceans on its surface, a breathable sky, and life in every corner of it.',
    },
  },
  {
    id: 'mars',
    name: 'Mars',
    order: 3,
    radius: 13,
    abbr: 'MAR',
    blurb: 'The dusty red neighbour.',
    visual: {
      base: 0xb4522f,
      bands: [0xc26340, 0x9c4526, 0xb85a34],
      bandContrast: 0.2,
      craters: 22,
      polarCaps: 0.6,
      grain: 0.5,
      atmosphere: 0xe89a72,
      atmosphereStrength: 0.28,
      spots: [
        { u: 0.42, v: 0.55, ru: 0.16, rv: 0.12, color: 0x7d3a20, alpha: 0.5 },
        { u: 0.78, v: 0.42, ru: 0.1, rv: 0.09, color: 0x8c4526, alpha: 0.45 },
      ],
      axialTiltDeg: 25,
      spinSpeed: 0.000068,
    },
    feature: {
      id: 'mars-red',
      prompt: 'Mars — the Red Planet',
      fact: 'Mars looks red because rusty iron dust coats its surface. It also has ice caps, giant canyons, and the tallest volcano in the solar system.',
    },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    order: 4,
    radius: 30,
    abbr: 'JUP',
    blurb: 'A giant ball of gas and storms.',
    visual: {
      base: 0xd9b287,
      bands: [0xefd9b6, 0xc08f5f, 0xe8cba4, 0xa8764b, 0xf0dcc0],
      bandContrast: 0.85,
      craters: 0,
      polarCaps: 0.12,
      grain: 0.2,
      atmosphere: 0xffd9a8,
      atmosphereStrength: 0.5,
      spots: [
        { u: 0.35, v: 0.62, ru: 0.075, rv: 0.055, color: 0xc4502f, alpha: 0.95 },
        { u: 0.35, v: 0.62, ru: 0.05, rv: 0.035, color: 0xe0714a, alpha: 0.8 },
      ],
      axialTiltDeg: 3,
      spinSpeed: 0.00016,
    },
    feature: {
      id: 'jupiter-spot',
      prompt: 'Jupiter — the Great Red Spot',
      fact: 'The Great Red Spot is a storm wider than Earth. It has been spinning across Jupiter for hundreds of years.',
    },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    order: 5,
    radius: 26,
    abbr: 'SAT',
    blurb: 'Famous for its bright icy rings.',
    visual: {
      base: 0xe0cb9a,
      bands: [0xf2e3bd, 0xd5bc88, 0xeadaae, 0xc9ad78],
      bandContrast: 0.45,
      craters: 0,
      polarCaps: 0.18,
      grain: 0.16,
      atmosphere: 0xffeec2,
      atmosphereStrength: 0.45,
      rings: {
        inner: 1.35,
        outer: 2.25,
        color: 0xe8d9b0,
        shadeColor: 0x8a7a58,
        alpha: 0.95,
      },
      axialTiltDeg: 27,
      spinSpeed: 0.00014,
    },
    feature: {
      id: 'saturn-rings',
      prompt: "Saturn's rings",
      fact: "Saturn's rings are billions of chunks of ice and rock — from specks of dust to pieces the size of a house — all orbiting the planet.",
    },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    order: 6,
    radius: 20,
    abbr: 'URA',
    blurb: 'An ice giant tipped on its side.',
    visual: {
      base: 0x8fd3dd,
      bands: [0xa8e2ea, 0x7cc3ce, 0x9adae3],
      bandContrast: 0.16,
      craters: 0,
      polarCaps: 0.1,
      grain: 0.12,
      atmosphere: 0xb6f0f8,
      atmosphereStrength: 0.6,
      axialTiltDeg: 82,
      spinSpeed: 0.0001,
    },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    order: 7,
    radius: 19,
    abbr: 'NEP',
    blurb: 'Deep blue with the fastest winds.',
    visual: {
      base: 0x2f5fc8,
      bands: [0x4374dc, 0x27509f, 0x3a68d0],
      bandContrast: 0.24,
      craters: 0,
      polarCaps: 0.1,
      grain: 0.14,
      atmosphere: 0x86b4ff,
      atmosphereStrength: 0.65,
      spots: [{ u: 0.6, v: 0.58, ru: 0.09, rv: 0.06, color: 0x16306e, alpha: 0.75 }],
      axialTiltDeg: 28,
      spinSpeed: 0.00012,
    },
  },
];

/** Features players must scan in phase 2 (order of challenges). */
export const SCAN_FEATURES: Array<{ planetId: string; feature: PlanetFeature }> = PLANETS.filter(
  (p): p is PlanetDef & { feature: PlanetFeature } => Boolean(p.feature)
).map((p) => ({ planetId: p.id, feature: p.feature }));

export function getPlanet(id: string): PlanetDef | undefined {
  return PLANETS.find((p) => p.id === id);
}
