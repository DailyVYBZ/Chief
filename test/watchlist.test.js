import test from "node:test";
import assert from "node:assert/strict";
import { getWatchlistSignal, mergeWatchlists, parseLocaleNumber, parseWatchlist, SEED_WATCHLIST } from "../src/watchlist.js";

test("liefert die acht bestätigten Märkte als historischen Startbestand", () => {
  assert.equal(SEED_WATCHLIST.length, 8);
  assert.ok(SEED_WATCHLIST.every(item => item.planStatus === "historical"));
});

test("versteht deutsche und internationale Zahlen", () => {
  assert.equal(parseLocaleNumber("29.578,18"), 29578.18);
  assert.equal(parseLocaleNumber("29578.18"), 29578.18);
});

test("importiert CSV mit Semikolon", () => {
  const rows = parseWatchlist("symbol;name;direction;entry\nDE40;DAX;short;25.945", "watchlist.csv");
  assert.equal(rows[0].symbol, "DE40");
  assert.equal(rows[0].entry, 25945);
});

test("führt gleiche Symbole und Richtungen ohne Duplikat zusammen", () => {
  const merged = mergeWatchlists([{ ...SEED_WATCHLIST[0], entry: 4300 }], [{ ...SEED_WATCHLIST[0], entry: 4360 }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].entry, 4360);
});

test("historischer Plan erzeugt kein aktives Signal", () => {
  assert.equal(getWatchlistSignal(SEED_WATCHLIST[0]).label, "HISTORISCH");
});

test("erkennt einen validierten nahen Trigger", () => {
  const item = { ...SEED_WATCHLIST[0], planStatus: "validated", referencePrice: 4370, priceAsOf: "2026-09-11T06:00:00Z" };
  const signal = getWatchlistSignal(item, new Date("2026-09-11T07:00:00Z"));
  assert.equal(signal.label, "TRIGGER NAH");
});
