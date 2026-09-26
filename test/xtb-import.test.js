import test from "node:test";
import assert from "node:assert/strict";
import { parseXtbQuotes, applyXtbQuotes } from "../src/xtb-import.js";

test("manual XTB quote import updates prices but preserves the trading plan", () => {
  const quotes = parseXtbQuotes("symbol;instrument;bid;ask;quotedAt\nBITCOIN;BITCOIN;78.950,25;78.970,25;2026-09-25T08:00:00+02:00");
  const plan = { symbol: "BITCOIN", direction: "long", trigger: 80000, stop: 78000, tp1: 81000, referencePrice: 78000 };
  const updated = applyXtbQuotes([plan], quotes)[0];
  assert.equal(updated.referencePrice, 78950.25);
  assert.equal(updated.askPrice, 78970.25);
  assert.equal(updated.trigger, 80000);
  assert.equal(updated.stop, 78000);
  assert.equal(updated.tp1, 81000);
  assert.equal(updated.quoteAuthoritative, false);
});

test("quote import rejects unknown and duplicate symbols, bad spread and missing timezone", () => {
  const head = "symbol;instrument;bid;ask;quotedAt\n";
  const row = "GOLD;GOLD;100;101;2026-09-25T08:00:00+02:00";
  assert.throws(() => parseXtbQuotes(head + row + "\n" + row), /doppelt/);
  assert.throws(() => parseXtbQuotes(head + "UNKNOWN;X;100;101;2026-09-25T08:00:00+02:00"), /unbekannt/);
  assert.throws(() => parseXtbQuotes(head + "GOLD;GOLD;100;99;2026-09-25T08:00:00+02:00"), /Bid\/Ask/);
  assert.throws(() => parseXtbQuotes(head + "GOLD;GOLD;100abc;101;2026-09-25T08:00:00+02:00"), /Bid\/Ask/);
  assert.throws(() => parseXtbQuotes(head + "GOLD;GOLD;78.950;;2026-09-25T08:00:00+02:00"), /Bid\/Ask/);
  assert.throws(() => parseXtbQuotes(head + "GOLD;GOLD;100;101;2026-09-25T08:00:00"), /Zeitzone/);
});
