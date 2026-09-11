export const WATCHLIST_VERSION = 2;
export const ACTIVE_PLAN_DATE = "2026-09-11";
export const ACTIVE_PLAN_SOURCE = "XTB Screenshots und bestätigter Marktplan vom 11.09.2026";

export const ACTIVE_MARKETS = [
  {
    symbol: "SILVER", name: "Silver CFD", assetClass: "Rohstoff", referencePrice: 64.972,
    marketStatus: "WARTEN", action: "Kein Einstieg am Pivot. Erst bestätigten Ausbruch handeln.",
    long: { timeframe: "H1", trigger: 65.20, entry: 65.22, stop: 64.42, tp1: 66.20, tp2: 67.30, tp3: 67.60, rrToTp2: 2.60,
      confirmation: "H1 Schluss über 65.20", invalidation: "Long Setup unter 64.42 ungültig", scenarioSwitch: "Short Szenario erst nach H1 Schluss unter 63.31" },
    short: { timeframe: "H1", trigger: 63.31, entry: 63.28, stop: 64.08, tp1: 62.98, tp2: 61.90, tp3: 60.835, rrToTp2: 1.73,
      confirmation: "H1 Schluss unter 63.31", invalidation: "Short Setup über 64.08 ungültig", scenarioSwitch: "Long Szenario erst nach H1 Schluss über 65.20" }
  },
  {
    symbol: "GOLD", name: "Gold CFD", assetClass: "Rohstoff", referencePrice: 4391.27,
    marketStatus: "NEUTRAL", action: "Bei 4391.27 kein Einstieg. Auf Bestätigung warten.",
    long: { timeframe: "H1", trigger: 4426, entry: 4427, stop: 4408, tp1: 4450, tp2: 4505, tp3: 4516.6, rrToTp2: 4.11,
      confirmation: "H1 Schluss über 4426", invalidation: "Long Setup unter 4408 ungültig", scenarioSwitch: "Short Szenario erst nach H1 Schluss unter 4374" },
    short: { timeframe: "H1", trigger: 4374, entry: 4372, stop: 4406, tp1: 4354.84, tp2: 4320, tp3: 4250, rrToTp2: 1.53,
      confirmation: "H1 Schluss unter 4374", invalidation: "Short Setup über 4406 ungültig", scenarioSwitch: "Long Szenario erst nach H1 Schluss über 4426" }
  },
  {
    symbol: "DE40", name: "DAX CFD", assetClass: "Index", referencePrice: 25581.3,
    marketStatus: "WARTEN AUF 25605 ODER 25548", action: "Kein Einstieg zwischen den Triggern.",
    long: { timeframe: "H1", trigger: 25605, entry: 25608, stop: 25548, tp1: 25683, tp2: 25773, tp3: 25832, rrToTp2: 2.75,
      confirmation: "H1 Schluss über 25605", invalidation: "Long Setup unter 25548 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 25548" },
    short: { timeframe: "H1", trigger: 25548, entry: 25544, stop: 25608, tp1: 25487, tp2: 25408, tp3: 25309, rrToTp2: 2.12,
      confirmation: "H1 Schluss unter 25548", invalidation: "Short Setup über 25608 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 25605" }
  },
  {
    symbol: "US100", name: "Nasdaq 100 CFD", assetClass: "Index", referencePrice: 29411.33,
    marketStatus: "ENTSCHEIDUNGSZONE", action: "Erst H1 Bestätigung über 29468 oder unter 29395 handeln.",
    long: { timeframe: "H1", trigger: 29468, entry: 29472, stop: 29392, tp1: 29555, tp2: 29685, tp3: 29743, rrToTp2: 2.66,
      confirmation: "H1 Schluss über 29468", invalidation: "Long Setup unter 29392 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 29395" },
    short: { timeframe: "H1", trigger: 29395, entry: 29390, stop: 29482, tp1: 29250, tp2: 29210, tp3: 29148, rrToTp2: 1.96,
      confirmation: "H1 Schluss unter 29395", invalidation: "Short Setup über 29482 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 29468" }
  },
  {
    symbol: "US500", name: "S&P 500 CFD", assetClass: "Index", referencePrice: 7668.7,
    marketStatus: "LEICHT BULLISCH OHNE BESTÄTIGUNG", action: "Warten. Long erst über 7682. Short erst unter 7618.",
    long: { timeframe: "H1", trigger: 7682, entry: 7684, stop: 7648, tp1: 7720, tp2: 7756, tp3: 7771, rrToTp2: 2.00,
      confirmation: "H1 Schluss über 7682", invalidation: "Long Setup unter 7648 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 7618" },
    short: { timeframe: "H1", trigger: 7618, entry: 7616, stop: 7652, tp1: 7577, tp2: 7540, tp3: 7500, rrToTp2: 2.11,
      confirmation: "H1 Schluss unter 7618", invalidation: "Short Setup über 7652 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 7682" }
  },
  {
    symbol: "OIL", name: "Brent Öl CFD", assetClass: "Rohstoff", referencePrice: 104.32,
    marketStatus: "HOHE VOLATILITÄT", action: "Kein Market Kauf und kein aggressiver Short. Trigger abwarten.",
    long: { timeframe: "H1", trigger: 105.65, entry: 105.70, stop: 103.90, tp1: 107.50, tp2: 110.00, tp3: 112.80, rrToTp2: 2.39,
      confirmation: "H1 Schluss über 105.65", invalidation: "Long Setup unter 103.90 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 103.80" },
    short: { timeframe: "H1", trigger: 103.80, entry: 103.75, stop: 105.05, tp1: 101.50, tp2: 100.00, tp3: 95.00, rrToTp2: 2.88,
      confirmation: "H1 Schluss unter 103.80", invalidation: "Short Setup über 105.05 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 105.65" }
  },
  {
    symbol: "SOLANA", name: "Solana CFD", assetClass: "Krypto", referencePrice: 102.87, askPrice: 103.29,
    marketStatus: "NICHT HINTERHERKAUFEN", action: "Kein Kauf bei 103.29 Ask. Long erst über 105.10 oder Nachkauf an den festen Rücksetzern.",
    accumulationLevels: [101.60, 98.30, 94.20], priceAsOf: "2026-09-11T13:50:00.000Z",
    long: { timeframe: "H1", trigger: 105.10, entry: 105.10, stop: 102.85, tp1: 107.37, tp2: 110.04, tp3: 113.80, rrToTp2: 2.20,
      confirmation: "H1 Schluss über 105.10", invalidation: "Long Setup unter 102.85 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 98.15" },
    short: { timeframe: "H1", trigger: 98.15, entry: 98.15, stop: 100.10, tp1: 96.35, tp2: 94.00, tp3: 93.60, rrToTp2: 2.13,
      confirmation: "H1 Schluss unter 98.15", invalidation: "Short Setup über 100.10 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 105.10" }
  },
  {
    symbol: "BITCOIN", name: "Bitcoin CFD", assetClass: "Krypto", referencePrice: 78621.70, askPrice: 78821.0,
    marketStatus: "WARTEN", action: "Kein Market Kauf bei 78621.70. Breakout oder Rücksetzer abwarten.",
    accumulationLevels: [77650, 75250, 72950],
    long: { timeframe: "H1", trigger: 78950, entry: 78950, stop: 78180, tp1: 80000, tp2: 81500, tp3: 82000, rrToTp2: 3.31,
      confirmation: "H1 Schluss über 78950", invalidation: "Long Setup unter 78180 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 76950" },
    short: { timeframe: "H1", trigger: 76950, entry: 76950, stop: 77880, tp1: 76100, tp2: 75000, tp3: 72900, rrToTp2: 2.10,
      confirmation: "H1 Schluss unter 76950", invalidation: "Short Setup über 77880 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 78950" }
  },
  {
    symbol: "ETHEREUM", name: "Ethereum CFD", assetClass: "Krypto", referencePrice: 2592.925,
    marketStatus: "STARK, ABER KEIN DIREKTER NACHKAUF", action: "Long erst über 2605 oder Nachkauf bei 2555, 2475 und 2405.",
    accumulationLevels: [2555, 2475, 2405],
    long: { timeframe: "H1", trigger: 2605, entry: 2605, stop: 2550, tp1: 2705, tp2: 2800, tp3: 3050, rrToTp2: 3.55,
      confirmation: "H1 Schluss über 2605", invalidation: "Long Setup unter 2550 ungültig", scenarioSwitch: "Unter 2475 neue Short Analyse auslösen" },
    short: null,
    missingPlanReason: "Kein bestätigter exakter Short Einstieg im Marktplan vom 11.09.2026."
  },
  {
    symbol: "EURUSD", name: "EUR/USD", assetClass: "Forex", referencePrice: 1.1602,
    marketStatus: "NEUTRAL", action: "Keine Position zwischen 1.1585 und 1.1645.",
    long: { timeframe: "H1", trigger: 1.1645, entry: 1.1647, stop: 1.1618, tp1: 1.1670, tp2: 1.1700, tp3: 1.1725, rrToTp2: 1.83,
      confirmation: "H1 Schluss über 1.1645", invalidation: "Long Setup unter 1.1618 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 1.1585" },
    short: { timeframe: "H1", trigger: 1.1585, entry: 1.1583, stop: 1.1610, tp1: 1.1565, tp2: 1.1550, tp3: 1.1515, rrToTp2: 1.22,
      confirmation: "H1 Schluss unter 1.1585", invalidation: "Short Setup über 1.1610 ungültig", scenarioSwitch: "Long Szenario nach H1 Schluss über 1.1645" }
  }
];

