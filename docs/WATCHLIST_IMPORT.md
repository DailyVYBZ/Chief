# Watchlist Import

Chief akzeptiert JSON und CSV. Bei CSV werden Semikolon und Komma als Trennzeichen erkannt. Für deutsche Dezimalzahlen ist das Semikolon empfohlen.

## Pflichtfelder für ein flaches Setup

* `symbol`
* `direction`

## Unterstützte Felder

* `name`
* `assetClass`
* `referencePrice`
* `askPrice`
* `marketStatus`
* `action`
* `direction`
* `timeframe`
* `trigger`
* `entry`
* `stop`
* `tp1`
* `tp2`
* `tp3`
* `rrToTp2`
* `source`
* `planDate`
* `priceAsOf`
* `planStatus`
* `confirmation`
* `invalidation`
* `scenarioSwitch`
* `accumulationLevels`

`planStatus` darf nur dann `validated` sein, wenn der Plan mit aktuellen Daten geprüft wurde. Andere Werte behandelt Chief als `historical`.

## JSON Formate

Chief akzeptiert drei Formen:

1. Eine direkte Liste von Setup Objekten.
2. Ein Objekt mit `watchlist` Liste.
3. Ein Marktplan Objekt mit `markets`. Darin dürfen `long` und `short` verschachtelt sein. Bei verschachtelten Plänen akzeptiert Chief `stop` oder `stopLoss`.

Das dritte Format eignet sich für einen Markt, der Long und Short gemeinsam dokumentiert. Krypto Märkte dürfen zusätzlich `accumulationLevels` enthalten.

## Duplikatregel

Symbol und Richtung bilden den eindeutigen Schlüssel. Ein erneuter Import aktualisiert diesen Eintrag. Long und Short für dasselbe Symbol bleiben getrennte Setups und werden in der Oberfläche zu einer Marktkarte gruppiert.

## Datenalter

Ein validierter Plan mit Referenzkurs älter als 24 Stunden erhält den Status `DATEN ALT`. Der Plan bleibt gespeichert, zählt aber nicht als frisches Signal.

## Direkte Provider Anbindung

Eine Live Anbindung benötigt einen Server Adapter. Zugangsdaten dürfen nicht im Browsercode liegen. Der Adapter soll mindestens Symbol, Referenzkurs, Quelle und Datenzeitpunkt liefern. Die Bewertungslogik bleibt unabhängig vom Anbieter.
