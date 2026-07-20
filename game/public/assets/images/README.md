# Assets — Cosmic Cadets

## Landing

| File | Use |
|------|-----|
| `cosmos-hero.png` | Landing hero (both themes) — kids in a rocket amid Earth, solar system, galaxies, nebulae |

## Mission Map thumbnails (`missions/`)

Same cadets + smiling rocket as the landing hero, themed per mission:

| File | Mission |
|------|---------|
| `missions/mission-01.png` | Earth's Rotation — day & night |
| `missions/mission-02.png` | Moon Phases |
| `missions/mission-03.png` | Seasons & Axial Tilt |
| `missions/mission-04.png` | Star Patterns |
| `missions/mission-05.png` | Solar System Tour |
| `missions/mission-06.png` | Gravity Golf |
| `missions/mission-07.png` | Shadow Play (eclipses) |
| `missions/mission-08.png` | Cosmic Sorting |
| `missions/mission-09.png` | Goldilocks Hunt |
| `missions/mission-10.png` | The Big Zoom Out |

## In-mission art

| File | Use |
|------|-----|
| `earth-equirectangular.jpg` | Mission 1 rotating sphere texture — NASA Blue Marble, public domain |
| `earth-bright.png` | Mission 1 globe (city day/night) — clean blue oceans / green lands |
| `earth.png` | Legacy stylized Earth (kept for reference; not used on landing) |

## Notes
- Prefer PNG; landing hero is wide (~16:9); map vignettes are square (~1:1) and shown in circular frames.
- `earth-equirectangular.jpg` source: NASA Earth Observatory Blue Marble (`land_shallow_topo_2048.jpg`), created by NASA GSFC and public domain in the United States.
- Mission 1 falls back to a procedural globe if its Earth texture fails to load.
- Catalog + art paths live in `game/src/data/missions.ts`.
