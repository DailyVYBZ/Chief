import { evaluateSetup } from "./engine.js";
import { exportWatchlist, getWatchlistSignal, mergeWatchlists, parseWatchlist, SEED_WATCHLIST } from "./watchlist.js";

const form = document.querySelector("#setup-form");
const resultPanel = document.querySelector("#result-panel");
const journalBody = document.querySelector("#journal-body");
const STORAGE_KEY = "chief-journal-v1";
const WATCHLIST_KEY = "chief-watchlist-v1";
const watchlistBody = document.querySelector("#watchlist-body");

const euros = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function badgeClass(decision) {
  return ({ KANDIDAT: "good", BEOBACHTEN: "watch", ABLEHNEN: "bad", UNVOLLSTÄNDIG: "muted" })[decision];
}

function renderResult(input, evaluation) {
  const { position } = evaluation;
  resultPanel.innerHTML = `
    <div class="result-head">
      <div>
        <span class="eyebrow">Entscheidung</span>
        <h2>${escapeHtml(input.symbol || "Setup")} <span class="badge ${badgeClass(evaluation.decision)}">${evaluation.decision}</span></h2>
      </div>
      <div class="score"><strong>${evaluation.score}</strong><span>/ 100</span></div>
    </div>
    ${evaluation.blockers.length ? `<div class="blockers"><strong>Vor Entscheidung klären</strong><ul>${evaluation.blockers.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>` : ""}
    <div class="trade-plan">
      <div><span>Einstieg</span><strong>${number.format(input.entry)}</strong></div>
      <div><span>Stop</span><strong>${number.format(input.stop)}</strong></div>
      <div><span>TP1</span><strong>${number.format(input.tp1)}</strong></div>
      <div><span>TP2</span><strong>${number.format(input.tp2)}</strong></div>
      <div><span>TP3</span><strong>${number.format(input.tp3)}</strong></div>
    </div>
    <div class="metric-grid">
      <div><span>CRV zu TP2</span><strong>${number.format(evaluation.rr)}</strong></div>
      <div><span>Risikobudget</span><strong>${euros.format(position.riskBudget)}</strong></div>
      <div><span>Stückzahl</span><strong>${number.format(position.units)}</strong></div>
      <div><span>Positionswert</span><strong>${euros.format(position.positionValue)}</strong></div>
      <div><span>Tatsächliches Risiko</span><strong>${euros.format(position.actualRisk)}</strong></div>
      <div><span>Datenalter</span><strong>${evaluation.ageHours === Infinity ? "fehlt" : `${number.format(evaluation.ageHours)} h`}</strong></div>
    </div>
    <div class="score-list">
      ${evaluation.components.map(part => `<div><span>${part.label}</span><progress max="${part.max}" value="${part.points}"></progress><strong>${number.format(part.points)} / ${part.max}</strong></div>`).join("")}
    </div>
    <div class="decision-note">
      <p><strong>These:</strong> ${escapeHtml(input.rationale || "Keine These erfasst")}</p>
      <p><strong>Invalidierung:</strong> ${escapeHtml(input.invalidation || "Nicht erfasst")}</p>
      <p><strong>Daten:</strong> ${escapeHtml(input.dataSource || "Quelle fehlt")} · ${input.dataTimestamp ? new Date(input.dataTimestamp).toLocaleString("de-DE") : "Stand fehlt"}</p>
    </div>
    <div class="result-actions">
      <button type="button" class="primary" id="save-entry">Im Journal speichern</button>
      <button type="button" class="secondary" id="watchlist-entry">In Watchlist übernehmen</button>
    </div>`;

  document.querySelector("#save-entry").addEventListener("click", () => saveEntry(input, evaluation));
  document.querySelector("#watchlist-entry").addEventListener("click", () => saveSetupToWatchlist(input, evaluation));
}

function saveEntry(input, evaluation) {
  const entries = loadJournal();
  entries.unshift({ id: crypto.randomUUID(), input, evaluation, status: "offen" });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  renderJournal();
  document.querySelector("#save-entry").textContent = "Gespeichert";
  document.querySelector("#save-entry").disabled = true;
}

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function renderJournal() {
  const entries = loadJournal();
  journalBody.innerHTML = entries.length ? entries.map(entry => `
    <tr>
      <td><strong>${escapeHtml(entry.input.symbol)}</strong><small>${escapeHtml(entry.input.company || entry.input.assetClass)}</small></td>
      <td>${new Date(entry.evaluation.evaluatedAt).toLocaleDateString("de-DE")}</td>
      <td><span class="badge ${badgeClass(entry.evaluation.decision)}">${entry.evaluation.decision}</span></td>
      <td>${entry.evaluation.score}</td>
      <td>${number.format(entry.evaluation.rr)}</td>
      <td>${number.format(entry.evaluation.position.units)}</td>
      <td><button class="icon-button" data-delete="${entry.id}" aria-label="Eintrag löschen">Löschen</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Noch keine Entscheidung gespeichert.</td></tr>`;
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(entry => entry.id !== button.dataset.delete)));
    renderJournal();
  }));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
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

