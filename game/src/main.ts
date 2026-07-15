import './style.css';
import { initTheme } from './services/theme';
import { initRouter, registerRoute, renderCurrentRoute, navigate, parseHash, setRouteChangeHandler } from './router';
import { storage } from './services/storage';
import { renderLanding } from './views/landing';
import { renderHome } from './views/home';
import { renderProfile } from './views/profile';
import { renderSettings } from './views/settings';
import { renderMission } from './views/mission';
import { renderOnboarding } from './views/onboarding';

initTheme();

const PUBLIC_ROUTES = new Set(['landing', 'onboarding']);

registerRoute('landing', (c) => renderLanding(c));
registerRoute('home', (c) => renderHome(c));
registerRoute('profile', (c) => renderProfile(c));
registerRoute('settings', (c) => renderSettings(c));
registerRoute('mission', (c, r) => renderMission(c, r));
registerRoute('onboarding', (c) => renderOnboarding(c));

function checkProfileAndRoute(): void {
  const rawName = location.hash.replace(/^#/, '').split('?')[0];
  // Clean unknown hashes left by broken in-page anchors so Safari back works
  if (rawName && !['landing', 'home', 'profile', 'settings', 'mission', 'onboarding'].includes(rawName)) {
    history.replaceState({ route: 'landing' }, '', `${location.pathname}${location.search}#landing`);
  }

  const route = parseHash();

  if (PUBLIC_ROUTES.has(route.name)) {
    renderCurrentRoute();
    return;
  }

  if (!storage.hasProfile()) {
    navigate({ name: 'onboarding' });
    return;
  }

  renderCurrentRoute();
}

setRouteChangeHandler(checkProfileAndRoute);
initRouter();
