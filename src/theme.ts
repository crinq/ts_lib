/**
 * The three supported theme modes.
 *
 * - `'light'` — always use the light color scheme
 * - `'dark'` — always use the dark color scheme
 * - `'auto'` — follow the OS `prefers-color-scheme` media query
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** localStorage key for persisting the user's theme preference. */
const STORAGE_KEY = 'theme-mode';

let currentMode: ThemeMode = 'auto';
let mediaQuery: MediaQueryList | null = null;
let mediaListener: (() => void) | null = null;
let changeCallbacks: Array<(mode: ThemeMode, resolved: 'light' | 'dark') => void> = [];

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(): void {
  const resolved = resolveTheme(currentMode);
  document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : '');
  for (const cb of changeCallbacks) cb(currentMode, resolved);
}

function setupMediaListener(): void {
  cleanupMediaListener();
  if (currentMode === 'auto') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaListener = () => applyTheme();
    mediaQuery.addEventListener('change', mediaListener);
  }
}

function cleanupMediaListener(): void {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener);
    mediaQuery = null;
    mediaListener = null;
  }
}

/**
 * Initialize the theme system.
 *
 * Reads the saved preference from localStorage (key: `'theme-mode'`).
 * If no preference is stored, defaults to `'auto'`. Applies the resolved
 * theme to `document.documentElement` via the `data-theme` attribute
 * and sets up a `prefers-color-scheme` media listener when in auto mode.
 *
 * Call this once at application startup before any UI rendering.
 */
export function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    currentMode = stored;
  }
  setupMediaListener();
  applyTheme();
}

/** Get the current theme mode (`'light'`, `'dark'`, or `'auto'`). */
export function getThemeMode(): ThemeMode {
  return currentMode;
}

/**
 * Get the resolved theme, accounting for `'auto'` mode.
 * Returns `'light'` or `'dark'` based on the OS preference when in auto mode.
 */
export function getResolvedTheme(): 'light' | 'dark' {
  return resolveTheme(currentMode);
}

/**
 * Set the theme mode, persist to localStorage, and apply immediately.
 * In `'auto'` mode, a `prefers-color-scheme` media listener is activated
 * so the theme updates when the OS preference changes.
 */
export function setThemeMode(mode: ThemeMode): void {
  currentMode = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  setupMediaListener();
  applyTheme();
}

/**
 * Cycle to the next theme mode: light → dark → auto → light.
 * Persists the new mode and applies it immediately.
 * @returns The new active theme mode.
 */
export function cycleThemeMode(): ThemeMode {
  const next: ThemeMode = currentMode === 'light' ? 'dark' : currentMode === 'dark' ? 'auto' : 'light';
  setThemeMode(next);
  return next;
}

/**
 * Register a callback that fires whenever the theme changes.
 * The callback receives both the mode (`'light'`/`'dark'`/`'auto'`) and
 * the resolved theme (`'light'` or `'dark'`). Also fires when the OS
 * preference changes while in `'auto'` mode.
 */
export function onThemeChange(callback: (mode: ThemeMode, resolved: 'light' | 'dark') => void): void {
  changeCallbacks.push(callback);
}

/**
 * Human-readable label for a theme mode, suitable for a toggle button.
 * Returns `'Light'`, `'Dark'`, or `'Auto'`.
 */
export function themeModeLabel(mode: ThemeMode): string {
  switch (mode) {
    case 'light': return 'Light';
    case 'dark': return 'Dark';
    case 'auto': return 'Auto';
  }
}
