const TYPES = new Set(["CPI", "FED", "EZB", "ARBEITSMARKT", "OEL", "KRYPTO"]);

export function createCatalyst({ id, type, scheduledAt, sourceUrl, markets, summary = "", risk = "normal" }) {
  const at = new Date(scheduledAt);
  if (!id || !TYPES.has(type) || Number.isNaN(at.getTime())) throw new Error("Ereigniskennung, Typ oder Zeitpunkt ungültig");
  if (!/^https:\/\//.test(sourceUrl || "")) throw new Error("Quellenadresse fehlt");
  if (!Array.isArray(markets) || !markets.length) throw new Error("Marktrelevanz fehlt");
  return { id, type, scheduledAt: at.toISOString(), sourceUrl, markets: [...new Set(markets)], summary,
    risk: risk === "high" ? "high" : "normal", publishedAt: null, observedAt: null };
}

export function publishCatalyst(catalyst, { publishedAt, observedAt, summary, sourceUrl }) {
  const published = new Date(publishedAt);
  const observed = new Date(observedAt);
  if (Number.isNaN(published.getTime()) || Number.isNaN(observed.getTime()) || observed < published)
    throw new Error("Veröffentlichung und Abrufzeit müssen getrennt und gültig sein");
  if (!/^https:\/\//.test(sourceUrl || catalyst.sourceUrl)) throw new Error("Quellenadresse fehlt");
  return { ...catalyst, publishedAt: published.toISOString(), observedAt: observed.toISOString(),
    summary: String(summary || catalyst.summary), sourceUrl: sourceUrl || catalyst.sourceUrl };
}

export function applyCatalystToPlan(plan, catalyst) {
  if (!catalyst.publishedAt || !catalyst.markets.includes(plan.symbol)) return plan;
  // Preserve every technical field. A news event may demand review, never
  // rewrite a level or assert a candle confirmation.
  return { ...plan, reviewStatus: "review_required", reviewEventId: catalyst.id,
    reviewRequestedAt: catalyst.publishedAt };
}

export function journalContextAt({ plan, catalysts, referenceQuote, evaluatedAt }) {
  const evaluated = new Date(evaluatedAt);
  if (Number.isNaN(evaluated.getTime())) throw new Error("Bewertungszeit fehlt");
  return {
    evaluatedAt: evaluated.toISOString(), symbol: plan.symbol, planVersion: plan.planVersion,
    reviewStatus: plan.reviewStatus || "current",
    referenceQuote: referenceQuote ? structuredClone(referenceQuote) : null,
    catalysts: catalysts.filter(item => item.markets.includes(plan.symbol)
      && new Date(item.scheduledAt) <= evaluated).map(item => structuredClone(item))
  };
}
