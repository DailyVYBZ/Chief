import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as alerts from "../src/alerts.js";

test("stored alarm history renders with journal choices and escapes user content", () => {
  const data = new Map([
    ["chief-alert-history-v1", JSON.stringify([{ id: "event-1", at: "2026-09-25T07:00:00Z", alertId: "GOLD:long", price: 100, type: "level-reached", journalEntryId: "entry-1" }])],
    ["chief-journal-v1", JSON.stringify([{ id: "entry-1", input: { symbol: '<img src=x onerror="bad()">' }, evaluation: { evaluatedAt: "2026-09-25T07:00:00Z" } }])]
  ]);
  const panel = { innerHTML: "", style: {}, querySelectorAll: () => [] };
  const document = { readyState: "complete", createElement: () => panel,
    querySelector: selector => selector === ".attention-card" ? { insertAdjacentElement() {} } : panel };
  const source = readFileSync(new URL("../src/alerts-ui.js", import.meta.url), "utf8").replace(/^import .*;\n/, "");
  runInNewContext(source, { ...alerts, document, window: { addEventListener() {} }, localStorage: {
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)
  } });
  assert.match(panel.innerHTML, /value="entry-1" selected/);
  assert.match(panel.innerHTML, /&lt;img/);
  assert.doesNotMatch(panel.innerHTML, /<img/);
});

test("old candle closes cannot confirm a current alert", () => {
  assert.throws(() => alerts.confirmAlert({ status: "reached", reachedAt: "2026-09-20T08:00:00Z" },
    { id: "gold", type: "long-trigger", direction: "long", level: 100, timeframe: "H1" },
    { timeframe: "H1", closePrice: 101, closedAt: "2026-09-20T09:00:00Z" }, new Date("2026-09-25T10:00:00Z")), /Prüfzeitraum/);
});
