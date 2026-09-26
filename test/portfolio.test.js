import test from "node:test";
import assert from "node:assert/strict";
import { openPosition, recordExit, positionResult, portfolioRisk, journalStatistics } from "../src/portfolio.js";

const openedAt = "2026-09-24T10:00:00Z";
const closedAt = "2026-09-24T12:00:00Z";
const setup = { symbol: "GOLD", direction: "long", entry: 100, stop: 90, trigger: 99,
  planVersion: "v2", confirmation: "H1 close", tp1: 110 };
const make = overrides => openPosition({ setup: { ...setup, ...overrides }, units: 10, actualEntry: 100,
  multiplier: 1, fxEurPerCurrency: 1, entryFeeEur: 2, openedAt });

test("a winning trade preserves its original setup and calculates fees and R", () => {
  const entry = make();
  const closed = recordExit(entry, { units: 10, price: 110, fxEurPerCurrency: 1, feeEur: 1, closedAt, target: "TP1" });
  assert.equal(positionResult(closed).status, "closed");
  assert.equal(positionResult(closed).realizedEur, 97);
  assert.equal(positionResult(closed).realizedR, .97);
  assert.equal(closed.setupSnapshot.trigger, 99);
  assert.equal(entry.exits.length, 0);
});

test("loss and partial exit reduce open risk by actual remaining units", () => {
  const entry = make();
  const partial = recordExit(entry, { units: 4, price: 110, fxEurPerCurrency: 1, feeEur: 1, closedAt });
  assert.equal(positionResult(partial).remainingUnits, 6);
  assert.equal(positionResult(partial).openRiskEur, 60);
  assert.ok(Math.abs(positionResult(partial).realizedEur - 38.2) < 1e-9);
  const lost = recordExit(partial, { units: 6, price: 90, fxEurPerCurrency: 1, feeEur: 1,
    closedAt: "2026-09-24T13:00:00Z" });
  assert.equal(positionResult(lost).realizedEur, -24);
  assert.equal(positionResult(lost).status, "closed");
  assert.throws(() => recordExit(lost, { units: 1, price: 90, fxEurPerCurrency: 1, closedAt }), /übersteigt/);
});

test("short positions and currency conversion require explicit contract parameters", () => {
  const short = openPosition({ setup: { symbol: "US100", direction: "short", stop: 110 }, units: 2,
    actualEntry: 100, multiplier: 5, fxEurPerCurrency: .9, openedAt });
  const result = recordExit(short, { units: 2, price: 90, fxEurPerCurrency: .85, closedAt });
  assert.equal(positionResult(result).realizedEur, 85);
  assert.throws(() => recordExit(short, { units: 1, price: 90, closedAt }), /Ausstiegsumrechnung/);
});

test("portfolio view groups shared exposures and previews additional risk", () => {
  const first = make();
  const second = openPosition({ setup: { symbol: "SILVER", direction: "long", stop: 90 }, units: 5,
    actualEntry: 100, multiplier: 1, fxEurPerCurrency: 1, openedAt });
  const analysis = portfolioRisk([first, second], { portfolioEur: 10000, maxRiskPercent: 1,
    proposed: openPosition({ setup: { symbol: "DE40", direction: "long", stop: 95 }, units: 1,
      actualEntry: 100, multiplier: 1, fxEurPerCurrency: 1, openedAt }) });
  assert.equal(analysis.totalRiskEur, 150);
  assert.equal(analysis.totalRiskPercent, 1.5);
  assert.deepEqual(analysis.concentrationGroups, ["Edelmetalle"]);
  assert.equal(analysis.availableRiskEur, 0);
  assert.equal(analysis.exceedsLimit, true);
});

test("journal statistics exclude open trades and distinguish unreviewed rules", () => {
  const winner = recordExit(make(), { units: 10, price: 110, fxEurPerCurrency: 1, closedAt });
  const loser = recordExit(make(), { units: 10, price: 90, fxEurPerCurrency: 1, closedAt });
  const stats = journalStatistics([{ ...winner, ruleDeviation: false }, loser, make()]);
  assert.equal(stats.closedTrades, 2);
  assert.equal(stats.winRatePercent, 50);
  assert.equal(stats.ruleReviewed, 1);
  assert.equal(stats.ruleCompliancePercent, 100);
  assert.equal(journalStatistics([make()]).averageR, null);
});
