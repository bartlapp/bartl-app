<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Anwendungsvertrag

Die [Betriebsphilosophie](https://github.com/bartlapp/bartl-app/blob/main/docs/philosophy.de.md) erklärt, warum Bartl Anwendung, Infrastruktur und Betriebsverantwortung verbindet. Dieser Vertrag bestimmt ihre erforderlichen Beiträge. [Eine Anwendung bartlisieren](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.de.md) erklärt die Umsetzung. Die Website rendert dieses Dokument; die Anwendungspakete führen ihre unterstützte Konfiguration, Verfahren und Nachweise. Maßgeblich ist die [englische Fassung](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md).

Menschen genehmigen Ergebnis und akzeptierte Risiken. Die Anwendung führt ihre internen Verfahren ohne manuelle technische Eingriffe aus. Ein Installation Administrator darf die gesamte Kundeninstallation durch dokumentierte Befehle mit ihrer versionierten Konfiguration betreiben und die Ergebnisse prüfen. Er darf dabei keine fehlende Anwendungsmechanik erfinden müssen. Installationsweite Automation ist ein gesondertes langfristiges Ziel.

## Anwendungsvertrag und Qualifikation

Der Vertrag gilt für eine logische Anwendungsinstanz, nicht unabhängig für jeden Prozeß oder jede Replika. Er schreibt weder Kubernetes noch gemeinsame Runtime, Controller oder Sidecar vor. Native Skalierungs-, Restart- und Update-Fähigkeiten bleiben erhalten. Produktgrenzen und begründete Paketeinschränkungen werden im unterstützten Profil benannt.

### Wie die Anwendung startet

Du installierst oder startest die Anwendung. Sie stellt selbst fest, was zu tun ist:

- Sind ihre Daten bereits vorhanden, verwendet sie diese.
- Andernfalls stellt sie die neueste Sicherung wieder her.
- Ist kein Backup-Speicher konfiguriert oder gibt es noch keine Sicherung, startet sie mit den Ausgangsdaten der Anwendung.
- Ist die Software neuer als die Daten, führt sie die notwendige unterstützte Aktualisierung durch.

Du mußt diese internen Schritte weder auswählen noch von Hand ausführen. Du lieferst Release und Installationskonfiguration, keine Initialisierungsfreigabe, keinen Recovery-Modus und keinen zweiten Befehl zur Freigabe erfolgreicher Rekonstruktion.

Bei einem Replacement-Upgrade stellt die neuere Installation das Backup wieder her und aktualisiert die Daten durch dasselbe Verfahren. Das Upgrade übt damit auch Recovery. Version und Ziel bleiben eine Betriebsentscheidung; für die Umschaltung gelten die Aktivierungsanforderungen weiter unten.

### Startentscheidung

```text
local = observe_local_state()
if not local.exists:
    backup = observe_backup()
    if backup.exists:
        restore(backup)
native_start()
await_native_success()
serving()
```

`observe_local_state()` unterscheidet vorhandenen eigenen Zustand von bestätigter Abwesenheit. Fehlgeschlagene Beobachtung blockiert den davon abhängigen Start oder Übergang; sie erlaubt niemals Initialisierung. Die Beobachtung liefert die Fakten zur Auswahl des Verfahrens, kein vollständiges Schema-Zertifikat.

Nur fehlender lokaler Zustand erfordert `observe_backup()`. Die Funktion liefert das neueste vollständige, geprüfte Backup für diesen Kunden und diese Anwendung. Sie meldet Abwesenheit, wenn kein Speicher konfiguriert ist oder eine erfolgreiche Abfrage kein Backup findet. Abfrage- und Integritätsfehler stoppen die Ausführung. Vorhandener Zustand benötigt keinen Backup-Zugriff.

`restore()` nutzt das unterstützte native Verfahren; unvollständige Rekonstruktion darf nicht zum nutzbaren Ziel werden. `native_start()` führt bei Bedarf native Initialisierung oder unterstützte Migration aus. Nicht unterstützte Übergänge und Downgrades dürfen Zustand nicht destruktiv verändern. Native Schutzmechanismen nutzen und nur nachgewiesene Lücken ergänzen.

`await_native_success()` prüft das native Übergangsergebnis und normale Readiness. Die Anwendung darf intern laufen, während gewöhnlicher Zugriff gesperrt bleibt. `serving()` öffnet ihn nach Erfolg. Ein gewöhnlicher Prozeß- oder Kubernetes-Neustart bleibt nativer Start, kein Recovery-Workflow und keine privilegierte Abnahme.

Fehlgeschlagene Initialisierung, Rekonstruktion oder Migration bleibt über Neustarts sichtbar gestoppt. Das fehlgeschlagene Ziel darf nur ersetzt und die gewöhnliche Installation wiederholt werden, wenn unabhängig erhaltene Eingaben den erforderlichen Zustand innerhalb der akzeptierten Datenverlustgrenze wiederherstellen können. Automatische Reparatur, Wiederholung oder Rekonstruktion unklaren Fortschritts ist nicht erforderlich.

### Verantwortung der Anwendung

Das Inventar erfaßt alle eigenen veränderlichen Daten und Metadaten, ihre Konsistenzbeziehungen und die für Betrieb und Recovery nötigen externen Abhängigkeiten. Die Nutzung eines gemeinsamen Dienstes erlaubt nicht dessen Rücksetzung. Eine zustandslose Anwendung deklariert ein leeres Persistenzinventar, statt Sicherungsarbeit zu erfinden.

Die Anwendung oder ihr gepflegtes Betriebspaket verantwortet konsistente Erfassung, Rekonstruktion, Migration und anwendungsbezogene Prüfung. Automatisiert werden die nativen Verfahren eines fachkundigen Administrators. Jeder eigene Mechanismus muß die Administratorhandlung benennen, die er automatisiert, oder die nachgewiesene native Lücke, die er schließt.

Jeder zustandsverändernde Schritt erhält einen Verantwortlichen; konkurrierende Ausführung wird ausgeschlossen. Weitere Repliken treten über native State-Sharing- oder Replikationsverfahren bei. Sie initialisieren oder rekonstruieren gemeinsamen Zustand nicht unabhängig. Komponenten dürfen über Entrypoint oder ausdrückliches Protokoll zusammenarbeiten. Fertigmeldungen müssen aber aktuelle Installation und Operation identifizieren. Neustart, wartende Arbeit und Abschluß dürfen einen bewußten Stop nicht übergehen oder Zugriff durch veraltete Ergebnisse freigeben.

Zulassung, laufender Betrieb und Entzug der Betriebsberechtigung sind verschiedene Entscheidungen. Fehlende Beobachtung allein entzieht einer laufenden Anwendung nicht ihre Berechtigung. Jedes Paket erklärt sein Betriebs- und Stop-Verhalten bei nicht verfügbarer Beobachtung einschließlich der Verfügbarkeits- und Sicherheitsgrenzen. Eine unbestätigte Stop-Anforderung beweist kein Ausführungsende. Fortlaufende Schema-Überwachung ist nicht erforderlich.

Fehler werden an der Grenze des betroffenen Vorgangs gemeldet. Scheitert nur die Veröffentlichung eines vollständigen konsistenten Capture, wird das Backup als fehlgeschlagen gemeldet und der Capture für einen erneuten Versuch geschützt. Eine ansonsten gesunde Anwendung nimmt den Betrieb wieder auf, wenn Zustand und aktuelle Betriebsberechtigung es erlauben. Der Veröffentlichungsfehler allein darf sie nicht gestoppt halten. Fehlgeschlagener Capture, unklarer Zustand oder ungeklärte Berechtigung erlauben keinen Wiederanlauf.

### Recovery-Artefakt und Speichergrenze

Ein Recovery-Punkt ist ein eindeutig identifizierter, vollständiger, konsistenter und prüfbarer Satz. Er enthält den erforderlichen veränderlichen Zustand, Inventar, Zustandsformat, Release-Kompatibilität und Integritätsinformationen. Datenbank- und Dateiexporte sind Bestandteile, keine getrennten Punkte, die ein Administrator später zusammenpassen muß. Erforderliche Anwendungsidentität bleibt erhalten; jede Recovery-Abhängigkeit wird benannt.

Das kompatible unveränderliche Release bleibt gesondert identifiziert und unabhängig verfügbar. Zielkonfiguration wird getrennt geliefert. Entschlüsselungsschlüssel müssen unabhängig nutzbar sein, nicht nur innerhalb des verschlüsselten Artefakts. Rekonstruktion muß ohne ursprüngliche Installation oder Provider funktionieren.

Native Formate verwenden. Weder Full-State-Blob, Objectstore noch universelles Archivformat sind vorgeschrieben. Ein benötigter Backup-Client darf Teil des Pakets sein. Erst vollständige geprüfte Veröffentlichung macht einen Punkt verwendbar. Unterbrochene Uploads und fehlende Bestandteile dürfen nicht als nutzbar erscheinen. Integritätsprüfungen allein belegen weder Capture-Konsistenz und Aktualität noch Unterbrechungssicherheit oder ausschließliche Schreibautorität.

Das Backup-System speichert, schützt, erhält und liefert erfaßte Daten. Es muß weder Anwendungsschema noch Migration verstehen. Erforderlich sind:

- dauerhafter, integritätsprüfbarer Speicher und mehrere eindeutig wählbare Punkte;
- verläßliche Retention, kontrolliertes Löschen und Schutz vor Löschen oder Überschreiben durch kompromittierte Produktionszugänge;
- Unabhängigkeit von der relevanten Ausfall- und Administrationsdomäne der Produktion;
- Verschlüsselung, unabhängige Schlüssel und Wiederherstellung ohne Quellinstallation;
- automatisierbare Schnittstellen, erkennbare unvollständige Backups und Fehler sowie vollständige Übergabe an einen Nachfolgebetreiber.

Gewünscht sind Übertragung und zusätzliche Speicherung nur geänderter Daten, Deduplication und sinnvolle Kompression, schneller Restore ohne manuelle Kettenzusammenstellung, geringer Betriebsaufwand, vorhersehbare Kosten und Speicherproviderwechsel mit Erhalt der benötigten Historie.

Ein externer Pfad oder Objectstore kann diese Grenze erfüllen, wenn Unabhängigkeit, Zugang, Verschlüsselung, Retention und regulatorische Bedingungen genügen. Versionierung reicht nicht, wenn Produktionszugänge sämtliche Versionen löschen können. Ein Speicherlabel belegt keine Compliance. Aus diesen Anforderungen folgt weder ein anwendungsbewußter Backup-Server noch eine Workflow-Plattform.

### Unterstützte Konfiguration und Katalog-Nachweise

Mit einer begründeten Konfiguration beginnen. Unterstützte Releases und Übergänge, Persistenz, Zielanforderungen, abgedeckte Ausfälle und Betriebsgrenzen festhalten. Das gelieferte Paket wird mit exakten Artefakten, beobachteten Ergebnissen und Grenzen qualifiziert:

| Fall | Erforderlicher Nachweis |
| --- | --- |
| Erstinitialisierung | Nutzbare Vanilla-Installation auf leerem eigenen Zustand, sowohl ohne konfigurierten Speicher als auch mit einem Speicher ohne Backup. |
| Normaler Neustart | Zustand und Identität bleiben ohne Backup-Zugriff, erneute Initialisierung oder unnötigen Restore erhalten. |
| Restore ohne Quelle | Mit dem Paket einen Punkt erzeugen, auf leerem Ziel ohne Quelle oder zweiten technischen Freigabebefehl wiederherstellen, Daten, Identität und Nutzbarkeit prüfen, neue Arbeit ausführen und einen weiteren nutzbaren Recovery-Punkt erzeugen. |
| Unterstützter Versionswechsel | Native Migration gelingt; unzulässige Übergänge und Downgrades werden ohne destruktiven Ersatzpfad abgewiesen. |
| Fehlgeschlagener Übergang und Wiederholung | Fehler bleiben über Neustarts sichtbar gestoppt; gewöhnliche Wiederholung auf unabhängigem Ziel gelingt innerhalb der akzeptierten Datenverlustgrenze. Konkurrierende Ausführung, veraltete Fertigmeldungen und Arbeit gegen Stop-Absicht sind ausgeschlossen. |
| Beobachtungs- und Verfahrensfehler | Fehlgeschlagene Beobachtung, Abfrage des konfigurierten Speichers, beschädigte Backups und native Fehler führen nicht zur Initialisierung. Veröffentlichungsfehler bleiben vom Anwendungszustand getrennt und respektieren Stop. Laufender Betrieb folgt der erklärten Beobachtungsausfallregel. |
| Fremder Zustand | Anwendungsfehler setzen gemeinsamen oder fremden Zustand nicht zurück. |
| Fachliche Abnahme | Vereinbarte Nutzbarkeit wird nach jedem unterstützten Übergang geprüft; erfolgreicher Container oder Job allein reicht nicht. |

Diese Fälle schreiben keinen universellen Test-Runner vor. Implementierungen werden dort wiederverwendet, wo Verantwortlichkeiten tatsächlich übereinstimmen. Ein einzelner bestandener Fall qualifiziert nicht den gesamten Vertrag. Die Nachweise benennen, welche der folgenden Service-Recovery-Bedingungen erprobt wurden.

## Service-Recovery und Aktivierung

Anwendungsrekonstruktion braucht eine nutzbare Umgebung, Zugangswege und durchgesetzte Produktionsautorität. Die Gesamtinstallation muß sie liefern, unabhängig davon, ob Mensch oder Automation das Verfahren ausführt. Sichere Aktivierung gilt bereits heute, nicht erst nach Einführung eines Installation Controllers.

### Eingaben und Autorisierung

Installation, exakte Releases und wirksame Konfiguration, vollständigen geprüften Recovery-Punkt oder autorisierte Auswahlregel, geschützte Credentials und Schlüssel sowie Zielprofil identifizieren. Zulässige Unterbrechung, Datenverlust und Behandlung der alten Schreibautorität festhalten. Ein geändertes Ziel oder Risiko außerhalb dieser Autorisierung verlangt eine neue Entscheidung. Entscheidungszeit zählt zur gesamten Unterbrechung.

### Ziel- und Providergrenze

Der Zielvertrag benennt Runtime und Versionen, Rechenleistung und temporäre Rekonstruktionskapazität, Persistenzsemantik, Erreichbarkeit, Serviceendpunkte und Abhängigkeiten. Providerspezifische Bereitstellung stellt diese Fähigkeiten her, ohne die Anwendungs-Recovery zu ändern. Die Umgebung darf neu oder vorhanden sein. Zugang, Autorisierung und Kapazität müssen aber innerhalb des Recovery-Ziels tatsächlich nutzbar sein.

### Ausführung und Ergebnis

Recovery-Verfahren und etwaiger Koordinator, Bootstrap, Artefakte, Zustand, Credentials und Schlüssel müssen den ausgeschlossenen Quellausfall beziehungsweise Administrationsbereich überstehen. Die Ausführung darf nicht nur in der Umgebung verfügbar sein, die sie rekonstruieren soll. Normaler Service darf nicht von ihrer dauerhaften Verfügbarkeit abhängen.

Nach Autorisierung werden Eingaben und Zielfähigkeiten geprüft, die Umgebung hergestellt, Anwendungen in Abhängigkeitsreihenfolge rekonstruiert und migriert, ihre Funktion geprüft, Schreibautorität übertragen und Zugang aktiviert. Erfolg bedeutet, daß Nutzer mit erforderlichen Daten und Abhängigkeiten innerhalb der genehmigten Grenzen arbeiten können. Tatsächliche Recovery-Zeit, gewählten Punkt, Abnahmeergebnisse und aktive Ressourcenidentitäten festhalten.

### Serviceautorität und Promotion

Promotion stellt genau eine maßgebliche Produktionsgeneration her. Der Vorgänger darf keine Produktionsarbeit mehr annehmen oder unzulässige Wirkungen über aktive Abhängigkeiten auslösen. Er darf mit isoliertem Zustand weiterlaufen, sofern er Produktion nicht beeinflussen und ohne ausdrücklichen Abgleich nicht wieder maßgeblich werden kann. Abschalten der alten Maschine ist ein möglicher Mechanismus, keine allgemeine Pflicht.

Für das erklärte Fehlermodell benennt die Integration:

- sämtliche Schreibpfade einschließlich Direktzugang, bestehender Verbindungen, Worker, Scheduler und Mirrors;
- externe Wirkungen, Systeme und Credentials sowie den Entzug alter Berechtigung an jeder Grenze;
- Durchsetzung bei erreichbarer Quelle und, soweit Quellverlust abgedeckt ist, ohne Mitwirkung ihres Providers;
- Schutz vor erneuter Übernahme durch einen zurückkehrenden Vorgänger;
- Feststellung der aktiven Generation nach unterbrochener Promotion oder verlorener Aktivierungsbestätigung, bevor weiter gehandelt wird.

Die Anwendung kennt ihre Writer, Wirkungen und Kontrollen. Infrastruktur und Abhängigkeitsintegrationen setzen durch, was sie nicht selbst durchsetzen kann. DNS-Wechsel, Workflow-Lock, Autoritätsdatensatz und abgelaufene Lease reichen nicht, wenn relevante Zugangswege und Ressourcen die Entscheidung nicht durchsetzen.

Geplante Ablösung kann bestätigten Stop und Drain der Quelle sowie Verhinderung ihres Neustarts nutzen. Providerverlust benötigt unabhängig vorbereitete Durchsetzung. Unerreichbarkeit ist keine Stillsetzung. Kann Berechtigung nicht ohne Quelle entzogen werden, stoppt die Aktivierung mit Benennung der fehlenden Fähigkeit. Sichere Verweigerung ist keine erfolgreiche Providerverlust-Recovery.

Ein isolierter Kandidat darf vorbereitet werden, während die Quelle läuft. Vor Produktionsaktivierung müssen spätere Writes durch abschließenden Capture und Rekonstruktion mit erneuter Prüfung oder einen unterstützten Aufholpfad innerhalb der autorisierten Datenverlustgrenze berücksichtigt werden. Ein älterer Punkt akzeptiert nur den erlaubten Verlust zwischenzeitlicher Arbeit, keinen Split-Brain oder stillen Merge aufgegebenen Zustands. Könnte der Ersatz bereits Writes oder Wirkungen erzeugt haben, darf der Vorgänger nicht automatisch reaktiviert werden.

Nachweise umfassen veraltete Zugänge, Hintergrundwirkungen, unterbrochene Aktivierung und Rückkehr des Vorgängers innerhalb des behaupteten Fehlermodells. Sie identifizieren aktive Generation und beobachtete Durchsetzung. Kein universelles Lease-Protokoll, Watchdog oder Fencing-Produkt ist vorgeschrieben.

## Providerunabhängiger Recovery-Ausführungsvertrag

Das zusätzliche langfristige Automationsziel ist die vollständige autorisierte Service-Recovery ohne manuelle technische Eingriffe. Das heutige menschlich ausgeführte Betriebsmodell muß diese Folge nicht automatisieren. Seine Anwendungs- und Servicepflichten bleiben unverändert.

Ein Provideradapter liefert und prüft das Ziel über unterstützte Maschinenschnittstellen. Er gibt Ressourcenidentitäten, Endpunkte und geschützte Zugangsreferenzen zurück. Diese Zuordnung muß beim Provider-Onboarding stehen, bevor unbeaufsichtigte Recovery zugesagt wird.

Die Ausführung erhält genug dauerhafte Absicht und beobachteten Fortschritt, um sicher fortzusetzen oder ohne unklare Zuständigkeit und destruktive Wiederholung zu stoppen. Fehlende oder inkonsistente Eingaben führen zum Abbruch. Technische Routineschritte dürfen keine manuelle Rekonstruktion verlangen. Ausnahmen liefern den beobachteten Zustand und eine ausdrückliche Entscheidung. Für Aktivierung gelten weiterhin die Anforderungen an Serviceautorität.

Der vollständige Anspruch wird ohne Quellzugriff erprobt, einschließlich Bereitstellung, Abhängigkeiten und Benutzerzugang. Unabhängige Backups allein reichen nicht. Automatische Incident-Erkennung und autonome Failover-Entscheidungen bleiben gesonderte Serviceentscheidungen, keine Voraussetzung automatischer Ausführung nach Autorisierung.
