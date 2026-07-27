import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import * as ui from '../ui.js';
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
    <div className="space-y-3">
      <button type="button" className={ui.btnGhost} onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        All scenarios
      </button>
      <div className={ui.panel}>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className={ui.faint}>Scenario {scenario.id}</div>
            <h2 className={`${ui.h2} mt-1`}>{scenario.title}</h2>
            <p className={`${ui.sub} mt-0.5`}>{scenario.summary}</p>
          </div>
          <button type="button" className={ui.btnDanger} onClick={onClear}>
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
        <div className="pt-4 space-y-4">
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
