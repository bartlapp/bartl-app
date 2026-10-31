<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bartl: handlungsfähig bleiben

Menschen müssen ihre Arbeit erledigen können. Sie müssen ihre Daten nutzen, zusammenarbeiten und Ergebnisse liefern können, auch wenn sich Software, Provider und Anforderungen ändern. Wir sollten eine Anwendung aktualisieren, einen ungeeigneten Dienstleister ersetzen oder eine Störung überwinden können, ohne erst erfinden zu müssen, wie der Service dabei nutzbar bleibt.

Dafür brauchen wir einen vollständigen Service, nicht nur gesunde Komponenten. Eine Anwendung kann laufen, während Menschen sich nicht anmelden, ihre Daten nicht erreichen oder eine erforderliche Abhängigkeit nicht nutzen können. Der Zustand einer Komponente ist wichtig, weil sie zur nutzbaren Leistung beiträgt. Er ist nicht das Ergebnis, das wir erhalten wollen.

Resilienz bedeutet, daß wir die erforderliche Arbeit trotz einer Störung fortsetzen oder innerhalb vertretbarer Grenzen für Unterbrechung und Datenverlust wiederaufnehmen können. Souveränität bedeutet, selbst darüber entscheiden zu können, wie wir IT nutzen. Dazu gehört, eine untragbare Betriebsvereinbarung ablehnen zu können, ohne den Service zu verlieren. Ein vertragliches Recht zum Ausstieg gibt uns wenig Freiheit, wenn es kein nutzbares Ziel gibt. Wir brauchen eine Alternative, deren Software, Daten, Infrastruktur, Zugang und Betriebsverantwortung so weit vorbereitet sind, daß wir sie innerhalb der akzeptierten Grenzen nutzen können.

Ein Spezialist weiß vielleicht, wie das einmal gelingt. Damit hat das Betriebsteam noch keine wiederholbar nutzbare Fähigkeit. Das technische Wissen muß in gepflegte Verfahren übergehen, die das vorgesehene Team mit den verfügbaren Menschen und Mitteln ausführen und prüfen kann. Entscheidungen und unerwartete Bedingungen brauchen weiterhin Urteilsvermögen. Der gewöhnliche Betrieb darf nicht davon abhängen, daß jemand den Lösungsweg immer wieder aus dem Gedächtnis zusammensetzt.

Bartl denkt von diesem Ergebnis zurück. Die Anwendung muß ihr eigenes Betriebswissen bereitstellen, die Infrastruktur die dafür nutzbaren Bedingungen schaffen und die Organisation Verantwortung, Befugnisse und Mittel regeln. Erst ihr Zusammenwirken kann den Service liefern. Bartl ist diese Betriebsphilosophie, keine bestimmte Runtime und keine Behauptung, daß diese Praktiken neu seien.

## Was muß die Anwendung leisten?

Die Infrastruktur kann nicht ableiten, welche Anwendungsdaten zusammengehören oder wie eine Softwareversion sie verändert. Die Anwendung muß deshalb ihren vollständigen Zustand kennen, ihn konsistent sichern und rekonstruieren können und wissen, welche Migrationen sie unterstützt. Sie muß unterscheiden, was erhalten bleiben muß und was neu aufgebaut oder verworfen werden kann, und das Ergebnis prüfen. Dieses Wissen gehört in ausführbare Verfahren, nicht in Anweisungen, die bei jeder Installation neu ausgelegt werden müssen.

Ein Wiederherstellungspunkt enthält den vollständigen, konsistenten Anwendungszustand samt Inventar, Kompatibilitätsinformationen und Integritätsprüfungen. Seine Bestandteile bilden einen ausdrücklich identifizierten Satz und werden gemeinsam wiederhergestellt. Der Betreiber darf nicht getrennte Datenbank- und Dateisicherungen einander zuordnen müssen. Native Formate bleiben erhalten. Zusätzliche Verpackung braucht einen konkreten Nutzen, nicht nur weniger Dateien. Das unveränderliche Release und die zielspezifische Konfiguration bleiben getrennt. Erforderliche Anwendungsidentität muß die Wiederherstellung überstehen.

