import { useEffect, useMemo, useState } from 'react';
import s from './brand.module.css';
import ScenarioGrid from './components/ScenarioGrid.jsx';
import ScenarioDetail from './components/ScenarioDetail.jsx';
import { SCENARIOS_BY_ID } from './data/scenarios.js';
import { getMeta, clearScenarioBackend, clearAllBackend } from './lib/api.js';
import { loadValues, saveValues, clearValues, clearAllValues } from './lib/storage.js';

// Resume target after the /callback 302 → /?scenario={id}&run={runId}.
function readResume() {
  const q = new URLSearchParams(window.location.search);
  const scenario = q.get('scenario');
  const run = q.get('run');
  if (scenario && run) {
    // Strip the query so a refresh doesn't re-resume a stale run.
    window.history.replaceState({}, '', window.location.pathname);
    return { scenarioId: Number(scenario), runId: run };
  }
  return null;
}

export default function App() {
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState(null);
  const [valuesById, setValuesById] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [resume] = useState(readResume);
  const [clearError, setClearError] = useState(null);

  // Scenarios to render: only those present in /api/meta AND known to the
  // design data; each carries meta's authoritative `kind`.
  const scenarios = useMemo(() => {
    if (!meta) return [];
    return meta.scenarios
      .map((m) => {
        const design = SCENARIOS_BY_ID[m.id];
        if (!design) return null;
        return { ...design, kind: m.kind || design.kind };
      })
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);
  }, [meta]);

  const scenariosById = useMemo(
    () => scenarios.reduce((acc, sc) => ((acc[sc.id] = sc), acc), {}),
    [scenarios]
  );

  useEffect(() => {
    let alive = true;
    getMeta()
      .then((m) => {
        if (!alive) return;
        setMeta(m);
        const initial = {};
        m.scenarios.forEach((sc) => {
          initial[sc.id] = loadValues(sc.id);
        });
        setValuesById(initial);
      })
      .catch((e) => alive && setMetaError(e.message || 'Could not reach the demo backend.'));
    return () => {
      alive = false;
    };
  }, []);

  // Once meta is loaded, honor a resume target (select the scenario).
  useEffect(() => {
    if (resume && scenarios.length && scenariosById[resume.scenarioId]) {
      setSelectedId(resume.scenarioId);
    }
  }, [resume, scenarios, scenariosById]);

  function setValue(id, key, val) {
    setValuesById((prev) => {
      const next = { ...(prev[id] || {}), [key]: val };
      saveValues(id, next);
      return { ...prev, [id]: next };
    });
  }

  // Clear the BACKEND first (config file + PEM + runs); only wipe localStorage on
  // success. On failure, leave localStorage intact and surface the error so the
  // developer can retry — never a false cleared state (spec §5/§8, standards §2).
  async function clearScenario(id) {
    try {
      await clearScenarioBackend(id);
    } catch (e) {
      setClearError(
        `Clear failed — the backend still holds scenario ${id}'s config file and private key. Nothing was cleared; retry. (${e.message})`
      );
      return;
    }
    clearValues(id);
    setValuesById((prev) => ({ ...prev, [id]: {} }));
    setClearError(null);
  }

  async function clearEverything() {
    try {
      await clearAllBackend();
    } catch (e) {
      setClearError(
        `Clear all failed — the backend still holds saved config files and private keys. Nothing was cleared; retry. (${e.message})`
      );
      return;
    }
    clearAllValues();
    setValuesById((prev) => {
      const reset = {};
      Object.keys(prev).forEach((k) => (reset[k] = {}));
      return reset;
    });
    setClearError(null);
  }

  const selected = selectedId != null ? scenariosById[selectedId] : null;

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.brandMark}>
          <div className={s.logo}>a</div>
          <div>
            <h1 className={s.title}>allme identity example</h1>
            <p className={s.subtitle}>The shared example test suite — every identity scenario through an SDK</p>
          </div>
        </div>
        {meta && (
          <div className={s.headerMeta}>
            <div>SDK: <code>{meta.sdk}{meta.sdkVersion ? ` ${meta.sdkVersion}` : ''}</code></div>
            <div>contract v<code>{meta.contractVersion}</code></div>
          </div>
        )}
      </header>

      <main className={s.main}>
        {metaError && (
          <div className={s.errorBox}>
            Could not load the demo backend: {metaError}
          </div>
        )}

        {clearError && <div className={s.errorBox}>{clearError}</div>}

        {!metaError && !meta && <div className={s.empty}>Loading scenarios…</div>}

        {meta && !selected && (
          <>
            <div className={s.toolbar}>
              <h2 className={s.sectionTitle}>Scenarios</h2>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={clearEverything}>
                Clear all
              </button>
            </div>
            <ScenarioGrid
              scenarios={scenarios}
              valuesById={valuesById}
              onSelect={setSelectedId}
            />
          </>
        )}

        {meta && selected && (
          <ScenarioDetail
            key={selected.id}
            scenario={selected}
            isGuide={selected.kind === 'guide'}
            values={valuesById[selected.id] || {}}
            setValue={(key, val) => setValue(selected.id, key, val)}
            onClear={() => clearScenario(selected.id)}
            onBack={() => setSelectedId(null)}
            onNavigate={(id) => setSelectedId(id)}
            scenariosById={scenariosById}
            resumeRunId={resume && resume.scenarioId === selected.id ? resume.runId : null}
          />
        )}
      </main>
    </div>
  );
}