function marketSetup(market, direction, plan, index) {
  if (!plan) return null;
  return normalizeWatchlistItem({
    id: `active-${market.symbol}-${direction}`,
    symbol: market.symbol,
    name: market.name,
    assetClass: market.assetClass,
    direction,
    referencePrice: market.referencePrice,
    askPrice: market.askPrice,
    marketStatus: market.marketStatus,
    action: market.action,
    accumulationLevels: market.accumulationLevels || [],
    missingPlanReason: market.missingPlanReason || "",
    trigger: plan.trigger,
    entry: plan.entry,
    stop: plan.stop,
    tp1: plan.tp1,
    tp2: plan.tp2,
    tp3: plan.tp3,
    rrToTp2: plan.rrToTp2,
    timeframe: plan.timeframe,
    confirmation: plan.confirmation,
    invalidation: plan.invalidation,
    scenarioSwitch: plan.scenarioSwitch,
    source: ACTIVE_PLAN_SOURCE,
    planDate: ACTIVE_PLAN_DATE,
    priceAsOf: market.priceAsOf || "2026-09-11T13:54:00.000Z",
    planStatus: "validated",
    planVersion: WATCHLIST_VERSION
  }, index);
}

export const ACTIVE_WATCHLIST = ACTIVE_MARKETS.flatMap((market, index) => [
  marketSetup(market, "long", market.long, index * 2),
  marketSetup(market, "short", market.short, index * 2 + 1)
].filter(Boolean));

