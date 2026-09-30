const SYMBOLS = new Set(["SILVER", "GOLD", "DE40", "US100", "US500", "OIL", "SOLANA", "BITCOIN", "ETHEREUM", "EURUSD"]);
function numeric(value) {
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(value)) return Number(value.replaceAll(".", "").replace(",", "."));
  if (/^\d+,\d+$/.test(value)) return Number(value.replace(",", "."));
  if (/^\d+\.\d{3}$/.test(value)) return NaN; // 78.950 is ambiguous across locales.
  return /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
}

export function parseXtbQuotes(csv) {
  const rows = String(csv).replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) throw new Error("CSV enthält keine Kurse");
  const delimiter = rows[0].includes(";") ? ";" : ",";
  const headers = rows.shift().split(delimiter).map(value => value.trim().toLowerCase());
  const column = name => headers.indexOf(name.toLowerCase());
  for (const name of ["symbol", "instrument", "bid", "quotedat"]) if (column(name) < 0) throw new Error(`Spalte ${name} fehlt`);
  const seen = new Set();
  return rows.map((row, index) => {
    const values = row.split(delimiter).map(value => value.trim());
    const get = name => values[column(name)] || "";
    const symbol = get("symbol").toUpperCase();
    const instrument = get("instrument");
    const bid = numeric(get("bid"));
    const ask = get("ask") ? numeric(get("ask")) : null;
    const rawTime = get("quotedAt");
    const timestamp = new Date(rawTime);
    if (!SYMBOLS.has(symbol) || seen.has(symbol)) throw new Error(`Zeile ${index + 2}: Symbol unbekannt oder doppelt`);
    if (!instrument || instrument.length > 100) throw new Error(`Zeile ${index + 2}: XTB Instrumentkennung fehlt`);
    if (!Number.isFinite(bid) || bid <= 0 || (ask !== null && (!Number.isFinite(ask) || ask < bid))) throw new Error(`Zeile ${index + 2}: Bid/Ask ungültig`);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?(?:Z|[+-]\d\d:\d\d)$/.test(rawTime) || Number.isNaN(timestamp.getTime()) || timestamp.getTime() - Date.now() > 300_000) {
      throw new Error(`Zeile ${index + 2}: Zeitpunkt mit Zeitzone fehlt oder liegt in der Zukunft`);
    }
    seen.add(symbol);
    return { symbol, instrument, bid, ask, timestamp: timestamp.toISOString() };
  });
}

export function applyXtbQuotes(watchlist, quotes) {
  const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  return watchlist.map(item => {
    const quote = bySymbol.get(item.symbol);
    if (!quote) return item;
    return { ...item, referencePrice: quote.bid, askPrice: quote.ask ?? 0, priceAsOf: quote.timestamp,
      quoteSource: "XTB (manuell importiert)", quoteProviderSymbol: quote.instrument, quoteAuthoritative: false };
  });
}
