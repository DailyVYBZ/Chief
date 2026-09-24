const GROUPS = Object.freeze({
  BITCOIN: "Krypto", ETHEREUM: "Krypto", SOLANA: "Krypto",
  US100: "US Indizes", US500: "US Indizes", DE40: "DE40",
  GOLD: "Edelmetalle", SILVER: "Edelmetalle", OIL: "Öl", EURUSD: "Forex"
});

function positive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${name} muss positiv sein`);
  return number;
}

function nonnegative(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${name} darf nicht negativ sein`);
  return number;
}

// Explicit multiplier and FX rate avoid silently treating CFD points or USD
// cash flows as EUR. The original setup and rule version stay as a snapshot.
export function openPosition({ setup, units, actualEntry, multiplier, fxEurPerCurrency, entryFeeEur = 0, openedAt }) {
  if (!GROUPS[setup?.symbol]) throw new Error("Unbekanntes Instrument");
  const entry = positive(actualEntry, "Einstieg");
  const stop = positive(setup.stop, "Stop");
  const direction = setup.direction;
  if (direction !== "long" && direction !== "short") throw new Error("Richtung fehlt");
  if (direction === "long" ? stop >= entry : stop <= entry) throw new Error("Stop liegt auf der falschen Seite");
  const timestamp = new Date(openedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Einstiegszeit fehlt");
  return {
    id: crypto.randomUUID(), setupSnapshot: structuredClone(setup), ruleVersion: setup.ruleVersion || setup.planVersion || null,
    symbol: setup.symbol, direction, group: GROUPS[setup.symbol], units: positive(units, "Stückzahl"),
    entry, stop, multiplier: positive(multiplier, "Kontraktfaktor"),
    fxEurPerCurrency: positive(fxEurPerCurrency, "EUR Umrechnung"),
    entryFeeEur: nonnegative(entryFeeEur, "Einstiegsgebühr"), openedAt: timestamp.toISOString(),
    exits: [], ruleDeviation: null, review: ""
  };
}

export function positionResult(position) {
  const closedUnits = position.exits.reduce((sum, exit) => sum + exit.units, 0);
  const remainingUnits = Math.max(0, position.units - closedUnits);
  const sign = position.direction === "long" ? 1 : -1;
  const grossEur = position.exits.reduce((sum, exit) => sum + sign * (exit.price - position.entry)
    * exit.units * position.multiplier * exit.fxEurPerCurrency, 0);
  const allocatedEntryFees = position.entryFeeEur * closedUnits / position.units;
  const exitFees = position.exits.reduce((sum, exit) => sum + exit.feeEur, 0);
  const realizedEur = grossEur - allocatedEntryFees - exitFees;
  const initialRiskPerUnitEur = Math.abs(position.entry - position.stop) * position.multiplier * position.fxEurPerCurrency;
  const closedRiskEur = initialRiskPerUnitEur * closedUnits;
  const openRiskEur = initialRiskPerUnitEur * remainingUnits;
  const closedNotionalEur = position.entry * closedUnits * position.multiplier * position.fxEurPerCurrency;
  return {
    status: remainingUnits === 0 ? "closed" : "open", remainingUnits, closedUnits,
    realizedEur, realizedPercent: closedNotionalEur ? realizedEur / closedNotionalEur * 100 : null,
    realizedR: closedRiskEur ? realizedEur / closedRiskEur : null, openRiskEur
  };
}

export function recordExit(position, { units, price, fxEurPerCurrency, feeEur = 0, closedAt, target = null }) {
  const quantity = positive(units, "Ausstiegsmenge");
  if (quantity > positionResult(position).remainingUnits + 1e-9) throw new Error("Ausstieg übersteigt offene Menge");
  const time = new Date(closedAt);
  if (Number.isNaN(time.getTime()) || time.getTime() < new Date(position.openedAt).getTime()) throw new Error("Ausstiegszeit ungültig");
  return {
    ...position,
    exits: [...position.exits, { units: quantity, price: positive(price, "Ausstieg"),
      fxEurPerCurrency: positive(fxEurPerCurrency, "Ausstiegsumrechnung"),
      feeEur: nonnegative(feeEur, "Ausstiegsgebühr"), closedAt: time.toISOString(), target }]
  };
}

export function portfolioRisk(positions, { portfolioEur, maxRiskPercent, proposed = null }) {
  const portfolio = positive(portfolioEur, "Portfolio");
  const limit = nonnegative(maxRiskPercent, "Risikolimit") / 100 * portfolio;
  const open = positions.filter(position => positionResult(position).remainingUnits > 0);
  const totalRiskEur = open.reduce((sum, position) => sum + positionResult(position).openRiskEur, 0);
  const byGroup = Object.fromEntries([...new Set(open.map(position => position.group))].map(group => [group,
    open.filter(position => position.group === group).reduce((sum, position) => sum + positionResult(position).openRiskEur, 0)]));
  const proposedRiskEur = proposed ? positionResult(proposed).openRiskEur : 0;
  return {
    totalRiskEur, totalRiskPercent: totalRiskEur / portfolio * 100,
    byGroup, concentrationGroups: Object.keys(byGroup).filter(group => open.filter(p => p.group === group).length > 1),
    availableRiskEur: Math.max(0, limit - totalRiskEur),
    proposedRiskEur, projectedRiskEur: totalRiskEur + proposedRiskEur,
    exceedsLimit: totalRiskEur + proposedRiskEur > limit
  };
}
