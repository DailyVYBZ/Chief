import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_SYMBOLS,
  normalizeCoinGeckoQuotes,
  normalizeSymbols,
  normalizeYahooQuote,
  providerStatus,
  quoteAgeSeconds
} from "../server/providers.mjs";

test("unterstützt alle zehn Chief Märkte", () => {
  assert.deepEqual(SUPPORTED_SYMBOLS, [
    "SILVER", "GOLD", "DE40", "US100", "US500", "OIL", "SOLANA", "BITCOIN", "ETHEREUM", "EURUSD"
  ]);
});

test("normalisiert angeforderte Symbole und entfernt Duplikate", () => {
  assert.deepEqual(normalizeSymbols(" bitcoin,ETHEREUM,bitcoin,unknown "), ["BITCOIN", "ETHEREUM"]);
});

test("verwendet ohne Parameter die gesamte Chief Watchlist", () => {
  assert.deepEqual(normalizeSymbols(""), SUPPORTED_SYMBOLS);
});

test("normalisiert Yahoo Kurs mit Marktzeit", () => {
  const payload = {
    chart: {
      result: [{
        meta: { regularMarketPrice: 78950.25, regularMarketTime: 1789142400, currency: "USD", bid: 78940, ask: 78960 },
        timestamp: [1789142340],
        indicators: { quote: [{ close: [78920, 78950.25] }] }
      }],
      error: null
    }
  };
  const quote = normalizeYahooQuote("BITCOIN", payload, new Date("2026-09-11T16:00:00Z"));
  assert.equal(quote.symbol, "BITCOIN");
  assert.equal(quote.providerSymbol, "BTC-USD");
  assert.equal(quote.price, 78950.25);
  assert.equal(quote.bid, 78940);
  assert.equal(quote.ask, 78960);
  assert.equal(quote.authoritative, false);
  assert.equal(quote.referenceOnly, true);
});

test("fällt bei Yahoo auf den letzten Schlusskurs zurück", () => {
  const payload = {
    chart: {
      result: [{
        meta: { currency: "USD" },
        timestamp: [1789142280, 1789142340],
        indicators: { quote: [{ close: [null, 104.35] }] }
      }],
      error: null
    }
  };
  const quote = normalizeYahooQuote("OIL", payload, new Date("2026-09-11T16:00:00Z"));
  assert.equal(quote.price, 104.35);
});

test("erfindet bei fehlendem Provider Zeitstempel keinen aktuellen Kurs", () => {
  assert.throws(() => normalizeYahooQuote("GOLD", {
    chart: { result: [{ meta: { regularMarketPrice: 2300 }, indicators: { quote: [{ close: [2300] }] } }] }
  }), /Datenzeitpunkt fehlt/);
  assert.deepEqual(normalizeCoinGeckoQuotes({ bitcoin: { usd: 79000 } }), []);
});

test("normalisiert CoinGecko Fallback nur für verfügbare Kryptos", () => {
  const quotes = normalizeCoinGeckoQuotes({
    bitcoin: { usd: 79000, last_updated_at: 1789142400 },
    ethereum: { usd: 2610, last_updated_at: 1789142401 },
    unknown: { usd: 1 }
  });
  assert.equal(quotes.length, 2);
  assert.deepEqual(quotes.map(item => item.symbol), ["BITCOIN", "ETHEREUM"]);
  assert.ok(quotes.every(item => item.source === "CoinGecko"));
});

test("berechnet Quote Alter", () => {
  const age = quoteAgeSeconds({ timestamp: "2026-09-11T15:59:30Z" }, new Date("2026-09-11T16:00:00Z"));
  assert.equal(age, 30);
});

test("meldet Teilabdeckung sauber", () => {
  const status = providerStatus([{ symbol: "BITCOIN" }, { symbol: "GOLD" }], ["BITCOIN", "GOLD", "DE40"]);
  assert.equal(status.received, 2);
  assert.deepEqual(status.missing, ["DE40"]);
  assert.equal(status.complete, false);
});
