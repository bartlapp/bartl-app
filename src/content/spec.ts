// SPDX-License-Identifier: CC-BY-4.0
export const specCopy = {
  de: {
    pageTitle: "Technische Spec",
    description:
      "Technische Spec des Bartl-Startpfads für zustandsbehaftete Anwendungen mit Eingaben, Entscheidung, Produktpflichten und Aussagegrenzen.",
    eyebrow: "Bartl-Startmechanismus",
    title: "Technische Spec",
    lead: "Diese Seite erläutert den normativen Anwendungsvertrag in README.md, Abschnitt Application contract and qualification. Der Startmechanismus ist ein Baustein von Bartls umfassender Betriebsphilosophie. Die Pflichten gelten je unterstützter Konfiguration; eine bestimmte Container- oder Kubernetes-Architektur ist nicht vorgeschrieben.",
    principle:
      "Der Zustand wählt den Pfad, nicht der Name einer angeforderten Operation.",
    toc: "Auf dieser Seite",
    nav: [
      ["contract", "Startvertrag"],
      ["decision", "Entscheidung"],
      ["invariants", "Invarianten"],
      ["product", "Produktpflichten"],
      ["qualification", "Katalog-Nachweise"],
      ["reference", "WordPress-Referenz"],
      ["boundary", "Aussagegrenze"],
    ],
    contractTitle: "Startvertrag und Eingaben",
    contractIntro:
      "Release, deklarierter Zustand und Zielkonfiguration müssen technisch prüfbar sein. Eine Sicherung ist optional und wird nur ohne lokalen Zustand abgefragt. Der Startpfad benötigt weder Moduswahl noch eine gesonderte Initialisierungsfreigabe.",
    inputLabel: "Eingabe",
    meaningLabel: "Vertrag",
    inputs: [
      [
        "Versioniertes Release",
        "Unveränderliches Anwendungsartefakt mit bekannter Engine-Version und der zugehörigen produktspezifischen Migrationslogik.",
      ],
      [
        "Vollständig deklarierter Zustand",
        "Inventar des eigenen veränderlichen Zustands und seiner Konsistenzbeziehungen. Native Verfahren bestimmen die relevante Kompatibilität. Fremde Persistenz ist eine Abhängigkeit, keine automatische Änderungsbefugnis.",
      ],
      [
        "Optionaler Sicherungsstand",
        "Der neueste geprüfte Stand für diesen Kunden und diese Anwendung. Kein konfigurierter Backup-Store oder ein konfigurierter Store ohne Sicherung bedeutet Abwesenheit, nicht Fehler.",
      ],
      [
        "Zielkonfiguration",
        "Vom Ziel gelieferte Endpunkte und Zugangsdaten. Sie sind weder Bestandteil des Releases noch des gesicherten Zustands.",
      ],
    ],
    observationsTitle: "Beobachtungen vor der Aktion",
    observations: [
      "observe_local_state() unterscheidet vorhandenen eigenen Zustand von bestätigter Abwesenheit. Beobachtungsfehler stoppen den Start, statt Initialisierung zu erlauben. Eine vollständige Schema-Zertifizierung ist nicht verlangt.",
      "observe_backup() läuft nur ohne lokalen Zustand. Die Funktion liefert den neuesten vollständig veröffentlichten und geprüften Stand für Kunde und Anwendung oder dessen Abwesenheit. Abfrage- und Integritätsfehler stoppen den Start.",
      "Der normale native Start übernimmt Initialisierung und unterstützte Migration. Native Kompatibilitätsgrenzen bleiben erhalten; nur nachgewiesene Lücken rechtfertigen eigene Ergänzungen.",
    ],
    decisionTitle: "Beobachteter Startpfad",
    decisionIntro:
      "Vorhandener Zustand führt zum normalen nativen Start. Nur bei bestätigter Abwesenheit wird nach einer Sicherung gesucht. Das ist kein Wiederholungskreislauf nach jeder Zustandsänderung.",
    pathTitle: "Auswertung",
    paths: [
      ["Lokaler Zustand vorhanden", "Normaler nativer Start verwendet den Zustand und führt nötige unterstützte Migration durch."],
      [
        "Kein lokaler Zustand und geprüfter Sicherungsstand",
        "Der neueste geprüfte Stand für Kunde und Anwendung wird mit dem unterstützten nativen Verfahren wiederhergestellt. Unvollständige Rekonstruktion wird nicht zum nutzbaren Ziel. Danach läuft der normale native Start einschließlich unterstützter Migration.",
      ],
      [
        "Kein lokaler Zustand und kein Sicherungsstand",
        "Der normale native Start initialisiert die Anwendung. Eine fehlgeschlagene Backup-Abfrage ist kein fehlender Sicherungsstand.",
      ],
      [
        "Beobachtung oder natives Verfahren schlägt fehl",
        "Der Start stoppt sichtbar. Nach einem fehlgeschlagenen zustandsändernden Versuch bleibt gewöhnlicher Zugriff auch über Neustarts gesperrt. Das fehlgeschlagene Ziel zu verwerfen und die gewöhnliche Installation zu wiederholen genügt.",
      ],
    ],
    invariantsTitle: "Invarianten des Mechanismus",
    invariantsIntro:
      "Eine Implementierung folgt dem Muster nur, wenn diese Eigenschaften über alle Startfälle erhalten bleiben.",
    invariants: [
      {
        title: "Ein Startpfad",
        body: "Vorhandener Zustand, Restore und Erstinitialisierung münden in den normalen nativen Start. Ein gewöhnlicher Kubernetes-Neustart bleibt ein gewöhnlicher Neustart.",
      },
      {
        title: "Fail-closed",
        body: "Beschädigter oder teilweise erzeugter Zustand, unvollständige Sicherungen und widersprüchliche Versionen werden nicht als leerer Startzustand umgedeutet.",
      },
      {
        title: "Prüfung vor Verwendung",
        body: "Ein Sicherungsstand wird erst nach erfolgreicher Prüfung seiner Veröffentlichung, seines Inventars und seiner Integrität wiederhergestellt.",
      },
      {
        title: "Migration gehört zum Produkt",
        body: "Native Initialisierung und Migration bleiben beim Produkt. Jede eigene Ergänzung muß eine benannte Administratorhandlung automatisieren oder eine nachgewiesene native Lücke schließen.",
      },
      {
        title: "Zugriff nach Erfolg",
        body: "Die Anwendung darf für Initialisierung oder Migration intern laufen. Gewöhnlicher Zugriff bleibt bis zum nativen Erfolg und normaler Readiness gesperrt. Eine laufende Schema-Überwachung ist nicht verlangt.",
      },
      {
        title: "Kontrollierter Abbruch",
        body: "Native Fehler und nicht unterstützte Übergänge enden sichtbar, ohne destruktiven Ersatzpfad. Automatische Reparatur oder Rekonstruktion mehrdeutiger Fortschritte ist nicht verlangt.",
      },
    ],
    productTitle: "Pflichten der Anwendung",
    productIntro:
      "Die Anwendung liefert die konkreten Verfahren für ihren eigenen Zustand. Eine gemeinsame Entscheidungsstruktur verlangt weder identischen Code noch einen universellen Operator. Mehrere Komponenten können über ein eindeutiges Protokoll zusammenarbeiten.",
    productRequirements: [
      "Zustandsgrenze: eigenes vollständiges Inventar und Konsistenzbeziehungen deklarieren; fremde oder gemeinsam genutzte Persistenz nur innerhalb ausdrücklich zugewiesener Verantwortung verändern.",
      "Beobachtung: vorhandenen eigenen Zustand von bestätigter Abwesenheit unterscheiden. Beobachtungsfehler erlauben keine Initialisierung; eine eigene vollständige Schema-Prüfung ist nicht verlangt.",
      "Lifecycle: nach gegebenenfalls nötigem Restore den normalen nativen Start einschließlich Initialisierung oder unterstützter Migration ausführen.",
      "Sicherung und Rekonstruktion: vollständige konsistente Recovery-Punkte erzeugen, vor Verwendung prüfen und ohne Quelle wiederherstellen; Software, Schlüssel und Zielvoraussetzungen benennen.",
      "Sichere Ausführung: konkurrierende Zustandsänderungen ausschließen und gewöhnlichen Zugriff bis zum Erfolg sperren. Fehlgeschlagene Übergänge bleiben auch über Neustarts gestoppt; Ziel verwerfen und gewöhnlich wiederholen genügt. Veraltete Fertigmeldungen dürfen Zugriff nicht freigeben.",
      "Ergebnisprüfung: native Übergangsergebnisse und normale Readiness verwenden. Die Paketqualifikation belegt die vereinbarte Fachleistung, nicht eine privilegierte Abnahme bei jedem Start.",
    ],
    qualificationTitle: "Nachweise für die Katalogaufnahme",
    qualificationIntro: "Je Anwendung wird zunächst eine begründete unterstützte Konfiguration mit Releases, Übergängen, Persistenz und Zielvoraussetzungen festgelegt. Die folgenden Fälle benötigen ausführbare Nachweise mit konkreten Artefakten und Aussagegrenzen. Einzelne bestandene Fälle sind keine vollständige Qualifikation; ein gemeinsamer Test-Runner ist nicht vorgeschrieben.",
    qualificationCases: [
      "Erstinitialisierung: nachweislich leerer eigener Zustand ergibt durch native Initialisierung eine nutzbare Installation, sowohl ohne konfigurierten Backup-Store als auch mit einem Store ohne Sicherung.",
      "Normaler Wiederanlauf: Zustand und Identität bleiben beim normalen nativen Start ohne Backup-Zugriff, erneute Initialisierung oder unnötigen Restore erhalten.",
      "Restore ohne Quelle: der neueste geprüfte vollständige Stand für Kunde und Anwendung stellt die vorgesehenen Daten, Identitäten und Rechte wieder her.",
      "Versionswechsel: der normale native Start führt unterstützte Migration durch. Nicht unterstützte Übergänge und Downgrades werden nativ oder durch eine begründete minimale Ergänzung ohne destruktiven Ersatzpfad abgewiesen.",
      "Fehlgeschlagener Übergang und Wiederholung: Fehler bleiben sichtbar und über Neustarts gestoppt. Ziel verwerfen und gewöhnliche Installation wiederholen kann erfolgreich sein; automatische Wiederaufnahme mehrdeutiger Fortschritte ist nicht verlangt. Konkurrierende Übergänge und veraltete Fertigmeldungen geben keinen Zugriff frei.",
      "Beobachtungs- und Verfahrensfehler: fehlgeschlagene lokale Beobachtung, unerreichbarer Backup-Speicher, beschädigte Backups und native Fehler erlauben keine leere Installation.",
      "Fremder Zustand: ein Fehler der Anwendung setzt weder eine gemeinsam genutzte Datenbank noch einen anderen Dienst zurück.",
      "Fachliche Abnahme: die Paketqualifikation belegt die vereinbarte Nutzbarkeit nach jedem unterstützten Übergang; ein erfolgreicher Container oder Job reicht nicht.",
    ],
    servingTitle: "Bedeutung von serving()",
    servingBody:
      "serving() gibt gewöhnlichen Zugriff nach nativem Erfolg und normaler Readiness frei. Die Anwendung darf zuvor intern für Initialisierung oder Migration laufen. Eine erfolgreiche Rekonstruktion benötigt keinen zweiten technischen Freigabebefehl. Der vollständige Servicevertrag regelt Quellisolation, Fencing, Erreichbarkeit, Aktivierung und Wiederanlaufzeit. Menschen autorisieren das Ergebnis und die akzeptierten Risiken; gepflegte Verfahren müssen diese Entscheidung technisch durchsetzen.",
    referenceTitle: "Ausführbare WordPress-Referenz",
    referenceIntro:
      "bartl-wordpress illustriert den Startmechanismus für eine konkrete WordPress-, MySQL- und Docker-Compose-Konfiguration. Die folgenden Angaben beschreiben die vorhandene Referenz, nicht zusätzliche normative Startbedingungen. Ihr Nachweis ist keine pauschale Bestätigung aller Katalogfälle.",
    referenceRows: [
      ["Deklarierter Zustand", "MySQL-Datenbank und wp-content/uploads"],
      ["Unveränderliches Release", "WordPress-Core, Plugins und Themes im Image"],
      ["Sicherungsformat", "database.sql, uploads.tar, state.json und SHA256SUMS in einem Archiv"],
      ["Veröffentlichung", "Archiv plus .sha256-Sidecar, wobei das Sidecar als Commit-Marker zuletzt erscheint"],
      ["Restore", "Neuester vollständig veröffentlichter Stand auf einem leeren kompatiblen Ziel"],
      ["Fehlerverhalten", "Auf einem leeren Ziel Abbruch bei fehlendem Store-Mount sowie immer bei unvollständigem Paar, falschen Prüfsummen oder ungültigem Inventar"],
    ],
    referenceLink: "Referenz und Runbook auf Codeberg öffnen",
    referenceAria: "bartl-wordpress auf Codeberg öffnen, neuer Tab",
    boundaryTitle: "Aussagegrenze",
    boundaryIntro:
      "Die Spec beschreibt nur den Startmechanismus für Anwendung und deklarierten Zustand.",
    insideTitle: "Teil des Startmechanismus",
    inside: [
      "vorhandenen Zustand von bestätigter Abwesenheit unterscheiden",
      "Sicherungsstände vor Verwendung prüfen und gegebenenfalls wiederherstellen",
      "native Initialisierung und unterstützte Migration beim normalen Start nutzen",
      "gewöhnlichen Zugriff nach nativem Erfolg freigeben oder sichtbar stoppen",
    ],
    outsideTitle: "Nicht durch den Startmechanismus abgedeckt",
    outside: [
      "Zielinfrastruktur, Netzwerk, DNS, TLS oder Identity bereitstellen",
      "externen Backup-Speicher betreiben",
      "allgemeine Backup- oder Migrationslogik für andere Produkte liefern",
      "Verfügbarkeit, Zielqualität oder Wiederanlaufzeit garantieren",
      "Traffic oder Schreibautorität koordinieren",
      "einen vollständigen Betriebs- oder Recovery-Prozeß ersetzen",
    ],
    closing:
      "Die WordPress-Referenz belegt diese Eigenschaften nur für ihre festgeschriebene Konfiguration. Andere Anwendungen benötigen ein eigenes Zustandsinventar, Sicherungsformat, Migrationslogik und ausführbaren Nachweis.",
    back: "Zur Startseite",
  },
  en: {
    pageTitle: "Technical Spec",
    description:
      "Technical specification of the Bartl startup path for stateful applications, covering inputs, decisions, product duties, and claim boundaries.",
    eyebrow: "Bartl startup mechanism",
    title: "Technical Spec",
    lead: "This page explains the normative application contract in README.md, under Application contract and qualification. The startup mechanism is one contribution to Bartl's broader operating philosophy. The obligations apply per supported configuration; no particular container or Kubernetes architecture is prescribed.",
    principle:
      "State selects the path, not the name of a requested operation.",
    toc: "On this page",
    nav: [
      ["contract", "Startup contract"],
      ["decision", "Decision"],
      ["invariants", "Invariants"],
      ["product", "Product duties"],
      ["qualification", "Catalogue evidence"],
      ["reference", "WordPress reference"],
      ["boundary", "Claim boundary"],
    ],
    contractTitle: "Startup contract and inputs",
    contractIntro:
      "Release, declared state and target configuration must be technically verifiable. A backup is optional and is queried only without local state. Startup requires neither a mode selector nor a separate initialization permission.",
    inputLabel: "Input",
    meaningLabel: "Contract",
    inputs: [
      [
        "Versioned release",
        "An immutable application artifact with a known engine version and its product-specific migration logic.",
      ],
      [
        "Fully declared state",
        "An inventory of owned mutable state and its consistency relationships. Native procedures determine relevant compatibility. Foreign persistence is a dependency, not automatic permission to modify it.",
      ],
      [
        "Optional backup",
        "The latest verified backup for this customer and application. No configured backup store, or a configured store containing no backup, means absence rather than failure.",
      ],
      [
        "Target configuration",
        "Endpoints and credentials supplied by the target. They belong neither to the release nor to backed-up state.",
      ],
    ],
    observationsTitle: "Observations before action",
    observations: [
      "observe_local_state() distinguishes existing owned state from confirmed absence. Observation errors stop startup rather than permit initialization. Full-schema certification is not required.",
      "observe_backup() runs only without local state. It returns the latest fully published and verified backup for the customer and application, or absence. Lookup and integrity errors stop startup.",
      "Normal native startup handles initialization and supported migration. Preserve native compatibility boundaries; only demonstrated gaps justify custom safeguards.",
    ],
    decisionTitle: "Observed startup path",
    decisionIntro:
      "Existing state leads to normal native startup. Only confirmed absence triggers backup lookup. This is not a loop that repeats observation after every state change.",
    pathTitle: "Evaluation",
    paths: [
      ["Existing local state", "Normal native startup uses the state and performs any necessary supported migration."],
      [
        "No local state and a verified backup",
        "Restore reconstructs the latest verified backup for the customer and application through the supported native procedure. Incomplete reconstruction cannot become the usable target. Normal native startup follows, including supported migration.",
      ],
      [
        "No local state and no backup",
        "Normal native startup initializes the application. A failed backup lookup is not an absent backup.",
      ],
      [
        "Observation or a native procedure fails",
        "Startup stops visibly. After a failed state-changing attempt, ordinary access remains withheld across restarts. Discarding the failed target and retrying the ordinary installation is sufficient.",
      ],
    ],
    invariantsTitle: "Mechanism invariants",
    invariantsIntro:
      "An implementation follows the pattern only if it preserves these properties across every startup case.",
    invariants: [
      {
        title: "One startup path",
        body: "Existing state, restore and first initialization lead to normal native startup. An ordinary Kubernetes restart remains an ordinary restart.",
      },
      {
        title: "Fail closed",
        body: "Damaged or partially created state, incomplete backups, and contradictory versions are never reinterpreted as an empty startup state.",
      },
      {
        title: "Verify before use",
        body: "A backup is restored only after its publication, inventory, and integrity have been verified.",
      },
      {
        title: "Migration belongs to the product",
        body: "Native initialization and migration remain with the product. Each custom mechanism must automate a named administrator action or close a demonstrated native gap.",
      },
      {
        title: "Access after success",
        body: "The application may run internally for initialization or migration. Ordinary access remains withheld until native success and normal readiness. Continuous schema policing is not required.",
      },
      {
        title: "Controlled abort",
        body: "Native failures and unsupported transitions end visibly without destructive fallback. Automatic repair or reconstruction of ambiguous progress is not required.",
      },
    ],
    productTitle: "Application duties",
    productIntro:
      "The application supplies concrete procedures for its own state. A common decision structure requires neither identical code nor a universal operator. Multiple components may cooperate through an explicit protocol.",
    productRequirements: [
      "State boundary: declare the complete owned inventory and consistency relationships; change foreign or shared persistence only within explicitly assigned responsibility.",
      "Observation: distinguish existing owned state from confirmed absence. Observation errors do not permit initialization; an independent full-schema validity check is not required.",
      "Lifecycle: after any required restore, use normal native startup including initialization or supported migration.",
      "Capture and reconstruction: produce complete consistent recovery points, verify before use and restore without the source; identify software, keys and target prerequisites.",
      "Safe execution: exclude conflicting state changes and withhold ordinary access until success. Failed transitions remain stopped across restarts; discarding the target and ordinary retry is sufficient. Stale completion signals must not release access.",
      "Result verification: use native transition results and normal readiness. Package qualification demonstrates agreed application behavior, not a privileged acceptance ceremony on every restart.",
    ],
    qualificationTitle: "Evidence for catalogue inclusion",
    qualificationIntro: "Start with one justified supported configuration per application, declaring releases, transitions, persistence and target prerequisites. The following cases require executable evidence with exact artifacts and claim boundaries. Individual passing cases are not complete qualification; a shared test runner is not prescribed.",
    qualificationCases: [
      "First initialization: confirmed empty owned state produces a usable installation through native initialization, both without a configured backup store and with a configured store containing no backup.",
      "Normal restart: state and identity survive ordinary native startup without backup access, reinitialization or unnecessary restore.",
      "Source-independent restore: the latest verified complete backup for the customer and application restores the intended data, identities and permissions.",
      "Release transition: normal native startup performs supported migration. Unsupported transitions and downgrades are rejected natively or through a justified minimal safeguard without destructive fallback.",
      "Failed transition and retry: failures remain visible and stopped across restarts. Discarding the target and retrying ordinary installation can succeed; automatic resumption of ambiguous progress is not required. Conflicting transitions and stale completion signals cannot release access.",
      "Observation and operation failures: failed local observation, unreachable backup storage, damaged backups and native failures never authorize an empty installation.",
      "Foreign state: an application failure does not reset a shared database or another service.",
      "Application acceptance: package qualification demonstrates agreed usability after each supported transition; a successful container or job is insufficient.",
    ],
    servingTitle: "Meaning of serving()",
    servingBody:
      "serving() opens ordinary access after native success and normal readiness. The application may run internally beforehand for initialization or migration. Successful reconstruction needs no second technical release command. The complete service contract covers source isolation, fencing, reachability, activation and recovery time. People authorize the outcome and accepted risks; maintained procedures must enforce that decision technically.",
    referenceTitle: "Executable WordPress reference",
    referenceIntro:
      "bartl-wordpress illustrates the startup mechanism for one concrete WordPress, MySQL, and Docker Compose configuration. The details below describe the existing reference, not additional normative startup conditions. Its evidence does not automatically qualify every catalogue case.",
    referenceRows: [
      ["Declared state", "MySQL database and wp-content/uploads"],
      ["Immutable release", "WordPress core, plugins, and themes in the image"],
      ["Backup format", "database.sql, uploads.tar, state.json, and SHA256SUMS in one archive"],
      ["Publication", "Archive plus .sha256 sidecar, with the sidecar published last as the commit marker"],
      ["Restore", "Newest fully published backup on an empty compatible target"],
      ["Failure behavior", "On an empty target, abort on a missing store mount; always abort on an incomplete pair, checksum failure, or invalid inventory"],
    ],
    referenceLink: "Open the reference and runbook on Codeberg",
    referenceAria: "Open bartl-wordpress on Codeberg in a new tab",
    boundaryTitle: "Claim boundary",
    boundaryIntro:
      "The spec describes only the startup mechanism for the application and its declared state.",
    insideTitle: "Part of the startup mechanism",
    inside: [
      "distinguish existing state from confirmed absence",
      "verify backups before use and restore when needed",
      "use native initialization and supported migration during normal startup",
      "open ordinary access after native success or stop visibly",
    ],
    outsideTitle: "Not covered by the startup mechanism",
    outside: [
      "provision target infrastructure, network, DNS, TLS, or identity",
      "operate external backup storage",
      "supply generic backup or migration logic for other products",
      "guarantee availability, target quality, or restart time",
      "coordinate traffic or write authority",
      "replace a complete operations or recovery process",
    ],
    closing:
      "The WordPress reference demonstrates these properties only for its pinned configuration. Other applications need their own state inventory, backup format, migration logic, and executable evidence.",
    back: "Back to the landing page",
  },
} as const;
