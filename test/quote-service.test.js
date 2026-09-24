import test from "node:test";
import assert from "node:assert/strict";
import { createQuoteService } from "../server/quote-service.mjs";

const now = new Date("2026-09-24T12:00:00Z");
const quote = (symbol, timestamp = now.toISOString()) => ({ symbol, price: 100, timestamp, source: "Test" });

test("rejects stale and future provider values, then uses a fresh fallback", async () => {
  const service = createQuoteService([
    { name: "primary", supports: () => true, fetch: async symbol => quote(symbol, "2026-09-23T11:59:59Z") },
    { name: "fallback", supports: () => true, fetch: async symbol => quote(symbol) }
  ], { now: () => now });
  const result = await service.load(["GOLD"]);
  assert.equal(result.quotes[0].fallback, true);
  assert.equal(result.errors.length, 1);
  assert.equal(result.status.complete, true);
});

test("a failed refresh does not report an old quote as current", async () => {
  let current = now;
  let fails = false;
  const service = createQuoteService([
    { name: "primary", supports: () => true, fetch: async symbol => {
      if (fails) throw new Error("offline");
      return quote(symbol);
    } }
  ], { now: () => current, cacheTtlMs: 1000 });
  assert.equal((await service.load(["GOLD"])).quotes.length, 1);
  current = new Date("2026-09-25T12:00:01Z");
  fails = true;
  const result = await service.load(["GOLD"]);
  assert.equal(result.quotes.length, 0);
  assert.deepEqual(result.status.missing, ["GOLD"]);
});

test("partial coverage preserves the requested order and reports missing symbols", async () => {
  const service = createQuoteService([{ name: "primary", supports: () => true, fetch: async symbol => {
    if (symbol === "DE40") throw new Error("offline");
    return quote(symbol);
  } }], { now: () => now });
  const result = await service.load(["GOLD", "DE40", "BITCOIN"]);
  assert.deepEqual(result.quotes.map(item => item.symbol), ["GOLD", "BITCOIN"]);
  assert.deepEqual(result.status.missing, ["DE40"]);
});
