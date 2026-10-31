// SPDX-License-Identifier: CC-BY-4.0
export const landingCopy = {
  de: {
    heroEyebrow: "Ein Startpfad. Mehrere Zustände.",
    heroTitle:
      "Installieren, wiederherstellen, aktualisieren: ein gemeinsamer Startpfad.",
    heroBody:
      "Bartl ist eine Betriebsphilosophie für praktisch ausübbare Resilienz und Souveränität. Sie verbindet Anwendung, Infrastruktur und Verantwortung für den vollständigen Service. Diese Seite erklärt einen technischen Baustein davon: den gemeinsamen Startpfad zustandsbehafteter Anwendungen.",
    heroPrimary: "WordPress-Referenz ausführen",
    heroPrimaryAria:
      "Ausführbare WordPress-Referenz auf Codeberg öffnen, neuer Tab",
    heroSecondary: "Entscheidungslogik ansehen",
    heroDerivation: "Herleitung lesen",
    heroSpec: "Technische Spec lesen",
    mechanismEyebrow: "Entscheidungslogik",
    mechanismTitle: "Wie die Anwendung startet",
    mechanismBody:
      "Wähle unter dem Pseudocode einen beobachteten Fall. Die Darstellung folgt dem Anwendungsvertrag in README.md. Fehler bei der Beobachtung oder Integritätsprüfung stoppen den Start, statt einen leeren Zustand anzunehmen.",
    inputsEyebrow: "Technischer Vertrag",
    inputsTitle: "Release, Zustand und Konfiguration trennen. Sicherung optional nutzen.",
    inputsBody:
      "Der gemeinsame Startpfad braucht weder Moduswahl noch eine Initialisierungsfreigabe. Ein Sicherungsstand wird nur ohne lokalen Zustand abgefragt.",
    inputs: [
      {
        title: "Versioniertes Release",
        body: "Ein unveränderliches Anwendungsartefakt mit bekannter Engine-Version und der produktspezifischen Migrationslogik, die zu diesem Release gehört.",
      },
      {
        title: "Vollständig deklarierter Zustand",
        body: "Alle eigenen veränderlichen Daten und Metadaten mit ihren Konsistenzbeziehungen. Native Verfahren bestimmen die relevante Kompatibilität. Nicht deklarierter Zustand kann nicht belastbar gesichert oder wiederhergestellt werden.",
      },
      {
        title: "Optionaler Sicherungsstand",
        body: "Der neueste vollständig veröffentlichte und geprüfte Stand für Kunde und Anwendung. Kein konfigurierter Backup-Store oder ein Store ohne Sicherung bedeutet Abwesenheit. Abfrage- und Integritätsfehler stoppen den Start.",
      },
      {
        title: "Zielkonfiguration",
        body: "Vom Ziel gelieferte Endpunkte und Zugangsdaten. Sie werden beim Start gebunden und gehören weder in das Release noch in den gesicherten Zustand.",
      },
    ],
    referenceEyebrow: "Historisches Beispiel",
    referenceTitle: "WordPress, MySQL und Docker Compose als prüfbares Beispiel.",
    referenceBody:
      "bartl-wordpress illustriert einen früheren Startmechanismus, nicht die vollständige Erfüllung des heutigen Anwendungsvertrags. Das Beispiel sichert die Datenbank und Uploads; die folgende Einordnung begrenzt seine Aussage.",
    referenceFacts: [
      ["Zustand", "MySQL-Datenbank und wp-content/uploads"],
      ["Software", "WordPress- und MySQL-Images; veränderliche Plugins und Themes sind nicht Teil der Upload-Sicherung"],
      ["Backup", "Archiv mit Metadaten und Prüfsummen; fehlende Prüfsummendateien werden beim Restore toleriert"],
      ["Restore", "Archivwahl ohne lokalen Versionsmarker, keine vollständige Zustandsprüfung"],
      ["Grenze", "Keine belegte Konsistenz bei parallelen Änderungen oder Migrationsabnahme vor Zugriff"],
    ],
    quickstartTitle: "Quickstart",
    quickstartBody:
      "Voraussetzung ist ein Linux-Host mit Docker und Docker Compose. Das Beispiel läuft unter http://localhost:8080. Nur mit entbehrlichen Testdaten und isoliertem Zugang verwenden.",
    backupLabel: "Nach der WordPress-Initialisierung einen Sicherungsstand veröffentlichen:",
    referenceLink: "Repository und Runbook auf Codeberg",
    referenceAria: "bartl-wordpress auf Codeberg öffnen, neuer Tab",
    proofTitle: "Nachweisgrenze",
    proofBody:
      "Die Skripte veranschaulichen Rekonstruktion, qualifizieren aber nicht den heutigen Vertrag. Veröffentlichungsschutz, konsistente Erfassung bei parallelen Änderungen und Migration vor Zugriff sind damit nicht nachgewiesen. Die Einzelheiten stehen im README des Beispiels.",
    scopeEyebrow: "Klare Grenze",
    scopeTitle: "Was der Startmechanismus leistet und was der vollständige Service braucht.",
    doesTitle: "Der Startmechanismus leistet",
    does: [
      "vorhandenen lokalen Zustand von bestätigter Abwesenheit unterscheiden",
      "nur ohne lokalen Zustand eine Sicherung abfragen und gegebenenfalls wiederherstellen",
      "Backups vor ihrer Verwendung prüfen",
      "native Initialisierung und unterstützte Migration beim normalen Start nutzen",
      "bei Beobachtungsfehlern oder fehlgeschlagenen Verfahren sichtbar stoppen",
      "gewöhnlichen Zugriff erst nach nativem Erfolg freigeben",
    ],
    doesNotTitle: "Nicht durch den Startmechanismus abgedeckt",
    doesNot: [
      "Zielinfrastruktur bereitstellen",
      "Netzwerk, DNS, TLS oder Identity einrichten",
      "externen Backup-Speicher betreiben",
      "Backups oder Migrationen für beliebige Produkte erzeugen",
      "Verfügbarkeit oder Wiederanlaufzeiten garantieren",
      "Traffic oder Schreibautorität koordinieren",
      "einen vollständigen Betriebs- oder Recovery-Prozeß ersetzen",
    ],
    fitEyebrow: "Eignung",
    fitTitle: "Das Muster braucht eine saubere Zustandsgrenze.",
    suitableTitle: "Geeignet, wenn",
    suitable: [
      "der eigene veränderliche Zustand vollständig benannt werden kann",
      "Release, Zustand und Zielkonfiguration sauber getrennt sind",
      "Backup-Integrität und Restore automatisiert geprüft werden können",
      "native Initialisierung und unterstützte Migration automatisiert ausgeführt werden können",
    ],
    unsuitableTitle: "Nicht geeignet, wenn",
    unsuitable: [
      "kritischer Zustand unbekannt oder über unkontrollierte Orte verteilt bleibt",
      "vorhandener Zustand und bestätigte Abwesenheit nicht unterscheidbar sind",
      "Release und Laufzeitzustand nicht voneinander getrennt werden können",
      "der Startmechanismus externe Betriebsaufgaben vollständig übernehmen soll",
    ],
    ctaTitle: "Den Mechanismus am laufenden Beispiel prüfen.",
    ctaBody:
      "Die Referenz mit Testdaten ausführen und ihren begrenzten Mechanismus untersuchen. Für neue Implementierungen gilt der heutige Anwendungsvertrag, nicht das historische Beispiel.",
    ctaPrimary: "Referenz auf Codeberg öffnen",
    ctaDerivation: "Warum dieser Mechanismus so aussieht",
    ctaSecondary: "Technische Spec lesen",
  },
  en: {
    heroEyebrow: "One startup path. Multiple states.",
    heroTitle: "Install, restore, upgrade: one shared startup path.",
    heroBody:
      "Bartl is an operating philosophy for resilience and sovereignty that can actually be exercised. It connects application, infrastructure and responsibility for the complete service. This page explains one technical contribution: the shared startup path for stateful applications.",
    heroPrimary: "Run the WordPress reference",
    heroPrimaryAria:
      "Open the executable WordPress reference on Codeberg in a new tab",
    heroSecondary: "See the decision logic",
    heroDerivation: "Read the derivation",
    heroSpec: "Read the technical spec",
    mechanismEyebrow: "Decision logic",
    mechanismTitle: "How the application starts",
    mechanismBody:
      "Select an observed case below the pseudocode. The presentation follows the application contract in README.md. Observation or integrity errors stop startup rather than assuming empty state.",
    inputsEyebrow: "Technical contract",
    inputsTitle: "Separate release, state and configuration. Use backups when available.",
    inputsBody:
      "The shared startup path needs neither a mode selector nor an initialization permission. A backup is queried only without local state.",
    inputs: [
      {
        title: "Versioned release",
        body: "An immutable application artifact with a known engine version and the product-specific migration logic that belongs to that release.",
      },
      {
        title: "Fully declared state",
        body: "All owned mutable data and metadata with their consistency relationships. Native procedures determine relevant compatibility. Undeclared state cannot be backed up or restored dependably.",
      },
      {
        title: "Optional backup",
        body: "The latest fully published and verified backup for this customer and application. No configured backup store, or a store containing no backup, means absence. Lookup and integrity errors stop startup.",
      },
      {
        title: "Target configuration",
        body: "Endpoints and credentials supplied by the target. They are bound at startup and belong neither in the release nor in the backed-up state.",
      },
    ],
    referenceEyebrow: "Historical example",
    referenceTitle: "WordPress, MySQL, and Docker Compose as an inspectable example.",
    referenceBody:
      "bartl-wordpress illustrates an earlier startup mechanism, not full conformance to the current application contract. It captures the database and uploads; the following details bound its claim.",
    referenceFacts: [
      ["State", "MySQL database and wp-content/uploads"],
      ["Software", "WordPress and MySQL images; mutable plugins and themes are outside the uploads backup"],
      ["Backup", "Archive with metadata and checksums; restore tolerates missing checksum files"],
      ["Restore", "Archive selection without a local version marker, not a complete state check"],
      ["Limit", "No established consistency under concurrent changes or migration acceptance before access"],
    ],
    quickstartTitle: "Quickstart",
    quickstartBody:
      "The prerequisite is a Linux host with Docker and Docker Compose. The example runs at http://localhost:8080. Use disposable test data and isolated access only.",
    backupLabel: "Publish a backup after WordPress has been initialized:",
    referenceLink: "Repository and runbook on Codeberg",
    referenceAria: "Open bartl-wordpress on Codeberg in a new tab",
    proofTitle: "Evidence boundary",
    proofBody:
      "The scripts illustrate reconstruction but do not qualify the current contract. They do not establish publication protection, consistent capture during concurrent changes or migration before access. The example's README records the details.",
    scopeEyebrow: "Explicit boundary",
    scopeTitle: "What startup does and what the complete service still needs.",
    doesTitle: "The startup mechanism does",
    does: [
      "distinguish existing local state from confirmed absence",
      "query backups only without local state and restore when available",
      "verify backups before using them",
      "use native initialization and supported migration during normal startup",
      "stop visibly on observation or native procedure failures",
      "open ordinary access only after native success",
    ],
    doesNotTitle: "Not covered by the startup mechanism",
    doesNot: [
      "provision target infrastructure",
      "configure network, DNS, TLS, or identity",
      "operate external backup storage",
      "create backups or migrations for arbitrary products",
      "guarantee availability or restart times",
      "coordinate traffic or write authority",
      "replace a complete operations or recovery process",
    ],
    fitEyebrow: "Fit",
    fitTitle: "The pattern requires a clean state boundary.",
    suitableTitle: "A good fit when",
    suitable: [
      "owned mutable state can be named completely",
      "release, state, and target configuration are cleanly separated",
      "backup integrity and restore can be checked automatically",
      "native initialization and supported migration can be executed automatically",
    ],
    unsuitableTitle: "Not a fit when",
    unsuitable: [
      "critical state is unknown or spread across uncontrolled locations",
      "existing state and confirmed absence cannot be distinguished",
      "release and runtime state cannot be separated",
      "the startup mechanism is expected to perform every external operating task",
    ],
    ctaTitle: "Inspect the mechanism in a running example.",
    ctaBody:
      "Run the reference with test data to inspect its bounded mechanism. New implementations follow the current application contract, not the historical example.",
    ctaPrimary: "Open the reference on Codeberg",
    ctaDerivation: "Why the mechanism looks this way",
    ctaSecondary: "Read the technical spec",
  },
} as const;
