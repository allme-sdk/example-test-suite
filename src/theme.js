/**
 * Dark mode.
 *
 * `tailwind.config.js` configures dark mode as CLASS-based: the `.dark` class on the
 * root element is what flips every `dark:` utility. The example suite has no theme
 * picker of its own, so it follows the operating system's preference and expresses
 * that through the `.dark` class the Tailwind config expects.
 */
export function startThemeSync() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => document.documentElement.classList.toggle('dark', mq.matches);
  apply();
  // Safari <14 exposes only the deprecated listener API.
  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
}
