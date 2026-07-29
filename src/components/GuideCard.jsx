import { ArrowRight } from 'lucide-react';
import * as ui from '../ui.js';

// Scenario 7 renders as a GUIDE (kind: guide) — no run button. It edits an
// existing OAuth app rather than registering a new one, and its checklist is
// scenario-specific instructions — including what to do AFTER the portal step
// (watch the consent screen on scenarios 1 and 5) — not a restatement of what
// PortalSetup already renders, so it stays hand-written and lives here rather
// than in the generic per-scenario setup section.
export default function GuideCard({ scenario, onNavigate, scenariosById }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className={ui.h4}>Setup checklist</h4>
        <ol className="mt-2 space-y-1.5 list-decimal list-inside text-sm text-body marker:text-faint">
          {scenario.checklist.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        {(scenario.guideLinks || []).map((id) => {
          const target = scenariosById[id];
          return (
            <button key={id} type="button" className={ui.btnPrimary} onClick={() => onNavigate(id)}>
              Go to scenario {id}
              {target ? ` — ${target.title}` : ''}
              <ArrowRight className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
