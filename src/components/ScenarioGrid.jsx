import { ChevronRight } from 'lucide-react';
import * as ui from '../ui.js';
import { StatusBadge } from './ScenarioStatus.jsx';

// The cards of ONE family. Family grouping moved to the left nav in #500 — the
// sidebar selects the family and the content pane shows just that family's
// scenarios, so the per-family section headings this component used to render
// (#494) would now duplicate the page heading `App` already draws from FAMILIES.
export default function ScenarioGrid({ scenarios, valuesById, onSelect }) {
  if (!scenarios.length) {
    return <div className={ui.noteBox}>The backend’s /api/meta listed no scenarios.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          className="group text-left p-4 rounded-xl bg-surface border border-line hover:border-brand-300 hover:bg-hover transition-colors"
          onClick={() => onSelect(scenario.id)}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={ui.faint}>Scenario {scenario.id}</span>
            <StatusBadge scenario={scenario} values={valuesById[scenario.id] || {}} />
          </div>
          <h3 className={`${ui.h3} flex items-center gap-1`}>
            {scenario.title}
            <ChevronRight className="w-4 h-4 text-faint group-hover:text-brand-600 transition-colors" />
          </h3>
          <p className={`${ui.sub} mt-1`}>{scenario.summary}</p>
        </button>
      ))}
    </div>
  );
}
