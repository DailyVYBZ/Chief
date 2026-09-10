export const RULES_VERSION = "chief-mvp-1.0";

const number = (value) => Number.parseFloat(value) || 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function hoursSince(value, now = new Date()) {
  if (!value) return Infinity;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return Infinity;
  return Math.max(0, (now.getTime() - timestamp.getTime()) / 3_600_000);
}

export function calculatePosition(input) {
  const portfolio = number(input.portfolio);
  const riskPercent = number(input.riskPercent);
  const entry = number(input.entry);
  const stop = number(input.stop);
  const riskBudget = portfolio * riskPercent / 100;
  const riskPerUnit = Math.abs(entry - stop);
  const riskUnits = riskPerUnit > 0 ? Math.floor(riskBudget / riskPerUnit) : 0;
  const allocationCap = portfolio * 0.2;
  const allocationUnits = entry > 0 ? Math.floor(allocationCap / entry) : 0;
  const units = Math.max(0, Math.min(riskUnits, allocationUnits));

  return {
    riskBudget,
    riskPerUnit,
    riskUnits,
    allocationCap,
    allocationUnits,
    units,
    positionValue: units * entry,
    actualRisk: units * riskPerUnit
  };
}

export function calculateRewardRisk(input) {
  const entry = number(input.entry);
  const stop = number(input.stop);
  const direction = input.direction || "long";
  const risk = Math.abs(entry - stop);
  const reward = direction === "short"
    ? entry - number(input.tp2)
    : number(input.tp2) - entry;
  return risk > 0 ? reward / risk : 0;
}

export function evaluateSetup(input, now = new Date()) {
  const entry = number(input.entry);
  const stop = number(input.stop);
  const direction = input.direction || "long";
  const rr = calculateRewardRisk(input);
  const tp1 = number(input.tp1);
  const tp2 = number(input.tp2);
  const tp3 = number(input.tp3);
  const ageHours = hoursSince(input.dataTimestamp, now);
  const blockers = [];

  if (!input.symbol?.trim()) blockers.push("Symbol fehlt");
  if (!input.dataSource?.trim()) blockers.push("Datenquelle fehlt");
  if (!input.dataTimestamp) blockers.push("Datenstand fehlt");
  if (entry <= 0 || stop <= 0) blockers.push("Einstieg oder Stop ist ungültig");
  if (direction === "long" && stop >= entry) blockers.push("Long Stop muss unter dem Einstieg liegen");
  if (direction === "short" && stop <= entry) blockers.push("Short Stop muss über dem Einstieg liegen");
  if (direction === "long" && !(entry < tp1 && tp1 < tp2 && tp2 < tp3)) blockers.push("Long Ziele müssen aufsteigend über dem Einstieg liegen");
  if (direction === "short" && !(entry > tp1 && tp1 > tp2 && tp2 > tp3)) blockers.push("Short Ziele müssen absteigend unter dem Einstieg liegen");
  if (rr < 1.5) blockers.push("CRV zu TP2 liegt unter 1,50");
  if (!input.invalidation?.trim()) blockers.push("Invalidierung fehlt");
  if (number(input.portfolio) <= 0 || number(input.riskPercent) <= 0) blockers.push("Portfolio oder Risiko ist ungültig");

  const components = [
    { label: "H4 Trend", points: clamp(number(input.h4Trend), 0, 2) * 10, max: 20 },
    { label: "H1 Bestätigung", points: clamp(number(input.h1Confirmation), 0, 2) * 10, max: 20 },
    { label: "Marktstruktur", points: clamp(number(input.structure), 0, 2) * 7.5, max: 15 },
    { label: "Katalysator", points: clamp(number(input.catalyst), 0, 2) * 5, max: 10 },
    { label: "Fundamentaldaten", points: clamp(number(input.fundamentals), 0, 2) * 5, max: 10 },
    { label: "Liquidität", points: clamp(number(input.liquidity), 0, 2) * 5, max: 10 },
    { label: "CRV zu TP2", points: clamp((rr - 1) / 2, 0, 1) * 15, max: 15 }
  ];
  const rawScore = components.reduce((sum, part) => sum + part.points, 0);
  const freshnessPenalty = ageHours === Infinity ? 10 : ageHours > 24 ? 5 : 0;
  const score = Math.round(clamp(rawScore - freshnessPenalty, 0, 100));

  let decision = score >= 75 ? "KANDIDAT" : score >= 60 ? "BEOBACHTEN" : "ABLEHNEN";
  if (blockers.length) decision = "UNVOLLSTÄNDIG";

  return {
    rulesVersion: RULES_VERSION,
    evaluatedAt: now.toISOString(),
    score,
    decision,
    rr,
    ageHours,
    freshnessPenalty,
    blockers,
    components,
    position: calculatePosition(input)
  };
}
