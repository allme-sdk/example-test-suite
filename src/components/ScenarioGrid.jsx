import s from '../brand.module.css';
import { isScenarioReady } from '../data/scenarios.js';

function Badge({ scenario, values }) {
  if (scenario.kind === 'guide') {
    return <span className={`${s.badge} ${s.badgeGuide}`}>Guide</span>;
  }
  const ready = isScenarioReady(scenario, values);
  return ready ? (
    <span className={`${s.badge} ${s.badgeReady}`}>Ready</span>
  ) : (
    <span className={`${s.badge} ${s.badgeSetup}`}>Needs setup</span>
  );
}

export default function ScenarioGrid({ scenarios, valuesById, onSelect }) {
  if (!scenarios.length) {
    return <div className={s.empty}>The backend’s /api/meta listed no scenarios.</div>;
  }
  return (
    <div className={s.grid}>
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          className={s.card}
          onClick={() => onSelect(scenario.id)}
        >
          <div className={s.cardHead}>
            <span className={s.cardNum}>Scenario {scenario.id}</span>
            <Badge scenario={scenario} values={valuesById[scenario.id] || {}} />
          </div>
          <h3 className={s.cardTitle}>{scenario.title}</h3>
          <p className={s.cardSummary}>{scenario.summary}</p>
        </button>
      ))}
    </div>
  );
}
