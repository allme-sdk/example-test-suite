import { ArrowRight } from 'lucide-react';
import * as ui from '../ui.js';

// Scenario 7 renders as a GUIDE (kind: guide) — no run button. It shows the
// setup checklist plus navigation links to scenarios 1 and 5, where the 2FA
// prompt is observed (spec §4/§5, CONTRACT.md /api/meta).
export default function GuideCard({ scenario, onNavigate, scenariosById }) {
  return (
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
  );
}
