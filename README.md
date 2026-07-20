# Cosmic Cadets

**Cosmic Cadets: A Starlight Saga** is a tablet-first astronomy game for kids aged 5–15. Play short missions, discover how the universe works, and earn badges along a cosmic trail.

**Mantra:** Play · Discover · Understand

## Documentation

| Doc | Purpose |
|-----|---------|
| [`Docs/prd.txt`](Docs/prd.txt) | Product requirements (canonical source of truth) |
| [`Docs/designs.txt`](Docs/designs.txt) | UI/UX design system |
| [`Docs/tech-notes-bootstrapping.txt`](Docs/tech-notes-bootstrapping.txt) | Engineering notes & shipped scope |

## Local development

From the `game/` directory:

```bash
npm install
npm run dev
```

Open [http://localhost:5173/#landing](http://localhost:5173/#landing)

Other routes:

- `#onboarding` — Cadet Registration
- `#home` — Mission Map
- `#mission?id=1` — Mission 1

Build for production:

```bash
npm run build
npm run preview
```

## Stack

Vite 7 · TypeScript · Phaser 3 · hash-based app shell

## Repo note

This repository (`Astro-Gamer`) hosts the **Cosmic Cadets** game under `game/`. The GitHub remote may still use the legacy name `AstroGame`.
