import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorkspaceStore } from "../server/workspace-store.mjs";
import { readLocalWorkspace, reconcileWorkspace, writeLocalWorkspace } from "../src/workspace.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("workspace writes are versioned, durable and reject a concurrent stale revision", async () => {
  const dir = await mkdtemp(join(tmpdir(), "chief-workspace-"));
  try {
    const path = join(dir, "workspace.json");
    const store = createWorkspaceStore(path);
    const data = readLocalWorkspace(memoryStorage());
    data.watchlist.push({ symbol: "GOLD", trigger: 100 });
    const [first, second] = await Promise.all([store.save(0, data), store.save(0, data)]);
    assert.deepEqual([first.conflict, second.conflict], [false, true]);
    assert.equal((await createWorkspaceStore(path).read()).data.watchlist[0].trigger, 100);
    data.watchlist[0].trigger = 101;
    assert.equal((await store.save(1, data)).current.revision, 2);
    assert.equal((await createWorkspaceStore(path).read()).data.watchlist[0].trigger, 101);
    assert.equal(JSON.parse(await readFile(`${path}.bak`, "utf8")).data.watchlist[0].trigger, 100);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("two device changes are detected as a conflict instead of being overwritten", () => {
  const storage = memoryStorage();
  const initial = readLocalWorkspace(storage);
  writeLocalWorkspace(storage, initial);
  const local = readLocalWorkspace(storage);
  local.journal.push({ id: "local" });
  const remote = { revision: 2, data: structuredClone(initial) };
  remote.data.journal.push({ id: "remote" });
  assert.equal(reconcileWorkspace(local, remote, { revision: 1, hash: JSON.stringify(initial) }), "conflict");
  assert.equal(reconcileWorkspace(initial, remote, { revision: 1, hash: JSON.stringify(initial) }), "pull");
  assert.equal(reconcileWorkspace(local, { revision: 1, data: initial }, { revision: 1, hash: JSON.stringify(initial) }), "push");
});
