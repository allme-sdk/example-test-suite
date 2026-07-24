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
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
