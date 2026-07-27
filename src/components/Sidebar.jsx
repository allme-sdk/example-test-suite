import { ChevronDown, KeyRound, Boxes, FileText, Trash2 } from 'lucide-react';
import * as ui from '../ui.js';
import { StatusIcon } from './ScenarioStatus.jsx';

/**
 * #500 — the persistent left nav, in the allus portal's shape.
 *
 * Structure follows `allus/src/Layout.jsx:84-133` rather than re-inventing one: a
 * declarative nav list, a collapsible group whose sub-items are indented under the
 * parent (`:112-132`), the portal's active-state classes, and a bordered footer.
 *
 * Two deliberate differences, both decided on the issue:
 *  - There is NO react-router (owner decision, #500): `CONTRACT.md`'s `/callback`
 *    302 → `/?scenario={id}&run={runId}` is a contract all six backends implement,
 *    so selection stays component state and sections are knowingly not linkable.
 *    The portal's `NavLink` becomes a `<button>` with the same classes.
 *  - The groups are an ACCORDION: the active family is expanded, the others are
 *    collapsed. The portal needs an effect to re-open a group it navigated into
 *    (`Layout.jsx:60-69`, the #486 fix) precisely because a manually-collapsed group
 *    could hide the active sub-item; deriving "expanded" from "active" makes that
 *    state unreachable for a three-entry nav.
 *
 * The families and their titles/blurbs come from `FAMILIES`/`familyOf` in
 * `data/scenarios.js` — a second nav array would be the duplicate list standards §1
 * forbids and the issue explicitly rules out.
 */
const FAMILY_ICON = {
  identity: KeyRound,
  'company-data': Boxes,
  flow: FileText
};

// Padding is NOT in the base: the portal gives the parent `px-3 py-2.5` and the
// indented child `pl-10 pr-3 py-2`, and composing `pl-10` on top of `px-3` in one
// class attribute would be resolved by stylesheet order, not string order — the
// classic Tailwind conflict. Each row supplies its own padding.
const rowBase =
  'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors';
const rowActive = 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300';
const rowIdle = 'text-body hover:bg-hover';

export default function Sidebar({
  families,
  activeFamily,
  selectedId,
  valuesById,
  onSelectFamily,
  onSelectScenario,
  meta,
  onClearAll
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-line flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-semibold shrink-0">
          a
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-heading truncate">allme SDK examples</div>
          <div className={`${ui.faint} truncate`}>example test suite</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {families.map((family) => {
          const Icon = FAMILY_ICON[family.key] || FileText;
          const open = family.key === activeFamily;
          return (
            <div key={family.key} className="space-y-1">
              <button
                type="button"
                onClick={() => onSelectFamily(family.key)}
                aria-expanded={open}
                className={`${rowBase} px-3 py-2.5 ${open && selectedId == null ? rowActive : rowIdle}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left truncate">{family.title}</span>
                <ChevronDown
                  className={`w-4 h-4 text-faint transition-transform shrink-0 ${open ? '' : '-rotate-90'}`}
                />
              </button>
              {open && (
                <div className="space-y-1">
                  {family.items.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => onSelectScenario(scenario.id)}
                      className={`${rowBase} pl-10 pr-3 py-2 ${
                        selectedId === scenario.id ? rowActive : rowIdle
                      }`}
                    >
                      <StatusIcon
                        scenario={scenario}
                        values={valuesById[scenario.id] || {}}
                        className="w-4 h-4"
                      />
                      <span className="flex-1 text-left truncate">{scenario.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {families.length === 0 && (
          <p className={`${ui.sub} px-3`}>No scenarios yet.</p>
        )}
      </nav>

      {/* The portal keeps its identity + account actions in a bordered footer
          (`Layout.jsx:134-170`); the suite's equivalents are the SDK/contract badges
          and the global Clear all, moved here out of the old centred header. */}
      <div className="px-3 py-3 border-t border-line space-y-3">
        {meta && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className={ui.badgeBrand}>
              {meta.sdk}
              {meta.sdkVersion ? ` ${meta.sdkVersion}` : ''}
            </span>
            <span className={ui.badgeNeutral}>contract v{meta.contractVersion}</span>
          </div>
        )}
        {/* Disabled until /api/meta resolves. The old header rendered this button only
            in the loaded state; the footer is always mounted, so without the guard a
            click during load — or while the backend is unreachable — fires a clear
            that can only fail, stacking a second error box on the load error. */}
        <button
          type="button"
          className={`${ui.btnDanger} w-full justify-center`}
          onClick={onClearAll}
          disabled={!meta}
        >
          <Trash2 className="w-4 h-4" />
          Clear all
        </button>
      </div>
    </div>
  );
}
