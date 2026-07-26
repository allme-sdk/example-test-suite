import s from '../brand.module.css';
import { isScenarioReady, FAMILIES, familyOf } from '../data/scenarios.js';

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

function Cards({ scenarios, valuesById, onSelect }) {
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

// One backend serves every family (#494), so the grid is grouped into a section per
// family. A family with no scenarios in this backend's /api/meta is simply not shown,
// so a backend that implements only one family still renders correctly.
export default function ScenarioGrid({ scenarios, valuesById, onSelect }) {
  if (!scenarios.length) {
    return <div className={s.empty}>The backend’s /api/meta listed no scenarios.</div>;
  }
  const sections = FAMILIES
    .map((f) => ({ ...f, items: scenarios.filter((sc) => familyOf(sc.id) === f.key) }))
    .filter((f) => f.items.length > 0);

  // Only one family present → no need for a section heading.
  if (sections.length <= 1) {
    return <Cards scenarios={scenarios} valuesById={valuesById} onSelect={onSelect} />;
  }
  return (
    <div>
      {sections.map((f) => (
        <section key={f.key} className={s.block}>
          <h3 className={s.sectionTitle}>{f.title}</h3>
          <p className={s.subtitle}>{f.blurb}</p>
          <Cards scenarios={f.items} valuesById={valuesById} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}
