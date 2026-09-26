import { applyXtbQuotes, parseXtbQuotes } from "./xtb-import.js";

(() => {
  const KEY = "chief-watchlist-v2";
  const panel = document.createElement("section");
  panel.className = "panel chief-sync-panel";
  panel.innerHTML = `<h3>XTB Kurse manuell übernehmen</h3>
    <p>Nur Kurse aus dem passenden XTB Instrument eintragen. Dieser Import ändert keine Trigger, Stops oder Ziele und bestätigt keinen Alarm automatisch.</p>
    <p>CSV Spalten: <code>symbol;instrument;bid;ask;quotedAt</code> · Zeitpunkt mit Zeitzone, z. B. <code>2026-09-26T08:00:00+02:00</code>. Ask darf leer bleiben.</p>
    <input id="chief-xtb-file" type="file" accept=".csv,text/csv" aria-label="XTB Kurs CSV auswählen">
    <p id="chief-xtb-result" role="status"></p>`;
  panel.querySelector("#chief-xtb-file").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = panel.querySelector("#chief-xtb-result");
    try {
      const quotes = parseXtbQuotes(await file.text());
      const current = JSON.parse(localStorage.getItem(KEY));
      if (!Array.isArray(current)) throw new Error("Watchlist fehlt");
      const updated = applyXtbQuotes(current, quotes);
      localStorage.setItem("chief-live-mode-v1", "shadow");
      localStorage.removeItem("chief-live-manual-anchor-v1");
      localStorage.setItem(KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("chief:watchlist-updated"));
      result.textContent = `${quotes.length} XTB Kurse übernommen. Instrument und Zeitpunkt vor Entscheidungen prüfen.`;
      location.reload();
    } catch (error) { result.textContent = `Import abgebrochen: ${error.message}`; }
    event.target.value = "";
  });
  function init() {
    const anchor = document.querySelector("#watchlist-body");
    anchor?.parentElement?.insertAdjacentElement("beforebegin", panel);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
