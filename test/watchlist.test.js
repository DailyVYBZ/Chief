import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_MARKETS,
  ACTIVE_WATCHLIST,
  WATCHLIST_VERSION,
  getMarketSignal,
  getWatchlistSignal,
  groupWatchlist,
  mergeWatchlists,
  parseLocaleNumber,
  parseWatchlist
} from "../src/watchlist.js";

test("liefert zehn Märkte und 19 konkrete Richtungsszenarien", () => {
  assert.equal(WATCHLIST_VERSION, 2);
  assert.equal(ACTIVE_MARKETS.length, 10);
  assert.equal(ACTIVE_WATCHLIST.length, 19);
  assert.equal(new Set(ACTIVE_WATCHLIST.map(item => item.symbol)).size, 10);
  assert.ok(ACTIVE_WATCHLIST.every(item => item.planStatus === "validated"));
});

test("jeder aktive Plan enthält exakte Pflichtfelder", () => {
  const numeric = ["referencePrice", "trigger", "entry", "stop", "tp1", "tp2", "tp3", "rrToTp2"];
  for (const item of ACTIVE_WATCHLIST) {
    for (const field of numeric) assert.ok(Number.isFinite(item[field]) && item[field] > 0, `${item.symbol} ${item.direction} ${field}`);
    assert.ok(item.confirmation);
    assert.ok(item.invalidation);
    assert.ok(item.scenarioSwitch);
    assert.ok(item.marketStatus);
    assert.ok(item.action);
  }
});

test("gruppiert Long und Short zu zehn Marktansichten", () => {
  const markets = groupWatchlist(ACTIVE_WATCHLIST);
  assert.equal(markets.length, 10);
  const bitcoin = markets.find(item => item.symbol === "BITCOIN");
  assert.equal(bitcoin.long.trigger, 78950);
  assert.equal(bitcoin.short.trigger, 76950);
  assert.deepEqual(bitcoin.accumulationLevels, [77650, 75250, 72950]);
  const ethereum = markets.find(item => item.symbol === "ETHEREUM");
  assert.ok(ethereum.long);
  assert.equal(ethereum.short, null);
});

test("versteht deutsche und internationale Zahlen", () => {
  assert.equal(parseLocaleNumber("29.578,18"), 29578.18);
  assert.equal(parseLocaleNumber("29578.18"), 29578.18);
});

test("importiert CSV mit Semikolon", () => {
  const rows = parseWatchlist("symbol;name;direction;entry;trigger\nDE40;DAX;short;25.544;25.548", "watchlist.csv");
  assert.equal(rows[0].symbol, "DE40");
  assert.equal(rows[0].entry, 25544);
  assert.equal(rows[0].trigger, 25548);
});

test("importiert das verschachtelte Marktplan JSON", () => {
  const rows = parseWatchlist(JSON.stringify({
    version: 2,
    planDate: "2026-09-11",
    priceAsOf: "2026-09-11T13:54:00Z",
    source: "Test",
    markets: [{
      symbol: "BTC", name: "Bitcoin", assetClass: "Krypto", referencePrice: 100,
      long: { trigger: 101, entry: 101, stopLoss: 99, tp1: 102, tp2: 104, tp3: 106, rrToTp2: 1.5, confirmation: "H1", invalidation: "99", scenarioSwitch: "98" }
    }]
  }), "plan.json");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stop, 99);
  assert.equal(rows[0].trigger, 101);
});

test("führt gleiche Symbole und Richtungen ohne Duplikat zusammen", () => {
  const bitcoin = ACTIVE_WATCHLIST.find(item => item.symbol === "BITCOIN" && item.direction === "long");
  const merged = mergeWatchlists([{ ...bitcoin, entry: 78000 }], [{ ...bitcoin, entry: 78950 }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].entry, 78950);
});

test("erkennt Bitcoin Long als sehr nahen Trigger", () => {
  const bitcoin = ACTIVE_WATCHLIST.find(item => item.symbol === "BITCOIN" && item.direction === "long");
  const signal = getWatchlistSignal(bitcoin, new Date("2026-09-11T14:00:00Z"));
  assert.equal(signal.label, "TRIGGER SEHR NAH");
  assert.ok(signal.distancePercent < 0.5);
});

test("priorisiert pro Markt das nächste relevante Level", () => {
  const bitcoin = groupWatchlist(ACTIVE_WATCHLIST).find(item => item.symbol === "BITCOIN");
  const signal = getMarketSignal(bitcoin, new Date("2026-09-11T14:00:00Z"));
  assert.equal(signal.focusType, "long");
  assert.equal(signal.level, 78950);
});

test("sperrt Signale bei Referenzkursen älter als 24 Stunden", () => {
  const bitcoin = ACTIVE_WATCHLIST.find(item => item.symbol === "BITCOIN" && item.direction === "long");
  const signal = getWatchlistSignal(bitcoin, new Date("2026-09-13T14:00:00Z"));
  assert.equal(signal.label, "DATEN ALT");
});
