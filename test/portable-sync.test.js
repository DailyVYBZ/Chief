import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("portable file origin needs a token and can exchange a versioned workspace", async () => {
  const dir = await mkdtemp(join(tmpdir(), "chief-portable-sync-"));
  const root = fileURLToPath(new URL("..", import.meta.url));
  const token = "portable-sync-integration-test";
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: "0", CHIEF_SYNC_TOKEN: token, CHIEF_WORKSPACE_PATH: join(dir, "workspace.json") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => reject(new Error(`Chief Server startete nicht: ${output}`)), 10_000);
      child.stdout.on("data", chunk => {
        output += chunk;
        const match = output.match(/localhost:(\d+)/);
        if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
      });
      child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Chief Server endete mit ${code}`)); });
    });
    const url = `http://127.0.0.1:${port}/api/workspace`;
    const preflight = await fetch(url, { method: "OPTIONS", headers: {
      Origin: "null", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "authorization,content-type"
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "null");
    assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);

    const denied = await fetch(url, { headers: { Origin: "null" } });
    assert.equal(denied.status, 401);
    const authorized = await fetch(url, { headers: { Origin: "null", Authorization: `Bearer ${token}` } });
    assert.equal(authorized.status, 200);
    assert.equal(authorized.headers.get("access-control-allow-origin"), "null");
    const data = (await authorized.json()).data;
    data.watchlist.push({ symbol: "GOLD", referencePrice: 100 });
    const saved = await fetch(url, { method: "PUT", headers: {
      Origin: "null", Authorization: `Bearer ${token}`, "Content-Type": "application/json"
    }, body: JSON.stringify({ baseRevision: 0, data }) });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).revision, 1);
    const foreignOrigin = await fetch(url, { method: "PUT", headers: {
      Origin: "https://example.invalid", Authorization: `Bearer ${token}`, "Content-Type": "application/json"
    }, body: JSON.stringify({ baseRevision: 1, data }) });
    assert.equal(foreignOrigin.status, 403);
  } finally {
    child.kill();
    await rm(dir, { recursive: true, force: true });
  }
});
