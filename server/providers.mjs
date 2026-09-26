export const SYMBOL_MAP = Object.freeze({
  SILVER: { yahoo: "SI=F", assetClass: "Rohstoff" },
  GOLD: { yahoo: "GC=F", assetClass: "Rohstoff" },
  DE40: { yahoo: "^GDAXI", assetClass: "Index" },
  US100: { yahoo: "^NDX", assetClass: "Index" },
  US500: { yahoo: "^GSPC", assetClass: "Index" },
  OIL: { yahoo: "BZ=F", assetClass: "Rohstoff" },
  SOLANA: { yahoo: "SOL-USD", coingecko: "solana", assetClass: "Krypto" },
  BITCOIN: { yahoo: "BTC-USD", coingecko: "bitcoin", assetClass: "Krypto" },
  ETHEREUM: { yahoo: "ETH-USD", coingecko: "ethereum", assetClass: "Krypto" },
  EURUSD: { yahoo: "EURUSD=X", assetClass: "Forex" }
});

export const SUPPORTED_SYMBOLS = Object.freeze(Object.keys(SYMBOL_MAP));

export function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeSymbols(value) {
  const requested = String(value || "")
    .split(",")
    .map(item => item.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(requested.length ? requested : SUPPORTED_SYMBOLS)];
  return unique.filter(symbol => SYMBOL_MAP[symbol]);
}

function lastFinite(values = []) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = finiteNumber(values[index]);
    if (value !== null) return value;
  }
  return null;
}

export function normalizeYahooQuote(chiefSymbol, payload, now = new Date()) {
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error(payload?.chart?.error?.description || "Yahoo liefert keinen Kurs");

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const marketPrice = finiteNumber(meta.regularMarketPrice);
  const price = marketPrice || lastFinite(quote.close);
  if (!price) throw new Error("Yahoo Kurs fehlt");

  const marketTime = Number(meta.regularMarketTime);
  const lastTimestamp = Number(result.timestamp?.at?.(-1));
  const timestampSeconds = marketPrice && Number.isFinite(marketTime) && marketTime > 0
    ? marketTime
    : Number.isFinite(lastTimestamp) && lastTimestamp > 0 ? lastTimestamp : null;
  if (!timestampSeconds) throw new Error("Yahoo Datenzeitpunkt fehlt");

  return {
    symbol: chiefSymbol,
    providerSymbol: SYMBOL_MAP[chiefSymbol]?.yahoo || chiefSymbol,
    price,
    ask: finiteNumber(meta.ask),
    bid: finiteNumber(meta.bid),
    currency: meta.currency || "USD",
    timestamp: new Date(timestampSeconds * 1000).toISOString(),
    source: "Yahoo Finance",
    authoritative: false,
    referenceOnly: true
  };
}

export function normalizeCoinGeckoQuotes(payload) {
  const byCoinId = Object.fromEntries(
    Object.entries(SYMBOL_MAP)
      .filter(([, config]) => config.coingecko)
      .map(([symbol, config]) => [config.coingecko, symbol])
  );

  return Object.entries(payload || {}).flatMap(([coinId, data]) => {
    const symbol = byCoinId[coinId];
    const price = finiteNumber(data?.usd);
    if (!symbol || !price) return [];
    const updated = Number(data?.last_updated_at);
    if (!Number.isFinite(updated) || updated <= 0) return [];
    return [{
      symbol,
      providerSymbol: coinId,
      price,
      ask: null,
      bid: null,
      currency: "USD",
      timestamp: new Date(updated * 1000).toISOString(),
      source: "CoinGecko",
      authoritative: false,
      referenceOnly: true
    }];
  });
}

export function quoteAgeSeconds(quote, now = new Date()) {
  const timestamp = new Date(quote?.timestamp);
  if (Number.isNaN(timestamp.getTime())) return Infinity;
  return (now.getTime() - timestamp.getTime()) / 1000;
}

export function isFreshQuote(quote, now = new Date()) {
  const age = quoteAgeSeconds(quote, now);
  return Boolean(SYMBOL_MAP[quote?.symbol]) && finiteNumber(quote?.price) !== null
    && Number.isFinite(age) && age >= -300 && age <= 86_400;
}

export function providerStatus(quotes, requestedSymbols) {
  const quoteSymbols = new Set((quotes || []).map(quote => quote.symbol));
  const missing = (requestedSymbols || []).filter(symbol => !quoteSymbols.has(symbol));
  return {
    requested: requestedSymbols?.length || 0,
    received: quoteSymbols.size,
    missing,
    complete: missing.length === 0
  };
}
