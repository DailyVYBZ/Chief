import { evaluateSetup } from "./engine.js";
import { exportWatchlist, getWatchlistSignal, mergeWatchlists, parseWatchlist, SEED_WATCHLIST } from "./watchlist.js";

const form = document.querySelector("#setup-form");
const resultPanel = document.querySelector("#result-panel");
const journalBody = document.querySelector("#journal-body");
const watchlistBody = document.querySelector("#watchlist-body");
const STORAGE_KEY = "chief-journal-v1";
const WATCHLIST_KEY = "chief-watchlist-v1";
const viewTitles = { dashboard: "Dashboard", watchlist: "Watchlist", setup: "Setup Analyse", journal: "Decision Journal" };
const euros = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

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
    <div class="trade-plan">
      <div><span>Einstieg</span><strong>${number.format(input.entry)}</strong></div>
      <div><span>Stop</span><strong>${number.format(input.stop)}</strong></div>
      <div><span>TP1</span><strong>${number.format(input.tp1)}</strong></div>
      <div><span>TP2</span><strong>${number.format(input.tp2)}</strong></div>
      <div><span>TP3</span><strong>${number.format(input.tp3)}</strong></div>
    </div>
    <div class="result-metrics">
      <div><span>CRV zu TP2</span><strong>${number.format(evaluation.rr)}</strong></div>
      <div><span>Risikobudget</span><strong>${euros.format(position.riskBudget)}</strong></div>
      <div><span>Stückzahl</span><strong>${number.format(position.units)}</strong></div>
      <div><span>Positionswert</span><strong>${euros.format(position.positionValue)}</strong></div>
    </div>
    <div class="score-list">
      ${evaluation.components.map(part => `<div><span>${part.label}</span><progress max="${part.max}" value="${part.points}"></progress><strong>${number.format(part.points)}</strong></div>`).join("")}
    </div>
    <div class="decision-note">
      <p><strong>These</strong>${escapeHtml(input.rationale || "Keine These erfasst")}</p>
      <p><strong>Invalidierung</strong>${escapeHtml(input.invalidation || "Nicht erfasst")}</p>
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
  entries.unshift({ id: crypto.randomUUID(), input, evaluation, status: "offen" });
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
      <td>${number.format(entry.evaluation.rr)}</td>
      <td>${number.format(entry.evaluation.position.units)}</td>
      <td><button class="icon-button" data-delete="${entry.id}" aria-label="Eintrag löschen">Löschen</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Noch keine Entscheidung gespeichert.</td></tr>`;
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(entry => entry.id !== button.dataset.delete)));
    renderJournal();
    renderDashboard();
  }));
}

function loadWatchlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
    if (Array.isArray(stored)) return stored;
  } catch {}
  const initial = structuredClone(SEED_WATCHLIST);
  saveWatchlist(initial);
  return initial;
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

function sortedWatchlist() {
  return loadWatchlist().map(item => ({ item, signal: getWatchlistSignal(item) }))
    .sort((a, b) => a.signal.priority - b.signal.priority || a.item.symbol.localeCompare(b.item.symbol));
}

function renderWatchlist() {
  const rows = sortedWatchlist();
  const historical = rows.filter(row => row.signal.label === "HISTORISCH").length;
  const actionable = rows.filter(row => row.signal.priority <= 1).length;
  document.querySelector("#nav-watchlist-count").textContent = rows.length;
  document.querySelector("#watchlist-count").textContent = rows.length;
  document.querySelector("#watchlist-actionable").textContent = actionable;
  document.querySelector("#watchlist-historical").textContent = historical;
  watchlistBody.innerHTML = rows.length ? rows.map(({ item, signal }) => watchlistRow(item, signal, true)).join("")
    : `<tr><td colspan="8" class="empty">Die Watchlist ist leer.</td></tr>`;
  bindWatchlistActions(watchlistBody);
  renderDashboard();
}

function watchlistRow(item, signal, detailed = false) {
  const distance = signal.distancePercent === undefined ? "—" : `${number.format(signal.distancePercent)} %`;
  if (!detailed) return `
    <tr><td><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(item.name)}</small></td>
    <td>${number.format(item.referencePrice)}</td><td>${number.format(item.entry)}</td><td>${distance}</td>
    <td><span class="badge ${signal.tone}">${signal.label}</span></td>
    <td><button type="button" class="text-button" data-analyze="${item.id}">Prüfen →</button></td></tr>`;
  return `
    <tr><td><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(item.name)}</small></td>
    <td><span class="direction ${item.direction}">${item.direction === "short" ? "Short" : "Long"}</span></td>
    <td><input class="table-input" type="number" step="any" value="${item.referencePrice || ""}" data-price="${item.id}" aria-label="Referenzkurs für ${escapeHtml(item.symbol)}"></td>
    <td><strong>${number.format(item.entry)}</strong></td><td>${distance}</td>
    <td><span class="badge ${signal.tone}">${signal.label}</span></td>
    <td>${item.planDate ? new Date(item.planDate).toLocaleDateString("de-DE") : "—"}<small>${escapeHtml(item.source)}</small></td>
    <td><button type="button" class="secondary compact" data-analyze="${item.id}">Prüfen</button></td></tr>`;
}

function bindWatchlistActions(root) {
  root.querySelectorAll("[data-price]").forEach(input => input.addEventListener("change", () => {
    const updated = loadWatchlist().map(item => item.id === input.dataset.price
      ? { ...item, referencePrice: Number(input.value) || 0, priceAsOf: new Date().toISOString(), source: "Manuelle Kursaktualisierung" } : item);
    saveWatchlist(updated);
    renderWatchlist();
    showToast("Referenzkurs aktualisiert");
  }));
  root.querySelectorAll("[data-analyze]").forEach(button => button.addEventListener("click", () => {
    loadWatchlistItemIntoForm(loadWatchlist().find(item => item.id === button.dataset.analyze));
  }));
}

function loadWatchlistItemIntoForm(item) {
  const values = {
    symbol: item.symbol, company: item.name, assetClass: item.assetClass, direction: item.direction,
    entry: item.entry, stop: item.stop, tp1: item.tp1, tp2: item.tp2, tp3: item.tp3,
    dataSource: item.planStatus === "historical" ? `${item.source}, historischer Plan vom ${item.planDate}` : item.source,
    dataTimestamp: "", rationale: "", invalidation: item.confirmation || ""
  };
  for (const [key, value] of Object.entries(values)) if (form.elements[key]) form.elements[key].value = value;
  switchView("setup");
  window.setTimeout(() => form.elements.dataTimestamp.focus(), 300);
}

function saveSetupToWatchlist(input, evaluation) {
  const item = {
    symbol: input.symbol, name: input.company || input.symbol, assetClass: input.assetClass,
    direction: input.direction, referencePrice: input.entry, entry: input.entry, stop: input.stop,
    tp1: input.tp1, tp2: input.tp2, tp3: input.tp3, source: input.dataSource,
    planDate: evaluation.evaluatedAt.slice(0, 10), priceAsOf: input.dataTimestamp,
    planStatus: evaluation.blockers.length ? "historical" : "validated", confirmation: input.invalidation
  };
  saveWatchlist(mergeWatchlists(loadWatchlist(), [item]));
  renderWatchlist();
  document.querySelector("#watchlist-entry").disabled = true;
  document.querySelector("#watchlist-entry").textContent = "Übernommen";
  showToast("Setup in die Watchlist übernommen");
}

function renderDashboard() {
  const rows = sortedWatchlist();
  const entries = loadJournal();
  const validated = rows.filter(row => row.item.planStatus === "validated" && !["DATEN ALT", "KURS FEHLT"].includes(row.signal.label)).length;
  document.querySelector("#dash-market-count").textContent = rows.length;
  document.querySelector("#dash-actionable-count").textContent = rows.filter(row => row.signal.priority <= 1).length;
  document.querySelector("#dash-journal-count").textContent = entries.length;
  document.querySelector("#dash-data-quality").textContent = rows.length ? `${Math.round(validated / rows.length * 100)} %` : "0 %";
  const dashboardBody = document.querySelector("#dashboard-watchlist-body");
  dashboardBody.innerHTML = rows.slice(0, 5).map(({ item, signal }) => watchlistRow(item, signal)).join("");
  bindWatchlistActions(dashboardBody);
  const recent = document.querySelector("#dashboard-journal");
  recent.innerHTML = entries.length ? entries.slice(0, 3).map(entry => `
    <article class="decision-card"><div><strong>${escapeHtml(entry.input.symbol)}</strong><span class="badge ${badgeClass(entry.evaluation.decision)}">${entry.evaluation.decision}</span></div>
    <p>${escapeHtml(entry.input.company || entry.input.assetClass)}</p><footer><span>Score ${entry.evaluation.score}</span><span>CRV ${number.format(entry.evaluation.rr)}</span></footer></article>`).join("")
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
    symbol: "SYK", company: "Stryker", assetClass: "Aktie", direction: "long",
    portfolio: "120000", riskPercent: "0.75", entry: "360", stop: "344",
    tp1: "382", tp2: "400", tp3: "424", h4Trend: "2", h1Confirmation: "2",
    structure: "2", catalyst: "1", fundamentals: "2", liquidity: "2",
    dataSource: "XTB Chart und Unternehmensdaten", invalidation: "H4 Schlusskurs unter 344 EUR",
    rationale: "Aufwärtstrend intakt. Einstieg erst nach bestätigtem Ausbruch und Rücklauf."
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
    document.querySelector("#import-message").textContent = `${imported.length} Einträge importiert. Gleiche Symbole und Richtungen wurden aktualisiert.`;
    showToast(`${imported.length} Watchlist Einträge importiert`);
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
  saveWatchlist(mergeWatchlists(loadWatchlist(), structuredClone(SEED_WATCHLIST)));
  renderWatchlist();
  document.querySelector("#import-message").textContent = "Der bestätigte Startbestand wurde ohne Duplikate ergänzt.";
  showToast("Startbestand ergänzt");
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
renderJournal();
renderWatchlist();
const initialView = location.hash.slice(1);
if (viewTitles[initialView]) switchView(initialView);
