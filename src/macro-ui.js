import { createCatalyst, publishCatalyst } from "./macro.js";

const KEY = "chief-macro-events-v1";
const panel = document.querySelector("#chief-macro");
const symbols = ["SILVER", "GOLD", "DE40", "US100", "US500", "OIL", "SOLANA", "BITCOIN", "ETHEREUM", "EURUSD"];
const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const read = () => { try { const value = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(value) ? value : []; } catch { return []; } };
const save = events => localStorage.setItem(KEY, JSON.stringify(events));

function render() {
  if (!panel) return;
  const events = read();
  const pending = [...new Set(events.filter(event => event.publishedAt).flatMap(event => event.markets))];
  panel.innerHTML = `<h3>Makro Kontext</h3><p>Ereignisse dokumentieren Quellen und Marktbezug. Ein Ereignis fordert eine Prüfung an, es ändert keinen Trigger, Stop oder Kerzenschluss.</p>
    <p>Prüfpflichtig nach Ereignis: ${pending.length ? pending.map(escape).join(", ") : "kein Markt"}. Eine Prüfung wird separat dokumentiert.</p>
    <details><summary>Ereignis erfassen</summary><form id="macro-create" class="form-grid three">
      <label>Kennung<input name="id" required placeholder="z. B. FED-2026-09-16"></label>
      <label>Typ<select name="type">${["CPI", "FED", "EZB", "ARBEITSMARKT", "OEL", "KRYPTO"].map(x => `<option>${x}</option>`).join("")}</select></label>
      <label>Geplanter Zeitpunkt<input name="scheduledAt" type="datetime-local" required></label>
      <label>Primärquelle HTTPS<input name="sourceUrl" type="url" pattern="https://.*" required></label>
      <label>Ereignisrisiko<select name="risk"><option value="normal">Normal</option><option value="high">Erhöht</option></select></label>
      <fieldset><legend>Betroffene Märkte</legend>${symbols.map(symbol => `<label><input name="markets" type="checkbox" value="${symbol}">${symbol}</label>`).join("")}</fieldset>
      <button class="secondary compact" type="submit">Ereignis speichern</button>
    </form></details>
    <h4>Ereignisse</h4>${events.map(event => `<details><summary>${escape(event.type)} · ${escape(event.id)} · ${escape(event.scheduledAt)} · ${event.publishedAt ? "prüfpflichtig" : "geplant"}</summary>
      <p>${event.markets.map(escape).join(", ")} · <a href="${escape(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Quelle</a></p>
      ${event.publishedAt ? `<p>Veröffentlicht ${escape(event.publishedAt)} · Erfasst ${escape(event.observedAt)} · ${escape(event.summary)}</p>` : `<form data-publish="${escape(event.id)}" class="form-grid three">
        <label>Veröffentlichung<input name="publishedAt" type="datetime-local" required></label>
        <label>Eigener Abruf<input name="observedAt" type="datetime-local" required></label>
        <label>Ergebnis<input name="summary" required></label>
        <label>Quellenadresse<input name="sourceUrl" type="url" pattern="https://.*" required value="${escape(event.sourceUrl)}"></label>
        <button class="secondary compact" type="submit">Veröffentlichung erfassen</button></form>`}</details>`).join("") || "<p>Keine Ereignisse erfasst.</p>"}
    <p id="macro-error" role="alert"></p>`;
  const error = message => { panel.querySelector("#macro-error").textContent = message; };
  panel.querySelector("#macro-create").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    input.markets = [...form.querySelectorAll('[name="markets"]:checked')].map(node => node.value);
    try {
      if (read().some(event => event.id === input.id)) throw new Error("Kennung existiert bereits");
      const next = createCatalyst(input);
      save([...read(), next]); render();
    } catch (exception) { error(exception.message); }
  });
  panel.querySelectorAll("[data-publish]").forEach(form => form.addEventListener("submit", e => {
    e.preventDefault();
    try {
      const input = Object.fromEntries(new FormData(form));
      const event = read().find(item => item.id === form.dataset.publish);
      const published = publishCatalyst(event, input);
      const next = read().map(item => item.id === published.id ? published : item);
      save(next); render();
    } catch (exception) { error(exception.message); }
  }));
}

if (panel) {
  window.addEventListener("storage", event => { if (event.key === KEY) render(); });
  render();
}
