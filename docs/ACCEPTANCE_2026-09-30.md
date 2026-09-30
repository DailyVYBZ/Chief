# Chief 0.5/0.6 – technische Abnahme am 30.09.2026

**Ergebnis:** Technische Teilabnahme des Draft-Stands. Kein Merge: instrumentgleiche XTB-Bid/Ask-Daten und ein echter Smartphone-/TLS-Test fehlen. Öffentliche Kurse sind nur Vergleichswerte und lösen keine exakten Broker-Alarme aus.

## PRs, Backup und Import

- [PR #9](https://github.com/DailyVYBZ/Chief/pull/9) ist Draft auf `3764d30` gegen `main`; CI erfolgreich. [PR #10](https://github.com/DailyVYBZ/Chief/pull/10) ist darauf gestapelt, Draft auf `b7d9017`; CI erfolgreich. Beide sind offen und ungemergt.
- Der lokale Stand wurde auf den aktuellen PR-Head gebracht. Der zusätzliche Commit `b7d9017` liest lokale Daten nach der Netzantwort und verwirft eine Konfliktauswahl, wenn sich lokale Daten inzwischen geändert haben.
- Workspace-Schreibvorgänge sind versioniert: ein veralteter Stand wird als Konflikt abgewiesen, die vorige Serverrevision bleibt in `workspace.json.bak`. Beim Übernehmen eines Serverstands wird der verdrängte lokale Stand gesichert. Der XTB-CSV-Import bewahrt Trigger, Stop und Ziele; doppelte Symbole, ungültige Bid/Ask-Werte und Zeitpunkte ohne Zeitzone werden abgewiesen. Dies ist durch `test/workspace.test.js`, `test/sync-ui.test.js` und `test/xtb-import.test.js` abgedeckt.

## Heutige Prüfungen

- `npm test`: **51 bestanden, 0 fehlgeschlagen**. `npm run build:portable`: erfolgreich. Die GitHub-CI der beiden PR-Heads ist erfolgreich.
- Serverbrowser: Dashboard und Watchlist bei 390 px geprüft; mobile Navigation funktioniert, zehn Marktkarten sind vorhanden, Dokumentbreite 375 px bei 390 px Viewport. Desktopansicht war erreichbar. Im isolierten Test-Workspace speicherte **Abgleichen** Version 1 mit 19 Szenarien und Alarmfeldern. Das belegt einen Browser-/Serverablauf, keinen Test auf zwei realen Geräten.
- Die alten XTB-Referenzen vom 11.09. blieben in der Watchlist sichtbar als **DATEN ALT** markiert; frische Yahoo-Werte erschienen getrennt als Vergleich mit Quelle, Zeit und ohne Ask.
- Die portable Datei wurde gebaut und ihr Dateiursprung ist durch den CORS-/Token-/GET-/PUT-Integrationstest abgedeckt. Eine interaktive `file://`-Prüfung konnte die verfügbare Browsersteuerung wegen einer Protokollsperre nicht durchführen.

## Zehn Märkte: Live-Abruf um 17:03:37 UTC

`GET /api/quotes` meldete `requested: 10`, `received: 10`, `missing: []`, keine Fehler. Alle Datensätze waren Yahoo-Referenzwerte mit `authoritative: false` und `ask: null`. Momentaufnahme, keine dauerhafte Providerzusage.

| Chief | Provider-Symbol | Preis | Provider-Zeit UTC | XTB-Bid/Ask |
|---|---|---:|---|---|
| SILVER | `SI=F` | 60,635 | 16:53:29 | nicht belegt |
| GOLD | `GC=F` | 4.190,1 | 16:53:33 | nicht belegt |
| DE40 | `^GDAXI` | 25.199,19 | 16:00:00 | nicht belegt |
| US100 | `^NDX` | 30.590,963 | 17:03:28 | nicht belegt |
| US500 | `^GSPC` | 7.711,66 | 17:03:36 | nicht belegt |
| OIL | `BZ=F` | 98,72 | 16:53:05 | nicht belegt |
| SOLANA | `SOL-USD` | 120,22 | 17:03:31 | nicht belegt |
| BITCOIN | `BTC-USD` | 84.252,75 | 17:03:36 | nicht belegt |
| ETHEREUM | `ETH-USD` | 2.692,59 | 17:03:30 | nicht belegt |
| EURUSD | `EURUSD=X` | 1,1343 | 17:02:56 | nicht belegt |

Stale-Data-Sperre, fehlender Zeitstempel, Provider-Ausfall und Teilabdeckung sind durch die Quote-/Provider-Tests abgedeckt. Die [XTB-Hilfe](https://www.xtb.com/int/help-center/our-platforms-6-4/does-xtb-offer-investment-automation-tools) bestätigt weiterhin, dass der API-Zugang am 14.03.2025 eingestellt wurde. Damit ist ein autorisierter automatischer XTB-Bid/Ask-Abruf für **alle zehn** Instrumente über diese Schnittstelle blockiert; der manuelle CSV-Weg beweist keinen Live-Feed.

## Rest und Freigabeentscheidung

Auf dem Prüf-PC war kein Android-/iPhone-/MTP-Gerät erreichbar; die vorhandenen WPD-Einträge sind Laufwerke, `adb` fehlt. Ein vertrauenswürdiges TLS-Zertifikat und eine erreichbare Smartphone-Adresse für den Gerätetest liegen nicht vor. Die mobile Browserbreite ersetzt diesen Test nicht.

**Vor Merge warten:** echten Smartphone-/TLS-Abgleich durchführen und für automatische exakte Alarme eine autorisierte instrumentgleiche Kursquelle nachweisen oder den manuellen Referenzbetrieb ausdrücklich als Zielumfang festlegen. Bis dahin bleiben PR #9 und #10 Draft. Keine Order, Veröffentlichung oder kostenpflichtige Aktivierung erfolgte.
