/** Canonical mission catalog — titles, concepts, and map art. */

export interface MissionDef {
  id: number;
  title: string;
  concept: string;
  /** Short line for the mission map */
  teaser: string;
  /** One-line learning recap for the Mission Report */
  recap: string;
  art: string;
}

/** Featured on the marketing landing (missions 1–3 + bridge + 10). */
export const LANDING_FEATURED_MISSION_IDS = [1, 2, 3, 10] as const;

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    title: "Earth's Rotation",
    concept: 'Day & Night',
    teaser: 'Spin Earth so cities wake up — or fall asleep.',
    recap: 'Earth spins once a day — the side facing the Sun has daylight, the other side has night.',
    art: '/assets/images/missions/mission-01.png',
  },
  {
    id: 2,
    title: 'Moon Phases',
    concept: 'Phases of the Moon',
    teaser: 'Dance the Moon through its glowing shapes.',
    recap: 'The Moon\'s phase changes as it orbits Earth and catches different amounts of sunlight.',
    art: '/assets/images/missions/mission-02.png',
  },
  {
    id: 3,
    title: 'Seasons & Axial Tilt',
    concept: "Earth's Tilt",
    teaser: 'Tilt and orbit to flip summer into winter.',
    recap: 'Earth\'s tilt changes how sunlight hits each hemisphere through the year — that creates seasons.',
    art: '/assets/images/missions/mission-03.png',
  },
  {
    id: 4,
    title: 'Star Patterns',
    concept: 'Constellations',
    teaser: 'Connect the dots across the night sky.',
    recap: 'Stars form patterns called constellations when you connect the dots across the night sky.',
    art: '/assets/images/missions/mission-04.png',
  },
  {
    id: 5,
    title: 'Solar System Tour',
    concept: 'Order & Features',
    teaser: 'Line up the planets and scan their secrets.',
    recap: 'Planets orbit the Sun in order, each with unique features like Saturn\'s rings.',
    art: '/assets/images/missions/mission-05.png',
  },
  {
    id: 6,
    title: 'Gravity Golf',
    concept: 'Gravity & Orbits',
    teaser: 'Aim a probe and loop into a steady orbit.',
    recap: 'Gravity pulls objects into curved paths — the right speed can keep a probe in orbit.',
    art: '/assets/images/missions/mission-06.png',
  },
  {
    id: 7,
    title: 'Shadow Play',
    concept: 'Eclipses',
    teaser: 'Align Sun, Earth, and Moon for eclipse magic.',
    recap: 'When Sun, Earth, and Moon line up just right, eclipses cast shadows in space.',
    art: '/assets/images/missions/mission-07.png',
  },
  {
    id: 8,
    title: 'Cosmic Sorting',
    concept: 'Small Bodies',
    teaser: 'Catch asteroids, comets, and meteoroids.',
    recap: 'Asteroids, comets, and meteoroids are small bodies with different origins in the solar system.',
    art: '/assets/images/missions/mission-08.png',
  },
  {
    id: 9,
    title: 'Goldilocks Hunt',
    concept: 'Exoplanets',
    teaser: 'Find worlds that are just right for life.',
    recap: 'Exoplanets might support life when they sit in the "Goldilocks" zone around their star.',
    art: '/assets/images/missions/mission-09.png',
  },
  {
    id: 10,
    title: 'The Big Zoom Out',
    concept: 'Scale of the Universe',
    teaser: 'Zoom from home to the cosmic web.',
    recap: 'The universe zooms from your neighborhood all the way out to galaxies and the cosmic web.',
    art: '/assets/images/missions/mission-10.png',
  },
];

export function getMission(id: number): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function padMissionId(id: number): string {
  return String(id).padStart(2, '0');
}

/** Mission 1 is always open; later missions unlock when the previous mission is complete. */
export function isMissionUnlocked(missionId: number, isMissionComplete: (id: number) => boolean): boolean {
  if (missionId <= 1) return true;
  return isMissionComplete(missionId - 1);
}