export const SEED_WATCHLIST = ACTIVE_WATCHLIST;

export function watchlistKey(item) {
  return `${String(item.symbol || "").trim().toUpperCase()}|${String(item.direction || "long").trim().toLowerCase()}`;
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
  const numericFields = ["referencePrice", "askPrice", "trigger", "entry", "stop", "tp1", "tp2", "tp3", "rrToTp2"];
  const normalized = {
    id: item.id || `item-${Date.now()}-${index}`,
    symbol: String(item.symbol || "").trim().toUpperCase(),
    name: String(item.name || item.symbol || "").trim(),
    assetClass: String(item.assetClass || "Aktie").trim(),
    direction: String(item.direction || "long").trim().toLowerCase(),
    timeframe: String(item.timeframe || "H1").trim().toUpperCase(),
    source: String(item.source || "Import").trim(),
    planDate: item.planDate || "",
    priceAsOf: item.priceAsOf || "",
    planStatus: item.planStatus === "validated" ? "validated" : "historical",
    planVersion: Number(item.planVersion) || 1,
    confirmation: String(item.confirmation || "").trim(),
    invalidation: String(item.invalidation || "").trim(),
    scenarioSwitch: String(item.scenarioSwitch || "").trim(),
    marketStatus: String(item.marketStatus || "").trim(),
    action: String(item.action || "").trim(),
    missingPlanReason: String(item.missingPlanReason || "").trim(),
    accumulationLevels: Array.isArray(item.accumulationLevels)
      ? item.accumulationLevels.map(parseLocaleNumber).filter(value => Number.isFinite(value) && value > 0)
      : []
  };
  for (const field of numericFields) normalized[field] = parseLocaleNumber(item[field]);
  if (!normalized.trigger) normalized.trigger = normalized.entry;
  return normalized;
}

