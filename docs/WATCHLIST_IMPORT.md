# Watchlist Import

Chief akzeptiert JSON und CSV. Bei CSV werden Semikolon und Komma als Trennzeichen erkannt. Für deutsche Dezimalzahlen ist das Semikolon empfohlen.

## Pflichtfelder

* `symbol`
* `direction`

## Unterstützte Felder

* `name`
* `assetClass`
* `referencePrice`
* `entry`
* `stop`
* `tp1`
* `tp2`
* `tp3`
* `source`
* `planDate`
* `priceAsOf`
* `planStatus`
* `confirmation`

`planStatus` darf nur dann `validated` sein, wenn die Zonen mit aktuellen Daten geprüft wurden. Alle anderen Werte behandelt Chief als `historical`.

## Duplikatregel

Symbol und Richtung bilden den eindeutigen Schlüssel. Ein erneuter Import aktualisiert diesen Eintrag. Long und Short für dasselbe Symbol bleiben getrennte Pläne.

## Direkte Provider Anbindung

Eine Live Anbindung benötigt einen Server Adapter. Zugangsdaten dürfen nicht im Browsercode liegen. Der Adapter soll dieselben Felder liefern und zusätzlich Quelle sowie Datenzeitpunkt setzen. Die Bewertungslogik bleibt unabhängig vom Anbieter.
