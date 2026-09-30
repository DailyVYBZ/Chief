(() => {
  const WATCHLIST_KEY = "chief-watchlist-v2";
  const JOURNAL_KEY = "chief-journal-v1";
  const ALERT_STATES_KEY = "chief-alert-states-v1";
  const ALERT_HISTORY_KEY = "chief-alert-history-v1";
  const MACRO_EVENTS_KEY = "chief-macro-events-v1";
  const POSITIONS_KEY = "chief-positions-v1";
  const RISK_SETTINGS_KEY = "chief-risk-settings-v1";
  const LIVE_QUOTES_KEY = "chief-live-quotes-v1";
  const SNAPSHOTS_KEY = "chief-market-snapshots-v1";
  const MANUAL_ANCHOR_KEY = "chief-live-manual-anchor-v1";
  const MODE_KEY = "chief-live-mode-v1";
  const REFRESH_MS = 60_000;
  const MAX_SNAPSHOTS = 20;
  const symbols = ["SILVER", "GOLD", "DE40", "US100", "US500", "OIL", "SOLANA", "BITCOIN", "ETHEREUM", "EURUSD"];
  const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 });
  const percent = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const state = {
    loading: false,
    lastSuccess: null,
    lastError: "",
    timer: null,
    quotes: loadJson(LIVE_QUOTES_KEY, []),
    activeMode: localStorage.getItem(MODE_KEY) === "active",
    portable: location.protocol === "file:"
  };

  if (state.portable && state.activeMode) {
    state.activeMode = false;
    localStorage.setItem(MODE_KEY, "shadow");
  }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadWatchlist() {
    const value = loadJson(WATCHLIST_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function finite(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function ageHours(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return Infinity;
    const age = (Date.now() - date.getTime()) / 3_600_000;
    return age < -5 / 60 ? Infinity : age;
  }

  function signalForSetup(item, referencePrice) {
    const price = finite(referencePrice);
    const trigger = finite(item?.trigger);
    if (!item || item.planStatus !== "validated") return { label: "HISTORISCH", tone: "muted", priority: 5, distance: Infinity };
    if (!price || !trigger) return { label: "KURS FEHLT", tone: "bad", priority: 5, distance: Infinity };
    const distance = Math.abs(price - trigger) / trigger * 100;
    const reached = item.direction === "short" ? price <= trigger : price >= trigger;
    if (reached) return { label: "BESTÄTIGUNG PRÜFEN", tone: "watch", priority: 0, distance };
    if (distance <= 0.25) return { label: "TRIGGER EXTREM NAH", tone: "watch", priority: 1, distance };
    if (distance <= 0.5) return { label: "TRIGGER SEHR NAH", tone: "good", priority: 2, distance };
    if (distance <= 1) return { label: "TRIGGER NAH", tone: "good", priority: 3, distance };
    return { label: "BEOBACHTEN", tone: "muted", priority: 4, distance };
  }

  function groupMarkets(items = loadWatchlist()) {
    const groups = new Map();
    for (const item of items) {
      if (!item?.symbol) continue;
      if (!groups.has(item.symbol)) groups.set(item.symbol, {
        symbol: item.symbol,
        name: item.name || item.symbol,
        assetClass: item.assetClass,
        referencePrice: finite(item.referencePrice),
        priceAsOf: item.priceAsOf,
        accumulationLevels: [],
        long: null,
        short: null
      });
      const group = groups.get(item.symbol);
      group.referencePrice = finite(item.referencePrice) || group.referencePrice;
      group.priceAsOf = item.priceAsOf || group.priceAsOf;
      if (Array.isArray(item.accumulationLevels)) group.accumulationLevels.push(...item.accumulationLevels.map(finite).filter(Boolean));
      group[item.direction === "short" ? "short" : "long"] = item;
    }
    for (const group of groups.values()) group.accumulationLevels = [...new Set(group.accumulationLevels)];
    return [...groups.values()];
  }

  function marketSignal(market, price = market.referencePrice) {
    const quote = currentQuote(market.symbol);
    const asOf = quote && price === quote.price ? quote.timestamp : market.priceAsOf;
    if (ageHours(asOf) > 24) {
      return { label: "DATEN ALT", tone: "bad", priority: 6, distance: Infinity, level: null, type: "stale" };
    }
    const candidates = [];
    for (const side of [market.long, market.short].filter(Boolean)) {
      const signal = signalForSetup(side, price);
      candidates.push({ ...signal, level: side.trigger, type: side.direction });
    }
    for (const level of market.accumulationLevels || []) {
      const distance = price && level ? Math.abs(price - level) / level * 100 : Infinity;
      const reached = price && price <= level;
      candidates.push({
        label: reached ? "NACHKAUF PRÜFEN" : distance <= 1 ? "NACHKAUF NAH" : "NACHKAUF BEOBACHTEN",
        tone: reached ? "watch" : distance <= 1 ? "good" : "muted",
        priority: reached ? 0 : distance <= 1 ? 2 : 5,
        distance,
        level,
        type: "accumulation"
      });
    }
    return candidates.sort((a, b) => a.priority - b.priority || a.distance - b.distance)[0] || {
      label: "KEIN SETUP", tone: "muted", priority: 9, distance: Infinity, level: null, type: "none"
    };
  }

  function currentQuote(symbol) {
    const quote = state.quotes.find(item => item.symbol === symbol);
    const age = quote ? (Date.now() - new Date(quote.timestamp).getTime()) / 3_600_000 : Infinity;
    return age >= -5 / 60 && age <= 24 ? quote : null;
  }

  function quotePriceForMarket(market) {
    const quote = currentQuote(market.symbol);
    return finite(quote?.price) || market.referencePrice;
  }

  function snapshotCurrentPrices(reason) {
    const watchlist = loadWatchlist();
    const snapshots = loadJson(SNAPSHOTS_KEY, []);
    snapshots.unshift({
      createdAt: new Date().toISOString(),
      reason,
      prices: watchlist.map(item => ({
        id: item.id,
        symbol: item.symbol,
        direction: item.direction,
        referencePrice: item.referencePrice,
        askPrice: item.askPrice,
        priceAsOf: item.priceAsOf,
        quoteSource: item.quoteSource,
        quoteProviderSymbol: item.quoteProviderSymbol,
        quoteAuthoritative: item.quoteAuthoritative
      }))
    });
    saveJson(SNAPSHOTS_KEY, snapshots.slice(0, MAX_SNAPSHOTS));
  }

  function captureManualAnchor() {
    const anchor = {
      createdAt: new Date().toISOString(),
      prices: loadWatchlist().map(item => ({
        id: item.id,
        referencePrice: item.referencePrice,
        askPrice: item.askPrice,
        priceAsOf: item.priceAsOf,
        quoteSource: item.quoteSource,
        quoteProviderSymbol: item.quoteProviderSymbol,
        quoteAuthoritative: item.quoteAuthoritative
      }))
    };
    saveJson(MANUAL_ANCHOR_KEY, anchor);
  }

  function restoreManualAnchor() {
    const anchor = loadJson(MANUAL_ANCHOR_KEY, null);
    if (!anchor?.prices?.length) return false;
    const byId = new Map(anchor.prices.map(item => [item.id, item]));
    const restored = loadWatchlist().map(item => {
      const previous = byId.get(item.id);
      if (!previous) return item;
      const next = {
        ...item,
        referencePrice: previous.referencePrice,
        askPrice: previous.askPrice,
        priceAsOf: previous.priceAsOf
      };
      if (previous.quoteSource) next.quoteSource = previous.quoteSource; else delete next.quoteSource;
      if (previous.quoteProviderSymbol) next.quoteProviderSymbol = previous.quoteProviderSymbol; else delete next.quoteProviderSymbol;
      if (previous.quoteAuthoritative !== undefined) next.quoteAuthoritative = previous.quoteAuthoritative; else delete next.quoteAuthoritative;
      return next;
    });
    saveJson(WATCHLIST_KEY, restored);
    localStorage.removeItem(MANUAL_ANCHOR_KEY);
    return true;
  }

  function applyQuotesToWatchlist(quotes) {
    if (!state.activeMode) return;
    const quoteMap = new Map(quotes.map(quote => [quote.symbol, quote]));
    if (!loadWatchlist().some(item => quoteMap.has(item.symbol) && currentQuote(item.symbol))) return;
    snapshotCurrentPrices("Vor Live Kurs Aktualisierung");
    const updated = loadWatchlist().map(item => {
      const quote = quoteMap.get(item.symbol);
      if (!quote?.price || !currentQuote(item.symbol)) return item;
      return {
        ...item,
        referencePrice: quote.price,
        askPrice: quote.ask ?? 0,
        priceAsOf: quote.timestamp,
        quoteSource: quote.source,
        quoteProviderSymbol: quote.providerSymbol,
        quoteAuthoritative: Boolean(quote.authoritative)
      };
    });
    saveJson(WATCHLIST_KEY, updated);
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Noch nicht aktualisiert";
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Stand fehlt";
    return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function injectStyles() {
    if (document.querySelector("#chief-live-styles")) return;
    const style = document.createElement("style");
    style.id = "chief-live-styles";
    style.textContent = `
      .chief-live-button{display:flex;align-items:center;gap:7px}
      .chief-live-button i{width:7px;height:7px;border-radius:50%;background:var(--amber);box-shadow:0 0 9px rgba(255,200,87,.4)}
      .chief-live-button.online i{background:var(--green);box-shadow:0 0 9px rgba(85,223,135,.55)}
      .chief-live-button.loading i{animation:chief-pulse .7s infinite alternate}
      .chief-live-button.error i{background:var(--red)}
      @keyframes chief-pulse{to{opacity:.25}}
      .chief-command-center{border:1px solid var(--line);background:linear-gradient(135deg,rgba(98,168,255,.08),rgba(200,255,61,.035));border-radius:var(--radius);padding:15px 17px;margin:-2px 0 18px;display:grid;grid-template-columns:minmax(220px,1.1fr) repeat(3,minmax(130px,.55fr));gap:12px;align-items:stretch}
      .chief-command-main{display:flex;flex-direction:column;justify-content:center;gap:5px}
      .chief-command-main strong{font-size:.9rem}.chief-command-main p{margin:0;color:var(--muted);font-size:.72rem}
      .chief-command-metric{border:1px solid var(--line);background:rgba(8,10,13,.45);border-radius:10px;padding:11px 12px;min-width:0}
      .chief-command-metric span{display:block;color:var(--muted);font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}.chief-command-metric strong{display:block;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .chief-live-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.chief-live-actions button{padding:6px 9px;font-size:.68rem}
      .chief-opportunities{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.chief-opportunity{display:inline-flex;gap:5px;align-items:center;border:1px solid var(--line);border-radius:99px;padding:4px 8px;font-size:.65rem;color:#c6ccd5;background:#0c0f14}.chief-opportunity b{color:var(--lime)}
      .chief-live-quote{display:block;color:var(--blue)!important;max-width:none!important;margin-top:4px!important;font-size:.64rem!important}
      .chief-shadow-note{color:var(--muted);font-size:.65rem;margin-left:4px}
      .chief-mode-active{color:var(--green)!important}.chief-mode-shadow{color:var(--amber)!important}
      @media(max-width:1050px){.chief-command-center{grid-template-columns:1fr 1fr}.chief-command-main{grid-column:1/-1}}
      @media(max-width:620px){.chief-command-center{grid-template-columns:1fr}.chief-command-main{grid-column:auto}.top-actions .chief-live-button{display:none}}
    `;
    document.head.appendChild(style);
  }

  function ensureTopbarButton() {
    const topActions = document.querySelector(".top-actions");
    if (!topActions || document.querySelector("#chief-live-refresh")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "chief-live-refresh";
    button.className = "secondary compact chief-live-button";
    button.innerHTML = "<i></i><span>Live prüfen</span>";
    button.addEventListener("click", () => refreshQuotes(true));
    topActions.insertBefore(button, topActions.firstChild);
  }

  function ensureCommandCenter() {
    const attention = document.querySelector(".attention-card");
    if (!attention || document.querySelector("#chief-command-center")) return;
    const panel = document.createElement("section");
    panel.id = "chief-command-center";
    panel.className = "chief-command-center";
    attention.insertAdjacentElement("afterend", panel);
  }

  function renderCommandCenter() {
    const panel = document.querySelector("#chief-command-center");
    if (!panel) return;
    const markets = groupMarkets();
    const ranked = markets.map(market => {
      const livePrice = quotePriceForMarket(market);
      return { market, signal: marketSignal(market, livePrice), livePrice };
    }).sort((a, b) => a.signal.priority - b.signal.priority || a.signal.distance - b.signal.distance);
    const top = ranked.slice(0, 3);
    const stale = markets.filter(market => ageHours(market.priceAsOf) > 24).length;
    const quoteCount = symbols.filter(symbol => currentQuote(symbol)).length;
    const modeLabel = state.portable ? "Portable" : state.activeMode ? "Live als Referenz" : "Live Vergleich";
    const nearest = top.find(item => item.signal.type !== "stale" && Number.isFinite(item.signal.distance));
    const timestamps = state.quotes.map(quote => quote.fetchedAt || quote.timestamp).filter(Boolean).sort();
    const last = state.lastSuccess || timestamps.at(-1);

    panel.innerHTML = `
      <div class="chief-command-main">
        <span class="panel-kicker">Chief Command Center</span>
        <strong>${state.portable ? "Lokaler Modus" : state.lastError ? "Provider teilweise nicht erreichbar" : "Marktdaten Kontrolle aktiv"}</strong>
        <p>${state.activeMode ? "Provider Kurse aktualisieren die Chief Referenzkurse. Beim Ausschalten wird dein vorheriger XTB Kursstand wiederhergestellt." : "Provider Kurse laufen als Vergleich. Deine XTB Referenzkurse bleiben unverändert."}</p>
        <div class="chief-opportunities">${top.map(({ market, signal }) => `<span class="chief-opportunity"><b>${market.symbol}</b>${signal.type === "accumulation" ? "Nachkauf" : signal.type === "short" ? "Short" : "Long"} ${signal.level ? number.format(signal.level) : ""} · ${Number.isFinite(signal.distance) ? percent.format(signal.distance) : "—"}%</span>`).join("")}</div>
        <div class="chief-live-actions">
          <button type="button" class="secondary compact" id="chief-mode-toggle" ${state.portable ? "disabled" : ""}>${state.activeMode ? "Live Referenz AUS" : "Live Referenz EIN"}</button>
          <button type="button" class="secondary compact" id="chief-backup-export">Workspace Backup</button>
          <button type="button" class="secondary compact" id="chief-restore-snapshot">Letzten Kurs Snapshot</button>
        </div>
      </div>
      <div class="chief-command-metric"><span>Modus</span><strong class="${state.activeMode ? "chief-mode-active" : "chief-mode-shadow"}">${modeLabel}</strong></div>
      <div class="chief-command-metric"><span>Live Kurse</span><strong>${quoteCount}/${symbols.length} · ${last ? formatTime(last) : "kein Abruf"}</strong></div>
      <div class="chief-command-metric"><span>Nächster Level</span><strong>${nearest ? `${nearest.market.symbol} ${nearest.signal.level ? number.format(nearest.signal.level) : ""}` : "—"}</strong><small class="chief-shadow-note">${stale} XTB Referenzen älter als 24 h</small></div>`;

    panel.querySelector("#chief-mode-toggle")?.addEventListener("click", toggleMode);
    panel.querySelector("#chief-backup-export")?.addEventListener("click", exportWorkspaceBackup);
    panel.querySelector("#chief-restore-snapshot")?.addEventListener("click", restoreLatestSnapshot);
  }

  function updateProviderState() {
    const provider = document.querySelector(".provider-state");
    if (provider) {
      const strong = provider.querySelector("strong");
      const small = provider.querySelector("small");
      const dot = provider.querySelector(".status-dot");
      if (strong) strong.textContent = state.portable ? "Manuelle XTB Kurse" : state.activeMode ? "Live Referenz aktiv" : "Live Vergleich aktiv";
      if (small) small.textContent = state.portable ? "Portable Modus" : state.lastError || (state.lastSuccess ? `Abruf ${formatTime(state.lastSuccess)}` : "Provider bereit");
      if (dot) dot.classList.toggle("amber", state.portable || !state.lastSuccess || Boolean(state.lastError));
    }

    const version = document.querySelector(".version");
    if (version) version.textContent = "Chief 0.6.0";

    const button = document.querySelector("#chief-live-refresh");
    if (button) {
      button.classList.toggle("loading", state.loading);
      button.classList.toggle("online", Boolean(state.lastSuccess) && !state.lastError);
      button.classList.toggle("error", Boolean(state.lastError));
      const text = button.querySelector("span");
      if (text) text.textContent = state.loading ? "Live lädt" : state.lastError ? "Live erneut" : state.lastSuccess ? `Live ${formatTime(state.lastSuccess)}` : "Live prüfen";
    }
  }

  function updateVisibleCards() {
    const markets = groupMarkets();
    for (const market of markets) {
      const quote = currentQuote(market.symbol);
      const livePrice = finite(quote?.price);
      const activePrice = state.activeMode && livePrice ? livePrice : market.referencePrice;
      const signal = marketSignal(market, activePrice);
      const card = document.querySelector(`[data-market-card="${market.symbol}"]`);
      if (card) {
        const input = card.querySelector("[data-market-price]");
        if (input && state.activeMode && livePrice) input.value = String(livePrice);
        const timeNode = card.querySelector(".market-price small:not(.chief-live-quote)");
        if (timeNode && state.activeMode && quote?.timestamp) timeNode.textContent = formatDateTime(quote.timestamp);
        let note = card.querySelector(".chief-live-quote");
        if (!note) {
          note = document.createElement("small");
          note.className = "chief-live-quote";
          card.querySelector(".market-price")?.appendChild(note);
        }
        if (note) {
          if (livePrice) {
            const drift = market.referencePrice ? (livePrice - market.referencePrice) / market.referencePrice * 100 : null;
            note.textContent = `${state.activeMode ? "Referenz" : "Vergleich"}: ${number.format(livePrice)} · Ask ${finite(quote.ask) ? number.format(quote.ask) : "nicht verfügbar"} · ${quote.source} · ${formatDateTime(quote.timestamp)}${Number.isFinite(drift) ? ` · Drift ${drift >= 0 ? "+" : ""}${percent.format(drift)} %` : ""}`;
          } else note.textContent = state.quotes.some(item => item.symbol === market.symbol) ? "Provider Kurs veraltet" : "Kein Provider Kurs";
        }
        const badge = card.querySelector(".market-state-box .badge");
        const distance = card.querySelector(".market-state-box small");
        if (badge && state.activeMode) {
          badge.className = `badge ${signal.tone}`;
          badge.textContent = signal.label;
        }
        if (distance && state.activeMode) distance.textContent = Number.isFinite(signal.distance) ? `${percent.format(signal.distance)} % bis Level` : "";

        for (const direction of ["long", "short"]) {
          const item = market[direction];
          const scenario = card.querySelector(`.scenario-card.${direction}`);
          const scenarioBadge = scenario?.querySelector(".badge");
          if (scenarioBadge && item && state.activeMode) {
            const sideSignal = signalForSetup(item, activePrice);
            scenarioBadge.className = `badge ${sideSignal.tone}`;
            scenarioBadge.textContent = sideSignal.label;
          }
        }
      }
    }

    document.querySelectorAll("#dashboard-watchlist-body tr").forEach(row => {
      const symbol = row.querySelector("td strong")?.textContent?.trim();
      if (!symbol) return;
      const market = markets.find(item => item.symbol === symbol);
      const quote = currentQuote(symbol);
      const livePrice = finite(quote?.price);
      if (!market || !livePrice) return;
      if (state.activeMode) {
        const signal = marketSignal(market, livePrice);
        if (row.children[1]) row.children[1].textContent = number.format(livePrice);
        if (row.children[2]) row.children[2].textContent = `${signal.type === "accumulation" ? "Nachkauf" : signal.type === "short" ? "Short" : "Long"} ${signal.level ? number.format(signal.level) : ""}`;
        if (row.children[3]) row.children[3].textContent = Number.isFinite(signal.distance) ? `${percent.format(signal.distance)} %` : "—";
        const badge = row.children[4]?.querySelector(".badge");
        if (badge) {
          badge.className = `badge ${signal.tone}`;
          badge.textContent = signal.label;
        }
      } else if (row.children[1]) {
        row.children[1].title = `Live Vergleich ${number.format(livePrice)} · ${quote.source}`;
      }
    });
  }

  async function refreshQuotes(manual = false) {
    if (state.loading || state.portable) {
      if (manual && state.portable) showNotice("Live Abruf benötigt den Chief Servermodus. Die portable Datei bleibt im XTB Handmodus.");
      return;
    }
    state.loading = true;
    state.lastError = "";
    updateProviderState();
    try {
      const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok && !payload?.quotes?.length) throw new Error(payload?.error || "Alle Kursprovider ausgefallen oder Kurse veraltet");
      const incoming = (payload.quotes || []).map(quote => ({ ...quote, fetchedAt: payload.generatedAt || new Date().toISOString() }));
      const received = new Set(incoming.map(quote => quote.symbol));
      state.quotes = [...incoming, ...state.quotes.filter(quote => !received.has(quote.symbol))];
      if (incoming.length) state.lastSuccess = payload.generatedAt || new Date().toISOString();
      state.lastError = payload.status?.missing?.length ? `${payload.status.missing.length} Märkte ohne aktuellen Kurs: ${payload.status.missing.join(", ")}` : "";
      saveJson(LIVE_QUOTES_KEY, state.quotes);
      applyQuotesToWatchlist(incoming);
      updateVisibleCards();
      renderCommandCenter();
      if (manual) showNotice(`${incoming.length}/${symbols.length} Referenzkurse aktualisiert${state.lastError ? ` · ${state.lastError}` : ""}`);
    } catch (error) {
      state.lastError = error.message || "Live Abruf fehlgeschlagen";
      if (manual) showNotice(state.lastError);
    } finally {
      state.loading = false;
      updateProviderState();
    }
  }

  function toggleMode() {
    if (state.portable) return;
    if (!state.activeMode) {
      captureManualAnchor();
      state.activeMode = true;
      localStorage.setItem(MODE_KEY, "active");
      if (state.quotes.length) applyQuotesToWatchlist(state.quotes.filter(quote => currentQuote(quote.symbol)));
      updateVisibleCards();
      updateProviderState();
      renderCommandCenter();
      showNotice("Live Provider Kurs ist jetzt Chief Referenzkurs");
      return;
    }

    const restored = restoreManualAnchor();
    state.activeMode = false;
    localStorage.setItem(MODE_KEY, "shadow");
    showNotice(restored ? "Vorheriger XTB Kursstand wiederhergestellt" : "Live Referenz ausgeschaltet");
    window.setTimeout(() => location.reload(), restored ? 350 : 0);
  }

  function exportWorkspaceBackup() {
    const payload = {
      version: "chief-workspace-backup-1",
      exportedAt: new Date().toISOString(),
      watchlist: loadWatchlist(),
      journal: loadJson(JOURNAL_KEY, []),
      alertStates: loadJson(ALERT_STATES_KEY, {}),
      alertHistory: loadJson(ALERT_HISTORY_KEY, []),
      macroEvents: loadJson(MACRO_EVENTS_KEY, []),
      positions: loadJson(POSITIONS_KEY, []),
      riskSettings: loadJson(RISK_SETTINGS_KEY, {}),
      liveQuotes: state.quotes,
      snapshots: loadJson(SNAPSHOTS_KEY, []),
      manualAnchor: loadJson(MANUAL_ANCHOR_KEY, null),
      liveMode: state.activeMode ? "active" : "shadow"
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `chief-workspace-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotice("Workspace Backup erstellt");
  }

  function restoreLatestSnapshot() {
    const snapshots = loadJson(SNAPSHOTS_KEY, []);
    const latest = snapshots[0];
    if (!latest?.prices?.length) return showNotice("Noch kein Kurs Snapshot vorhanden");
    const byId = new Map(latest.prices.map(item => [item.id, item]));
    const restored = loadWatchlist().map(item => {
      const previous = byId.get(item.id);
      return previous ? { ...item, ...previous } : item;
    });
    saveJson(WATCHLIST_KEY, restored);
    state.activeMode = false;
    localStorage.setItem(MODE_KEY, "shadow");
    localStorage.removeItem(MANUAL_ANCHOR_KEY);
    showNotice(`Kurs Snapshot von ${formatTime(latest.createdAt)} wiederhergestellt`);
    window.setTimeout(() => location.reload(), 350);
  }

  function showNotice(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function bindShortcuts() {
    document.addEventListener("keydown", event => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (typing) return;
      if (event.key === "/") {
        event.preventDefault();
        document.querySelector("#watchlist-search")?.focus();
      }
      if (event.key.toLowerCase() === "r") refreshQuotes(true);
    });
  }

  function schedule() {
    window.clearInterval(state.timer);
    if (!state.portable) state.timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshQuotes(false);
    }, REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.lastSuccess && Date.now() - new Date(state.lastSuccess).getTime() > REFRESH_MS) refreshQuotes(false);
    });
  }

  function init() {
    injectStyles();
    ensureTopbarButton();
    ensureCommandCenter();
    updateProviderState();
    renderCommandCenter();
    updateVisibleCards();
    bindShortcuts();
    schedule();
    if (!state.portable) window.setTimeout(() => refreshQuotes(false), 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
