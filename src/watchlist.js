export const WATCHLIST_VERSION = 1;

export const SEED_WATCHLIST = [
  { symbol: "GOLD", name: "Gold CFD", assetClass: "Rohstoff", direction: "short", referencePrice: 4406.14, entry: 4360, stop: 4390, tp1: 4325, tp2: 4285, tp3: 4235 },
  { symbol: "DE40", name: "DAX CFD", assetClass: "Index", direction: "short", referencePrice: 26038.8, entry: 25945, stop: 26020, tp1: 25790, tp2: 25730, tp3: 25550 },
  { symbol: "US100", name: "Nasdaq 100 CFD", assetClass: "Index", direction: "short", referencePrice: 29578.18, entry: 29425, stop: 29550, tp1: 29305, tp2: 29170, tp3: 28970 },
  { symbol: "US500", name: "S&P 500 CFD", assetClass: "Index", direction: "short", referencePrice: 7714, entry: 7680, stop: 7710, tp1: 7655, tp2: 7635, tp3: 7615 },
  { symbol: "OIL", name: "Brent Öl CFD", assetClass: "Rohstoff", direction: "short", referencePrice: 96.88, entry: 93, stop: 94.1, tp1: 91.55, tp2: 90.75, tp3: 89.15 },
  { symbol: "SOLANA", name: "Solana CFD", assetClass: "Krypto", direction: "short", referencePrice: 105.21, entry: 101.4, stop: 103.3, tp1: 99.4, tp2: 97.5, tp3: 95.3 },
  { symbol: "BITCOIN", name: "Bitcoin CFD", assetClass: "Krypto", direction: "short", referencePrice: 79697, entry: 78650, stop: 79250, tp1: 77780, tp2: 77000, tp3: 76300 },
  { symbol: "ETHEREUM", name: "Ethereum CFD", assetClass: "Krypto", direction: "short", referencePrice: 2505.855, entry: 2430, stop: 2460, tp1: 2390, tp2: 2360, tp3: 2330 }
].map((item, index) => ({
  ...item,
  id: `seed-${index + 1}`,
  source: "Swing Trading Marktplan",
  planDate: "2026-09-07",
  priceAsOf: "2026-09-10T00:00:00.000Z",
  planStatus: "historical",
  confirmation: "H4 Schluss unter Einstieg, dann H1 Rücktest mit Schluss darunter"
}));

export function watchlistKey(item) {
  return `${String(item.symbol || "").trim().toUpperCase()}|${item.direction || "long"}`;
}

export function parseLocaleNumber(value) {
  if (typeof value === "number") return value;
  const clean = String(value ?? "").trim().replace(/\s/g, "");
  if (!clean) return 0;
  const germanThousands = !clean.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(clean);
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : germanThousands ? clean.replace(/\./g, "") : clean;
  return Number.parseFloat(normalized) || 0;
}

export function normalizeWatchlistItem(item, index = 0) {
  const numericFields = ["referencePrice", "entry", "stop", "tp1", "tp2", "tp3"];
  const normalized = {
    id: item.id || `item-${Date.now()}-${index}`,
    symbol: String(item.symbol || "").trim().toUpperCase(),
    name: String(item.name || item.symbol || "").trim(),
    assetClass: String(item.assetClass || "Aktie").trim(),
    direction: String(item.direction || "long").trim().toLowerCase(),
    source: String(item.source || "Import").trim(),
    planDate: item.planDate || "",
    priceAsOf: item.priceAsOf || "",
    planStatus: item.planStatus === "validated" ? "validated" : "historical",
    confirmation: String(item.confirmation || "").trim()
  };
  for (const field of numericFields) normalized[field] = parseLocaleNumber(item[field]);
  return normalized;
}

export function mergeWatchlists(current, incoming) {
  const merged = new Map(current.map(item => [watchlistKey(item), item]));
  incoming.map(normalizeWatchlistItem).filter(item => item.symbol).forEach(item => {
    const key = watchlistKey(item);
    merged.set(key, { ...merged.get(key), ...item, id: merged.get(key)?.id || item.id });
  });
  return [...merged.values()];
}

function splitRow(row, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  values.push(current.trim());
  return values.map(value => value.replace(/^"|"$/g, ""));
}

export function parseWatchlist(content, filename = "") {
  if (filename.toLowerCase().endsWith(".json") || content.trim().startsWith("[")) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error("JSON muss eine Liste enthalten");
    return parsed.map(normalizeWatchlistItem).filter(item => item.symbol);
  }

  const rows = content.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) throw new Error("CSV enthält keine Datenzeilen");
  const delimiter = rows[0].includes(";") ? ";" : ",";
  const headers = splitRow(rows[0], delimiter);
  return rows.slice(1).map((row, index) => {
    const values = splitRow(row, delimiter);
    return normalizeWatchlistItem(Object.fromEntries(headers.map((header, column) => [header.trim(), values[column] ?? ""])), index);
  }).filter(item => item.symbol);
}

export function getWatchlistSignal(item, now = new Date()) {
  if (item.planStatus !== "validated") return { label: "HISTORISCH", tone: "muted", priority: 4 };
  const timestamp = new Date(item.priceAsOf);
  const ageHours = Number.isNaN(timestamp.getTime()) ? Infinity : Math.max(0, (now - timestamp) / 3_600_000);
  if (ageHours > 24) return { label: "DATEN ALT", tone: "bad", priority: 3 };
  if (!item.referencePrice || !item.entry) return { label: "KURS FEHLT", tone: "bad", priority: 3 };
  const distancePercent = Math.abs(item.referencePrice - item.entry) / item.entry * 100;
  const triggered = item.direction === "short" ? item.referencePrice <= item.entry : item.referencePrice >= item.entry;
  if (triggered) return { label: "BESTÄTIGUNG PRÜFEN", tone: "watch", priority: 1, distancePercent };
  if (distancePercent <= 1) return { label: "TRIGGER NAH", tone: "good", priority: 0, distancePercent };
  return { label: "BEOBACHTEN", tone: "muted", priority: 2, distancePercent };
}

export function exportWatchlist(items) {
  return JSON.stringify(items, null, 2);
}
