import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYMBOL_MAP,
  SUPPORTED_SYMBOLS,
  normalizeCoinGeckoQuotes,
  normalizeSymbols,
  normalizeYahooQuote,
} from "./server/providers.mjs";
import { createQuoteService } from "./server/quote-service.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const cacheTtlMs = Math.max(5_000, Number(process.env.CHIEF_QUOTE_CACHE_MS || 15_000));
const requestTimeoutMs = Math.max(2_000, Number(process.env.CHIEF_QUOTE_TIMEOUT_MS || 8_000));
const quoteService = createQuoteService([
  { name: "Yahoo Finance", supports: symbol => Boolean(SYMBOL_MAP[symbol]?.yahoo), fetch: yahooQuote },
  { name: "CoinGecko", supports: symbol => Boolean(SYMBOL_MAP[symbol]?.coingecko),
    fetch: async symbol => (await coinGeckoQuotes([symbol])).find(quote => quote.symbol === symbol) }
], { cacheTtlMs });

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

function safePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname); }
  catch { return null; }
  // Never expose repository metadata, server code, configuration, or secrets.
  if (!/^\/(index\.html|styles\.css|src\/(app|engine|watchlist|live)\.js)$/.test(decoded)) return null;
  return resolve(root, `.${decoded}`);
}

async function serveStatic(req, res, pathname) {
  const target = safePath(pathname);
  if (!target) return json(res, 404, { error: "Datei nicht gefunden" });
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
      const result = await quoteService.load(symbols);
      const status = result.status;
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

server.listen(port, process.env.CHIEF_HOST || "127.0.0.1", () => {
  console.log(`Chief 0.5 läuft auf http://localhost:${server.address().port}`);
  console.log("Live Provider laufen im Referenzmodus. XTB bleibt für exakte CFD Trigger die maßgebliche Kursquelle.");
});