Die Anwendung legt außerdem fest, was ihre Umgebung bereitstellen muß. Dazu gehören Runtime, Storage-Semantik, Konnektivität und Abhängigkeiten. Ihr Wiederherstellungsmechanismus sollte diesen Vertrag nutzen, statt von der Implementierung eines bestimmten Providers abzuhängen.

## Was muß die Infrastruktur leisten?

Diese Verfahren brauchen eine Umgebung, in der sie laufen können. Die Infrastruktur muß die von der Anwendung geforderten Fähigkeiten über unterstützte Maschinenschnittstellen bereitstellen. Providerspezifische Bereitstellung schafft die Zielumgebung, ohne das Rekonstruktionsverfahren der Anwendung zu verändern. Jede Umgebung, die den Vertrag erfüllt, kann ein Ziel sein. Zugangsdaten, Kapazität, Zugriff und Bereitstellung müssen jedoch innerhalb der erforderlichen Zeit tatsächlich nutzbar sein.

Storage bewahrt das Wiederherstellungsartefakt auf und liefert es zurück. Er muß die Anwendung nicht verstehen. Ein unabhängiger Pfad oder Object Store kann genügen, wenn Zugriff, Dauerhaftigkeit, Schutz gegen Überschreiben und Löschen sowie regulatorische Anforderungen erfüllt sind. Schlüssel müssen verfügbar bleiben. Eine Prüfsumme kann nicht belegen, daß die Anwendung einen konsistenten Zustand gesichert hat.

Bei der Wiederherstellung nach Providerverlust müssen sowohl die Eingaben als auch der Ausführungspfad den behaupteten Ausfall überstehen. Ein Backup, das nur der verlorene Provider entschlüsseln kann, oder ein Recovery-Runner, der nur im verlorenen Cluster verfügbar ist, erfüllt diese Bedingung nicht. Die Abhängigkeit in einen zentralen Steuerungsdienst zu verlagern beseitigt sie nicht. Auch der normale Service darf nicht von der ständigen Verfügbarkeit dieses Koordinators abhängen.

Self-Healing ist nicht dasselbe wie Hochverfügbarkeit. Ein einzelner Node kann ausgefallene Workloads neu starten, aber nicht sein eigenes Verschwinden überstehen. Die erforderliche Verfügbarkeit bestimmt die Redundanz. Weder Updates durch Ersatzinstallationen noch providerunabhängige Rekonstruktion erfordern grundsätzlich ein HA-Deployment.

## Was muß die Organisation leisten?

Funktionierende Anwendungsverfahren und verfügbare Infrastruktur entscheiden nicht darüber, welcher Service gebraucht wird oder wer ihn verändern darf. Jemand muß für den vollständigen Service verantwortlich bleiben. Dazu gehören Anwendung, Infrastruktur, Benutzerzugang und Abhängigkeiten einschließlich der Beiträge Dritter. Die Organisation legt die erforderliche Funktionalität sowie Grenzen für Schutz, Unterbrechung, Datenverlust und Kosten fest und stellt die dafür nötigen Befugnisse und Mittel bereit. Genehmigung und Beschaffung gehören zur Einsatzbereitschaft des Ziels. Was während der zulässigen Unterbrechung nicht beschafft werden kann, muß vorher vorbereitet sein.

Menschen entscheiden, was wann und mit welchem Risiko geschehen soll. Jede bartlisierte Anwendung führt ihre unterstützten internen Verfahren ohne manuelle technische Eingriffe aus, prüft das Ergebnis und meldet Erfolg oder hält sicher an. Ein Installationsadministrator darf die Kundeninstallation betreiben und pflegen, indem er dokumentierte Befehle mit ihrer versionierten Kundenkonfiguration kopiert und ausführt und die dokumentierten Ergebnisse prüft. Er darf keine fehlenden Anwendungsverfahren erfinden oder die internen Schritte für Initialisierung, Restore oder Migration von Hand zusammensetzen müssen.

