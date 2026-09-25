import { openPosition, recordExit, positionResult, portfolioRisk, journalStatistics } from "./portfolio.js";

const KEY = "chief-positions-v1";
const SETTINGS = "chief-risk-settings-v1";
const JOURNAL = "chief-journal-v1";
const panel = document.querySelector("#chief-positions");
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dec = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const positions = () => read(KEY, []);
const errorMessage = error => { document.querySelector("#position-error").textContent = error.message; };

function render() {
  if (!panel) return;
  const list = positions();
  const journal = read(JOURNAL, []);
  const linked = new Set(list.map(position => position.journalEntryId));
  const available = journal.filter(entry => !linked.has(entry.id) && entry.input?.symbol);
  const settings = read(SETTINGS, { portfolioEur: 120000, maxRiskPercent: 2 });
  let risk;
  try { risk = portfolioRisk(list, settings); } catch { risk = null; }
  const stats = journalStatistics(list);
  panel.innerHTML = `<h3>Trades und Portfolio Risiko</h3>
    <p>Trage nur tatsächlich ausgeführte Trades ein. Kontraktfaktor und EUR Umrechnung stammen aus deiner Brokerabrechnung. Die Risikogruppen zeigen gemeinsame Expositionen, keine gemessene Korrelation.</p>
    <form id="risk-settings" class="form-grid two">
      <label>Portfoliowert EUR<input name="portfolioEur" type="number" step="any" min="0.01" required value="${escape(settings.portfolioEur)}"></label>
      <label>Maximales Gesamtrisiko %<input name="maxRiskPercent" type="number" step="any" min="0" required value="${escape(settings.maxRiskPercent)}"></label>
      <button class="secondary compact" type="submit">Risikolimit speichern</button>
    </form>
    <p aria-live="polite">Offenes Risiko: ${risk ? eur.format(risk.totalRiskEur) : "Eingabe prüfen"} ${risk ? `(${dec.format(risk.totalRiskPercent)} %) · Weiteres Risiko: ${eur.format(risk.availableRiskEur)}` : ""}</p>
    <p>Risikogruppen: ${risk && Object.keys(risk.byGroup).length ? Object.entries(risk.byGroup).map(([group, value]) => `${escape(group)} ${eur.format(value)}`).join(" · ") : "keine offenen Positionen"}</p>
    <p>${risk?.concentrationGroups.length ? `Mehrere Positionen: ${risk.concentrationGroups.map(escape).join(", ")}` : "Keine mehrfach besetzte Risikogruppe"}</p>
    <p>Geschlossen: ${stats.closedTrades} · Ergebnis: ${eur.format(stats.realizedEur)} · Trefferquote: ${stats.winRatePercent === null ? "offen" : `${dec.format(stats.winRatePercent)} %`} · Ø R: ${stats.averageR === null ? "offen" : dec.format(stats.averageR)} · Regeltreue: ${stats.ruleCompliancePercent === null ? "nicht bewertet" : `${dec.format(stats.ruleCompliancePercent)} % (${stats.ruleReviewed} geprüft)`}</p>
    <details><summary>Tatsächlichen Einstieg erfassen</summary>
      <form id="position-open" class="form-grid three">
        <label>Journalentscheidung<select name="journalEntryId" required>${available.map(entry => `<option value="${escape(entry.id)}">${escape(entry.input.symbol)} · ${escape(new Date(entry.evaluation.evaluatedAt).toLocaleDateString("de-DE"))}</option>`).join("")}</select></label>
        <label>Stückzahl oder Lots<input name="units" type="number" step="any" min="0.000001" required></label>
        <label>Tatsächlicher Einstieg<input name="actualEntry" type="number" step="any" min="0.000001" required></label>
        <label>Kontraktfaktor<input name="multiplier" type="number" step="any" min="0.000001" required></label>
        <label>EUR je Kurswährung<input name="fxEurPerCurrency" type="number" step="any" min="0.000001" required></label>
        <label>Einstiegsgebühr EUR<input name="entryFeeEur" type="number" step="any" min="0" value="0" required></label>
        <label>Tatsächlicher Zeitpunkt<input name="openedAt" type="datetime-local" required></label>
        <output id="proposed-risk" aria-live="polite">Vorschau nach Eingabe</output>
        <button class="primary compact" type="submit" ${available.length ? "" : "disabled"}>Trade erfassen</button>
      </form>${available.length ? "" : "<p>Speichere zuerst eine Setup Bewertung im Decision Journal.</p>"}
    </details>
    <h4>Positionen</h4>${list.map(position => {
      const result = positionResult(position);
      return `<details><summary>${escape(position.symbol)} · ${result.status === "closed" ? "geschlossen" : "offen"} · ${dec.format(result.remainingUnits)} verbleibend · ${eur.format(result.realizedEur)}</summary>
        <p>Einstieg ${dec.format(position.entry)} · Stop ${dec.format(position.stop)} · Regelversion ${escape(position.ruleVersion || "ohne")}</p>
        ${result.remainingUnits ? `<form data-exit="${escape(position.id)}" class="form-grid three">
          <label>Ausstiegsmenge<input name="units" type="number" step="any" min="0.000001" max="${result.remainingUnits}" required></label>
          <label>Ausstiegskurs<input name="price" type="number" step="any" min="0.000001" required></label>
          <label>EUR je Kurswährung<input name="fxEurPerCurrency" type="number" step="any" min="0.000001" required></label>
          <label>Ausstiegsgebühr EUR<input name="feeEur" type="number" step="any" min="0" value="0" required></label>
          <label>Erreichtes Ziel<input name="target" placeholder="z. B. TP1"></label>
          <button class="secondary compact" type="submit">Teilverkauf oder Abschluss</button>
        </form>` : `<p>Ergebnis ${dec.format(result.realizedPercent)} % · ${dec.format(result.realizedR)} R</p>
        <form data-review="${escape(position.id)}"><label>Regeltreue <select name="ruleDeviation"><option value="">Noch ungeprüft</option><option value="false" ${position.ruleDeviation === false ? "selected" : ""}>Regeln eingehalten</option><option value="true" ${position.ruleDeviation === true ? "selected" : ""}>Abweichung</option></select></label>
          <label>Nachbetrachtung<textarea name="review" rows="2">${escape(position.review)}</textarea></label><button class="secondary compact" type="submit">Nachbetrachtung speichern</button></form>`}</details>`;
    }).join("") || "<p>Noch kein ausgeführter Trade erfasst.</p>"}
    <p id="position-error" role="alert"></p>`;
  panel.querySelector("#risk-settings").addEventListener("submit", event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.target));
    try { portfolioRisk(positions(), input); save(SETTINGS, input); render(); } catch (error) { errorMessage(error); }
  });
  panel.querySelector("#position-open").addEventListener("submit", event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.target));
    const entry = read(JOURNAL, []).find(item => item.id === input.journalEntryId);
    try {
      if (!entry || positions().some(item => item.journalEntryId === entry.id)) throw new Error("Journalentscheidung fehlt oder wurde bereits verwendet");
      const position = openPosition({ ...input, setup: { ...entry.input, ruleVersion: entry.evaluation.ruleVersion } });
      const next = { ...position, journalEntryId: entry.id };
      save(KEY, [next, ...positions()]); render();
    } catch (error) { errorMessage(error); }
  });
  panel.querySelector("#position-open").addEventListener("input", event => {
    const output = panel.querySelector("#proposed-risk");
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const entry = journal.find(item => item.id === input.journalEntryId);
    try {
      const proposed = openPosition({ ...input, setup: entry.input });
      const preview = portfolioRisk(list, { ...settings, proposed });
      output.textContent = `Neues Risiko ${eur.format(preview.proposedRiskEur)} · danach ${eur.format(preview.projectedRiskEur)}${preview.exceedsLimit ? " · Risikolimit überschritten" : ""}`;
    } catch { output.textContent = "Vorschau nach vollständiger Eingabe"; }
  });
  panel.querySelectorAll("[data-exit]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    try {
      const next = positions().map(position => position.id === form.dataset.exit
        ? recordExit(position, { ...input, closedAt: new Date().toISOString() }) : position);
      save(KEY, next); render();
    } catch (error) { errorMessage(error); }
  }));
  panel.querySelectorAll("[data-review]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    save(KEY, positions().map(position => position.id === form.dataset.review ? { ...position,
      ruleDeviation: input.ruleDeviation === "" ? null : input.ruleDeviation === "true", review: input.review } : position));
    render();
  }));
}

if (panel) {
  document.addEventListener("click", event => { if (event.target?.id === "save-entry") setTimeout(render, 0); });
  window.addEventListener("storage", event => { if ([KEY, SETTINGS, JOURNAL].includes(event.key)) render(); });
  render();
}
