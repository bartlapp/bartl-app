<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Eine Anwendung bartlisieren

Die unterstützten Verfahren, die ein sachkundiger Administrator ausführen würde, werden in ein gepflegtes Betriebspaket überführt. Die native Arbeit der Anwendung bleibt erhalten. Automatisiert werden die fehlenden Schritte und ihre Koordination.

Der [Anwendungsvertrag](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md) definiert das Verhalten. Dieser Leitfaden erklärt die Umsetzung, ohne Kubernetes oder eine gemeinsame Runtime vorzuschreiben.

## Mit einer unterstützten Konfiguration beginnen

Release, Persistenz, Abhängigkeiten, Zielanforderungen und unterstützten Versionsübergang benennen. Festlegen, welche Nutzbarkeit die Rekonstruktion überstehen muß, welche Ausfälle abgedeckt sind, welche Unterbrechung und welcher Datenverlust zulässig sind und welche Abhängigkeiten und Betriebsarbeit das Team tragen kann. Das kleinste native Verfahren wählen, das diese Grenzen einhält, einschließlich Implementierung, Betrieb und Pflege. Mit einer benötigten Konfiguration beginnen, nicht mit einer spekulativen Kompatibilitätsmatrix.

Eigenen veränderlichen Zustand, abgeleiteten oder entbehrlichen Zustand, unveränderliche Software und Zielkonfiguration trennen. Externe Schlüssel und Recovery-Abhängigkeiten identifizieren.

## Das native Verfahren ermitteln

Für Start, Capture, Restore und gewähltes Upgrade native Befehle und Voraussetzungen ermitteln. Klären, welche Prozesse laufen, auslaufen oder stoppen müssen, welchen Zustand sie verändern dürfen und woran ihr Erfolg erkennbar ist. Feststellen, was Fehler hinterlassen und wie ein Administrator sicher erneut versuchen kann.

Upstream-Dokumentation und Source nutzen, dann unsicheres Verhalten erproben. Nachweise für die exakte Version wiederverwenden, wo sie die Frage beantworten. Ein erfolgreicher Containerstart belegt kein nutzbares Anwendungsverfahren. Native Initialisierung oder Migration muß möglicherweise intern laufen, bevor gewöhnlicher Zugriff erlaubt wird. Beobachtet wird genug, um dieses Verfahren auszuwählen und abzuschließen, nicht um das gesamte Schema zu zertifizieren.

## Nur die fehlende Koordination ergänzen

Für jeden eigenen Mechanismus beantworten:

> Welche konkrete Administratorhandlung automatisiert er, oder welche nachgewiesene Lücke im nativen Verfahren schließt er?

Die Antwort gehört neben den Mechanismus in den Anwendungsentwurf. Gibt es keine, entfällt er. Ein Ausfall innerhalb des erklärten unterstützten Fehlermodells ist auch dann eine berechtigte Entwurfsgrundlage, wenn er noch nicht eingetreten ist. Spekulation außerhalb dieses Modells ist es nicht. Ein ausuferndes Abnahmekriterium hinterfragen, statt ein Subsystem zu seiner Erfüllung zu bauen.

Jeder zustandsverändernde Schritt erhält einen Verantwortlichen. Native Transaktionen, Ausschluß konkurrierender Ausführung, Supervision und Readiness nutzen. Ergänzt wird nur ihre Verbindung zum Verfahren. Ermitteln, welche Beobachtungen den Arbeitsbeginn erlauben und welche Garantien den laufenden Betrieb tragen. Fehler- und Stop-Verhalten begründen, statt den Guard eines anderen Pakets zu kopieren.

