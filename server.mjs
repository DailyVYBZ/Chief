import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
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
import { createWorkspaceStore } from "./server/workspace-store.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const cacheTtlMs = Math.max(5_000, Number(process.env.CHIEF_QUOTE_CACHE_MS || 15_000));
const requestTimeoutMs = Math.max(2_000, Number(process.env.CHIEF_QUOTE_TIMEOUT_MS || 8_000));
const host = process.env.CHIEF_HOST || "127.0.0.1";
const remoteHost = !["127.0.0.1", "localhost", "::1"].includes(host);
const syncToken = process.env.CHIEF_SYNC_TOKEN || "";
if (remoteHost && (!syncToken || !process.env.CHIEF_TLS_KEY_PATH || !process.env.CHIEF_TLS_CERT_PATH)) {
  throw new Error("Netzwerkzugriff erfordert CHIEF_SYNC_TOKEN und ein vertrauenswürdiges TLS Zertifikat");
}
const workspaceStore = createWorkspaceStore(resolve(process.env.CHIEF_WORKSPACE_PATH || resolve(root, ".chief-data/workspace.json")));
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
  if (!/^\/(index\.html|styles\.css|src\/(app|engine|watchlist|live|alerts|alerts-ui|positions-ui|portfolio|macro|macro-ui|workspace|sync-ui|xtb-import|xtb-import-ui)\.js)$/.test(decoded)) return null;
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
      const alertsTag = '<script type="module" src="src/alerts-ui.js"></script>';
      const syncTag = '<script type="module" src="src/sync-ui.js"></script>';
      const xtbTag = '<script type="module" src="src/xtb-import-ui.js"></script>';
      body = Buffer.from(html.includes(liveTag) ? html : html.replace("</body>", `  ${liveTag}\n  ${alertsTag}\n  ${syncTag}\n  ${xtbTag}\n</body>`), "utf8");
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

async function readRequestJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error("Workspace Daten zu groß");
  }
  return JSON.parse(body);
}

const handler = async (req, res) => {
  if (!remoteHost && !/^(?:localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(req.headers.host || "")) {
    return json(res, 403, { error: "Unzulässiger Host" });
  }
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);
  if (url.pathname === "/api/workspace") {
    // A portable file has an opaque Origin. Permit it only when this server has
    // a token, and still require that token on every data request.
    const portableOrigin = req.headers.origin === "null" && Boolean(syncToken);
    if (portableOrigin) {
      res.setHeader("access-control-allow-origin", "null");
      res.setHeader("vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      if (!portableOrigin) return json(res, 403, { error: "Dateiabgleich erfordert Zugriffscode" });
      res.writeHead(204, {
        "access-control-allow-methods": "GET, PUT, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-max-age": "600"
      });
      return res.end();
    }
    if (syncToken && req.headers.authorization !== `Bearer ${syncToken}`) return json(res, 401, { error: "Zugriffscode fehlt oder ist ungültig" });
    if (req.headers.origin === "null" && !portableOrigin) return json(res, 403, { error: "Dateiabgleich erfordert Zugriffscode" });
    if (req.method === "GET") {
      try { return json(res, 200, await workspaceStore.read()); }
      catch { return json(res, 500, { error: "Workspace Speicher nicht lesbar" }); }
    }
    if (req.method !== "PUT") return json(res, 405, { error: "Nur GET und PUT unterstützt" });
    if (!(portableOrigin || req.headers.origin === `${remoteHost ? "https" : "http"}://${req.headers.host}`) || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) {
      return json(res, 403, { error: "Gleicher Ursprung und JSON erforderlich" });
    }
    try {
      const input = await readRequestJson(req);
      const result = await workspaceStore.save(input.baseRevision, input.data);
      return json(res, result.conflict ? 409 : 200, result.current);
    } catch (error) { return json(res, 400, { error: error.message || "Workspace Daten ungültig" }); }
  }
  if (req.method !== "GET") return json(res, 405, { error: "Nur GET unterstützt" });

  if (url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      version: "0.6.0",
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
};

const server = remoteHost ? createHttpsServer({
  key: await readFile(process.env.CHIEF_TLS_KEY_PATH), cert: await readFile(process.env.CHIEF_TLS_CERT_PATH)
}, handler) : createServer(handler);

server.listen(port, host, () => {
  console.log(`Chief 0.6 läuft auf ${remoteHost ? "https" : "http"}://${remoteHost ? host : "localhost"}:${server.address().port}`);
  console.log("Live Provider laufen im Referenzmodus. XTB bleibt für exakte CFD Trigger die maßgebliche Kursquelle.");
});
