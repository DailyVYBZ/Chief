# DailyVYBZ Investment Chief

Chief führt eine Markt Watchlist von der Beobachtung bis zur dokumentierten Entscheidung. Das System trennt Long und Short Szenarien, verlangt konkrete Trigger und bewertet jedes Setup mit H4 Trend, H1 Bestätigung, Marktstruktur, Katalysator, Fundamentaldaten, Liquidität und Chance Risiko Verhältnis. Positionsgröße und Risikobudget werden automatisch berechnet.

## Benutzeroberfläche

Die Anwendung besitzt vier Arbeitsbereiche:

* Dashboard mit priorisierten Märkten, Datenqualität und nächstem relevanten Level
* Watchlist mit zehn Märkten, Long und Short Szenarien, Referenzkurs, Trigger, Einstieg, Stop Loss, TP1 bis TP3, CRV, Bestätigung, Invalidierung und Szenariowechsel
* Setup Analyse mit Score, Positionsgröße und vollständigem Preisplan
* Decision Journal mit gespeicherten Bewertungen

BTC, ETH und SOL enthalten zusätzlich feste Nachkauflevel. ETH besitzt bewusst kein erfundenes Short Setup, solange kein exakter Short Plan bestätigt wurde.

## Aktiver Marktplan

Der Plan vom 11.09.2026 ist als strukturierter Datensatz unter `data/active-watchlist-2026-09-11.json` dokumentiert und als aktiver Startbestand in `src/watchlist.js` hinterlegt.

Chief behandelt einen Trigger nur als Prüfpunkt. Erst ein abgeschlossener H1 oder H4 Schluss gemäß Bestätigungsregel macht daraus ein bestätigtes Setup. Referenzkurse älter als 24 Stunden werden als veraltet markiert.

## Start

```bash
npm start
```

Danach `http://localhost:4173` öffnen. Es gibt keine externen Laufzeitabhängigkeiten.

## Direkt auf Windows starten

Die Datei `dist/Investment-Chief.html` herunterladen und doppelt anklicken. Sie enthält die komplette Anwendung und benötigt keinen lokalen Server.

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
* Migration des bisherigen lokalen Watchlist Bestands auf Version 2
* Responsive Oberfläche für Smartphone und Desktop
* Portable Einzeldatei für Windows und andere Desktop Systeme

Die Architekturentscheidungen stehen in `docs/ARCHITECTURE.md`.

Das Importformat steht in `docs/WATCHLIST_IMPORT.md`. Eine Vorlage liegt unter `examples/watchlist-import.csv`.
