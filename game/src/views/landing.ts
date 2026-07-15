/* Marketing Landing — Cosmic Cadets */

import { navigate } from '../router';
import { storage } from '../services/storage';
import { bindThemeToggle, themeToggleMarkup } from '../components/themeToggle';

export function renderLanding(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'screen screen-landing';

  root.innerHTML = `
    <section class="landing-hero" aria-label="Cosmic Cadets hero">
      <div class="landing-starfield" aria-hidden="true"></div>

      <header class="landing-nav">
        <div class="landing-brand-mark">
          <span class="landing-signal" aria-hidden="true"></span>
          <span class="landing-brand-text">Cosmic Cadets</span>
        </div>
        <nav class="landing-nav-links" aria-label="Landing">
          <button type="button" class="landing-nav-link js-scroll" data-scroll-target="landing-ages">
            Cadets
          </button>
          <button type="button" class="landing-nav-link js-scroll" data-scroll-target="landing-missions">
            Missions
          </button>
          ${themeToggleMarkup()}
          <button type="button" class="landing-btn landing-btn-ghost js-launch">
            Launch Mission
          </button>
        </nav>
      </header>

      <div class="landing-hero-content">
        <div class="landing-hero-copy">
          <div class="landing-wordmark">
            <h1>Cosmic<br />Cadets</h1>
            <p class="landing-saga">A Starlight Saga</p>
          </div>
          <div class="landing-promise">
            <p class="landing-mantra">Play. Discover. Understand.</p>
            <p class="landing-lede">
              An astronomy adventure for ages 5–15. Ten short missions. One friendly guide named Nova.
            </p>
          </div>
          <div class="landing-cta-group">
            <button type="button" class="landing-btn landing-btn-primary js-launch">
              Launch Mission
            </button>
          </div>
        </div>
        <div class="landing-hero-visual">
          <div class="landing-hero-glow" aria-hidden="true"></div>
          <img
            class="landing-cosmos"
            src="/assets/images/cosmos-hero.png"
            alt="Smiling kids flying a rocket past Earth, planets, galaxies, and nebulae"
            width="960"
            height="540"
          />
        </div>
      </div>
    </section>

    <section class="landing-section landing-ages" id="landing-ages">
      <p class="landing-eyebrow">Choose your flight path</p>
      <h2>Built for every young explorer</h2>
      <div class="landing-band-list">
        <article class="landing-band-row">
          <span class="landing-band-ages landing-band-ages--sparks">Ages 5–7</span>
          <div>
            <h3>Little Sparks</h3>
            <p>Gentle tap missions that spark wonder about the sky above.</p>
          </div>
        </article>
        <article class="landing-band-row">
          <span class="landing-band-ages landing-band-ages--gazers">Ages 8–11</span>
          <div>
            <h3>Star Gazers</h3>
            <p>Hands-on puzzles that turn night-sky curiosity into real astronomy know-how.</p>
          </div>
        </article>
        <article class="landing-band-row landing-band-row--last">
          <span class="landing-band-ages landing-band-ages--explorers">Ages 12–15</span>
          <div>
            <h3>Galaxy Explorers</h3>
            <p>Deeper missions on gravity, galaxies, and the scale of the universe.</p>
          </div>
        </article>
      </div>
    </section>

    <section class="landing-section landing-missions" id="landing-missions">
      <p class="landing-eyebrow landing-eyebrow--primary">Ten missions · One star map</p>
      <h2>From your backyard to the edge of the universe</h2>
      <p class="landing-section-lede">
        Each mission lasts 3–10 minutes and teaches one big idea through play — with Nova as your guide.
      </p>
      <div class="landing-mission-journey" aria-label="Mission journey preview">
        <article class="landing-mission-item landing-mission-item--01">
          <span class="landing-mission-num">01</span>
          <h3>Solar System Line-up</h3>
          <p>Drag planets into their true orbits.</p>
        </article>
        <span class="landing-mission-connector" aria-hidden="true"></span>
        <article class="landing-mission-item landing-mission-item--02">
          <span class="landing-mission-num">02</span>
          <h3>Moon Dance</h3>
          <p>Shape moonlight into every phase.</p>
        </article>
        <span class="landing-mission-connector" aria-hidden="true"></span>
        <article class="landing-mission-item landing-mission-item--03">
          <span class="landing-mission-num">03</span>
          <h3>World Spinner</h3>
          <p>Spin Earth through day, night, seasons.</p>
        </article>
        <span class="landing-mission-connector" aria-hidden="true"></span>
        <article class="landing-mission-bridge" aria-label="Missions 4 through 9">
          <div class="landing-bridge-dots" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <span class="landing-mission-num">04 – 09</span>
          <p>Six more missions unlock as you explore the star map.</p>
        </article>
        <span class="landing-mission-connector" aria-hidden="true"></span>
        <article class="landing-mission-item landing-mission-item--10">
          <span class="landing-mission-num">10</span>
          <h3>The Big Zoom Out</h3>
          <p>Zoom from your home to a web of galaxies.</p>
        </article>
      </div>
    </section>

    <section class="landing-section landing-closing" id="landing-cta">
      <h2>Ready for takeoff, Cadet?</h2>
      <p>Register your callsign and open the star map. Nova is waiting.</p>
      <button type="button" class="landing-btn landing-btn-primary js-launch">
        Launch Mission
      </button>
    </section>

    <footer class="landing-footer">
      <span>Cosmic Cadets · A Starlight Saga</span>
      <span>Play · Discover · Understand</span>
    </footer>
  `;

  root.querySelectorAll('.js-launch').forEach((el) => {
    el.addEventListener('click', handleLaunch);
  });

  root.querySelectorAll('.js-scroll').forEach((el) => {
    el.addEventListener('click', () => {
      const targetId = (el as HTMLElement).dataset.scrollTarget;
      if (!targetId) return;
      const target = root.querySelector(`#${targetId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  bindThemeToggle(root);

  container.appendChild(root);
}

/** Enter the game: returning cadets → mission map; new players → registration. */
function handleLaunch(): void {
  if (storage.hasProfile()) {
    navigate({ name: 'home' });
    return;
  }
  navigate({ name: 'onboarding' });
}
