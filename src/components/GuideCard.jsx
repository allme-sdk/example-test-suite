import s from '../brand.module.css';

// Scenario 7 renders as a GUIDE (kind: guide) — no run button. It shows the
// setup checklist plus navigation links to scenarios 1 and 5, where the 2FA
// prompt is observed (spec §4/§5, CONTRACT.md /api/meta).
export default function GuideCard({ scenario, onNavigate, scenariosById }) {
  return (
    <div className={s.block}>
      <div className={s.guideLinks}>
        {(scenario.guideLinks || []).map((id) => {
          const target = scenariosById[id];
          return (
            <button key={id} type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => onNavigate(id)}>
              Go to scenario {id}{target ? ` — ${target.title}` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
