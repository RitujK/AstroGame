/** Canonical mission catalog — titles, concepts, and map art. */

export interface MissionDef {
  id: number;
  title: string;
  concept: string;
  /** Short line for the mission map */
  teaser: string;
  art: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    title: "Earth's Rotation",
    concept: 'Day & Night',
    teaser: 'Spin Earth so cities wake up — or fall asleep.',
    art: '/assets/images/missions/mission-01.png',
  },
  {
    id: 2,
    title: 'Moon Phases',
    concept: 'Phases of the Moon',
    teaser: 'Dance the Moon through its glowing shapes.',
    art: '/assets/images/missions/mission-02.png',
  },
  {
    id: 3,
    title: 'Seasons & Axial Tilt',
    concept: "Earth's Tilt",
    teaser: 'Tilt and orbit to flip summer into winter.',
    art: '/assets/images/missions/mission-03.png',
  },
  {
    id: 4,
    title: 'Star Patterns',
    concept: 'Constellations',
    teaser: 'Connect the dots across the night sky.',
    art: '/assets/images/missions/mission-04.png',
  },
  {
    id: 5,
    title: 'Solar System Tour',
    concept: 'Order & Features',
    teaser: 'Line up the planets and scan their secrets.',
    art: '/assets/images/missions/mission-05.png',
  },
  {
    id: 6,
    title: 'Gravity Golf',
    concept: 'Gravity & Orbits',
    teaser: 'Aim a probe and loop into a steady orbit.',
    art: '/assets/images/missions/mission-06.png',
  },
  {
    id: 7,
    title: 'Shadow Play',
    concept: 'Eclipses',
    teaser: 'Align Sun, Earth, and Moon for eclipse magic.',
    art: '/assets/images/missions/mission-07.png',
  },
  {
    id: 8,
    title: 'Cosmic Sorting',
    concept: 'Small Bodies',
    teaser: 'Catch asteroids, comets, and meteoroids.',
    art: '/assets/images/missions/mission-08.png',
  },
  {
    id: 9,
    title: 'Goldilocks Hunt',
    concept: 'Exoplanets',
    teaser: 'Find worlds that are just right for life.',
    art: '/assets/images/missions/mission-09.png',
  },
  {
    id: 10,
    title: 'The Big Zoom Out',
    concept: 'Scale of the Universe',
    teaser: 'Zoom from home to the cosmic web.',
    art: '/assets/images/missions/mission-10.png',
  },
];

export function getMission(id: number): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function padMissionId(id: number): string {
  return String(id).padStart(2, '0');
}
