export const WORKSPACE_KEYS = Object.freeze({
  watchlist: "chief-watchlist-v2",
  journal: "chief-journal-v1",
  positions: "chief-positions-v1",
  riskSettings: "chief-risk-settings-v1",
  macroEvents: "chief-macro-events-v1",
  alertStates: "chief-alert-states-v1",
  alertHistory: "chief-alert-history-v1"
});

const ARRAY_FIELDS = new Set(["watchlist", "journal", "positions", "macroEvents", "alertHistory"]);

export function validateWorkspaceData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Workspace Daten fehlen");
  const result = {};
  for (const [field] of Object.entries(WORKSPACE_KEYS)) {
    const value = data[field];
    if (ARRAY_FIELDS.has(field) ? !Array.isArray(value) : !value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Workspace Feld ${field} ist ungültig`);
    }
    result[field] = structuredClone(value);
  }
  return result;
}

export function readLocalWorkspace(storage) {
  const data = {};
  for (const [field, key] of Object.entries(WORKSPACE_KEYS)) {
    let value;
    try { value = JSON.parse(storage.getItem(key)); } catch {}
    data[field] = value ?? (ARRAY_FIELDS.has(field) ? [] : {});
  }
  return validateWorkspaceData(data);
}

export function writeLocalWorkspace(storage, data) {
  const valid = validateWorkspaceData(data);
  for (const [field, key] of Object.entries(WORKSPACE_KEYS)) storage.setItem(key, JSON.stringify(valid[field]));
}

export function reconcileWorkspace(local, remote, baseline) {
  const localHash = JSON.stringify(validateWorkspaceData(local));
  const remoteHash = JSON.stringify(validateWorkspaceData(remote.data));
  if (localHash === remoteHash) return "equal";
  if (remote.revision === 0) return "push";
  if (!baseline) return "conflict";
  if (baseline.revision === remote.revision) return "push";
  if (baseline.hash === localHash) return "pull";
  return "conflict";
}
