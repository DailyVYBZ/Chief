const CRYPTO = new Set(["BITCOIN", "ETHEREUM", "SOLANA"]);

export function buildAlertDefinitions(items) {
  const definitions = [];
  const accumulationSeen = new Set();
  for (const item of items || []) {
    if (item.planStatus !== "validated" || !Number.isFinite(Number(item.trigger)) || Number(item.trigger) <= 0) continue;
    const direction = item.direction === "short" ? "short" : "long";
    definitions.push({
      id: `${item.symbol}:trigger:${direction}:${item.planVersion || "v1"}:${item.trigger}`,
      symbol: item.symbol, type: `${direction}-trigger`, direction,
      level: Number(item.trigger), timeframe: item.timeframe === "H4" ? "H4" : "H1",
      planId: item.id, planVersion: item.planVersion || "v1"
    });
    if (!CRYPTO.has(item.symbol)) continue;
    for (const level of item.accumulationLevels || []) {
      if (!Number.isFinite(Number(level)) || Number(level) <= 0) continue;
      const id = `${item.symbol}:accumulation:${item.planVersion || "v1"}:${Number(level)}`;
      if (accumulationSeen.has(id)) continue;
      accumulationSeen.add(id);
      definitions.push({ id, symbol: item.symbol, type: "accumulation", direction: "long", level: Number(level),
        timeframe: null, planId: item.id, planVersion: item.planVersion || "v1" });
    }
  }
  return definitions;
}

export function freshAlertPrice(quote, now = new Date()) {
  const time = new Date(quote?.timestamp).getTime();
  const age = now.getTime() - time;
  return Number.isFinite(time) && age >= -300_000 && age <= 86_400_000
    && Number.isFinite(Number(quote?.price)) && Number(quote.price) > 0;
}

export function advanceAlert(state, definition, quote, now = new Date()) {
  if (!freshAlertPrice(quote, now) || state?.status === "confirmed") return { state, event: null };
  const reached = definition.type === "accumulation" || definition.direction === "short"
    ? Number(quote.price) <= definition.level : Number(quote.price) >= definition.level;
  if (!reached || state?.status === "reached") return { state, event: null };
  const event = { id: crypto.randomUUID(), alertId: definition.id, type: "level-reached", at: now.toISOString(),
    quoteTimestamp: quote.timestamp, price: Number(quote.price), source: quote.source || "Manuell",
    journalEntryId: null };
  return { state: { status: "reached", reachedAt: event.at, lastPrice: event.price, lastSource: event.source }, event };
}

export function confirmAlert(state, definition, { timeframe, closePrice, closedAt }, now = new Date()) {
  if (definition.type === "accumulation") throw new Error("Nachkauflevel benötigen eine getrennte manuelle Entscheidung");
  if (state?.status !== "reached") throw new Error("Level wurde noch nicht erreicht");
  if (timeframe !== definition.timeframe) throw new Error(`Bestätigung benötigt ${definition.timeframe} Schluss`);
  const time = new Date(closedAt).getTime();
  if (!Number.isFinite(time) || time < new Date(state.reachedAt).getTime() || time > now.getTime() + 300_000 || now.getTime() - time > 86_400_000)
    throw new Error("Kerzenschluss liegt außerhalb des Prüfzeitraums");
  const price = Number(closePrice);
  if (!Number.isFinite(price) || price <= 0 || (definition.direction === "short" ? price >= definition.level : price <= definition.level))
    throw new Error("Kerzenschluss bestätigt den Trigger nicht");
  const event = { id: crypto.randomUUID(), alertId: definition.id, type: "candle-confirmed", at: now.toISOString(),
    candleClosedAt: new Date(time).toISOString(), timeframe, price, source: "Manuell bestätigt", journalEntryId: null };
  return { state: { ...state, status: "confirmed", confirmedAt: event.at, closePrice: price }, event };
}
