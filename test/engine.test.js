import test from "node:test";
import assert from "node:assert/strict";
import { calculatePosition, evaluateSetup } from "../src/engine.js";

const complete = {
  symbol: "SYK", direction: "long", entry: 360, stop: 344, tp1: 382, tp2: 400, tp3: 424,
  portfolio: 120000, riskPercent: 0.75, h4Trend: 2, h1Confirmation: 2,
  structure: 2, catalyst: 1, fundamentals: 2, liquidity: 2,
  dataSource: "XTB", dataTimestamp: "2026-09-10T18:00:00Z",
  invalidation: "H4 Schlusskurs unter Stop"
};

test("begrenzt die Position durch Risikobudget und 20 Prozent Allokation", () => {
  const result = calculatePosition(complete);
  assert.equal(result.riskBudget, 900);
  assert.equal(result.riskUnits, 56);
  assert.equal(result.allocationUnits, 66);
  assert.equal(result.units, 56);
  assert.equal(result.actualRisk, 896);
});

test("bewertet ein vollständiges Long Setup als Kandidat", () => {
  const result = evaluateSetup(complete, new Date("2026-09-10T19:00:00Z"));
  assert.equal(result.decision, "KANDIDAT");
  assert.equal(result.rr, 2.5);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.score >= 75);
});

test("blockiert ein Long Setup mit Stop über dem Einstieg", () => {
  const result = evaluateSetup({ ...complete, stop: 370 }, new Date("2026-09-10T19:00:00Z"));
  assert.equal(result.decision, "UNVOLLSTÄNDIG");
  assert.ok(result.blockers.includes("Long Stop muss unter dem Einstieg liegen"));
});

test("bewertet auch ein korrekt geordnetes Short Setup", () => {
  const short = { ...complete, direction: "short", entry: 100, stop: 105, tp1: 92, tp2: 90, tp3: 84 };
  const result = evaluateSetup(short, new Date("2026-09-10T19:00:00Z"));
  assert.equal(result.decision, "KANDIDAT");
  assert.equal(result.rr, 2);
});

test("zieht bei veralteten Daten fünf Punkte ab", () => {
  const fresh = evaluateSetup(complete, new Date("2026-09-10T19:00:00Z"));
  const stale = evaluateSetup(complete, new Date("2026-09-12T19:00:00Z"));
  assert.equal(stale.score, fresh.score - 5);
});