export function mergeWatchlists(current, incoming) {
  const merged = new Map((current || []).map(item => [watchlistKey(item), normalizeWatchlistItem(item)]));
  (incoming || []).map(normalizeWatchlistItem).filter(item => item.symbol).forEach(item => {
    const key = watchlistKey(item);
    merged.set(key, { ...merged.get(key), ...item, id: merged.get(key)?.id || item.id });
  });
  return [...merged.values()];
}

export function groupWatchlist(items) {
  const groups = new Map();
  (items || []).map(normalizeWatchlistItem).forEach(item => {
    if (!item.symbol) return;
    if (!groups.has(item.symbol)) {
      groups.set(item.symbol, {
        symbol: item.symbol,
        name: item.name,
        assetClass: item.assetClass,
        referencePrice: item.referencePrice,
        askPrice: item.askPrice,
        marketStatus: item.marketStatus,
        action: item.action,
        source: item.source,
        planDate: item.planDate,
        priceAsOf: item.priceAsOf,
        accumulationLevels: [],
        long: null,
        short: null,
        missingPlanReason: item.missingPlanReason
      });
    }
    const group = groups.get(item.symbol);
    group.name = item.name || group.name;
    group.assetClass = item.assetClass || group.assetClass;
    group.referencePrice = item.referencePrice || group.referencePrice;
    group.askPrice = item.askPrice || group.askPrice;
    group.marketStatus = item.marketStatus || group.marketStatus;
    group.action = item.action || group.action;
    group.source = item.source || group.source;
    group.planDate = item.planDate || group.planDate;
    group.priceAsOf = item.priceAsOf || group.priceAsOf;
    group.missingPlanReason = item.missingPlanReason || group.missingPlanReason;
    group.accumulationLevels = [...new Set([...group.accumulationLevels, ...item.accumulationLevels])];
    group[item.direction === "short" ? "short" : "long"] = item;
  });
  return [...groups.values()];
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

function marketsToWatchlist(markets, metadata = {}) {
  return (markets || []).flatMap((market, index) => ["long", "short"].map((direction, sideIndex) => {
    const plan = market[direction];
    if (!plan) return null;
    return normalizeWatchlistItem({
      id: market.id ? `${market.id}-${direction}` : undefined,
      ...market,
      ...plan,
      direction,
      stop: plan.stop ?? plan.stopLoss,
      source: market.source || metadata.source || "Import",
      planDate: market.planDate || metadata.planDate || "",
      priceAsOf: market.priceAsOf || metadata.priceAsOf || "",
      planStatus: market.planStatus || "validated",
      planVersion: metadata.version || market.planVersion || WATCHLIST_VERSION
    }, index * 2 + sideIndex);
  }).filter(Boolean));
}

export function parseWatchlist(content, filename = "") {
  if (filename.toLowerCase().endsWith(".json") || content.trim().startsWith("[") || content.trim().startsWith("{")) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.map(normalizeWatchlistItem).filter(item => item.symbol);
    if (Array.isArray(parsed.watchlist)) return parsed.watchlist.map(normalizeWatchlistItem).filter(item => item.symbol);
    if (Array.isArray(parsed.markets)) return marketsToWatchlist(parsed.markets, parsed);
    throw new Error("JSON muss eine Watchlist oder markets Liste enthalten");
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
  const normalized = normalizeWatchlistItem(item);
  if (normalized.planStatus !== "validated") return { label: "HISTORISCH", tone: "muted", priority: 5 };
  const timestamp = new Date(normalized.priceAsOf);
  const ageHours = Number.isNaN(timestamp.getTime()) ? Infinity : Math.max(0, (now - timestamp) / 3_600_000);
  if (ageHours > 24) return { label: "DATEN ALT", tone: "bad", priority: 4, ageHours };
  if (!normalized.referencePrice || !normalized.trigger) return { label: "KURS FEHLT", tone: "bad", priority: 4, ageHours };
  const distancePercent = Math.abs(normalized.referencePrice - normalized.trigger) / normalized.trigger * 100;
  const triggered = normalized.direction === "short"
    ? normalized.referencePrice <= normalized.trigger
    : normalized.referencePrice >= normalized.trigger;
  if (triggered) return { label: "BESTÄTIGUNG PRÜFEN", tone: "watch", priority: 0, distancePercent, ageHours };
  if (distancePercent <= 0.5) return { label: "TRIGGER SEHR NAH", tone: "good", priority: 1, distancePercent, ageHours };
  if (distancePercent <= 1) return { label: "TRIGGER NAH", tone: "good", priority: 2, distancePercent, ageHours };
  return { label: "BEOBACHTEN", tone: "muted", priority: 3, distancePercent, ageHours };
}

export function getMarketSignal(market, now = new Date()) {
  const setups = [market.long, market.short].filter(Boolean).map(item => ({ item, signal: getWatchlistSignal(item, now) }));
  setups.sort((a, b) => a.signal.priority - b.signal.priority || (a.signal.distancePercent ?? Infinity) - (b.signal.distancePercent ?? Infinity));
  const best = setups[0] || { item: null, signal: { label: "KEIN SETUP", tone: "muted", priority: 5 } };

  const accumulation = (market.accumulationLevels || []).map(level => ({
    level,
    distancePercent: market.referencePrice && level ? Math.abs(market.referencePrice - level) / level * 100 : Infinity,
    reached: market.referencePrice > 0 && market.referencePrice <= level
  })).sort((a, b) => a.distancePercent - b.distancePercent)[0];

  if (accumulation && accumulation.reached && (best.signal.priority > 0 || accumulation.distancePercent < (best.signal.distancePercent ?? Infinity))) {
    return { label: "NACHKAUF PRÜFEN", tone: "watch", priority: 0, distancePercent: accumulation.distancePercent, focusType: "accumulation", level: accumulation.level, focusItem: market.long || market.short };
  }
  if (accumulation && accumulation.distancePercent <= 1 && best.signal.priority > 1) {
    return { label: "NACHKAUF NAH", tone: "good", priority: 1, distancePercent: accumulation.distancePercent, focusType: "accumulation", level: accumulation.level, focusItem: market.long || market.short };
  }
  return { ...best.signal, focusType: best.item?.direction || "none", level: best.item?.trigger, focusItem: best.item };
}

export function exportWatchlist(items) {
  return JSON.stringify({
    version: WATCHLIST_VERSION,
    exportedAt: new Date().toISOString(),
    watchlist: (items || []).map(normalizeWatchlistItem)
  }, null, 2);
}
