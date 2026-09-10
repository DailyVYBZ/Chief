import { evaluateSetup } from "./engine.js";

const form = document.querySelector("#setup-form");
const resultPanel = document.querySelector("#result-panel");
const journalBody = document.querySelector("#journal-body");
const STORAGE_KEY = "chief-journal-v1";

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
    <button type="button" class="primary" id="save-entry">Im Journal speichern</button>`;

  document.querySelector("#save-entry").addEventListener("click", () => saveEntry(input, evaluation));
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
