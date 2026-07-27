import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Menu } from 'lucide-react';
import * as ui from './ui.js';
import Sidebar from './components/Sidebar.jsx';
import ScenarioGrid from './components/ScenarioGrid.jsx';
import ScenarioDetail from './components/ScenarioDetail.jsx';
import { SCENARIOS_BY_ID, FAMILIES, familyOf } from './data/scenarios.js';
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
  const [activeFamily, setActiveFamily] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resume] = useState(readResume);
  const [clearError, setClearError] = useState(null);

  // Scenarios to render: only those present in /api/meta AND known to the
  // design data; each carries meta's authoritative `kind`. Rendered in the
  // backend's declared /api/meta order — stable for both integer identity ids
  // and string companydata:* ids (a numeric id-subtraction sort would NaN on the
  // namespaced string ids, #483).
  const scenarios = useMemo(() => {
    if (!meta) return [];
    const order = new Map(meta.scenarios.map((m, i) => [String(m.id), i]));
    return meta.scenarios
      .map((m) => {
        const design = SCENARIOS_BY_ID[m.id];
        if (!design) return null;
        return { ...design, kind: m.kind || design.kind };
      })
      .filter(Boolean)
      .sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0));
  }, [meta]);

  const scenariosById = useMemo(
    () => scenarios.reduce((acc, sc) => ((acc[sc.id] = sc), acc), {}),
    [scenarios]
  );

  // The left nav's sections (#500). Derived from FAMILIES + familyOf — never a
  // second hand-maintained list — and a family this backend's /api/meta does not
  // list is simply absent, so a single-family backend still renders correctly.
  const families = useMemo(
    () =>
      FAMILIES.map((f) => ({
        ...f,
        items: scenarios.filter((sc) => familyOf(sc.id) === f.key)
      })).filter((f) => f.items.length > 0),
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

  // Land on the first family the backend actually serves, once meta is in. Guarded
  // on `activeFamily == null` so it seeds once and never fights a user selection —
  // and it re-seeds if the current family disappears from a later meta.
  useEffect(() => {
    if (!families.length) return;
    if (activeFamily == null || !families.some((f) => f.key === activeFamily)) {
      setActiveFamily(families[0].key);
    }
  }, [families, activeFamily]);

  // Selecting a scenario always brings its family along, so the left nav's expanded
  // group is the one holding the active item — for the grid, for the guide card's
  // cross-links, and for the /callback resume below.
  const selectScenario = useCallback((id) => {
    setSelectedId(id);
    setActiveFamily(familyOf(id));
    setMobileOpen(false);
  }, []);

  const selectFamily = useCallback((key) => {
    setActiveFamily(key);
    setSelectedId(null);
    setMobileOpen(false);
  }, []);

  // Once meta is loaded, honor a resume target (select the scenario).
  useEffect(() => {
    if (resume && scenarios.length && scenariosById[resume.scenarioId]) {
      selectScenario(resume.scenarioId);
    }
  }, [resume, scenarios, scenariosById, selectScenario]);

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
    setMobileOpen(false);
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
  const family = families.find((f) => f.key === activeFamily) || null;

  const sidebar = (
    <Sidebar
      families={families}
      activeFamily={activeFamily}
      selectedId={selectedId}
      valuesById={valuesById}
      onSelectFamily={selectFamily}
      onSelectScenario={selectScenario}
      meta={meta}
      onClearAll={clearEverything}
    />
  );

  // Shell shape follows `allus/src/Layout.jsx:174-197`: a fixed 16rem sidebar from
  // `lg` up, a slide-over drawer below it, and the content column offset by
  // `lg:pl-64`.
  return (
    <div className="min-h-screen bg-surface-alt text-body">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-surface border-r border-line flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface border-r border-line">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-surface/80 backdrop-blur border-b border-line">
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-hover"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-heading">allme SDK examples</span>
        </header>

        <main className="max-w-5xl px-6 py-8 space-y-4">
          {metaError && (
            <div className={ui.errorBox}>
              <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Could not load the demo backend: {metaError}
            </div>
          )}

          {clearError && (
            <div className={ui.errorBox}>
              <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {clearError}
            </div>
          )}

          {!metaError && !meta && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading scenarios…
            </div>
          )}

          {meta && !selected && (
            <>
              <div>
                <h1 className={ui.h1}>{family ? family.title : 'Scenarios'}</h1>
                <p className={`${ui.sub} mt-1`}>
                  {family ? family.blurb : 'Every scenario the backend exposes, through an SDK.'}
                </p>
              </div>
              <ScenarioGrid
                scenarios={family ? family.items : scenarios}
                valuesById={valuesById}
                onSelect={selectScenario}
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
              backLabel={family ? family.title : 'All scenarios'}
              onNavigate={selectScenario}
              scenariosById={scenariosById}
              resumeRunId={resume && resume.scenarioId === selected.id ? resume.runId : null}
            />
          )}
        </main>
      </div>
    </div>
  );
}
