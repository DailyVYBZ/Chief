# Architekturentscheidungen

## Ziel

Ein Instrument durchläuft den vollständigen Prozess Referenzkurs, Trigger, Bestätigung, Einstieg, Risiko, Ziele, Entscheidung und Dokumentation. Das Ergebnis muss reproduzierbar und prüfbar sein.

## Verbindliche Entscheidungen

1. Externe Plattformen liefern Marktdaten. Chief bewertet mit einem eigenen versionierten Regelwerk.
2. Trigger und Einstieg sind getrennte Felder. Ein erreichter Kurs allein bestätigt kein Setup.
3. Long und Short bleiben getrennte Szenarien. Symbol und Richtung bilden den eindeutigen Setup Schlüssel.
4. Ein aktiver Trigger benötigt eine definierte H1 oder H4 Schlussregel. Ein Docht reicht nicht.
5. Jeder aktive Plan enthält Referenzkurs, Marktstatus, Aktion, Trigger, Einstieg, Stop Loss, TP1 bis TP3, CRV, Bestätigung, Invalidierung und Szenariowechsel.
6. Fehlende Quelle, fehlender Datenstand, ein ungültiger Stop, ein CRV unter 1,50 oder eine fehlende Invalidierung blockieren eine Handelsfreigabe in der Setup Analyse.
7. Referenzkurse älter als 24 Stunden werden als veraltet markiert. Chief zeigt daraus kein frisches Signal.
8. Die Positionsgröße wird durch das Risikobudget und zugleich durch maximal 20 Prozent Portfolioallokation begrenzt.
9. H4 Trend und H1 Bestätigung erhalten im Bewertungsmodell zusammen 40 von 100 Punkten.
10. Jede gespeicherte Entscheidung enthält Eingaben, Ergebnis, Regelversion und Bewertungszeitpunkt.
11. Die Watchlist Version 2 migriert vorhandene Version 1 Einträge. Bei gleicher Symbol Richtungs Kombination bleibt der gespeicherte Nutzerplan erhalten; fehlende Startszenarien werden ergänzt.
12. BTC, ETH und SOL dürfen zusätzliche Nachkauflevel enthalten. Diese Level ersetzen keinen Long Trigger für ein Swing Setup.
13. Automatische Provider Zugriffe gehören nicht in den Browser. Der lokale Server kapselt Yahoo und CoinGecko mit getrennten Adaptern und hält optionale Zugangsdaten nur in Server Umgebungsvariablen.
14. Die portable Einzeldatei muss dieselbe Bewertungslogik und denselben aktiven Marktplan wie die Server Version enthalten.

## Module

`src/engine.js` enthält Score, CRV und Positionsgrößen Berechnung ohne Oberflächenlogik.

`src/watchlist.js` enthält Watchlist Versionierung, aktiven Marktplan, Normalisierung, Import, Gruppierung und Signallogik.

`src/app.js` verwaltet Navigation, lokale Speicherung, Migration, Watchlist Darstellung, Setup Übernahme und Decision Journal.

`data/active-watchlist-2026-09-11.json` dokumentiert den bestätigten Marktplan als unabhängigen strukturierten Snapshot.

`scripts/build-portable.mjs` erstellt die autarke Datei `dist/Investment-Chief.html`.

`server/quote-service.mjs` validiert Zeitstempel und Kurs, koordiniert Provider Fallback und Cache und gibt Teilabdeckung explizit zurück. `server.mjs` stellt nur die öffentliche Oberfläche und die Kurs API bereit.

## Nächste Ausbaustufen

1. Autoritative XTB CFD Kursquelle ergänzen, sobald ein passender Zugang verfügbar ist.
2. Preisalarme für Trigger und Krypto Nachkauflevel anbinden.
3. Trade Ergebnis mit Ausstieg, Gebühren und Regelabweichung erfassen.
4. Offene Positionen zu Gesamtportfoliorisiko und Korrelation verdichten.
5. Chief Score und Marktstatus mit aktuellen Makro und Nachrichten Katalysatoren ergänzen.
6. Der lokale Chief Server verwaltet einen versionierten Workspace mit Konflikterkennung. Die Freigabe im lokalen Netz benötigt einen Zugriffscode und ein vertrauenswürdiges TLS Zertifikat; eine Cloud Bereitstellung ist nicht aktiviert.
