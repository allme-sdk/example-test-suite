/**
 * The shared class vocabulary.
 *
 * Every string here names one consistent idiom, not a new dialect per component: the
 * card, the primary/secondary button, the input, the badge and the headings each have
 * exactly one class string, defined once, so the examples read as one product. Naming
 * them here keeps standards §1 honest — the alternative is the same forty-character
 * class string copied across six components, which is exactly how two slightly-different
 * button styles get born.
 *
 * When the look needs to change, this file is the one place to do it.
 */

/** Page surfaces */
export const card = 'bg-surface border border-line rounded-2xl shadow-sm';
export const panel = `${card} p-6`;
export const block = 'rounded-xl border border-line bg-surface-alt p-4';

/** Buttons: bg-brand-600/hover:bg-brand-700 for primary, border+hover:bg-hover otherwise */
export const btnBase =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
export const btnPrimary = `${btnBase} bg-brand-600 hover:bg-brand-700 text-white`;
export const btn = `${btnBase} border border-line text-body hover:bg-hover bg-surface`;
export const btnDanger = `${btnBase} border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 bg-surface`;
export const btnGhost =
  'inline-flex items-center gap-1.5 text-sm text-muted hover:text-heading transition-colors';

/** Form controls */
export const input =
  'w-full px-3 py-2 border border-line rounded-lg text-sm text-heading bg-surface outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
export const inputInvalid = 'border-red-400 dark:border-red-700 focus:ring-red-500 focus:border-red-500';
export const label = 'block text-sm font-medium text-heading mb-1';
export const hint = 'block text-xs text-muted mt-1';

/** Typography */
export const h1 = 'text-2xl font-semibold text-heading';
export const h2 = 'text-lg font-semibold text-heading';
export const h3 = 'text-base font-semibold text-heading';
export const h4 = 'text-sm font-semibold text-heading';
export const sub = 'text-sm text-muted';
export const faint = 'text-xs text-faint';

/** Badges */
export const badgeBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium';
export const badgeBrand = `${badgeBase} bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300`;
export const badgeNeutral = `${badgeBase} bg-surface-alt border border-line text-faint font-normal`;
export const badgeOk = `${badgeBase} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`;
export const badgeWarn = `${badgeBase} bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300`;

/** Notices */
export const errorBox =
  'rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm p-3';
export const noteBox =
  'rounded-lg border border-line bg-surface-inset text-sm text-body p-3';

/** Code + raw JSON */
export const code = 'font-mono text-[0.8125rem] text-heading';
export const pre =
  'mt-2 max-h-80 overflow-auto rounded-lg bg-surface-inset border border-line p-3 font-mono text-xs text-body whitespace-pre';

/** Small square icon tile */
export const iconTile =
  'w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0';
