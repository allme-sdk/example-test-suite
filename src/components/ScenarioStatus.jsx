import { CheckCircle2, CircleDashed, BookOpen } from 'lucide-react';
import * as ui from '../ui.js';
import { scenarioStatus } from '../data/scenarios.js';

/**
 * The scenario's Ready / Needs setup / Guide signal, in ONE place.
 *
 * It is shown twice: as the badge on the scenario card, and as the icon beside the
 * scenario in the left nav. Two copies of the mapping would be exactly the drift
 * bug standards §1 exists to prevent, so the icon/label/badge-class tables live here
 * and both surfaces read them.
 */
const ICON = { guide: BookOpen, ready: CheckCircle2, setup: CircleDashed };
const LABEL = { guide: 'Guide', ready: 'Ready', setup: 'Needs setup' };
const BADGE = { guide: ui.badgeBrand, ready: ui.badgeOk, setup: ui.badgeWarn };
// Nav-icon tint: the badge colours minus the pill, so the nav reads the same at a glance.
const TINT = {
  guide: 'text-brand-600 dark:text-brand-300',
  ready: 'text-emerald-600 dark:text-emerald-300',
  setup: 'text-amber-600 dark:text-amber-300'
};

export function StatusBadge({ scenario, values }) {
  const status = scenarioStatus(scenario, values);
  const Icon = ICON[status];
  return (
    <span className={BADGE[status]}>
      <Icon className="w-3 h-3" />
      {LABEL[status]}
    </span>
  );
}

export function StatusIcon({ scenario, values, className = 'w-4 h-4' }) {
  const status = scenarioStatus(scenario, values);
  const Icon = ICON[status];
  return <Icon className={`${className} ${TINT[status]} shrink-0`} aria-label={LABEL[status]} />;
}
