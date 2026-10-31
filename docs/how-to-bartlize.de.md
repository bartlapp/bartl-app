<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Eine Anwendung bartlisieren

Die unterstützten Verfahren, die ein sachkundiger Administrator ausführen würde, werden in ein gepflegtes Betriebspaket überführt. Die native Arbeit der Anwendung bleibt erhalten. Automatisiert werden die fehlenden Schritte und ihre Koordination.

Der [Anwendungsvertrag](https://codeberg.org/bartlapp/bartl-app#application-contract-and-qualification) definiert das erforderliche Verhalten. Dieser Leitfaden erklärt seine Umsetzung. Er schreibt weder Kubernetes noch eine gemeinsame Runtime vor.

## Mit einer unterstützten Konfiguration beginnen

Anwendungsrelease, Persistenz und Abhängigkeiten, Zielanforderungen und unterstützten Versionsübergang benennen. Festlegen, welches nutzbare Verhalten die Rekonstruktion überstehen muß. Mit einer Konfiguration beginnen, die jemand braucht, nicht mit einer spekulativen Kompatibilitätsmatrix.

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

Die Antwort gehört neben den Mechanismus in den Entwurf der Anwendung. Gibt es auf keine der beiden Fragen eine Antwort, entfällt der Mechanismus. Ein hypothetischer Fehler oder ein ausuferndes Abnahmekriterium genügt nicht als Begründung. Das Kriterium muß hinterfragt werden, statt ein Subsystem zu seiner Erfüllung zu bauen.

Jeder zustandsverändernde Schritt erhält genau einen Verantwortlichen. Native Transaktionen, Ausschluß konkurrierender Ausführung, Prozeßüberwachung und Readiness werden genutzt, wo sie das erforderliche Verhalten bereits liefern. Ergänzt wird nur, was diese Fähigkeiten zum unterstützten Verfahren verbindet. Zustandsbeobachtung darf nicht zur vollständigen Schemazertifizierung oder Dauerüberwachung mit der Befugnis werden, eine gesunde Anwendung anzuhalten.

Ein fehlgeschlagener zustandsverändernder Versuch darf sichtbar nicht verfügbar bleiben und seine Diagnoseinformationen behalten, während ein Administrator das fehlgeschlagene Ziel ersetzt und mit unabhängig verfügbaren Eingaben erneut beginnt. Maßgeblicher Zustand und Backups bleiben erhalten. Automatische Reparatur, Wiederholung oder Rekonstruktion unklaren Fortschritts ist nicht erforderlich. Das schaltet gewöhnliche Prozeßneustarts der Plattform nicht ab.

Den ersten vollständigen Pfad vor einer Erweiterung gegen diese Zuordnung prüfen. Vorhandener Code und bestandene Tests belegen weder die Notwendigkeit eines Mechanismus noch die Erlaubnis, Abhängigkeiten, Privilegien, Bedienerschritte oder neue Fehlerregeln hinzuzufügen.

## Ein nutzbares Paket liefern

Der Administrator liefert Release, Installationsidentität, wirksame Konfiguration und geschützte Verweise auf Eingaben. Das Paket führt die anwendungsspezifische Arbeit über die gewöhnliche Installations- und Betriebsschnittstelle aus.

Die Bedienungsanleitung bleibt von der Implementierungsbegründung getrennt. Sie nennt unterstützte Konfiguration, erforderliche Entscheidungen, optionale Abweichungen, Befehle und erwartete Ergebnisse. Nachweise und historische Einschränkungen bleiben ihren exakten Releases zugeordnet, statt mit aktuellen Anweisungen vermischt zu werden. Unabhängig verfügbare Software, Konfiguration, Backup-Historie und Schlüssel müssen einem Nachfolger genügen, die Anwendung ohne die ursprüngliche Installation oder die private Maschinerie des Autors zu betreiben.

## Den gelieferten Pfad qualifizieren

Die [Nachweisfälle des Vertrags](https://codeberg.org/bartlapp/bartl-app#supported-configuration-and-catalogue-evidence) verwenden, keine zweite, von der Implementierung erfundene Checkliste. Das tatsächliche Paket und die Administratorschnittstelle erproben, einschließlich nutzbarer Wiederherstellung, unterstützter Migration und Fehlerverhalten.

Neben dem erfolgreichen Betrieb auch die Grenzen unserer Eingriffe prüfen. Ein gewöhnlicher Neustart darf keine Recovery-Abhängigkeiten erhalten. Fehlgeschlagene Arbeit darf nicht stillschweigend initialisieren oder erneut ablaufen. Ein Abschlußsignal darf einen bewußten Stop nicht übergehen. Qualifizierungsaccounts und Funktionsprüfungen werden nicht automatisch zu Startabhängigkeiten.

Exakte Artefaktidentitäten, beobachtete Ergebnisse und maßgebliche Grenzen festhalten. Die behauptete Ausfallgrenze testen. Wiederherstellung in einem anderen Namespace belegt nicht, daß Host- oder Providerverlust überstanden wird. Betroffene Nachweise werden erneuert, wenn sich das Paket ändert.

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
