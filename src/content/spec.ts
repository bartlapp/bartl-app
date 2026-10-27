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
        "Inventar des eigenen veränderlichen Zustands mit Konsistenzbeziehungen und zuverlässig ermittelbarer Zustandsversion. Fremde Persistenz ist eine Abhängigkeit, keine automatische Änderungsbefugnis.",
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
      "observe_local_state() unterscheidet gültigen lokalen Zustand mit bekannter Version von bestätigter Abwesenheit. Beobachtungsfehler, beschädigter oder unvollständiger Zustand stoppen den Start.",
      "observe_backup() läuft nur ohne lokalen Zustand. Die Funktion liefert den neuesten vollständig veröffentlichten und geprüften Stand für Kunde und Anwendung oder dessen Abwesenheit. Abfrage- und Integritätsfehler stoppen den Start, statt zur Initialisierung überzugehen.",
      "Engine- und Zustandsversion sind gleich, die Engine ist neuer oder die Engine ist älter.",
      "Release, vorhandener Zustand, gegebenenfalls Sicherung und Zielkonfiguration müssen vollständig und widerspruchsfrei sein.",
    ],
    decisionTitle: "Beobachteter Startpfad",
    decisionIntro:
      "Der Mechanismus entscheidet nicht aus einem Label wie Install, Restore oder Upgrade. Komponenten dürfen zusammenarbeiten; Übergangsverantwortung und aktuelle Fertigmeldung müssen eindeutig sein. Nach jeder Zustandsänderung wird erneut beobachtet.",
    pathTitle: "Auswertung",
    paths: [
      ["Gültiger lokaler Zustand und gleiche Version", "Die Anwendung kann bedienen."],
      [
        "Gültiger lokaler Zustand und neuere Engine",
        "Die native produktspezifische Migration läuft. Nicht unterstützte Übergänge oder Fehler stoppen den Start; Erfolg führt zur erneuten Beobachtung.",
      ],
      ["Gültiger lokaler Zustand und ältere Engine", "Der Start bricht als unzulässiger Downgrade ab."],
      [
        "Kein lokaler Zustand und gültiger Sicherungsstand",
        "Der neueste geprüfte Stand für Kunde und Anwendung wird nativ wiederhergestellt. Fehler stoppen den Start; Erfolg führt zur erneuten Beobachtung.",
      ],
      [
        "Kein lokaler Zustand und kein Sicherungsstand",
        "Native Initialisierung erzeugt neuen Zustand. Fehler stoppen den Start; Erfolg führt zur erneuten Beobachtung. Eine fehlgeschlagene Backup-Abfrage ist kein fehlender Sicherungsstand.",
      ],
      [
        "Ungültige, unvollständige, widersprüchliche oder nicht beurteilbare Eingaben",
        "Der Start bricht kontrolliert ab, bevor Zustand verändert oder bedient wird.",
      ],
    ],
    invariantsTitle: "Invarianten des Mechanismus",
    invariantsIntro:
      "Eine Implementierung folgt dem Muster nur, wenn diese Eigenschaften über alle Startfälle erhalten bleiben.",
    invariants: [
      {
        title: "Eine Entscheidungsschleife",
        body: "Normalstart, Erstinitialisierung und Restore beginnen mit derselben Beobachtung und verwenden dieselben Abbruchbedingungen.",
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
        body: "Bartl koordiniert den Übergang. Vorhandene native Initialisierung und Migration bleiben beim Produkt; ergänzt werden nur fehlende Beobachtung, Koordination und Prüfung.",
      },
      {
        title: "Erneute Beobachtung",
        body: "Initialisierung, Restore und Migration führen zurück an den Anfang. Erst ein gültiger kompatibler Zustand erreicht serving().",
      },
      {
        title: "Kontrollierter Abbruch",
        body: "Downgrade, Inkonsistenz und fehlende Voraussetzungen enden sichtbar. Der Mechanismus rät keinen Ersatzwert und überspringt keine Prüfung.",
      },
    ],
    productTitle: "Pflichten der Anwendung",
    productIntro:
      "Die Anwendung liefert die konkreten Verfahren für ihren eigenen Zustand. Eine gemeinsame Entscheidungsstruktur verlangt weder identischen Code noch einen universellen Operator. Mehrere Komponenten können über ein eindeutiges Protokoll zusammenarbeiten.",
    productRequirements: [
      "Zustandsgrenze: eigenes vollständiges Inventar und Konsistenzbeziehungen deklarieren; fremde oder gemeinsam genutzte Persistenz nur innerhalb ausdrücklich zugewiesener Verantwortung verändern.",
      "Beobachtung: leeren, gültigen, unvollständigen, beschädigten und nicht beurteilbaren Zustand samt relevanter Version zuverlässig unterscheiden; Marker allein genügen nicht.",
      "Lifecycle: Normalstart, Initialisierung, Restore und Migration aus derselben Beobachtung ableiten; native Fehler stoppen den Start, erfolgreiche Änderungen führen zur erneuten Beobachtung.",
      "Sicherung und Rekonstruktion: vollständige konsistente Recovery-Punkte erzeugen, vor Verwendung prüfen und ohne Quelle wiederherstellen; Software, Schlüssel und Zielvoraussetzungen benennen.",
      "Sichere Ausführung: Unterbrechungen, Wiederholungen und konkurrierende Änderungen beherrschen; veraltete Fertigmeldungen und ungeprüfte Teilzustände dürfen keine Bedienung freigeben.",
      "Ergebnisprüfung: native Übergangsergebnisse vor dem normalen Start prüfen und Fehler maschinenlesbar melden. Die Paketqualifikation belegt die vereinbarte Fachleistung; sie ist keine privilegierte Abnahme bei jedem Start.",
    ],
    qualificationTitle: "Nachweise für die Katalogaufnahme",
    qualificationIntro: "Je Anwendung wird zunächst eine begründete unterstützte Konfiguration mit Releases, Übergängen, Persistenz und Zielvoraussetzungen festgelegt. Die folgenden Fälle benötigen ausführbare Nachweise mit konkreten Artefakten und Aussagegrenzen. Einzelne bestandene Fälle sind keine vollständige Qualifikation; ein gemeinsamer Test-Runner ist nicht vorgeschrieben.",
    qualificationCases: [
      "Erstinitialisierung: nachweislich leerer eigener Zustand ergibt durch native Initialisierung eine nutzbare Installation, sowohl ohne konfigurierten Backup-Store als auch mit einem Store ohne Sicherung.",
      "Normaler Wiederanlauf: gültiger Zustand und Identität bleiben ohne Backup-Zugriff, erneute Initialisierung oder unnötigen Restore erhalten.",
      "Restore ohne Quelle: der neueste geprüfte vollständige Stand für Kunde und Anwendung stellt die vorgesehenen Daten, Identitäten und Rechte wieder her.",
      "Versionswechsel: unterstützte native Migration gelingt; unbekannte Übergänge und Downgrades werden ohne destruktiven Ersatzpfad abgewiesen.",
      "Unterbrechung und Wiederholung: Teilzustände werden erkannt; Wiederholung, konkurrierende Ausführung und veraltete Fertigmeldungen enden sicher.",
      "Fehlende oder widersprüchliche Eingaben: unerreichbarer Speicher, beschädigte Daten und unvollständige Backups werden nicht zur Erlaubnis für eine leere Installation.",
      "Fremder Zustand: ein Fehler der Anwendung setzt weder eine gemeinsam genutzte Datenbank noch einen anderen Dienst zurück.",
      "Fachliche Abnahme: die Paketqualifikation belegt die vereinbarte Nutzbarkeit nach jedem unterstützten Übergang; ein erfolgreicher Container oder Job reicht nicht.",
    ],
    servingTitle: "Bedeutung von serving()",
    servingBody:
      "serving() startet die native Anwendung mit ihrem normalen Readiness-Verhalten. Eine erfolgreiche Rekonstruktion benötigt keinen zweiten technischen Freigabebefehl. Der vollständige Servicevertrag regelt Quellisolation, Fencing, Erreichbarkeit, Aktivierung und Wiederanlaufzeit. Menschen autorisieren das Ergebnis und die akzeptierten Risiken; gepflegte Verfahren müssen diese Entscheidung technisch durchsetzen.",
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
      "Zustand und Versionen beobachten",
      "Sicherungsstände vor Verwendung prüfen",
      "initialisieren, wiederherstellen oder produktspezifisch migrieren",
      "gültigen Zustand bedienen oder kontrolliert abbrechen",
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
        "An inventory of owned mutable state, its consistency relationships and a reliably detectable state version. Foreign persistence is a dependency, not automatic permission to modify it.",
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
      "observe_local_state() distinguishes valid local state with a known version from confirmed absence. Observation errors, damaged state and incomplete state stop startup.",
      "observe_backup() runs only without local state. It returns the latest fully published and verified backup for the customer and application, or absence. Lookup and integrity errors stop startup instead of falling back to initialization.",
      "The engine and state versions are equal, the engine is newer, or the engine is older.",
      "Release, existing state, any backup used and target configuration must be complete and mutually consistent.",
    ],
    decisionTitle: "Observed startup path",
    decisionIntro:
      "The mechanism does not decide from an install, restore or upgrade label. Components may cooperate, but transition ownership and current completion signals must be unambiguous. Observe again after every state change.",
    pathTitle: "Evaluation",
    paths: [
      ["Valid local state and equal version", "The application can serve."],
      [
        "Valid local state and newer engine",
        "Native product-specific migration runs. Unsupported transitions or failures stop startup; success returns to observation.",
      ],
      ["Valid local state and older engine", "Startup aborts because a downgrade is not permitted."],
      [
        "No local state and a valid backup",
        "Native restore reconstructs the latest verified backup for the customer and application. Failure stops startup; success returns to observation.",
      ],
      [
        "No local state and no backup",
        "Native initialization creates fresh state. Failure stops startup; success returns to observation. A failed backup lookup is not an absent backup.",
      ],
      [
        "Invalid, incomplete, contradictory or unknown inputs",
        "Startup aborts before state is changed or served.",
      ],
    ],
    invariantsTitle: "Mechanism invariants",
    invariantsIntro:
      "An implementation follows the pattern only if it preserves these properties across every startup case.",
    invariants: [
      {
        title: "One decision loop",
        body: "Normal startup, first initialization, and restore begin with the same observation and use the same abort conditions.",
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
        body: "Bartl coordinates the transition. Existing native initialization and migration remain with the product; add only missing observation, coordination and verification.",
      },
      {
        title: "Observe again",
        body: "Initialization, restore, and migration return to the beginning. Only valid compatible state reaches serving().",
      },
      {
        title: "Controlled abort",
        body: "Downgrade, inconsistency, and missing prerequisites end visibly. The mechanism neither guesses replacement values nor skips checks.",
      },
    ],
    productTitle: "Application duties",
    productIntro:
      "The application supplies concrete procedures for its own state. A common decision structure requires neither identical code nor a universal operator. Multiple components may cooperate through an explicit protocol.",
    productRequirements: [
      "State boundary: declare the complete owned inventory and consistency relationships; change foreign or shared persistence only within explicitly assigned responsibility.",
      "Observation: reliably distinguish empty, valid, incomplete, damaged and unknown state and its relevant version; a marker alone is insufficient.",
      "Lifecycle: derive normal start, initialization, restore and migration from the same observations; native failures stop startup, successful changes return to observation.",
      "Capture and reconstruction: produce complete consistent recovery points, verify before use and restore without the source; identify software, keys and target prerequisites.",
      "Safe execution: handle interruption, repetition and conflicting changes; stale completion signals and unverified partial state must not release serving.",
      "Result verification: verify native transition results before normal startup and expose machine-readable failures. Package qualification demonstrates agreed application behavior; it is not a privileged acceptance ceremony on every restart.",
    ],
    qualificationTitle: "Evidence for catalogue inclusion",
    qualificationIntro: "Start with one justified supported configuration per application, declaring releases, transitions, persistence and target prerequisites. The following cases require executable evidence with exact artifacts and claim boundaries. Individual passing cases are not complete qualification; a shared test runner is not prescribed.",
    qualificationCases: [
      "First initialization: confirmed empty owned state produces a usable installation through native initialization, both without a configured backup store and with a configured store containing no backup.",
      "Normal restart: valid state and identity survive without backup access, reinitialization or unnecessary restore.",
      "Source-independent restore: the latest verified complete backup for the customer and application restores the intended data, identities and permissions.",
      "Release transition: supported native migration succeeds; unknown transitions and downgrades are rejected without destructive fallback.",
      "Interruption and repetition: partial state is recognized; retry, conflicting execution and stale completion signals remain safe.",
      "Missing or contradictory inputs: unreachable storage, damaged data and incomplete backups never authorize an empty installation.",
      "Foreign state: an application failure does not reset a shared database or another service.",
      "Application acceptance: package qualification demonstrates agreed usability after each supported transition; a successful container or job is insufficient.",
    ],
    servingTitle: "Meaning of serving()",
    servingBody:
      "serving() starts the native application with its normal readiness behavior. Successful reconstruction needs no second technical release command. The complete service contract covers source isolation, fencing, reachability, activation and recovery time. People authorize the outcome and accepted risks; maintained procedures must enforce that decision technically.",
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
      "observe state and versions",
      "verify backups before use",
      "initialize, restore, or run product-specific migration",
      "serve valid state or abort in a controlled way",
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
