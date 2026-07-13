/*
 * Cold-boot theme stamp. Reads the persisted preference axes from localStorage and
 * writes them onto <html> before the React bundle loads, so there is no theme flash
 * and no unstyled first frame. Mirror of the seven-axis cascade in THEMING_ARCHITECTURE.md.
 *
 * Storage keys are prefixed `local:` (single constant mirrored in src/lib/storage.ts).
 * This file is intentionally dependency-free plain ES5-ish JS.
 */
(function () {
  var P = 'local:';
  var root = document.documentElement;

  function read(key) {
    try {
      return localStorage.getItem(P + key);
    } catch (e) {
      return null;
    }
  }

  // --- theme (data-theme + .dark, written in tandem) ---
  var pref = read('theme') || 'system';
  var resolved;
  if (pref === 'dark' || pref === 'light') {
    resolved = pref;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    resolved = 'light';
  } else {
    resolved = 'dark';
  }
  root.setAttribute('data-theme', resolved);
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');

  // --- skin (community type) — village is the default identity ---
  root.setAttribute('data-skin', read('skin') || 'village');

  // --- user-preference axes: only stamp non-default values ---
  var accent = read('accent');
  if (accent && accent !== 'leaf') root.setAttribute('data-accent', accent);

  var density = read('density');
  if (density && density !== 'regular') root.setAttribute('data-density', density);

  var font = read('font');
  if (font && font !== 'default') root.setAttribute('data-font', font);

  var contrast = read('contrast');
  if (contrast === 'high') root.setAttribute('data-contrast', 'high');

  var motion = read('motion');
  if (motion === 'reduce' || motion === 'full') root.setAttribute('data-motion', motion);
})();
