import test from "node:test";
import assert from "node:assert/strict";
import { createCatalyst, publishCatalyst, applyCatalystToPlan, journalContextAt } from "../src/macro.js";

test("macro event marks a relevant plan for review without changing technical rules", () => {
  const event = publishCatalyst(createCatalyst({ id: "FED-TEST", type: "FED", scheduledAt: "2026-09-16T18:00:00Z",
    sourceUrl: "https://www.federalreserve.gov/", markets: ["US100", "GOLD"], risk: "high" }),
  { publishedAt: "2026-09-16T18:00:00Z", observedAt: "2026-09-16T18:03:00Z", summary: "Decision" });
  const plan = { symbol: "US100", planVersion: "v2", trigger: 25000, entry: 25010, stop: 24900,
    tp1: 25200, tp2: 25300, invalidation: "H1", scenarioSwitch: "short" };
  const updated = applyCatalystToPlan(plan, event);
  assert.equal(updated.reviewStatus, "review_required");
  for (const key of ["trigger", "entry", "stop", "tp1", "tp2", "invalidation", "scenarioSwitch"])
    assert.equal(updated[key], plan[key]);
  assert.equal(plan.reviewStatus, undefined);
  assert.equal(applyCatalystToPlan({ symbol: "OIL" }, event).reviewStatus, undefined);
  const context = journalContextAt({ plan: updated, catalysts: [event], referenceQuote: { price: 25020 },
    evaluatedAt: "2026-09-16T18:05:00Z" });
  assert.equal(context.catalysts[0].observedAt, "2026-09-16T18:03:00.000Z");
  assert.equal(context.referenceQuote.price, 25020);
});

test("event sources and distinct published and observed timestamps are required", () => {
  assert.throws(() => createCatalyst({ id: "CPI", type: "CPI", scheduledAt: "2026-09-16", markets: ["US100"] }), /Quelle/);
  const event = createCatalyst({ id: "CPI", type: "CPI", scheduledAt: "2026-09-16", markets: ["US100"], sourceUrl: "https://example.org" });
  assert.throws(() => publishCatalyst(event, { publishedAt: "2026-09-16T14:00:00Z",
    observedAt: "2026-09-16T13:59:00Z" }), /getrennt/);
});

test("historical journal context does not disclose later observed event results", () => {
  const event = publishCatalyst(createCatalyst({ id: "FED-2", type: "FED", scheduledAt: "2026-09-16T18:00:00Z",
    markets: ["US100"], sourceUrl: "https://www.federalreserve.gov/" }),
  { publishedAt: "2026-09-16T18:00:00Z", observedAt: "2026-09-16T18:10:00Z", summary: "Result" });
  const earlier = journalContextAt({ plan: { symbol: "US100" }, catalysts: [event],
    evaluatedAt: "2026-09-16T18:05:00Z" });
  assert.equal(earlier.catalysts[0].observedAt, null);
  assert.equal(earlier.catalysts[0].publishedAt, null);
});
