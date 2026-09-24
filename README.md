# DailyVYBZ Investment Chief

Chief führt eine Markt Watchlist von der Beobachtung bis zur dokumentierten Entscheidung. Das System trennt Long und Short Szenarien, verlangt konkrete Trigger und bewertet jedes Setup mit H4 Trend, H1 Bestätigung, Marktstruktur, Katalysator, Fundamentaldaten, Liquidität und Chance Risiko Verhältnis. Positionsgröße und Risikobudget werden automatisch berechnet.

## Benutzeroberfläche

Die Anwendung besitzt vier Arbeitsbereiche:

* Dashboard mit priorisierten Märkten, Datenqualität und nächstem relevanten Level
* Watchlist mit zehn Märkten, Long und Short Szenarien, Referenzkurs, Trigger, Einstieg, Stop Loss, TP1 bis TP3, CRV, Bestätigung, Invalidierung und Szenariowechsel
* Setup Analyse mit Score, Positionsgröße und vollständigem Preisplan
* Decision Journal mit gespeicherten Bewertungen

BTC, ETH und SOL enthalten zusätzlich feste Nachkauflevel. ETH besitzt bewusst kein erfundenes Short Setup, solange kein exakter Short Plan bestätigt wurde.

## Chief 0.5 Command Center

Chief 0.5 ergänzt einen lokalen Node Server und ein Live Command Center.

* Öffentliche Referenzkurse für alle zehn Märkte
* Yahoo Finance als allgemeiner Referenz Provider
* CoinGecko als Krypto Fallback
* Automatischer Abruf alle 60 Sekunden im Servermodus
* Provider Status, letzter Abruf und fehlende Märkte sichtbar
* Live Vergleich standardmäßig ohne Veränderung deiner XTB Referenzkurse
* Optionaler Live Referenzmodus mit automatischer Rückkehr zum vorherigen XTB Kursstand
* Kurs Snapshots vor automatischen Änderungen
* Workspace Backup mit Watchlist, Journal, Live Kursen und Snapshots
* Top drei Märkte nach Trigger oder Nachkaufnähe im Command Center
* Tastenkürzel `R` für Kursabruf und `/` für die Watchlist Suche

Die öffentlichen Provider Kurse sind Referenzwerte und können von XTB CFD Kursen abweichen. Deshalb startet Chief im Vergleichsmodus. Deine XTB Kurse bleiben dort die führende Grundlage für exakte Trigger. Erst wenn du `Live Referenz EIN` aktivierst, schreibt Chief Provider Kurse in die aktive Watchlist. Beim Ausschalten stellt Chief den vorherigen XTB Kursstand wieder her.

## Alarmmodell

Chief verwaltet Long, Short und Krypto Nachkauflevel getrennt. Ein manuell gepflegter Kurs kann den Zustand `Level erreicht` auslösen. Ein H1 oder H4 Schluss erfordert eine zusätzliche manuelle Bestätigung mit Schlusskurs. Doppelte Meldungen bei unverändertem Plan werden unterdrückt. Die letzten 200 Zustandsereignisse liegen lokal im Browser und besitzen eine spätere Journal Zuordnung. Öffentliche Provider Kurse lösen wegen der Abweichung zu XTB keine exakten Alarme aus. Siehe `docs/ALERTS.md`.

## Aktiver Marktplan

Der Plan vom 11.09.2026 ist als strukturierter Datensatz unter `data/active-watchlist-2026-09-11.json` dokumentiert und als aktiver Startbestand in `src/watchlist.js` hinterlegt.

Chief behandelt einen Trigger nur als Prüfpunkt. Erst ein abgeschlossener H1 oder H4 Schluss gemäß Bestätigungsregel macht daraus ein bestätigtes Setup. Referenzkurse älter als 24 Stunden werden als veraltet markiert.

## Start

```bash
npm start
```

Danach `http://localhost:4173` öffnen. Der Node Server stellt die Oberfläche und die Route `/api/quotes` bereit.

Optional kann für CoinGecko ein Demo Schlüssel als Umgebungsvariable gesetzt werden:

```bash
COINGECKO_DEMO_API_KEY=dein_key npm start
```

Weitere Server Optionen:

```bash
PORT=4173
CHIEF_QUOTE_CACHE_MS=15000
CHIEF_QUOTE_TIMEOUT_MS=8000
```

## Direkt auf Windows starten

Die Datei `dist/Investment-Chief.html` herunterladen und doppelt anklicken. Sie enthält die komplette Anwendung und benötigt keinen lokalen Server. In diesem Portable Modus bleibt die Kursführung manuell. Das Command Center, Backups und Snapshots stehen trotzdem zur Verfügung.

Nach Änderungen wird die portable Datei so neu erstellt:

```bash
npm run build:portable
```

## Test

```bash
npm test
```

## Aktueller Umfang

* Zehn aktive Märkte und 19 konkrete Richtungsszenarien
* Long und Short pro Markt in einer gemeinsamen Marktansicht
* Exakter Trigger getrennt vom Einstieg
* Stop Loss und drei Kursziele
* CRV zu TP2
* Marktstatus und klare Aktion
* Bestätigungsregel, Invalidierung und Szenariowechsel
* Krypto Nachkauflevel für BTC, ETH und SOL
* Priorisierung nach Triggernähe und Nachkaufnähe
* Sperre für Referenzkurse älter als 24 Stunden
* Regelbasierter Score von 0 bis 100
* Positionsgröße aus Portfolio, Risiko und 20 Prozent Allokationsgrenze
* Lokales Decision Journal
* Suche und Assetklassen Filter
* CSV und JSON Import mit Duplikatkontrolle
* JSON Export als Sicherung
* Workspace Backup und Kurs Snapshots
* Live Vergleich und optionaler Live Referenzmodus
* Provider Cache, Timeout und Krypto Fallback
* Migration des bisherigen lokalen Watchlist Bestands auf Version 2
* Responsive Oberfläche für Smartphone und Desktop
* Portable Einzeldatei für Windows und andere Desktop Systeme
* GitHub Actions Tests und portable Builds

Die Architekturentscheidungen stehen in `docs/ARCHITECTURE.md`.

Das Importformat steht in `docs/WATCHLIST_IMPORT.md`. Eine Vorlage liegt unter `examples/watchlist-import.csv`.

Der Umsetzungsstand vom 11.09.2026 steht in `docs/IMPLEMENTATION_2026-09-11.md`.
