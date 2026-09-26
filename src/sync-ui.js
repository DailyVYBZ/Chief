import { readLocalWorkspace, reconcileWorkspace, writeLocalWorkspace } from "./workspace.js";

(() => {
  const BASELINE_KEY = "chief-sync-baseline-v1";
  const ENABLED_KEY = "chief-sync-enabled-v1";
  const TOKEN_KEY = "chief-sync-token-v1";
  const LOCAL_BACKUP_KEY = "chief-sync-local-backup-v1";
  const SERVER_URL_KEY = "chief-sync-server-url-v1";
  const portable = location.protocol === "file:";
  let busy = false;
  let conflict = null;
  const panel = document.createElement("section");
  panel.className = "panel chief-sync-panel";
  panel.innerHTML = `<h3>Geräteabgleich</h3>
    <p id="chief-sync-status" role="status">Lokaler Abgleich bereit. Daten werden erst nach „Abgleichen“ auf diesem Chief Server gespeichert.</p>
    ${portable ? '<label>Chief Serveradresse <input id="chief-sync-server-url" type="url" placeholder="https://chief.example:4173" autocomplete="url" /></label>' : ""}
    <label>Zugriffscode für geschützten Server <input id="chief-sync-token" type="password" autocomplete="off" placeholder="Nur bei Netzwerkzugriff" /></label>
    <div class="chief-sync-actions"><button type="button" class="secondary compact" id="chief-sync-now">Abgleichen</button>
    <button type="button" class="secondary compact" id="chief-sync-pull" hidden>Serverstand übernehmen</button>
    <button type="button" class="secondary compact" id="chief-sync-push" hidden>Lokalen Stand hochladen</button></div>`;

  const status = message => { panel.querySelector("#chief-sync-status").textContent = message; };
  const hash = data => JSON.stringify(data);
  const baseline = () => { try { return JSON.parse(localStorage.getItem(BASELINE_KEY)); } catch { return null; } };
  const saveBaseline = (revision, data) => localStorage.setItem(BASELINE_KEY, JSON.stringify({ revision, hash: hash(data) }));
  const token = () => panel.querySelector("#chief-sync-token").value.trim();
  const headers = () => token() ? { Authorization: `Bearer ${token()}` } : {};
  const endpoint = () => {
    if (!portable) return "/api/workspace";
    const raw = panel.querySelector("#chief-sync-server-url").value.trim();
    let url;
    try { url = new URL(raw); } catch { throw new Error("Gültige Chief Serveradresse eingeben"); }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("Serveradresse benötigt HTTPS; HTTP ist nur auf diesem PC erlaubt");
    }
    if (!token()) throw new Error("Für die portable Datei ist ein Zugriffscode erforderlich");
    return `${url.origin}/api/workspace`;
  };
  const request = async (method, body) => {
    const response = await fetch(endpoint(), { method, headers: { ...headers(), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(response.status === 409 ? "Anderes Gerät hat zuerst gespeichert. Erneut abgleichen." : payload.error || `HTTP ${response.status}`);
    return payload;
  };
  const download = (data, name) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const preserveLocal = data => {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    download(data, `chief-lokal-vor-abgleich-${Date.now()}.json`);
  };
  const setConflict = value => {
    conflict = value;
    panel.querySelector("#chief-sync-pull").hidden = !value;
    panel.querySelector("#chief-sync-push").hidden = !value;
  };

  async function sync() {
    if (busy || document.visibilityState === "hidden") return;
    busy = true;
    try {
      const local = readLocalWorkspace(localStorage);
      const remote = await request("GET");
      const action = reconcileWorkspace(local, remote, baseline());
      if (action === "equal") { saveBaseline(remote.revision, local); setConflict(null); status(`Synchron · Version ${remote.revision}`); }
      if (action === "push") {
        const saved = await request("PUT", { baseRevision: remote.revision, data: local });
        saveBaseline(saved.revision, local); setConflict(null); status(`Lokal gespeichert · Version ${saved.revision}`);
      }
      if (action === "pull") {
        preserveLocal(local);
        localStorage.setItem("chief-live-mode-v1", "shadow");
        localStorage.removeItem("chief-live-manual-anchor-v1");
        writeLocalWorkspace(localStorage, remote.data); saveBaseline(remote.revision, remote.data);
        setConflict(null); status(`Serverstand übernommen · Version ${remote.revision}`); location.reload();
      }
      if (action === "conflict") {
        setConflict({ local, remote });
        status("Konflikt: Lokal und Server unterscheiden sich. Wähle einen Stand; der andere wird zuvor als JSON gesichert.");
      }
      if (action !== "conflict") localStorage.setItem(ENABLED_KEY, "true");
    } catch (error) { status(`Abgleich fehlgeschlagen: ${error.message}`); }
    finally { busy = false; }
  }

  panel.querySelector("#chief-sync-now").addEventListener("click", sync);
  if (portable) panel.querySelector("#chief-sync-server-url").addEventListener("change", event => localStorage.setItem(SERVER_URL_KEY, event.target.value.trim()));
  panel.querySelector("#chief-sync-token").addEventListener("change", () => sessionStorage.setItem(TOKEN_KEY, token()));
  panel.querySelector("#chief-sync-pull").addEventListener("click", () => {
    if (!conflict) return;
    try {
      preserveLocal(conflict.local);
      localStorage.setItem("chief-live-mode-v1", "shadow");
      localStorage.removeItem("chief-live-manual-anchor-v1");
      writeLocalWorkspace(localStorage, conflict.remote.data);
      saveBaseline(conflict.remote.revision, conflict.remote.data);
      localStorage.setItem(ENABLED_KEY, "true");
      location.reload();
    } catch (error) { status(`Übernahme abgebrochen: ${error.message}`); }
  });
  panel.querySelector("#chief-sync-push").addEventListener("click", async () => {
    if (!conflict) return;
    download(conflict.remote.data, `chief-server-vor-abgleich-${Date.now()}.json`);
    try {
      const saved = await request("PUT", { baseRevision: conflict.remote.revision, data: conflict.local });
      saveBaseline(saved.revision, conflict.local); localStorage.setItem(ENABLED_KEY, "true"); setConflict(null); status(`Lokaler Stand gespeichert · Version ${saved.revision}`);
    } catch (error) { status(`Abgleich fehlgeschlagen: ${error.message}`); }
  });

  function init() {
    const anchor = document.querySelector("#chief-command-center");
    if (!anchor) return;
    anchor.insertAdjacentElement("afterend", panel);
    panel.querySelector("#chief-sync-token").value = sessionStorage.getItem(TOKEN_KEY) || "";
    if (portable) {
      panel.querySelector("#chief-sync-server-url").value = localStorage.getItem(SERVER_URL_KEY) || "";
      status("Portable Datei bereit. Serveradresse und Zugriffscode eingeben, dann Abgleichen wählen.");
    }
    if (localStorage.getItem(ENABLED_KEY) === "true") sync();
    window.setInterval(() => { if (localStorage.getItem(ENABLED_KEY) === "true") sync(); }, 30_000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
