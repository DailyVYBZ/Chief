# Chief 0.4 Umsetzung vom 11.09.2026

## Umgesetzt

* Aktiver Marktplan für SILVER, GOLD, DE40, US100, US500, OIL, SOLANA, BITCOIN, ETHEREUM und EURUSD
* 19 konkrete Long und Short Szenarien
* Exakte Trigger getrennt vom Einstieg
* H1 Bestätigungsregeln
* Stop Loss, TP1, TP2, TP3 und CRV zu TP2
* Invalidierung und Szenariowechsel
* Feste Krypto Nachkauflevel für BTC, ETH und SOL
* Kein erfundener ETH Short Plan
* Gruppierte Marktansicht mit Long und Short nebeneinander
* Priorisierung nach Triggernähe und Nachkaufnähe
* Sperre für Referenzkurse älter als 24 Stunden
* Suche und Assetklassen Filter
* Watchlist Migration von Version 1 auf Version 2
* Vollständige Übernahme eines Szenarios in die Setup Analyse
* Erweiterter Setup Nachweis mit Bestätigungsregel und Szenariowechsel
* Aktualisierte portable Einzeldatei
* Automatische Tests und portable Builds über GitHub Actions

## Prüfstatus

Die lokalen Tests umfassen 14 Testfälle. Der GitHub Actions Lauf für die Änderung wurde erfolgreich abgeschlossen. Die portable Datei wurde im CI Lauf neu gebaut und in den Branch geschrieben.

## Nächste technische Schritte

1. Geschützten Kurs Provider anbinden.
2. Trigger und Nachkauflevel als Benachrichtigungen anbinden.
3. Trade Ergebnisse und Regelabweichungen erfassen.
4. Gesamtportfoliorisiko und Korrelation berechnen.
5. Geräteübergreifende Synchronisation ergänzen.