Die Arbeit dieses Administrators über die vollständige Kundeninstallation hinweg durch einen Installation Controller zu automatisieren ist das langfristige Ziel, keine Voraussetzung für das heutige, von Menschen betriebene Modell. Ob dieser Controller als Kubernetes Operator oder anders implementiert wird, bleibt offen. Automatische Entscheidungen über Störungen sind eine getrennte Wahl. Menschliche Entscheidungs- und Ausführungszeit zählt weiterhin zur Unterbrechung.

Anwendung, Infrastruktur und Betriebsverfahren werden als versionierter Code beschrieben. Sie werden geprüft, getestet und freigegeben. Wo die Arbeit dieselbe ist, werden dieselbe Logik und geprüfte Artefakte verwendet. Der Nutzen ist verläßliche Qualität, nicht bloß schnellere Ausführung. Eine Korrektur gehört in diese gemeinsame Implementierung, damit der nächste Administrator sie nicht erneut entdecken muß. Ausnahmen können Urteilsvermögen erfordern. Gewöhnliche Fälle, die wiederholt als Ausnahmen bezeichnet werden, weisen auf unfertiges Engineering hin.

Wir müssen nicht alles selbst betreiben, aber beurteilen und ersetzen können, was wir einkaufen. Ein Nachfolger muß die Umgebung ohne Abhängigkeit von der zentralen Maschinerie des bisherigen Dienstleisters betreiben können. Der Austausch eines Dienstleisters beseitigt nicht zwangsläufig eine Abhängigkeit vom Softwarehersteller. Die Alternative muß die entscheidende Abhängigkeit adressieren.

## Wie werden die Beiträge zu einem funktionierenden Service?

Die Grenzen oben teilen die Arbeit auf, nicht das Ergebnis. Wir müssen prüfen, ob die Beiträge zusammenpassen und die benötigte Leistung für die Menschen erbringen.

Ein vollständiger Service kann mehrere Anwendungen enthalten, ohne sie zu einer gemeinsamen Update- oder Restore-Einheit zu machen. Das Update einer Forge muß nicht den Dateidienst desselben Kunden rekonstruieren. Tatsächliche Zustandsabhängigkeiten bestimmen, was gemeinsam wiederhergestellt werden muß. Die vollständige Betriebsverantwortung umfaßt deren Integration und Übergabe.

Rekonstruktion allein genügt nicht. Benutzer brauchen weiterhin Zugang, Identität und funktionierende Abhängigkeiten. Die alte Installation kann außerdem noch Anfragen bedienen oder Hintergrundarbeit ausführen. Eine DNS-Änderung entzieht ihr nicht zwangsläufig ihre Befugnisse.

Die Aktivierung muß genau eine maßgebliche Produktionsgeneration hinterlassen. Die alte Kopie kann weiterlaufen, wenn sie wirksam isoliert ist, darf aber keine Produktionsarbeit annehmen oder unzulässige Auswirkungen über aktive Abhängigkeiten verursachen. Die Anwendung legt ihre schreibenden Komponenten und Auswirkungen offen. Die umgebende Infrastruktur setzt die betreffenden Grenzen durch. Eine unterbrochene Aktivierung darf nicht blind die alte Kopie neu starten.

Wenn die Aktivierung ohne Hilfe des Quellproviders nicht sicher erfolgen kann, unterstützt die Installation die behauptete Wiederherstellung nach dessen Verlust noch nicht. Sicher anzuhalten ist notwendig, aber kein Erfolg. Einen älteren Wiederherstellungspunkt zu akzeptieren erlaubt keinen fortgesetzten Split-Brain.

## Wie halten wir diese Fähigkeit nutzbar?

Softwareversionen, Abhängigkeiten, Zugangsdaten und die zuständigen Menschen ändern sich. Ein Verfahren, das einmal funktioniert hat, kann unbrauchbar werden, während der aktuelle Service noch läuft. Die Fähigkeit zu erhalten gehört deshalb in den gewöhnlichen Betrieb. Bei Änderungen am Service müssen wir die Verfahren mitpflegen, sie erproben und korrigieren, was nicht mehr funktioniert.