Die [Fehler-, Wiederholungs- und Veröffentlichungsgrenzen](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#application-responsibilities) des Vertrags auf das konkrete Verfahren anwenden. Maßgeblicher Zustand bleibt wiederherstellbar, Diagnose bleibt verfügbar. Aus der Koordination nativer Arbeit folgt weder eine automatische Reparatur-Engine noch ein Supervisor mit Abschaltbefugnis über eine gesunde Anwendung.

Den ersten vollständigen Pfad vor einer Erweiterung prüfen. Vorhandener Code und bestandene Tests belegen weder die Notwendigkeit eines Mechanismus noch die Erlaubnis zusätzlicher Abhängigkeiten, Privilegien, Bedienerschritte oder Fehlerregeln.

## Ein nutzbares Paket liefern

Die Bedienungsanleitung bleibt von der Implementierungsbegründung getrennt. Sie nennt unterstützte Konfiguration, Entscheidungen, Befehle und erwartete Ergebnisse. Release, Installationsidentität, wirksame Konfiguration und geschützte Eingabereferenzen müssen genügen, um die Anwendungsarbeit über die gewöhnliche Schnittstelle auszuführen. Ein Nachfolger braucht unabhängig verfügbare Software, Konfiguration, Backup-Historie und Schlüssel, nicht die private Maschinerie des Autors.

Stop und Deinstallation zusammen mit der Installation festlegen. Bleibt Zustand zur Wiederverwendung erhalten, die autorisierte Neuinstallation ohne konkurrierenden Vorgänger erproben. Erhaltene Daten allein belegen dieses Verfahren nicht. Die zum Abschluß der Deinstallation nötige Koordination muß bis zu ihrem Ende verfügbar bleiben.

Für eine Ablösung die [Anforderungen an Serviceautorität](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#service-authority-and-promotion) in konkrete Schritte für Quellstillsetzung, letzte Writes und Aktivierung übersetzen. Vorbereitung und Promotion eines Kandidaten sind verschiedene Vorgänge.

## Den gelieferten Pfad qualifizieren

Das tatsächliche Paket und seine Administratorschnittstelle gegen die [Nachweisfälle des Vertrags](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#supported-configuration-and-catalogue-evidence) erproben, nicht gegen eine weitere Implementierungscheckliste. Auch die Grenzen unserer Eingriffe prüfen. Neustart darf keine Recovery-Abhängigkeiten erhalten, fehlgeschlagene Arbeit nicht stillschweigend initialisieren oder wiederholt werden und Abschluß keinen Stop übergehen. Qualifizierungsaccounts und Funktionsprüfungen werden nicht automatisch zu Startabhängigkeiten.

Dieselben unveränderlichen Artefakte qualifizieren, die Betreiber beziehen. Anhand des Source getesteter Code qualifiziert kein veröffentlichtes Paket. Wiederholbare Prüfungen bleiben im Source, rohe Ausgaben außerhalb von Git. Exakte Artefaktidentitäten, beobachtete Ergebnisse und maßgebliche Grenzen gehören in die Release-/Integrationsbeschreibung. Keine Nachweisdateien oder Qualifizierungsberichte je Session anlegen. Historische Grenzen bleiben an ihre exakten Releases gebunden, außerhalb aktueller Anweisungen.

Die behauptete Ausfallgrenze testen. Ein anderer Namespace belegt nicht das Überstehen eines Host- oder Providerverlusts. Betroffene Nachweise bei Paketänderungen erneuern.

## Beispiel: Keycloak

Das Betriebspaket 0.5.0 kombiniert Keycloak 26.6.2 mit PostgreSQL 17.6 und unterstützt den Vorwärtsübergang von Keycloak 26.6.1. Sein Rekonstruktionspfad veranschaulicht die Methode:

| Natives Verfahren | Fehlende Koordination durch das Paket |
| --- | --- |
| PostgreSQL startet und stellt die eigene Datenbank bereit. | Vorhandenen Anwendungszustand feststellen. Vorhandener Zustand führt zum nativen Keycloak-Start; nur Abwesenheit zur Backup-Suche. |
| PostgreSQL rekonstruiert einen nativen Dump transaktional. | Neuestes passendes Backup auswählen und prüfen, konkurrierende Writer stoppen und Ausschluß an die Restore-Transaktion binden. Ein endlicher Job führt die Arbeit aus. |
| `kc.sh start` initialisiert oder migriert nativ. | Nach erfolgreicher erforderlicher Rekonstruktion starten; Zugriff bis zur nativen Readiness sperren, ohne eigene Schema-Zertifizierung. |
| Native Realm-Administration widerruft wiederhergestellte Sessions. | Nach Recovery ausführen, nicht beim gewöhnlichen Neustart, bevor Traffic zugelassen wird. |

Fehlgeschlagene oder unklare Mutation läßt das Ziel mit Diagnose nicht verfügbar. Erhaltene Recovery-Eingaben erlauben Rekonstruktion auf anderem leeren Ziel statt automatischer Reparatur. Der Controller verbindet native Verfahren. Sein Kubernetes-Aufbau und die nur nach Recovery geltende Session-Regel sind Paketentscheidungen, keine zusätzlichen Bartl-Anforderungen.
