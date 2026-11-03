<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Eine Anwendung bartlisieren

Die unterstützten Verfahren, die ein sachkundiger Administrator ausführen würde, werden in ein gepflegtes Betriebspaket überführt. Die native Arbeit der Anwendung bleibt erhalten. Automatisiert werden die fehlenden Schritte und ihre Koordination.

Der [Anwendungsvertrag](https://codeberg.org/bartlapp/bartl-app#application-contract-and-qualification) definiert das erforderliche Verhalten. Dieser Leitfaden erklärt seine Umsetzung. Er schreibt weder Kubernetes noch eine gemeinsame Runtime vor.

## Mit einer unterstützten Konfiguration beginnen

Anwendungsrelease, Persistenz und Abhängigkeiten, Zielanforderungen und unterstützten Versionsübergang benennen. Festlegen, welches nutzbare Verhalten die Rekonstruktion überstehen muß, welche Ausfälle das Profil abdeckt und welche Unterbrechung und welcher Datenverlust zulässig sind. Benennen, welche Abhängigkeiten und welchen Betriebsaufwand das vorgesehene Team tragen kann. Das kleinste native Verfahren wählen, das diese Grenzen einhält, und dabei Implementierung, laufenden Betrieb und Pflege berücksichtigen. Mit einer Konfiguration beginnen, die jemand braucht, nicht mit einer spekulativen Kompatibilitätsmatrix.

Eigenen veränderlichen Zustand, abgeleiteten oder entbehrlichen Zustand, unveränderliche Software und Zielkonfiguration trennen. Externe Schlüssel und Abhängigkeiten einschließen, die für die Wiederherstellung erforderlich sind. Eine gemeinsame Datenbank oder ein externer Service darf nicht allein deshalb zurückgesetzt werden, weil die Anwendung ihn nutzt.

## Das native Verfahren ermitteln

Für Start, Sicherung, Restore und das gewählte Update ermitteln:

- die unterstützten nativen Befehle und Voraussetzungen;
- welche Prozesse laufen, auslaufen oder anhalten müssen und welcher Zustand sich ändern darf;
- das native Erfolgssignal und die normale Readiness;
- was ein fehlgeschlagener Versuch hinterläßt und wie ein Administrator sicher erneut versuchen kann.

Upstream-Dokumentation und Source verwenden und anschließend unsicheres Verhalten praktisch erproben. Vorhandene Nachweise für die exakte Version wiederverwenden, wenn sie die Frage beantworten. Aus einem erfolgreichen Containerstart kein funktionierendes Anwendungsverfahren ableiten.

Beobachtung liefert die Fakten zur Wahl des Verfahrens, kein unabhängiges Zertifikat der Anwendungsintegrität. Der native Start kann die Anwendung selbst initialisieren oder migrieren. Er muß deshalb möglicherweise intern laufen, bevor gewöhnlicher Zugriff erlaubt wird.

## Nur die fehlende Koordination ergänzen

Für jeden eigenen Mechanismus beantworten:

> Welche konkrete Administratorhandlung automatisiert er, oder welche nachgewiesene Lücke im nativen Verfahren schließt er?

Die Antwort gehört neben den Mechanismus in den Entwurf der Anwendung. Gibt es auf keine der beiden Fragen eine Antwort, entfällt der Mechanismus. Ein Ausfall innerhalb des erklärten unterstützten Fehlermodells ist eine berechtigte Entwurfsgrundlage, auch wenn er noch nicht eingetreten ist. Spekulation außerhalb dieses Modells genügt nicht als Begründung. Ein ausuferndes Abnahmekriterium muß hinterfragt werden, statt ein Subsystem zu seiner Erfüllung zu bauen.

Jeder zustandsverändernde Schritt erhält genau einen Verantwortlichen. Native Transaktionen, Ausschluß konkurrierender Ausführung, Prozeßüberwachung und Readiness werden genutzt, wo sie das erforderliche Verhalten bereits liefern. Ergänzt wird nur, was diese Fähigkeiten zum unterstützten Verfahren verbindet. Zustandsbeobachtung darf nicht zur vollständigen Schemazertifizierung oder Dauerüberwachung mit der Befugnis werden, eine gesunde Anwendung anzuhalten.

Ermitteln, welche Beobachtungen für den Beginn eines Vorgangs erforderlich sind und von welchen Garantien der laufende Betrieb abhängt. Nicht verfügbare Beobachtung vom beobachteten Entzug der Betriebsberechtigung unterscheiden. Das gewählte Verhalten erklären, ohne den Guard oder die Fehlerregeln eines anderen Pakets zu übernehmen, sofern diese Anwendung sie nicht benötigt.

Eine fehlgeschlagene Initialisierung, Rekonstruktion oder Migration darf sichtbar nicht verfügbar bleiben und ihre Diagnoseinformationen behalten. Ein Administrator darf das fehlgeschlagene Ziel nur ersetzen und erneut beginnen, wenn unabhängig erhaltene Eingaben den erforderlichen Zustand innerhalb der akzeptierten Datenverlustgrenze wiederherstellen können. Maßgeblicher Zustand und Backups bleiben erhalten. Automatische Reparatur, Wiederholung oder Rekonstruktion unklaren Fortschritts ist nicht erforderlich. Das schaltet gewöhnliche Prozeßneustarts der Plattform nicht ab.

Capture, Veröffentlichung und Wiederaufnahme der Anwendung getrennt behandeln. Scheitert nur die Veröffentlichung eines vollständigen konsistenten Capture, das fehlgeschlagene Backup melden und den Capture für einen erneuten Versuch schützen. Ein ansonsten gesunder Service darf nicht allein deshalb gestoppt bleiben. Seine Wiederaufnahme hängt weiterhin von gültigem Zustand und aktueller Betriebsberechtigung ab und darf einen bewußten Stop niemals übergehen.

Den ersten vollständigen Pfad vor einer Erweiterung gegen diese Zuordnung prüfen. Vorhandener Code und bestandene Tests belegen weder die Notwendigkeit eines Mechanismus noch die Erlaubnis, Abhängigkeiten, Privilegien, Bedienerschritte oder neue Fehlerregeln hinzuzufügen.

## Ein nutzbares Paket liefern

Der Administrator liefert Release, Installationsidentität, wirksame Konfiguration und geschützte Verweise auf Eingaben. Das Paket führt die anwendungsspezifische Arbeit über die gewöhnliche Installations- und Betriebsschnittstelle aus.

Die Bedienungsanleitung bleibt von der Implementierungsbegründung getrennt. Sie nennt unterstützte Konfiguration, erforderliche Entscheidungen, optionale Abweichungen, Befehle und erwartete Ergebnisse. Nachweise und historische Einschränkungen bleiben ihren exakten Releases zugeordnet, statt mit aktuellen Anweisungen vermischt zu werden. Unabhängig verfügbare Software, Konfiguration, Backup-Historie und Schlüssel müssen einem Nachfolger genügen, die Anwendung ohne die ursprüngliche Installation oder die private Maschinerie des Autors zu betreiben.

Unterstützten Stop und unterstützte Deinstallation zusammen mit der Installation festlegen. Bleibt bei der Deinstallation Zustand zur Wiederverwendung erhalten, beschreiben, wie eine nachfolgende autorisierte Installation ihn nutzen kann, ohne einen konkurrierenden Vorgänger zuzulassen. Diesen Ablauf erproben, bevor er als unterstützt gilt. Erhaltene Daten allein belegen kein nutzbares Verfahren zur Neuinstallation. Die zum Abschluß der Deinstallation erforderliche Koordination muß verfügbar bleiben, bis ihre Arbeit beendet ist.

Bei einer Ablösung die Vorbereitung eines isolierten Kandidaten von seiner Aktivierung als Produktion unterscheiden. Vor der Aktivierung muß durch bestätigten Stop oder wirksame Isolation der Quelle genau eine maßgebliche Produktionsgeneration sichergestellt sein. Dafür die Kontrollen der Anwendung und das umgebende Serviceverfahren nutzen. Nimmt die Quelle weiter Schreibzugriffe an, diese durch einen abschließenden Capture und Rekonstruktion mit erneuter Prüfung oder einen unterstützten Aufholpfad innerhalb der akzeptierten Datenverlustgrenze berücksichtigen. Sobald der Ersatz Schreibzugriffe annimmt, ist die alte Kopie kein verlustfreier Rückweg mehr.

## Den gelieferten Pfad qualifizieren

Die [Nachweisfälle des Vertrags](https://codeberg.org/bartlapp/bartl-app#supported-configuration-and-catalogue-evidence) verwenden, keine zweite, von der Implementierung erfundene Checkliste. Das tatsächliche Paket und die Administratorschnittstelle erproben, einschließlich nutzbarer Wiederherstellung, unterstützter Migration und Fehlerverhalten.

Neben dem erfolgreichen Betrieb auch die Grenzen unserer Eingriffe prüfen. Ein gewöhnlicher Neustart darf keine Recovery-Abhängigkeiten erhalten. Fehlgeschlagene Arbeit darf nicht stillschweigend initialisieren oder erneut ablaufen. Ein Abschlußsignal darf einen bewußten Stop nicht übergehen. Qualifizierungsaccounts und Funktionsprüfungen werden nicht automatisch zu Startabhängigkeiten.

Das für Betreiber bestimmte Release mit denselben unveränderlichen Artefakten qualifizieren, die Betreiber beziehen. Eine anhand des Source getestete Implementierung qualifiziert für sich allein kein veröffentlichtes Paket. Exakte Artefaktidentitäten, beobachtete Ergebnisse und maßgebliche Grenzen in der Release- oder Integrationsbeschreibung festhalten. Wiederholbare Prüfungen bleiben im Source, rohe Laufausgaben außerhalb von Git. Keine Nachweisdateien oder Qualifizierungsberichte je Session anlegen.

Die behauptete Ausfallgrenze testen. Wiederherstellung in einem anderen Namespace belegt nicht, daß Host- oder Providerverlust überstanden wird. Betroffene Nachweise werden erneuert, wenn sich das Paket ändert.

## Beispiel: Keycloak

Das Betriebspaket 0.5.0 kombiniert Keycloak 26.6.2 mit PostgreSQL 17.6 und unterstützt den Vorwärtsübergang von Keycloak 26.6.1. Sein Rekonstruktionspfad veranschaulicht die Methode:

| Natives Verfahren | Fehlende Koordination durch das Paket |
| --- | --- |
| PostgreSQL startet und stellt die eigene Datenbank bereit. | Feststellen, ob Anwendungszustand vorhanden ist. Vorhandener Zustand führt direkt zum nativen Keycloak-Start. Nur Abwesenheit wählt die Backup-Suche. |
| PostgreSQL rekonstruiert einen nativen Datenbankdump transaktional. | Das neueste passende Backup auswählen und prüfen, konkurrierende Schreiber angehalten halten und den Ausschluß an die tatsächliche Restore-Transaktion binden. Ein endlicher Job führt die Arbeit aus. |
| `kc.sh start` initialisiert oder führt die unterstützte native Migration aus. | Erst nach erfolgreicher erforderlicher Rekonstruktion starten. Gewöhnlichen Zugriff bis zur Readiness des nativen Starts zurückhalten. Das Schema nicht unabhängig zertifizieren. |
| Keycloaks native Realm-Administration widerruft wiederhergestellte Sessions. | Dies nach einer Backup-Wiederherstellung ausführen, nicht bei gewöhnlichem Neustart, bevor gewöhnlicher Traffic zugelassen wird. |

Wenn der zustandsverändernde Versuch fehlschlägt oder sein Ergebnis unklar ist, bleibt das Ziel nicht verfügbar und behält seine Diagnoseinformationen. Der Administrator kann ein anderes leeres Ziel aus dem erhaltenen Backup rekonstruieren, statt das fehlgeschlagene automatisch zu reparieren.

Der Controller verbindet diese Verfahren. Er ersetzt weder PostgreSQL-Transaktionen noch den Keycloak-Start. Sein Kubernetes-Aufbau und seine nur nach Recovery geltende Session-Regel sind Entscheidungen des Anwendungspakets, keine zusätzlichen Bartl-Anforderungen.
