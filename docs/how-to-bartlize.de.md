<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Eine Anwendung bartlisieren

Die unterstützten Verfahren, die ein sachkundiger Administrator ausführen würde, werden in ein gepflegtes Betriebspaket überführt. Die native Arbeit der Anwendung bleibt erhalten. Automatisiert werden die fehlenden Schritte und ihre Koordination.

Der [Anwendungsvertrag](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md) definiert das Verhalten. Dieser Leitfaden erklärt die Umsetzung, ohne Kubernetes oder eine gemeinsame Runtime vorzuschreiben.

Entwickler beginnen mit dem folgenden Verfahren. Administratoren beginnen beim [Kundeninstallationsrepo](#kundeninstallationsrepo) und bei [Betrieb und Übergabe](#eine-installation-betreiben-und-übergeben). Das erforderliche Projektwissen liegt in den `bartlapp`-Repos und ihrer referenzierten Upstream-Dokumentation. Tatsächliche Installationswerte und geschützte Eingaben gehören zum Kunden, nicht in diesen Leitfaden oder ein privates Entwicklungsrepo.

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

## Kubernetes-Betriebspakete

Die heutigen Keycloak-, Paperless-, Forgejo- und Restic-Pakete nutzen Kubernetes und Helm. Das ist ihre gewählte Implementierung, keine Anforderung an jede Bartl-Anwendung. Mit dem unterstützten Paketprofil und den nativen Verfahren beginnen, nicht mit einer vollständigen Kopie seines Controllers. [Keycloaks Entwurf](https://codeberg.org/bartlapp/bartl-keycloak/src/branch/main/DESIGN.md) erklärt eine Umsetzung; die anderen Pakete dokumentieren ihre eigenen Zustands- und Capture-Grenzen.

Helm wählt unveränderliches Paket, wirksame Konfiguration und Run-/Stop-Absicht. Ein namespace-begrenzter Application Controller verantwortet die Lifecycle-Entscheidungen einer logischen Anwendung einschließlich ihrer eigenen Datenbank und Hilfskomponenten. Er koordiniert Workloads, endliche native Jobs und Zugriff. Native Werkzeuge behalten Initialisierung, Migration, Capture und Restore. Entrypoints, Jobs und Helm-Hooks dürfen keine konkurrierenden Lifecycle-Entscheidungen treffen. Absicht, beobachtete Generation und abgeschlossene Operation bleiben unterscheidbar; ein erfolgreicher Helm-Befehl ist keine Anwendungsabnahme.

Dieses Betriebsmodell verwendet einen eigenen Cluster je unabhängig übergebbarer Kundeninstallation. Darin behalten Anwendungen unabhängige Releases, Zustände und Lifecycles. Zusätzliche Cluster, HA, replizierter Storage und Datenbank-Failover folgen dem vereinbarten Fehlermodell, nicht einer festen Node-Zahl. [base-k3s](https://codeberg.org/bartlapp/base-k3s) liefert eine Single-Node-Anleitung für Hetzner, keine allgemeine HA- oder Providerverlustgarantie. Runtime, Storage-Semantik, Netzwerk, TLS, Credentials und Kapazität müssen zu den gewählten Paketen passen.

Das [Restic-Paket](https://codeberg.org/bartlapp/bartl-restic) verantwortet Backup-Speicher, Schutz, Replikation und Endpoint-Recovery; jede Anwendung verantwortet konsistenten Capture und Rekonstruktion. Jede Anwendung erhält eigenes Repository, Verschlüsselungsschlüssel und begrenzte Reader-/Writer-Zugänge. Destruktive Wartungsbefugnis bleibt getrennt. Native Reader-Locks benötigen eng begrenzte Lock-Schreibrechte, keine Änderung von Backup-Inhalten. Für Verlust des primären Providers müssen unabhängig nutzbare sekundäre Historie, Schlüssel und Zugänge bereits vorhanden sein. Primäre Publikation allein belegt diesen Schutz nicht.

Der Installation Administrator koordiniert Anwendungen, Infrastruktur, Endpunkte und Quellstillsetzung über die dokumentierten Schnittstellen. Ein Company- oder Installation Controller ist nicht erforderlich. Ein zukünftiger Controller darf diese Sequenz automatisieren; gewöhnlicher Anwendungsbetrieb und Betreiberübergabe dürfen nicht von ihm abhängen. Erforderliche Application Controller, native Verfahren, Backup-Schnittstellen und Scheduling verbleiben bei der Installation.

## Kundeninstallationsrepo

Vor der Provisionierung ein kundenseitig kontrolliertes Repo für die Installation anlegen. Sein README ist der Einstieg für den Administrator und die vorgesehene Eingabegrenze zukünftiger Installationsautomation. Heute benennt es wirksame Dateien und dokumentierte Befehle; ein zusätzliches Controller-Schema oder ein privater Compiler ist nicht erforderlich.

Gemeinsame Verfahren bleiben in `bartlapp`. Das Kundenrepo hält ihre konkrete Anwendung fest:

| Eintrag | Erforderlicher Installationsinhalt |
| --- | --- |
| Zusammensetzung und Identität | Stabile Installations-/Anwendungsidentitäten, gewählte Dienste und Abhängigkeiten, Zuordnung zu Cluster, Kontext, Namespace und Helm-Release, Endpunkte und verantwortliche Betreiber. Platzierung und Paketversion sind keine Anwendungsidentität. |
| Releases und Konfiguration | Exakte Chart-/Image-Referenzen, unterstützte Übergänge, vollständige wirksame Helm-Werte und Ressourcen-/Storage-Anforderungen. Artefakte unabhängig beziehbar erhalten; Source-Commit oder bewegliches Tag genügen nicht. |
| Geschützte Eingaben | Referenzen auf kundenseitig kontrollierte Credentials, Identitäts-Secrets, Schlüssel, Zertifikate und Recovery-Zugänge samt dokumentiertem Abruf. Recovery darf weder verlorenen Cluster noch dessen Keycloak oder den Autor benötigen. Keine Klartext-Secrets oder aktiven kubeconfigs committen. |
| Betriebsentscheidungen | Zulässige Unterbrechung und Datenverlust, Quellstillsetzung, Backup-/Replikationspläne, Retention-Politik, Kapazitäts- und Alarmierungsverantwortung, fachliche Abnahme sowie erforderlicher Umgang mit wiederhergestellten Identitäten oder Records. |
| Verfahren und Ergebnisse | Abhängigkeitsreihenfolge, Links auf Paketbefehle, installationsspezifische Abweichungen, aktive Ziel-/Ressourcenidentitäten, gewählte Recovery-Punkte, Abnahmeergebnisse und ungeklärte Fehler. Sollwerte und beobachtete Ergebnisse bleiben getrennt. |

Beispielsweise führt `README.md` den Einstieg, `installation.env` nicht geheime Release-/Endpoint-Werte, `values/` vollständige Helm-Werte je Dienst und `evidence/` ausgewählte Installationsergebnisse. `.lab/` für vorübergehende geschützte Zugangsdateien ignorieren. Diese Namen veranschaulichen den [Referenzdurchlauf](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/reference-installation/README.md), kein neues maschinenlesbares Schema. Ein ignoriertes Verzeichnis ist weder unabhängige Secret-Verwahrung noch Backup.

Das Repo muß während des abgedeckten Ausfalls erreichbar und an einen Nachfolger übergebbar bleiben. Es beschreibt die Verwahrung von Software, Backup-Historie und geschützten Eingaben; Git ersetzt keinen dieser Bestände. Kundenentscheidungen werden hier einmal festgehalten, nicht in gemeinsame Paketdokumentation kopiert. Ein neuer Kunde trifft eigene Entscheidungen, statt die Risikoannahme des Beispiels zu übernehmen.

## Eine Installation betreiben und übergeben

Zuerst Paketreleases wählen und vollständige Installationswerte anlegen. Basis, unabhängig nutzbare Zugänge und Backup-Dienst herstellen, dann Identität und abhängige Anwendungen in dokumentierter Reihenfolge. Je Paket Installation und generationsgebundene Statusprüfung ausführen, anschließend die vereinbarte Fachleistung über den tatsächlichen Zugangsweg prüfen. Der [manuelle Restic-/Keycloak-/Forgejo-Durchlauf](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/reference-installation/README.md) liefert eine vollständige Beispielsequenz mit eigener Infrastruktur, DNS und Credentials des Betreibers.

Im Betrieb Ergebnisse geplanter und manueller Backups, Capture-Alter, erforderliche unabhängige Replikation, Storage-/Staging-Kapazität, Zertifikatsgültigkeit und Anwendungsgesundheit prüfen. Alarmzustellung und Reaktion einem Betreiber über einen Weg zuordnen, der den abgedeckten Ausfall übersteht. Retention und Wartung über unterstützte Verfahren des Backup-Dienstes mit getrennter Befugnis einrichten. Chart-Installation liefert nicht automatisch Überwachung oder qualifizierte automatische Retention; Historie erhalten, bis ein sicheres unterstütztes Retention-Verfahren und ausreichende Kapazität feststehen.

Für Upgrades und Recovery gewähltes Release und wirksame Werte erhalten, den unterstützten nativen Übergang mit unabhängig verfügbaren Recovery-Eingaben nutzen und die Anwendung vor Promotion prüfen. Letzte Writes sowie alle alten Zugriffs- und Schreibpfade berücksichtigen; DNS-Wechsel allein ist keine Stillsetzung. Nach Recovery neue Arbeit und ein anschließend nutzbares Backup prüfen. Fehlgeschlagene oder unklare Übergänge nicht durch Marker-Löschung, Statusänderung oder Software-Rollback gegen migrierte Daten in Erfolg umdeuten.

Für Stop, Deinstallation und unterstützte Neuinstallation mit erhaltenem Zustand das Paketverfahren befolgen und dessen aktuelle Operation bis zum Abschluß oder sichtbaren Fehler beobachten. Die Finalisierung bleibt verfügbar, bis eigene Arbeit beendet ist. Daten nur nach ausdrücklicher Kundenentscheidung erhalten oder vernichten; anschließend ausschließlich identifizierte Infrastruktur- und DNS-Ressourcen entfernen. Anwendungsentfernung und Infrastrukturrückbau sind getrennte Vorgänge.

Ein Nachfolger erhält administrative Kontrolle, Installationsrepo, nutzbare Release-Artefakte und Lizenzen, Backup-Historie, geschützte Eingaben sowie Betriebs- und Abnahmeverfahren. Fortgesetzte Backups und erforderliches Scheduling ohne unsere Dienste prüfen; Nachfolgeüberwachung vereinbaren, alte Automation stoppen und bisherige Zugänge widerrufen. Der Nachfolger darf eigene Werkzeuge verwenden, muß aber keine fehlenden Anwendungsprozeduren erfinden.

## Beispiel: Keycloak

Das Betriebspaket 0.5.0 kombiniert Keycloak 26.6.2 mit PostgreSQL 17.6 und unterstützt den Vorwärtsübergang von Keycloak 26.6.1. Sein Rekonstruktionspfad veranschaulicht die Methode:

| Natives Verfahren | Fehlende Koordination durch das Paket |
| --- | --- |
| PostgreSQL startet und stellt die eigene Datenbank bereit. | Vorhandenen Anwendungszustand feststellen. Vorhandener Zustand führt zum nativen Keycloak-Start; nur Abwesenheit zur Backup-Suche. |
| PostgreSQL rekonstruiert einen nativen Dump transaktional. | Neuestes passendes Backup auswählen und prüfen, konkurrierende Writer stoppen und Ausschluß an die Restore-Transaktion binden. Ein endlicher Job führt die Arbeit aus. |
| `kc.sh start` initialisiert oder migriert nativ. | Nach erfolgreicher erforderlicher Rekonstruktion starten; Zugriff bis zur nativen Readiness sperren, ohne eigene Schema-Zertifizierung. |
| Native Realm-Administration widerruft wiederhergestellte Sessions. | Nach Recovery ausführen, nicht beim gewöhnlichen Neustart, bevor Traffic zugelassen wird. |

Fehlgeschlagene oder unklare Mutation läßt das Ziel mit Diagnose nicht verfügbar. Erhaltene Recovery-Eingaben erlauben Rekonstruktion auf anderem leeren Ziel statt automatischer Reparatur. Der Controller verbindet native Verfahren. Sein Kubernetes-Aufbau und die nur nach Recovery geltende Session-Regel sind Paketentscheidungen, keine zusätzlichen Bartl-Anforderungen.
