/**
 * #496 — dark mode, the portal's way.
 *
 * `tailwind.config.js` is the portal's, so dark mode is CLASS-based: the `.dark` class on the root
 * element is what flips every `dark:` utility. The portal toggles it from a theme picker backed by
 * localStorage; the example suite has never had a picker and this issue is a restyle, not a new
 * feature, so it keeps its previous behaviour exactly — follow the operating system — and simply
 * expresses it through the class the portal's config expects.
 */
export function startThemeSync() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => document.documentElement.classList.toggle('dark', mq.matches);
  apply();
  // Safari <14 exposes only the deprecated listener API.
  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
}
