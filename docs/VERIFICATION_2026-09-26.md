# Chief 0.6 – Prüfstand vom 26.09.2026

## Ausgeführt

* `npm test`: 49 Tests bestanden, 0 fehlgeschlagen.
* `npm run build:portable`: `dist/Investment-Chief.html` erfolgreich erstellt.
* GitHub Actions „Chief CI“ für Commit `ae9e524`: erfolgreich.
* Browseransicht zuvor am Desktop und mit 390 px Breite geprüft; kein horizontaler Überlauf. Das ist kein Test auf einem echten Smartphone.
* Lokaler Workspace API Test zuvor mit erstem PUT, 409 bei veralteter Revision, erneutem GET nach Serverneustart, 403 ohne Origin und bei fremdem Host sowie verweigertem Start mit Netzwerkfreigabe ohne TLS/Token. Der Workspace Test prüft zusätzlich die vorige Serverrevision in `workspace.json.bak`.

## Live Abruf

Am 26.09.2026 um 09:01:11 UTC lieferte `GET /api/quotes` bei einem lokalen Chief Server `requested: 10`, `received: 10`, `missing: []`. Die Antwort enthielt SILVER, GOLD, DE40, US100, US500, OIL, SOLANA, BITCOIN, ETHEREUM und EURUSD. Für alle zehn lautete die Quelle `Yahoo Finance`, jeder Datensatz hatte einen Provider Zeitstempel und alle zehn hatten `ask: null`. Der Abruf ist ein Zeitpunktnachweis, keine Zusage dauerhafter Verfügbarkeit. Der Server verwirft Kurswerte ohne echten Provider Zeitstempel, zu alte Werte und unzulässig zukünftige Werte; Tests decken diese Fälle und Provider Ausfall ab.

## Externe Grenzen

* XTB bestätigt, dass der API Zugang seit dem 14.03.2025 eingestellt ist: <https://www.xtb.com/int/help-center/our-platforms-6-4/does-xtb-offer-investment-automation-tools-4>. Damit lässt sich ein automatischer, instrumentgleicher XTB Bid/Ask Feed aus dieser Schnittstelle nicht herstellen. Der separate manuelle CSV Import bleibt als Zwischenweg gekennzeichnet und löst keine automatischen Alarme aus.
* Am Prüf PC wurde kein Android, iPhone oder MTP Gerät erkannt; `adb` war nicht vorhanden. Die 390 px Browseransicht und der API Test belegen deshalb keine Bedienung oder Synchronisation auf einem echten Smartphone. Für den Netzwerktest auf einem Gerät fehlen außerdem eine erreichbare Geräteadresse und ein für sie vertrauenswürdiges TLS Zertifikat.

Chief wurde weder zusammengeführt noch veröffentlicht. Ein kostenpflichtiger Dienst wurde nicht aktiviert.
