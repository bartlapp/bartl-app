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
    referenceEyebrow: "Ausführbare Referenz",
    referenceTitle: "WordPress, MySQL und Docker Compose als prüfbares Beispiel.",
    referenceBody:
      "bartl-wordpress illustriert den Mechanismus für eine festgeschriebene WordPress-Konfiguration. Ihre konkreten Voraussetzungen definieren nicht den allgemeinen Startvertrag. Datenbank und Uploads bilden den Zustand. WordPress-Core, Plugins und Themes bleiben unveränderlicher Image-Inhalt.",
    referenceFacts: [
      ["Zustand", "MySQL-Datenbank und wp-content/uploads"],
      ["Release", "WordPress-Core, Plugins und Themes im Image"],
      ["Backup", "Prüfsummen für alle Bestandteile und .sha256 als Commit-Marker"],
      ["Restore", "Nur auf einem leeren, kompatiblen Ziel mit vollständigen Eingaben"],
      ["Fehlerfall", "Abbruch bei fehlenden, unvollständigen oder widersprüchlichen Eingaben"],
    ],
    quickstartTitle: "Quickstart",
    quickstartBody:
      "Voraussetzung ist ein Linux-Host mit Docker und Docker Compose. Ohne WORDPRESS_PUBLIC_URL läuft die lokale Referenz unter http://localhost:8080.",
    backupLabel: "Nach der WordPress-Initialisierung einen Sicherungsstand veröffentlichen:",
    referenceLink: "Repository und Runbook auf Codeberg",
    referenceAria: "bartl-wordpress auf Codeberg öffnen, neuer Tab",
    proofTitle: "Nachweisgrenze",
    proofBody:
      "Die Referenz belegt den Mechanismus nur für diese WordPress-Konfiguration. Sie belegt weder andere Anwendungen noch die Qualität einer Zielumgebung oder eine bestimmte Wiederanlaufzeit.",
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
      "Die Referenz ausführen, einen Sicherungsstand erzeugen und den Start auf einem leeren kompatiblen Ziel beobachten. Die Spec beschreibt den engen Vertrag dahinter.",
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
    referenceEyebrow: "Executable reference",
    referenceTitle: "WordPress, MySQL, and Docker Compose as an inspectable example.",
    referenceBody:
      "bartl-wordpress illustrates the mechanism for one pinned WordPress configuration. Its particular prerequisites do not define the general startup contract. The database and uploads are state. WordPress core, plugins, and themes remain immutable image content.",
    referenceFacts: [
      ["State", "MySQL database and wp-content/uploads"],
      ["Release", "WordPress core, plugins, and themes in the image"],
      ["Backup", "Checksums for every member and .sha256 as the commit marker"],
      ["Restore", "Only to an empty, compatible target with complete inputs"],
      ["Failure", "Abort on missing, incomplete, or contradictory inputs"],
    ],
    quickstartTitle: "Quickstart",
    quickstartBody:
      "The prerequisite is a Linux host with Docker and Docker Compose. Without WORDPRESS_PUBLIC_URL, the local reference runs at http://localhost:8080.",
    backupLabel: "Publish a backup after WordPress has been initialized:",
    referenceLink: "Repository and runbook on Codeberg",
    referenceAria: "Open bartl-wordpress on Codeberg in a new tab",
    proofTitle: "Evidence boundary",
    proofBody:
      "The reference demonstrates the mechanism only for this WordPress configuration. It demonstrates neither other applications nor the quality of a target environment or a particular restart time.",
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
      "Run the reference, publish a backup, and observe startup on an empty compatible target. The spec describes the narrow contract behind it.",
    ctaPrimary: "Open the reference on Codeberg",
    ctaDerivation: "Why the mechanism looks this way",
    ctaSecondary: "Read the technical spec",
  },
} as const;
