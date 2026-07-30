// Per-scenario setup values live in localStorage (spec §5). PEM file content is
// stored here too — the file picker reads the file's CONTENT into localStorage
// like every other input; on Save the backend writes it into the scenario's SDK
// config file (referenced by path), which the run then executes off.

const NS = 'allme-example:scenario:';

export function loadValues(id) {
  try {
    const raw = localStorage.getItem(NS + id);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveValues(id, values) {
  localStorage.setItem(NS + id, JSON.stringify(values || {}));
}

export function clearValues(id) {
  localStorage.removeItem(NS + id);
}

export function clearAllValues() {
  scenarioKeys().forEach((k) => localStorage.removeItem(k));
}

// ── the whole-suite snapshot: Save all / Restore all ────────────────────────
//
// A setup entered here is stuck in this browser, because localStorage is per origin
// and per browser. These two build and consume ONE snapshot object, carried by
// `POST`/`GET /api/state`, so a setup typed on a desktop can be picked up on a phone.
//
// The FORMAT IS OWNED HERE, end to end: `CONTRACT.md` fixes that payload as opaque,
// so a change to the shape below stays confined to this file.

const SNAPSHOT_SUITE = 'allme-example-test-suite';
const SNAPSHOT_VERSION = 1;

/** Every suite key currently in localStorage (full keys, namespace included). */
function scenarioKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) keys.push(k);
  }
  return keys;
}

/** This browser's whole suite setup as one snapshot object, keyed by scenario id. */
export function exportAllValues() {
  const values = {};
  scenarioKeys().forEach((k) => {
    const id = k.slice(NS.length);
    try {
      const parsed = JSON.parse(localStorage.getItem(k));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) values[id] = parsed;
    } catch {
      /* an unreadable entry is left out of the snapshot rather than shipped broken */
    }
  });
  return { suite: SNAPSHOT_SUITE, version: SNAPSHOT_VERSION, savedAt: new Date().toISOString(), values };
}

/**
 * Load a snapshot back into localStorage, REPLACING the suite's entries: the snapshot
 * is a picture of the whole setup, so a scenario absent from it is absent afterwards.
 *
 * Returns the restored `{scenarioId: values}` map, or null when the blob carries no
 * readable `values` object — in which case nothing has been touched, so the caller can
 * say so honestly instead of reporting a restore that emptied the setup.
 *
 * **Replace-or-unchanged, across write failures too.** The entries are cleared before
 * the new ones are written, so a `setItem` that throws part-way — a snapshot carrying
 * PEMs can exceed a phone's quota — would otherwise leave a setup that is neither the
 * old one nor the new one, while the caller reports it untouched. The prior entries are
 * captured first and put back on any failure. If that rollback ALSO fails there is no
 * honest "untouched" left to report, so the thrown error carries `rolledBack: false`
 * and the caller says what really happened rather than the reassuring thing.
 */
export function importAllValues(snapshot) {
  const values = snapshot && typeof snapshot === 'object' ? snapshot.values : null;
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null;

  const previous = scenarioKeys().map((k) => [k, localStorage.getItem(k)]);
  const restored = {};
  try {
    clearAllValues();
    Object.keys(values).forEach((id) => {
      const v = values[id];
      restored[id] = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      saveValues(id, restored[id]);
    });
    return restored;
  } catch (cause) {
    let rolledBack = true;
    try {
      clearAllValues(); // frees whatever the partial write took, so the rollback fits
      previous.forEach(([k, v]) => {
        if (v !== null) localStorage.setItem(k, v);
      });
    } catch {
      rolledBack = false;
    }
    const failure = new Error(cause && cause.message ? cause.message : 'could not write to browser storage');
    failure.rolledBack = rolledBack;
    throw failure;
  }
}