function renderWatchlist() {
  const items = loadWatchlist();
  const rows = items.map(item => ({ item, signal: getWatchlistSignal(item) }))
    .sort((a, b) => a.signal.priority - b.signal.priority || a.item.symbol.localeCompare(b.item.symbol));
  document.querySelector("#watchlist-count").textContent = items.length;
  document.querySelector("#watchlist-actionable").textContent = rows.filter(row => row.signal.priority <= 1).length;
  document.querySelector("#watchlist-historical").textContent = rows.filter(row => row.signal.label === "HISTORISCH").length;
  watchlistBody.innerHTML = rows.length ? rows.map(({ item, signal }) => `
    <tr>
      <td><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(item.name)}</small></td>
      <td>${item.direction === "short" ? "Short" : "Long"}</td>
      <td><input class="table-input" type="number" step="any" value="${item.referencePrice || ""}" data-price="${item.id}" aria-label="Referenzkurs für ${escapeHtml(item.symbol)}"></td>
      <td><strong>${number.format(item.entry)}</strong></td>
      <td>${signal.distancePercent === undefined ? "—" : `${number.format(signal.distancePercent)} %`}</td>
      <td><span class="badge ${signal.tone}">${signal.label}</span></td>
      <td>${item.planDate ? new Date(item.planDate).toLocaleDateString("de-DE") : "—"}<small>${escapeHtml(item.source)}</small></td>
      <td><button type="button" class="secondary compact" data-analyze="${item.id}">Prüfen</button></td>
    </tr>`).join("") : `<tr><td colspan="8" class="empty">Die Watchlist ist leer.</td></tr>`;

  document.querySelectorAll("[data-price]").forEach(input => input.addEventListener("change", () => {
    const updated = loadWatchlist().map(item => item.id === input.dataset.price
      ? { ...item, referencePrice: Number(input.value) || 0, priceAsOf: new Date().toISOString(), source: "Manuelle Kursaktualisierung" }
      : item);
    saveWatchlist(updated);
    renderWatchlist();
  }));
  document.querySelectorAll("[data-analyze]").forEach(button => button.addEventListener("click", () => {
    const item = loadWatchlist().find(entry => entry.id === button.dataset.analyze);
    loadWatchlistItemIntoForm(item);
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
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.dataTimestamp.focus();
}

function saveSetupToWatchlist(input, evaluation) {
  const item = {
    symbol: input.symbol, name: input.company || input.symbol, assetClass: input.assetClass,
    direction: input.direction, referencePrice: input.entry, entry: input.entry, stop: input.stop,
    tp1: input.tp1, tp2: input.tp2, tp3: input.tp3, source: input.dataSource,
    planDate: evaluation.evaluatedAt.slice(0, 10), priceAsOf: input.dataTimestamp,
    planStatus: evaluation.blockers.length ? "historical" : "validated",
    confirmation: input.invalidation
  };
  saveWatchlist(mergeWatchlists(loadWatchlist(), [item]));
  renderWatchlist();
  const button = document.querySelector("#watchlist-entry");
  button.textContent = "Übernommen";
  button.disabled = true;
}

document.querySelector("#import-watchlist").addEventListener("click", () => document.querySelector("#watchlist-import").click());
document.querySelector("#watchlist-import").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const message = document.querySelector("#import-message");
  try {
    const imported = parseWatchlist(await file.text(), file.name);
    saveWatchlist(mergeWatchlists(loadWatchlist(), imported));
    renderWatchlist();
    message.textContent = `${imported.length} Einträge importiert. Gleiche Symbole und Richtungen wurden aktualisiert.`;
  } catch (error) {
    message.textContent = `Import nicht möglich: ${error.message}`;
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
});
document.querySelector("#restore-seeds").addEventListener("click", () => {
  saveWatchlist(mergeWatchlists(loadWatchlist(), structuredClone(SEED_WATCHLIST)));
  renderWatchlist();
  document.querySelector("#import-message").textContent = "Der bestätigte Startbestand wurde ohne Duplikate ergänzt.";
});

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
    rationale: "Aufwärtstrend intakt, Einstieg erst nach bestätigtem Ausbruch und Rücklauf."
  };
  sample.dataTimestamp = new Date().toISOString().slice(0, 16);
  for (const [key, value] of Object.entries(sample)) if (form.elements[key]) form.elements[key].value = value;
});

renderJournal();
renderWatchlist();
