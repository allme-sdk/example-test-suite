import { CheckCircle2, CircleDashed, BookOpen, ChevronRight } from 'lucide-react';
import * as ui from '../ui.js';
import { isScenarioReady, FAMILIES, familyOf } from '../data/scenarios.js';

function Badge({ scenario, values }) {
  if (scenario.kind === 'guide') {
    return (
      <span className={ui.badgeBrand}>
        <BookOpen className="w-3 h-3" />
        Guide
      </span>
    );
  }
  const ready = isScenarioReady(scenario, values);
  return ready ? (
    <span className={ui.badgeOk}>
      <CheckCircle2 className="w-3 h-3" />
      Ready
    </span>
  ) : (
    <span className={ui.badgeWarn}>
      <CircleDashed className="w-3 h-3" />
      Needs setup
    </span>
  );
}

function Cards({ scenarios, valuesById, onSelect }) {
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
            <Badge scenario={scenario} values={valuesById[scenario.id] || {}} />
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

// One backend serves every family (#494), so the grid is grouped into a section per
// family. A family with no scenarios in this backend's /api/meta is simply not shown,
// so a backend that implements only one family still renders correctly.
export default function ScenarioGrid({ scenarios, valuesById, onSelect }) {
  if (!scenarios.length) {
    return <div className={ui.noteBox}>The backend’s /api/meta listed no scenarios.</div>;
  }
  const sections = FAMILIES
    .map((f) => ({ ...f, items: scenarios.filter((sc) => familyOf(sc.id) === f.key) }))
    .filter((f) => f.items.length > 0);

  // Only one family present → no need for a section heading.
  if (sections.length <= 1) {
    return <Cards scenarios={scenarios} valuesById={valuesById} onSelect={onSelect} />;
  }
  return (
    <div className="space-y-6">
      {sections.map((f) => (
        <section key={f.key}>
          <h3 className={ui.h3}>{f.title}</h3>
          <p className={`${ui.sub} mt-0.5 mb-3`}>{f.blurb}</p>
          <Cards scenarios={f.items} valuesById={valuesById} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}
