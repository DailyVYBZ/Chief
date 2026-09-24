import { evaluateSetup } from "./engine.js";
import {
  ACTIVE_WATCHLIST,
  WATCHLIST_VERSION,
  exportWatchlist,
  getMarketSignal,
  getWatchlistSignal,
  groupWatchlist,
  mergeWatchlists,
  parseWatchlist
} from "./watchlist.js";

const form = document.querySelector("#setup-form");
const resultPanel = document.querySelector("#result-panel");
const journalBody = document.querySelector("#journal-body");
const watchlistBody = document.querySelector("#watchlist-body");
const STORAGE_KEY = "chief-journal-v1";
const WATCHLIST_KEY = `chief-watchlist-v${WATCHLIST_VERSION}`;
const LEGACY_WATCHLIST_KEY = "chief-watchlist-v1";
const viewTitles = { dashboard: "Dashboard", watchlist: "Watchlist", setup: "Setup Analyse", journal: "Decision Journal" };
const euros = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 });
const compactNumber = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const createId = () => globalThis.crypto?.randomUUID?.() || `chief-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchView(name) {
  document.querySelectorAll("[data-view-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === name));
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
  document.querySelector("#view-title").textContent = viewTitles[name];
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${name}`);
}

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelectorAll("[data-open-setup]").forEach(button => button.addEventListener("click", () => switchView("setup")));
document.querySelectorAll("[data-open-watchlist]").forEach(button => button.addEventListener("click", () => switchView("watchlist")));
document.querySelectorAll("[data-open-journal]").forEach(button => button.addEventListener("click", () => switchView("journal")));

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function badgeClass(decision) {
  return ({ KANDIDAT: "good", BEOBACHTEN: "watch", ABLEHNEN: "bad", UNVOLLSTÄNDIG: "muted" })[decision] || "muted";
}

