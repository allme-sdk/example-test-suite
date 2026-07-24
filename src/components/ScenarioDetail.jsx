import { useEffect, useMemo, useState } from 'react';
import s from '../brand.module.css';
import SetupWizard from './SetupWizard.jsx';
import RunPanel from './RunPanel.jsx';
import GuideCard from './GuideCard.jsx';
import { isScenarioReady } from '../data/scenarios.js';
import { saveConfig } from '../lib/api.js';

// Merge stored values with each field's default so advanced inputs (API url /
// authorize base) always carry a value to the backend.
function computeEffective(scenario, values) {
  const eff = {};
  scenario.fields.forEach((f) => {
    const v = values[f.key];
    eff[f.key] = v !== undefined && v !== '' ? v : f.default !== undefined ? f.default : v || '';
  });
  return eff;
}

export default function ScenarioDetail({
  scenario,
  isGuide,
  values,
  setValue,
  onClear,
  onBack,
  onNavigate,
  scenariosById,
  resumeRunId
}) {
  const ready = isGuide ? true : isScenarioReady(scenario, values);
  const effectiveValues = useMemo(() => computeEffective(scenario, values), [scenario, values]);

  // Config-file model (spec §3 amendment): Save writes the canonical SDK config
  // file the run executes off; Run is enabled only once a config is saved. Any
  // edit invalidates the saved config so the developer re-Saves before running.
  const [configPath, setConfigPath] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const sig = useMemo(() => JSON.stringify(effectiveValues), [effectiveValues]);
  useEffect(() => {
    setConfigPath(null);
    setSaveError(null);
  }, [sig]);

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await saveConfig(scenario.id, effectiveValues);
      setConfigPath((r && r.configPath) || '.runtime/config/' + scenario.id + '.json');
    } catch (e) {
      setSaveError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" className={s.backLink} onClick={onBack}>
        ← All scenarios
      </button>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <div>
            <div className={s.cardNum}>Scenario {scenario.id}</div>
            <h2 className={s.title} style={{ marginTop: 4 }}>{scenario.title}</h2>
            <p className={s.subtitle}>{scenario.summary}</p>
          </div>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={onClear}>
            Clear
          </button>
        </div>
        <div className={s.panelBody}>
          <SetupWizard
            scenario={scenario}
            values={values}
            setValue={setValue}
            showInvalid={!isGuide && !ready}
            isGuide={isGuide}
            canSave={ready}
            saving={saving}
            saveError={saveError}
            configPath={configPath}
            onSave={onSave}
          />
          {isGuide ? (
            <GuideCard scenario={scenario} onNavigate={onNavigate} scenariosById={scenariosById} />
          ) : (
            <RunPanel
              key={scenario.id}
              scenario={scenario}
              resumeRunId={resumeRunId}
              canRun={ready && !!configPath}
              needsSave={ready && !configPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