Updates durch Ersatzinstallationen sind eine Möglichkeit, diesen Grundsatz umzusetzen. Wir müssen die Anwendung ohnehin aktualisieren. Warum nutzen wir diese Arbeit nicht, um herauszufinden, ob wir sie wiederherstellen können?

Installation, Update und Wiederherstellung brauchen zu großen Teilen dasselbe Wissen. Ihre gemeinsame Maschinerie wird gemeinsam gepflegt. Eine Ersatzinstallation wird aus einem Backup aufgebaut, das unterstützte Update angewendet, das Ergebnis getestet und anschließend die Produktion umgeschaltet. Das Update übt damit auch die Rekonstruktion. Der Kandidat braucht eigenen veränderlichen Zustand, kann aber bei ausreichender Kapazität auf derselben Maschine oder im selben Cluster laufen.

Das hat einen Preis. Zusätzliche Kapazität, Kopier- und Migrationszeit sowie die Koordination von Schreibzugriffen werden benötigt. Verändert sich die Produktion weiter, braucht der Kandidat einen abschließenden Restore mit erneuter Prüfung oder einen unterstützten Aufholpfad. Sobald er neue Schreibzugriffe annimmt, ist die alte Installation kein verlustfreier Rückweg mehr.

Updates durch Ersatzinstallationen sind dort sinnvoll, wo diese Kosten brauchbare Wiederherstellungsnachweise liefern. In-Place-Updates können ebenfalls unterstützt werden, prüfen aber keinen Restore. Dieser muß getrennt geübt werden. Ein Erfolg innerhalb desselben Providers belegt in keinem der beiden Fälle bereits Providerunabhängigkeit.

Eine Vorführung belegt, was unter ihren Bedingungen funktioniert hat, keine dauerhafte Fähigkeit. Verantwortung und Mittel müssen dafür zugeordnet sein, Verfahren, Abhängigkeiten und Nachweise aktuell zu halten. Der vollständige Service wird unter den behaupteten Ausfallbedingungen geübt, auch mit entzogenem Quellzugriff. Gemessen wird, wann Menschen wieder arbeiten können und welche Daten zurückgekehrt sind. Übergabe wird getestet, statt nur Dokumente zu übergeben.

## Lohnt sich die Pflege?

Implementierung, Pflege und Koordination zählen mit, nicht nur eingesparte manuelle Schritte. Wiederverwendbare Verfahren können getrennte Kundeninstallationen wirtschaftlich machen. Multiplied Single Tenancy kann dann unabhängige Änderungen, Wiederherstellung und Ausstieg ermöglichen. Fleet Management koordiniert die Wiederholung, bringt aber eigene Kosten und Risiken geteilter Steuerungsbefugnisse mit. Das sind Abwägungen, keine automatischen Vorteile oder universellen Topologievorgaben.

Wenn wir die zugesagte Fähigkeit nicht aufrechterhalten können, müssen wir das Serviceprofil ändern oder die Abhängigkeit ausdrücklich akzeptieren. Wir dürfen keine Fähigkeit versprechen, die nur existiert, wenn der richtige Spezialist eingreift. Der Maßstab ist, ob das vorgesehene Team innerhalb der vereinbarten Grenzen betreiben, ändern, wiederherstellen und aussteigen kann, nicht eine bevorzugte Technologie oder der Automatisierungsgrad.

Bartls Startmuster ist ein Implementierungsmechanismus. Vorhandener Zustand wird durch den normalen nativen Start verwendet. Fehlt Zustand, wird ein verfügbares Backup wiederhergestellt oder initialisiert. Der native Start führt unterstützte Migrationen aus. Fehlgeschlagene Beobachtung oder ein fehlgeschlagenes Verfahren hält sichtbar an, statt Initialisierung oder automatische Reparatur zu erlauben. Die [detaillierten Verträge](https://codeberg.org/bartlapp/bartl-app#provider-independent-recovery-execution-contract) beschreiben die weitergehenden Pflichten. Implementierungen müssen sie weiterhin nachweisen.
