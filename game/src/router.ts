// Simple hash-based router for the app shell
export type RouteName = 'landing' | 'home' | 'profile' | 'settings' | 'mission' | 'onboarding';

export type Route = {
  name: RouteName;
  params?: Record<string, string>;
};

type RenderFn = (container: HTMLElement, route: Route) => void;

const ROUTE_NAMES = new Set<RouteName>([
  'landing',
  'home',
  'profile',
  'settings',
  'mission',
  'onboarding',
]);

const routes: Record<RouteName, RenderFn> = {
  landing: () => {},
  home: () => {},
  profile: () => {},
  settings: () => {},
  mission: () => {},
  onboarding: () => {},
};

let onRouteChange: (() => void) | null = null;
let routeChangeScheduled = false;

export function registerRoute(name: RouteName, render: RenderFn): void {
  routes[name] = render;
}

/** Optional guard/hook called on every route change (including browser back/forward). */
export function setRouteChangeHandler(handler: () => void): void {
  onRouteChange = handler;
}

export function navigate(route: Route): void {
  const hash = buildHash(route);
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }
  // Explicit history update — more reliable than bare hash assignment on Safari
  const url = `${location.pathname}${location.search}${hash}`;
  history.pushState({ route: route.name }, '', url);
  handleLocationChange();
}

function buildHash(route: Route): string {
  return route.params
    ? `#${route.name}?${new URLSearchParams(route.params).toString()}`
    : `#${route.name}`;
}

export function parseHash(): Route {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return { name: 'landing' };
  const [namePart, query = ''] = raw.split('?');
  const candidate = namePart || 'landing';
  // Unknown fragments (old section anchors, typos) stay on landing — don't poison history
  const name = (ROUTE_NAMES.has(candidate as RouteName) ? candidate : 'landing') as RouteName;
  const params = Object.fromEntries(new URLSearchParams(query));
  return { name, params };
}

export function isKnownRouteName(name: string): boolean {
  return ROUTE_NAMES.has(name as RouteName);
}

export function renderCurrentRoute(): void {
  const route = parseHash();
  const container = document.getElementById('app');
  if (!container) return;
  container.innerHTML = '';
  const render = routes[route.name] ?? routes.landing;
  render(container, route);
}

function handleLocationChange(): void {
  // Coalesce popstate + hashchange firing together (common on Safari)
  if (routeChangeScheduled) return;
  routeChangeScheduled = true;
  queueMicrotask(() => {
    routeChangeScheduled = false;
    if (onRouteChange) {
      onRouteChange();
      return;
    }
    renderCurrentRoute();
  });
}

export function initRouter(): void {
  addEventListener('popstate', handleLocationChange);
  addEventListener('hashchange', handleLocationChange);

  if (!location.hash || !isKnownRouteName(location.hash.replace(/^#/, '').split('?')[0])) {
    const url = `${location.pathname}${location.search}#landing`;
    history.replaceState({ route: 'landing' }, '', url);
  }

  handleLocationChange();
}