function renderResult(input, evaluation) {
  const { position } = evaluation;
  resultPanel.innerHTML = `
    <div class="result-head">
      <div><span class="eyebrow">Entscheidung</span><h2>${escapeHtml(input.symbol || "Setup")}</h2><span class="badge ${badgeClass(evaluation.decision)}">${evaluation.decision}</span></div>
      <div class="score"><strong>${evaluation.score}</strong><span>/ 100</span></div>
    </div>
    ${evaluation.blockers.length ? `<div class="blockers"><strong>Vor der Entscheidung klären</strong><ul>${evaluation.blockers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
    <div class="trade-plan six-plan">
      <div><span>Trigger</span><strong>${number.format(input.trigger || input.entry)}</strong></div>
      <div><span>Einstieg</span><strong>${number.format(input.entry)}</strong></div>
      <div><span>Stop</span><strong>${number.format(input.stop)}</strong></div>
      <div><span>TP1</span><strong>${number.format(input.tp1)}</strong></div>
      <div><span>TP2</span><strong>${number.format(input.tp2)}</strong></div>
      <div><span>TP3</span><strong>${number.format(input.tp3)}</strong></div>
    </div>
    <div class="result-metrics">
      <div><span>CRV zu TP2</span><strong>${compactNumber.format(evaluation.rr)}</strong></div>
      <div><span>Risikobudget</span><strong>${euros.format(position.riskBudget)}</strong></div>
      <div><span>Stückzahl</span><strong>${compactNumber.format(position.units)}</strong></div>
      <div><span>Positionswert</span><strong>${euros.format(position.positionValue)}</strong></div>
    </div>
    <div class="score-list">
      ${evaluation.components.map(part => `<div><span>${part.label}</span><progress max="${part.max}" value="${part.points}"></progress><strong>${compactNumber.format(part.points)}</strong></div>`).join("")}
    </div>
    <div class="decision-note">
      <p><strong>Marktstatus</strong>${escapeHtml(input.marketStatus || "Nicht erfasst")}</p>
      <p><strong>Aktion</strong>${escapeHtml(input.action || "Nicht erfasst")}</p>
      <p><strong>Bestätigung</strong>${escapeHtml(input.confirmationRule || "Nicht erfasst")}</p>
      <p><strong>These</strong>${escapeHtml(input.rationale || "Keine These erfasst")}</p>
      <p><strong>Invalidierung</strong>${escapeHtml(input.invalidation || "Nicht erfasst")}</p>
      <p><strong>Szenariowechsel</strong>${escapeHtml(input.scenarioSwitch || "Nicht erfasst")}</p>
      <p><strong>Daten</strong>${escapeHtml(input.dataSource || "Quelle fehlt")} · ${input.dataTimestamp ? new Date(input.dataTimestamp).toLocaleString("de-DE") : "Stand fehlt"}</p>
    </div>
    <div class="result-actions">
      <button type="button" class="primary" id="save-entry">Im Journal speichern</button>
      <button type="button" class="secondary" id="watchlist-entry">In Watchlist übernehmen</button>
    </div>`;
  document.querySelector("#save-entry").addEventListener("click", () => saveEntry(input, evaluation));
  document.querySelector("#watchlist-entry").addEventListener("click", () => saveSetupToWatchlist(input, evaluation));
}

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveEntry(input, evaluation) {
  const entries = loadJournal();
  entries.unshift({ id: createId(), input, evaluation, status: "offen" });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  renderJournal();
  renderDashboard();
  document.querySelector("#save-entry").disabled = true;
  document.querySelector("#save-entry").textContent = "Gespeichert";
  showToast("Entscheidung im Journal gespeichert");
}

function renderJournal() {
  const entries = loadJournal();
  document.querySelector("#nav-journal-count").textContent = entries.length;
  document.querySelector("#journal-total").textContent = entries.length;
  document.querySelector("#journal-candidates").textContent = entries.filter(entry => entry.evaluation.decision === "KANDIDAT").length;
  document.querySelector("#journal-average").textContent = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.evaluation.score, 0) / entries.length) : 0;
  journalBody.innerHTML = entries.length ? entries.map(entry => `
    <tr>
      <td><strong>${escapeHtml(entry.input.symbol)}</strong><small>${escapeHtml(entry.input.company || entry.input.assetClass)}</small></td>
      <td>${new Date(entry.evaluation.evaluatedAt).toLocaleDateString("de-DE")}</td>
      <td><span class="badge ${badgeClass(entry.evaluation.decision)}">${entry.evaluation.decision}</span></td>
      <td><strong>${entry.evaluation.score}</strong></td>
      <td>${compactNumber.format(entry.evaluation.rr)}</td>
      <td>${compactNumber.format(entry.evaluation.position.units)}</td>
      <td><button class="icon-button" data-delete="${entry.id}" aria-label="Eintrag löschen">Löschen</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Noch keine Entscheidung gespeichert.</td></tr>`;
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(entry => entry.id !== button.dataset.delete)));
    renderJournal();
    renderDashboard();
  }));
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("chief:watchlist-updated"));
}

function loadWatchlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
    if (Array.isArray(stored)) return stored;
  } catch {}

  let legacy = [];
  try {
    const stored = JSON.parse(localStorage.getItem(LEGACY_WATCHLIST_KEY));
    if (Array.isArray(stored)) legacy = stored;
  } catch {}

  const initial = mergeWatchlists(legacy, structuredClone(ACTIVE_WATCHLIST));
  saveWatchlist(initial);
  return initial;
}

function sortedMarkets() {
  return groupWatchlist(loadWatchlist()).map(market => ({ market, signal: getMarketSignal(market) }))
    .sort((a, b) => a.signal.priority - b.signal.priority || (a.signal.distancePercent ?? Infinity) - (b.signal.distancePercent ?? Infinity) || a.market.symbol.localeCompare(b.market.symbol));
}

function filteredMarkets() {
  const query = String(document.querySelector("#watchlist-search")?.value || "").trim().toLowerCase();
  const assetClass = document.querySelector("#asset-filter")?.value || "all";
  return sortedMarkets().filter(({ market }) => {
    const matchesQuery = !query || `${market.symbol} ${market.name} ${market.marketStatus} ${market.action}`.toLowerCase().includes(query);
    const matchesClass = assetClass === "all" || market.assetClass === assetClass;
    return matchesQuery && matchesClass;
  });
}

function formatDateTime(value) {
  if (!value) return "Stand fehlt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Stand fehlt";
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function scenarioCard(item, missingReason = "") {
  if (!item) return `
    <section class="scenario-card unavailable">
      <div class="scenario-head"><span class="direction">Kein Setup</span><span class="badge muted">NICHT DEFINIERT</span></div>
      <p>${escapeHtml(missingReason || "Für diese Richtung ist aktuell kein bestätigter Plan gespeichert.")}</p>
    </section>`;
  const signal = getWatchlistSignal(item);
  return `
    <section class="scenario-card ${item.direction}">
      <div class="scenario-head">
        <span class="direction ${item.direction}">${item.direction === "short" ? "SHORT" : "LONG"} · ${escapeHtml(item.timeframe)}</span>
        <span class="badge ${signal.tone}">${signal.label}</span>
      </div>
      <div class="scenario-metrics">
        <div><span>Trigger</span><strong>${number.format(item.trigger)}</strong></div>
        <div><span>Einstieg</span><strong>${number.format(item.entry)}</strong></div>
        <div><span>Stop Loss</span><strong>${number.format(item.stop)}</strong></div>
        <div><span>CRV TP2</span><strong>${compactNumber.format(item.rrToTp2 || 0)}</strong></div>
      </div>
      <div class="target-row">
        <span>TP1 <strong>${number.format(item.tp1)}</strong></span>
        <span>TP2 <strong>${number.format(item.tp2)}</strong></span>
        <span>TP3 <strong>${number.format(item.tp3)}</strong></span>
      </div>
      <div class="scenario-rules">
        <p><strong>Bestätigung</strong>${escapeHtml(item.confirmation)}</p>
        <p><strong>Invalidierung</strong>${escapeHtml(item.invalidation)}</p>
        <p><strong>Szenariowechsel</strong>${escapeHtml(item.scenarioSwitch)}</p>
      </div>
      <button type="button" class="secondary compact scenario-button" data-analyze="${item.id}">${item.direction === "short" ? "Short" : "Long"} Setup prüfen</button>
    </section>`;
}

function accumulationBlock(market) {
  if (!market.accumulationLevels?.length) return "";
  return `<div class="accumulation-block">
    <div><span class="panel-kicker">Krypto Nachkaufplan</span><strong>Feste Rücksetzer</strong></div>
    <div class="accumulation-levels">${market.accumulationLevels.map((level, index) => `<span><small>Tranche ${index + 1}</small><strong>${number.format(level)}</strong></span>`).join("")}</div>
  </div>`;
}

function marketCard(market, signal) {
  return `
    <article class="market-card" data-market-card="${escapeHtml(market.symbol)}">
      <header class="market-card-head">
        <div class="market-identity">
          <span class="asset-chip">${escapeHtml(market.assetClass)}</span>
          <h3>${escapeHtml(market.symbol)}</h3>
          <p>${escapeHtml(market.name)}</p>
        </div>
        <label class="market-price">Referenzkurs
          <input class="table-input" type="number" step="any" value="${market.referencePrice || ""}" data-market-price="${escapeHtml(market.symbol)}" aria-label="Referenzkurs für ${escapeHtml(market.symbol)}">
          <small>${formatDateTime(market.priceAsOf)}</small>
        </label>
        <div class="market-state-box"><span class="badge ${signal.tone}">${signal.label}</span><small>${signal.distancePercent === undefined ? "" : `${compactNumber.format(signal.distancePercent)} % bis Level`}</small></div>
      </header>
      <div class="market-decision">
        <div><span>Status</span><strong>${escapeHtml(market.marketStatus || "Ohne Status")}</strong></div>
        <div><span>Aktion</span><strong>${escapeHtml(market.action || "Prüfen")}</strong></div>
      </div>
      ${accumulationBlock(market)}
      <div class="scenario-grid">
        ${scenarioCard(market.long)}
        ${scenarioCard(market.short, market.missingPlanReason)}
      </div>
    </article>`;
}

function renderWatchlist() {
  const allRows = sortedMarkets();
  const rows = filteredMarkets();
  const actionable = allRows.filter(row => row.signal.priority <= 1).length;
  const stale = allRows.filter(row => row.signal.label === "DATEN ALT").length;
  const crypto = allRows.filter(row => row.market.assetClass === "Krypto").length;
  document.querySelector("#nav-watchlist-count").textContent = allRows.length;
  document.querySelector("#watchlist-count").textContent = allRows.length;
  document.querySelector("#watchlist-actionable").textContent = actionable;
  document.querySelector("#watchlist-crypto").textContent = crypto;
  document.querySelector("#watchlist-stale").textContent = stale;
  watchlistBody.innerHTML = rows.length ? rows.map(({ market, signal }) => marketCard(market, signal)).join("")
    : `<div class="empty dashboard-empty"><strong>Kein Markt gefunden</strong><p>Filter oder Suche anpassen.</p></div>`;
  bindWatchlistActions(watchlistBody);
  renderDashboard();
}

function bindWatchlistActions(root) {
  root.querySelectorAll("[data-market-price]").forEach(input => input.addEventListener("change", () => {
    const symbol = input.dataset.marketPrice;
    const newPrice = Number(input.value) || 0;
    const timestamp = new Date().toISOString();
    const updated = loadWatchlist().map(item => {
      if (item.symbol !== symbol) return item;
      const manual = { ...item, referencePrice: newPrice, priceAsOf: timestamp };
      delete manual.quoteSource;
      delete manual.quoteProviderSymbol;
      delete manual.quoteAuthoritative;
      return manual;
    });
    saveWatchlist(updated);
    renderWatchlist();
    showToast(`${symbol} Referenzkurs aktualisiert`);
  }));
  root.querySelectorAll("[data-analyze]").forEach(button => button.addEventListener("click", () => {
    loadWatchlistItemIntoForm(loadWatchlist().find(item => item.id === button.dataset.analyze));
  }));
}

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function loadWatchlistItemIntoForm(item) {
  if (!item) return;
  const values = {
    symbol: item.symbol,
    company: item.name,
    assetClass: item.assetClass,
    direction: item.direction,
    marketStatus: item.marketStatus,
    action: item.action,
    trigger: item.trigger,
    entry: item.entry,
    stop: item.stop,
    tp1: item.tp1,
    tp2: item.tp2,
    tp3: item.tp3,
    dataSource: item.source,
    dataTimestamp: toLocalDateTimeInput(item.priceAsOf),
    confirmationRule: item.confirmation,
    rationale: `${item.marketStatus}. ${item.action}`,
    invalidation: item.invalidation,
    scenarioSwitch: item.scenarioSwitch,
    h1Confirmation: getWatchlistSignal(item).label === "BESTÄTIGUNG PRÜFEN" ? "1" : "0"
  };
  for (const [key, value] of Object.entries(values)) if (form.elements[key]) form.elements[key].value = value ?? "";
  switchView("setup");
  window.setTimeout(() => form.elements.h4Trend?.focus(), 300);
}

function saveSetupToWatchlist(input, evaluation) {
  const additionalBlockers = [];
  if (!input.confirmationRule?.trim()) additionalBlockers.push("Bestätigungsregel fehlt");
  if (!input.scenarioSwitch?.trim()) additionalBlockers.push("Szenariowechsel fehlt");
  const item = {
    symbol: input.symbol,
    name: input.company || input.symbol,
    assetClass: input.assetClass,
    direction: input.direction,
    referencePrice: Number(input.entry) || 0,
    trigger: Number(input.trigger) || Number(input.entry) || 0,
    entry: input.entry,
    stop: input.stop,
    tp1: input.tp1,
    tp2: input.tp2,
    tp3: input.tp3,
    rrToTp2: evaluation.rr,
    source: input.dataSource,
    planDate: evaluation.evaluatedAt.slice(0, 10),
    priceAsOf: input.dataTimestamp,
    planStatus: evaluation.blockers.length || additionalBlockers.length ? "historical" : "validated",
    confirmation: input.confirmationRule,
    invalidation: input.invalidation,
    scenarioSwitch: input.scenarioSwitch,
    marketStatus: input.marketStatus,
    action: input.action,
    timeframe: "H1",
    planVersion: WATCHLIST_VERSION
  };
  saveWatchlist(mergeWatchlists(loadWatchlist(), [item]));
  renderWatchlist();
  document.querySelector("#watchlist-entry").disabled = true;
  document.querySelector("#watchlist-entry").textContent = "Übernommen";
  showToast(additionalBlockers.length ? "Als unbestätigter Plan gespeichert" : "Setup in die Watchlist übernommen");
}

function dashboardRow(market, signal) {
  const focus = signal.focusItem;
  const levelLabel = signal.focusType === "accumulation"
    ? `Nachkauf ${number.format(signal.level)}`
    : focus ? `${focus.direction === "short" ? "Short" : "Long"} ${number.format(focus.trigger)}` : "—";
  return `
    <tr>
      <td><strong>${escapeHtml(market.symbol)}</strong><small>${escapeHtml(market.name)}</small></td>
      <td>${number.format(market.referencePrice)}</td>
      <td>${levelLabel}</td>
      <td>${signal.distancePercent === undefined ? "—" : `${compactNumber.format(signal.distancePercent)} %`}</td>
      <td><span class="badge ${signal.tone}">${signal.label}</span></td>
      <td>${focus ? `<button type="button" class="text-button" data-analyze="${focus.id}">Prüfen</button>` : `<button type="button" class="text-button" data-open-market="${escapeHtml(market.symbol)}">Details</button>`}</td>
    </tr>`;
}

function renderDashboard() {
  const rows = sortedMarkets();
  const entries = loadJournal();
  const fresh = rows.filter(row => row.signal.label !== "DATEN ALT" && row.signal.label !== "KURS FEHLT").length;
  const stale = rows.length - fresh;
  document.querySelector("#dash-market-count").textContent = rows.length;
  document.querySelector("#dash-actionable-count").textContent = rows.filter(row => row.signal.priority <= 1).length;
  document.querySelector("#dash-journal-count").textContent = entries.length;
  document.querySelector("#dash-data-quality").textContent = rows.length ? `${Math.round(fresh / rows.length * 100)} %` : "0 %";

  const attentionTitle = document.querySelector("#attention-title");
  const attentionCopy = document.querySelector("#attention-copy");
  if (stale) {
    attentionTitle.textContent = "Marktdaten aktualisieren";
    attentionCopy.textContent = `${stale} Märkte haben Daten älter als 24 Stunden. Trigger bleiben gesperrt, bis der Referenzkurs erneuert wurde.`;
  } else {
    attentionTitle.textContent = "Aktiver Marktplan 11.09.2026";
    attentionCopy.textContent = "Feste Long und Short Trigger sind geladen. Nur abgeschlossene H1 oder H4 Kerzen bestätigen ein Setup.";
  }

  const dashboardBody = document.querySelector("#dashboard-watchlist-body");
  dashboardBody.innerHTML = rows.slice(0, 5).map(({ market, signal }) => dashboardRow(market, signal)).join("");
  dashboardBody.querySelectorAll("[data-analyze]").forEach(button => button.addEventListener("click", () => {
    loadWatchlistItemIntoForm(loadWatchlist().find(item => item.id === button.dataset.analyze));
  }));
  dashboardBody.querySelectorAll("[data-open-market]").forEach(button => button.addEventListener("click", () => switchView("watchlist")));

  const recent = document.querySelector("#dashboard-journal");
  recent.innerHTML = entries.length ? entries.slice(0, 3).map(entry => `
    <article class="decision-card"><div><strong>${escapeHtml(entry.input.symbol)}</strong><span class="badge ${badgeClass(entry.evaluation.decision)}">${entry.evaluation.decision}</span></div>
    <p>${escapeHtml(entry.input.company || entry.input.assetClass)}</p><footer><span>Score ${entry.evaluation.score}</span><span>CRV ${compactNumber.format(entry.evaluation.rr)}</span></footer></article>`).join("")
    : `<div class="empty dashboard-empty"><strong>Noch keine Entscheidungen</strong><p>Bewerte dein erstes Setup und speichere es im Journal.</p><button class="secondary compact" type="button" data-empty-setup>Setup öffnen</button></div>`;
  recent.querySelector("[data-empty-setup]")?.addEventListener("click", () => switchView("setup"));
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const input = formData();
  renderResult(input, evaluateSetup(input));
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#load-example").addEventListener("click", () => {
  const sample = {
    symbol: "BITCOIN", company: "Bitcoin CFD", assetClass: "Krypto", direction: "long",
    marketStatus: "WARTEN", action: "Long nur nach bestätigtem H1 Schluss über dem Trigger.",
    portfolio: "120000", riskPercent: "0.75", trigger: "78950", entry: "78950", stop: "78180",
    tp1: "80000", tp2: "81500", tp3: "82000", h4Trend: "1", h1Confirmation: "0",
    structure: "2", catalyst: "1", fundamentals: "1", liquidity: "2",
    dataSource: "XTB Chart und Marktplan", confirmationRule: "H1 Schluss über 78950",
    invalidation: "Long Setup unter 78180 ungültig", scenarioSwitch: "Short Szenario nach H1 Schluss unter 76950",
    rationale: "Breakout nur handeln, wenn der Stundenkurs oberhalb des Triggers schließt."
  };
  sample.dataTimestamp = new Date().toISOString().slice(0, 16);
  for (const [key, value] of Object.entries(sample)) if (form.elements[key]) form.elements[key].value = value;
  showToast("Beispiel geladen");
});

document.querySelector("#import-watchlist").addEventListener("click", () => document.querySelector("#watchlist-import").click());
document.querySelector("#watchlist-import").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = parseWatchlist(await file.text(), file.name);
    saveWatchlist(mergeWatchlists(loadWatchlist(), imported));
    renderWatchlist();
    document.querySelector("#import-message").textContent = `${imported.length} Setups importiert. Gleiche Symbole und Richtungen wurden aktualisiert.`;
    showToast(`${imported.length} Watchlist Setups importiert`);
  } catch (error) {
    document.querySelector("#import-message").textContent = `Import nicht möglich: ${error.message}`;
  }
  event.target.value = "";
});

document.querySelector("#export-watchlist").addEventListener("click", () => {
  const blob = new Blob([exportWatchlist(loadWatchlist())], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `chief-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Watchlist exportiert");
});

document.querySelector("#restore-seeds").addEventListener("click", () => {
  saveWatchlist(mergeWatchlists(loadWatchlist(), structuredClone(ACTIVE_WATCHLIST)));
  renderWatchlist();
  document.querySelector("#import-message").textContent = "Der aktive Marktplan vom 11.09.2026 wurde ohne Duplikate wiederhergestellt.";
  showToast("Aktiver Marktplan wiederhergestellt");
});

document.querySelector("#watchlist-search").addEventListener("input", renderWatchlist);
document.querySelector("#asset-filter").addEventListener("change", renderWatchlist);

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
const hour = new Date().getHours();
document.querySelector("#greeting").textContent = hour < 11 ? "Guten Morgen, Sebi." : hour < 18 ? "Guten Tag, Sebi." : "Guten Abend, Sebi.";
renderJournal();
renderWatchlist();
const initialView = location.hash.slice(1);
if (viewTitles[initialView]) switchView(initialView);
