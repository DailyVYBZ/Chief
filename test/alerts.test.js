import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_WATCHLIST } from "../src/watchlist.js";
import { advanceAlert, buildAlertDefinitions, confirmAlert } from "../src/alerts.js";

const at = new Date("2026-09-24T12:00:00Z");
const defs = buildAlertDefinitions(ACTIVE_WATCHLIST);
const btc = defs.find(item => item.symbol === "BITCOIN" && item.type === "long-trigger");
const quote = price => ({ price, timestamp: at.toISOString(), source: "Manuelle Watchlist" });

test("each active scenario is represented and crypto accumulation levels are separate", () => {
  assert.equal(defs.filter(item => item.type.endsWith("trigger")).length, 19);
  assert.equal(defs.filter(item => item.type === "accumulation").length, 9);
  assert.equal(new Set(defs.map(item => item.id)).size, defs.length);
});

test("a wick reaches a level once but cannot itself confirm a setup", () => {
  const first = advanceAlert(undefined, btc, quote(78950), at);
  assert.equal(first.state.status, "reached");
  assert.equal(first.event.type, "level-reached");
  assert.equal(advanceAlert(first.state, btc, quote(79000), at).event, null);
  assert.throws(() => confirmAlert(first.state, btc, {
    timeframe: "H1", closePrice: 78950, closedAt: at.toISOString()
  }, at), /bestätigt/);
});

test("a valid H1 close confirms once and records a journal link slot", () => {
  const reached = advanceAlert(undefined, btc, quote(78950), at);
  const later = new Date(at.getTime() + 3_600_000);
  assert.throws(() => confirmAlert(reached.state, btc, {
    timeframe: "H4", closePrice: 79000, closedAt: later.toISOString()
  }, later), /H1/);
  const confirmed = confirmAlert(reached.state, btc, {
    timeframe: "H1", closePrice: 79000, closedAt: later.toISOString()
  }, later);
  assert.equal(confirmed.state.status, "confirmed");
  assert.equal(confirmed.event.journalEntryId, null);
  assert.equal(advanceAlert(confirmed.state, btc, quote(79000), later).event, null);
});

test("stale data and future prices never advance an alarm", () => {
  const stale = { price: 80000, timestamp: "2026-09-23T11:59:59Z" };
  const future = { price: 80000, timestamp: "2026-09-24T12:06:00Z" };
  assert.equal(advanceAlert(undefined, btc, stale, at).event, null);
  assert.equal(advanceAlert(undefined, btc, future, at).event, null);
});

test("accumulation stays separate from long triggers", () => {
  const accumulation = defs.find(item => item.symbol === "BITCOIN" && item.type === "accumulation");
  const reached = advanceAlert(undefined, accumulation, quote(accumulation.level), at);
  assert.equal(reached.state.status, "reached");
  assert.throws(() => confirmAlert(reached.state, accumulation, {
    timeframe: "H1", closePrice: 90000, closedAt: at.toISOString()
  }, at), /getrennte/);
});
