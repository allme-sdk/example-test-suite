// Thin client for the demo-backend contract (CONTRACT.md / spec §3).
// The backend serves this bundle AND the API on the same origin, so every
// call is a relative fetch. Only the endpoints/shapes in the contract are used;
// no endpoint is invented here.

async function request(path, options) {
  const res = await fetch(path, options);
  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

const jsonPost = (path) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}'
});

// GET /api/meta -> {sdk, sdkVersion, contractVersion, scenarios: [{id, kind}]}
export async function getMeta() {
  const { ok, body } = await request('/api/meta');
  if (!ok || !body) throw new Error('Could not load /api/meta');
  return body;
}

// POST /api/scenarios/{id}/config -> {ok:true, configPath}
// The browser's setup values are written to a canonical SDK config FILE the run
// then executes off (spec §3, config-file amendment). Save before Start.
export async function saveConfig(id, values) {
  const { ok, body } = await request(`/api/scenarios/${id}/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values || {})
  });
  if (!ok) throw new Error((body && body.error) || `save failed (${id})`);
  return body;
}

// POST /api/scenarios/{id}/start -> {runId, action}
// Body ignored: the run is built from the saved config file (409 not_configured
// if none was saved). The 409 is surfaced so the UI can prompt for Save.
export async function startScenario(id) {
  const { ok, status, body } = await request(`/api/scenarios/${id}/start`, jsonPost());
  if (status === 409) throw new Error('not_configured');
  if (!ok) throw new Error((body && body.error) || `start failed (${id})`);
  return body;
}

// POST /api/scenarios/{id}/enroll -> {runId, action}
// Credentials come from the saved config file (409 not_configured if none);
// responseMode ('redirect' | 'detached') is the delivery-leg choice — a UI action
// parameter, not a credential — so it rides the body (spec scenario 8, both legs).
export async function enrollScenario(id, responseMode) {
  const { ok, status, body } = await request(`/api/scenarios/${id}/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(responseMode ? { responseMode } : {})
  });
  if (status === 409) throw new Error('not_configured');
  if (!ok) throw new Error((body && body.error) || `enroll failed (${id})`);
  return body;
}

// GET /api/runs/{runId} -> {status, result?, error?, calls: []}
// Unknown/expired runId -> 404 {error:"not_found"}; surfaced as null.
export async function getRun(runId) {
  const { ok, status, body } = await request(`/api/runs/${runId}`);
  if (status === 404) return null;
  if (!ok || !body) throw new Error('run poll failed');
  return body;
}

// POST /api/scenarios/{id}/clear -> {ok:true}
// Throws on non-2xx/network failure so the caller never presents a false cleared
// state while the backend still holds the config file + its PEM (standards §2).
export async function clearScenarioBackend(id) {
  const { ok, body } = await request(`/api/scenarios/${id}/clear`, jsonPost());
  if (!ok) throw new Error((body && body.error) || `clear failed (${id})`);
}

// POST /api/clear -> {ok:true}
export async function clearAllBackend() {
  const { ok, body } = await request('/api/clear', jsonPost());
  if (!ok) throw new Error((body && body.error) || 'clear-all failed');
}
