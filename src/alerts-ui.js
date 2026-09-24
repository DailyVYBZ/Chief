import { buildAlertDefinitions, advanceAlert, confirmAlert, freshAlertPrice } from "./alerts.js";

(() => {
  const WATCHLIST_KEY = "chief-watchlist-v2";
  const STATE_KEY = "chief-alert-states-v1";
  const HISTORY_KEY = "chief-alert-history-v1";
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const label = def => `${def.symbol} ${def.type === "accumulation" ? "Nachkauf" : def.direction === "long" ? "Long" : "Short"} ${def.level}`;
  const definitions = () => buildAlertDefinitions(read(WATCHLIST_KEY, []));

  function updateFromManualPrices() {
    const list = read(WATCHLIST_KEY, []);
    const states = read(STATE_KEY, {});
    const history = read(HISTORY_KEY, []);
    for (const def of buildAlertDefinitions(list)) {
      const item = list.find(entry => entry.symbol === def.symbol && entry.id === def.planId);
      // Provider reference data have different instruments from XTB and never
      // create an exact alarm. Only explicit manual Watchlist prices can do so.
      if (!item || item.quoteSource || !freshAlertPrice({ price: item.referencePrice, timestamp: item.priceAsOf })) continue;
      const result = advanceAlert(states[def.id], def, {
        price: item.referencePrice, timestamp: item.priceAsOf, source: "Manuelle Watchlist"
      });
      if (result.event) { states[def.id] = result.state; history.unshift(result.event); }
    }
    save(STATE_KEY, states);
    save(HISTORY_KEY, history.slice(0, 200));
    render();
  }

  function render() {
    const panel = document.querySelector("#chief-alerts");
    if (!panel) return;
    const defs = definitions();
    const states = read(STATE_KEY, {});
    const history = read(HISTORY_KEY, []);
    const reached = defs.filter(def => states[def.id]?.status === "reached");
    const confirmed = defs.filter(def => states[def.id]?.status === "confirmed");
    panel.innerHTML = `<h3>Alarme <small>${reached.length} Level erreicht · ${confirmed.length} bestätigt · ${defs.length} Pläne</small></h3>
      <p>Automatische XTB Alarme benötigen eine passende Kursquelle. Manuell gepflegte Kurse markieren nur Level erreicht. Den Kerzenschluss bestätigst du selbst.</p>
      <details><summary>Aktive und ausgelöste Alarme</summary>
      ${reached.length ? reached.map(def => `<form data-alert-id="${escape(def.id)}"><strong>${escape(label(def))}</strong>
        <span>Level erreicht um ${escape(states[def.id].reachedAt)} · ${escape(states[def.id].lastSource)}</span>
        ${def.type === "accumulation" ? "<span>Nachkauf separat prüfen</span>" : `<label>${def.timeframe} Schlusskurs <input name="closePrice" type="number" step="any" required></label><button class="secondary compact" type="submit">Schluss bestätigen</button>`}</form>`).join("") : "<p>Kein ausgelöstes Level.</p>"}
      <p>${defs.length - reached.length - confirmed.length} weitere Level aktiv. Bereits bestätigte Level bleiben bis zu einer neuen Planversion dokumentiert.</p>
      <h4>Alarmhistorie</h4><ol>${history.slice(0, 15).map(event => `<li>${escape(event.at)} · ${escape(event.alertId)} · ${escape(event.type)} · ${escape(event.price)}</li>`).join("") || "<li>Noch kein Ereignis</li>"}</ol></details>`;
    panel.querySelectorAll("form[data-alert-id]").forEach(form => form.addEventListener("submit", event => {
      event.preventDefault();
      const def = defs.find(item => item.id === form.dataset.alertId);
      const states = read(STATE_KEY, {});
      try {
        const result = confirmAlert(states[def.id], def, {
          timeframe: def.timeframe, closePrice: form.elements.closePrice.value, closedAt: new Date().toISOString()
        });
        states[def.id] = result.state;
        save(STATE_KEY, states);
        save(HISTORY_KEY, [result.event, ...read(HISTORY_KEY, [])].slice(0, 200));
        render();
      } catch (error) { window.alert(error.message); }
    }));
  }

  function init() {
    const anchor = document.querySelector(".attention-card");
    if (!anchor) return;
    const panel = document.createElement("section");
    panel.id = "chief-alerts";
    panel.className = "panel";
    panel.style.cssText = "margin:12px 0;padding:14px 18px";
    anchor.insertAdjacentElement("afterend", panel);
    window.addEventListener("chief:watchlist-updated", updateFromManualPrices);
    window.addEventListener("storage", event => { if (event.key === WATCHLIST_KEY) updateFromManualPrices(); });
    updateFromManualPrices();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
