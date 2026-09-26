import test from "node:test";
import assert from "node:assert/strict";
import { readLocalWorkspace, writeLocalWorkspace } from "../src/workspace.js";

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key) };
}

test("sync keeps edits made during a request and rejects a stale conflict choice", async () => {
  const saved = Object.fromEntries(["document", "window", "location", "localStorage", "sessionStorage", "fetch"]
    .map(key => [key, globalThis[key]]));
  const local = storage();
  const children = new Map();
  const child = selector => {
    if (!children.has(selector)) children.set(selector, { value: "", textContent: "", hidden: true,
      addEventListener(type, callback) { this[type] = callback; } });
    return children.get(selector);
  };
  const panel = { querySelector: child, innerHTML: "", className: "" };
  const pending = [];
  try {
    globalThis.localStorage = local;
    globalThis.sessionStorage = storage();
    globalThis.location = { protocol: "http:", reload() {} };
    globalThis.document = { readyState: "complete", visibilityState: "visible",
      createElement: tag => tag === "section" ? panel : { click() {} },
      querySelector: () => ({ insertAdjacentElement() {} }) };
    globalThis.window = { setInterval() {}, setTimeout() {} };
    globalThis.fetch = () => new Promise(resolve => pending.push(resolve));
    await import(`../src/sync-ui.js?test=${Date.now()}`);

    const data = readLocalWorkspace(local);
    data.watchlist.push({ symbol: "GOLD", trigger: 100 });
    writeLocalWorkspace(local, data);
    const first = child("#chief-sync-now").click();
    const editedDuringRequest = readLocalWorkspace(local);
    editedDuringRequest.watchlist[0].trigger = 101;
    writeLocalWorkspace(local, editedDuringRequest);
    pending.shift()({ ok: true, json: async () => ({ revision: 1, data: { ...data, watchlist: [{ symbol: "GOLD", trigger: 99 }] } }) });
    await first;
    assert.match(child("#chief-sync-status").textContent, /Konflikt/);
    child("#chief-sync-pull").click();
    assert.equal(JSON.parse(local.getItem("chief-sync-local-backup-v1")).data.watchlist[0].trigger, 101);
    assert.equal(readLocalWorkspace(local).watchlist[0].trigger, 99);

    const editedBeforeConflict = readLocalWorkspace(local);
    editedBeforeConflict.watchlist[0].trigger = 100;
    writeLocalWorkspace(local, editedBeforeConflict);
    const second = child("#chief-sync-now").click();
    pending.shift()({ ok: true, json: async () => ({ revision: 2, data: { ...data, watchlist: [{ symbol: "GOLD", trigger: 98 }] } }) });
    await second;
    assert.match(child("#chief-sync-status").textContent, /Konflikt/);

    const editedAfterConflict = readLocalWorkspace(local);
    editedAfterConflict.watchlist[0].trigger = 102;
    writeLocalWorkspace(local, editedAfterConflict);
    child("#chief-sync-pull").click();
    assert.equal(readLocalWorkspace(local).watchlist[0].trigger, 102);
    assert.match(child("#chief-sync-status").textContent, /erneut abgleichen/);
    assert.equal(child("#chief-sync-pull").hidden, true);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
