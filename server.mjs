import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYMBOL_MAP,
  SUPPORTED_SYMBOLS,
  normalizeCoinGeckoQuotes,
  normalizeSymbols,
  normalizeYahooQuote,
  providerStatus
} from "./server/providers.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const cacheTtlMs = Math.max(5_000, Number(process.env.CHIEF_QUOTE_CACHE_MS || 15_000));
const requestTimeoutMs = Math.max(2_000, Number(process.env.CHIEF_QUOTE_TIMEOUT_MS || 8_000));
const cache = new Map();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "DailyVYBZ-Chief/0.5",
        ...headers
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function yahooQuote(symbol) {
  const providerSymbol = SYMBOL_MAP[symbol]?.yahoo;
  if (!providerSymbol) throw new Error("Kein Yahoo Mapping");
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?interval=1m&range=1d`;
  return normalizeYahooQuote(symbol, await fetchJson(url));
}

async function coinGeckoQuotes(symbols) {
  const mapped = symbols
    .map(symbol => SYMBOL_MAP[symbol]?.coingecko)
    .filter(Boolean);
  if (!mapped.length) return [];
  const headers = process.env.COINGECKO_DEMO_API_KEY
    ? { "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY }
    : {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(mapped.join(","))}&vs_currencies=usd&include_last_updated_at=true`;
  return normalizeCoinGeckoQuotes(await fetchJson(url, headers));
}

function cachedQuote(symbol) {
  const entry = cache.get(symbol);
  if (!entry || Date.now() - entry.cachedAt > cacheTtlMs) return null;
  return entry.quote;
}

function remember(quote) {
  cache.set(quote.symbol, { quote, cachedAt: Date.now() });
  return quote;
}

async function loadQuotes(requestedSymbols) {
  const quotes = [];
  const errors = [];
  const pending = [];

  for (const symbol of requestedSymbols) {
    const cached = cachedQuote(symbol);
    if (cached) quotes.push({ ...cached, cache: "hit" });
    else pending.push(symbol);
  }

  const yahooResults = await Promise.allSettled(pending.map(async symbol => remember(await yahooQuote(symbol))));
  const yahooMissing = [];
  yahooResults.forEach((result, index) => {
    const symbol = pending[index];
    if (result.status === "fulfilled") quotes.push({ ...result.value, cache: "miss" });
    else {
      yahooMissing.push(symbol);
      errors.push({ symbol, provider: "Yahoo Finance", message: result.reason?.message || "Abruf fehlgeschlagen" });
    }
  });

  const cryptoMissing = yahooMissing.filter(symbol => SYMBOL_MAP[symbol]?.coingecko);
  if (cryptoMissing.length) {
    try {
      const fallback = await coinGeckoQuotes(cryptoMissing);
      for (const quote of fallback) {
        remember(quote);
        const existingIndex = quotes.findIndex(item => item.symbol === quote.symbol);
        if (existingIndex >= 0) quotes[existingIndex] = { ...quote, cache: "miss", fallback: true };
        else quotes.push({ ...quote, cache: "miss", fallback: true });
      }
    } catch (error) {
      for (const symbol of cryptoMissing) errors.push({ symbol, provider: "CoinGecko", message: error.message || "Fallback fehlgeschlagen" });
    }
  }

  const latestBySymbol = new Map();
  for (const quote of quotes) latestBySymbol.set(quote.symbol, quote);
  return {
    quotes: requestedSymbols.flatMap(symbol => latestBySymbol.has(symbol) ? [latestBySymbol.get(symbol)] : []),
    errors
  };
}

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const target = resolve(root, `.${decoded}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;
  return target;
}

async function serveStatic(req, res, pathname) {
  const target = safePath(pathname);
  if (!target) return json(res, 403, { error: "Pfad nicht erlaubt" });
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not-file");
    let body = await readFile(target);
    if ((pathname === "/" || pathname === "/index.html") && extname(target) === ".html") {
      const html = body.toString("utf8");
      const liveTag = '<script type="module" src="src/live.js"></script>';
      body = Buffer.from(html.includes(liveTag) ? html : html.replace("</body>", `  ${liveTag}\n</body>`), "utf8");
    }
    res.writeHead(200, {
      "content-type": contentTypes[extname(target)] || "application/octet-stream",
      "cache-control": pathname.startsWith("/src/") ? "no-cache" : "no-store"
    });
    res.end(body);
  } catch {
    json(res, 404, { error: "Datei nicht gefunden" });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);
  if (req.method !== "GET") return json(res, 405, { error: "Nur GET unterstützt" });

  if (url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      version: "0.5.0",
      quoteMode: "reference-only",
      supportedSymbols: SUPPORTED_SYMBOLS,
      cacheTtlMs
    });
  }

  if (url.pathname === "/api/quotes") {
    const symbols = normalizeSymbols(url.searchParams.get("symbols"));
    if (!symbols.length) return json(res, 400, { error: "Keine unterstützten Symbole" });
    const startedAt = Date.now();
    try {
      const result = await loadQuotes(symbols);
      const status = providerStatus(result.quotes, symbols);
      return json(res, status.received ? 200 : 502, {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        quoteMode: "reference-only",
        authoritative: false,
        status,
        quotes: result.quotes,
        errors: result.errors
      });
    } catch (error) {
      return json(res, 502, { error: error.message || "Marktdaten nicht verfügbar" });
    }
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(port, () => {
  console.log(`Chief 0.5 läuft auf http://localhost:${port}`);
  console.log("Live Provider laufen im Referenzmodus. XTB bleibt für exakte CFD Trigger die maßgebliche Kursquelle.");
});
