// SPDX-License-Identifier: CC-BY-4.0
export const specCopy = {
  de: {
    pageTitle: "Technische Spec",
    description:
      "Technische Spec des Bartl-Startpfads für zustandsbehaftete Anwendungen mit Eingaben, Entscheidung, Produktpflichten und Aussagegrenzen.",
    eyebrow: "Bartl-Muster",
    title: "Technische Spec",
    lead: "Bartl ist ein offenes Entwurfsmuster für den Start zustandsbehafteter Anwendungen. Der Mechanismus beobachtet vorhandenen Zustand und wählt daraus genau die nächste zulässige Aktion.",
    principle:
      "Der Zustand wählt den Pfad, nicht der Name einer angeforderten Operation.",
    toc: "Auf dieser Seite",
    nav: [
      ["contract", "Startvertrag"],
      ["decision", "Entscheidung"],
      ["invariants", "Invarianten"],
      ["product", "Produktpflichten"],
      ["reference", "WordPress-Referenz"],
      ["boundary", "Aussagegrenze"],
    ],
    contractTitle: "Startvertrag mit vier Eingaben",
    contractIntro:
      "Diese vier Eingaben müssen vor der Startentscheidung voneinander abgrenzbar und technisch prüfbar sein.",
    inputLabel: "Eingabe",
    meaningLabel: "Vertrag",
    inputs: [
      [
        "Versioniertes Release",
        "Unveränderliches Anwendungsartefakt mit bekannter Engine-Version und der zugehörigen produktspezifischen Migrationslogik.",
      ],
      [
        "Vollständig deklarierter Zustand",
        "Vollständiges Inventar aller veränderlichen Daten und Metadaten mit zuverlässig ermittelbarer Zustandsversion.",
      ],
      [
        "Gültiger Sicherungsstand",
        "Vollständig veröffentlichter Stand, dessen Format, Inventar und Integrität vor der Verwendung geprüft werden können.",
      ],
      [
        "Zielkonfiguration",
        "Vom Ziel gelieferte Endpunkte und Zugangsdaten. Sie sind weder Bestandteil des Releases noch des gesicherten Zustands.",
      ],
    ],
    observationsTitle: "Beobachtungen vor der Aktion",
    observations: [
      "Lokaler Zustand ist abwesend, gültig oder ungültig. Ungültiger Zustand darf nicht wie abwesender Zustand behandelt werden.",
      "Ein Sicherungsstand ist abwesend oder vollständig veröffentlicht und gültig. Ein unvollständiger Stand ist ein Fehler, keine Erstinstallation.",
      "Engine- und Zustandsversion sind gleich, die Engine ist neuer oder die Engine ist älter.",
      "Release, Zustand, Sicherungsstand und Zielkonfiguration sind vollständig und widerspruchsfrei.",
    ],
    decisionTitle: "Beobachteter Startpfad",
    decisionIntro:
      "Der Mechanismus trifft keine Entscheidung aus einem Label wie Install, Restore oder Upgrade. Nach jeder zustandsverändernden Aktion beginnt die Beobachtung erneut.",
    pathTitle: "Auswertung",
    paths: [
      ["Gültiger lokaler Zustand und gleiche Version", "Die Anwendung kann bedienen."],
      [
        "Gültiger lokaler Zustand und neuere Engine",
        "Die produktspezifische Migration läuft. Danach wird der Zustand erneut beobachtet.",
      ],
      ["Gültiger lokaler Zustand und ältere Engine", "Der Start bricht als unzulässiger Downgrade ab."],
      [
        "Kein lokaler Zustand und gültiger Sicherungsstand",
        "Der Stand wird vor Verwendung geprüft und wiederhergestellt. Danach wird erneut beobachtet.",
      ],
      [
        "Kein lokaler Zustand und kein Sicherungsstand",
        "Ein neuer Zustand wird initialisiert. Danach wird erneut beobachtet.",
      ],
      [
        "Ungültige, unvollständige oder widersprüchliche Eingaben",
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
        body: "Bartl wählt den Migrationspunkt. Nur das jeweilige Produkt kann die fachlich richtige Zustandsänderung implementieren und prüfen.",
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
      "Bartl liefert die Entscheidungsstruktur. Die Anwendung muß die konkreten Adapter für ihren eigenen Zustand bereitstellen.",
    productRequirements: [
      "das vollständige Zustandsinventar deklarieren",
      "die Zustandsversion zuverlässig schreiben und lesen",
      "gültigen, leeren, unvollständigen und beschädigten Zustand unterscheiden",
      "einen neuen Zustand eindeutig initialisieren",
      "einen Sicherungsstand vollständig veröffentlichen und vor Restore prüfen",
      "produktspezifische Migrationen zwischen unterstützten Versionen implementieren",
      "nach Restore und Migration technische Konsistenz prüfen",
      "bei Fehlern ohne teilweise Bedienung abbrechen",
    ],
    servingTitle: "Bedeutung von serving()",
    servingBody:
      "serving() bedeutet innerhalb des Musters nur, daß Release, Zustand und Zielkonfiguration kompatibel genug sind, um die Anwendung zu starten. Daraus folgt keine Garantie für Erreichbarkeit, Verfügbarkeit oder eine bestimmte Wiederanlaufzeit.",
    helpTitle: "Hilfe",
    helpBody:
      "Wer Bartl in ein bestehendes Produkt einbaut oder unsicher ist, wo die Zustandsgrenze verläuft: Florian Kessler GmbH arbeitet an genau dieser Art von Systemdesign.",
    helpLinkAria: "fke.systems öffnen, neuer Tab",
    referenceTitle: "Ausführbare WordPress-Referenz",
    referenceIntro:
      "bartl-wordpress zeigt die Spec für eine konkrete WordPress-, MySQL- und Docker-Compose-Konfiguration.",
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
    insideTitle: "Teil des Musters",
    inside: [
      "Zustand und Versionen beobachten",
      "Sicherungsstände vor Verwendung prüfen",
      "initialisieren, wiederherstellen oder produktspezifisch migrieren",
      "gültigen Zustand bedienen oder kontrolliert abbrechen",
    ],
    outsideTitle: "Nicht Teil des Musters",
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
    eyebrow: "Bartl pattern",
    title: "Technical Spec",
    lead: "Bartl is an open design pattern for starting stateful applications. The mechanism observes existing state and uses it to select exactly the next permitted action.",
    principle:
      "State selects the path, not the name of a requested operation.",
    toc: "On this page",
    nav: [
      ["contract", "Startup contract"],
      ["decision", "Decision"],
      ["invariants", "Invariants"],
      ["product", "Product duties"],
      ["reference", "WordPress reference"],
      ["boundary", "Claim boundary"],
    ],
    contractTitle: "Startup contract with four inputs",
    contractIntro:
      "These four inputs must be distinguishable from each other and technically verifiable before the startup decision.",
    inputLabel: "Input",
    meaningLabel: "Contract",
    inputs: [
      [
        "Versioned release",
        "An immutable application artifact with a known engine version and its product-specific migration logic.",
      ],
      [
        "Fully declared state",
        "A complete inventory of all mutable data and metadata with a reliably detectable state version.",
      ],
      [
        "Valid backup",
        "A fully published backup whose format, inventory, and integrity can be verified before use.",
      ],
      [
        "Target configuration",
        "Endpoints and credentials supplied by the target. They belong neither to the release nor to backed-up state.",
      ],
    ],
    observationsTitle: "Observations before action",
    observations: [
      "Local state is absent, valid, or invalid. Invalid state must never be treated as absent state.",
      "A backup is absent or fully published and valid. An incomplete backup is an error, not a fresh installation.",
      "The engine and state versions are equal, the engine is newer, or the engine is older.",
      "Release, state, backup, and target configuration are complete and mutually consistent.",
    ],
    decisionTitle: "Observed startup path",
    decisionIntro:
      "The mechanism does not decide from a label such as install, restore, or upgrade. After every state-changing action, observation starts again.",
    pathTitle: "Evaluation",
    paths: [
      ["Valid local state and equal version", "The application can serve."],
      [
        "Valid local state and newer engine",
        "Product-specific migration runs. State is then observed again.",
      ],
      ["Valid local state and older engine", "Startup aborts because a downgrade is not permitted."],
      [
        "No local state and a valid backup",
        "The backup is verified before use and restored. State is then observed again.",
      ],
      [
        "No local state and no backup",
        "Fresh state is initialized. State is then observed again.",
      ],
      [
        "Invalid, incomplete, or contradictory inputs",
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
        body: "Bartl selects the migration point. Only the product can implement and verify the correct change to its state.",
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
      "Bartl supplies the decision structure. The application must supply concrete adapters for its own state.",
    productRequirements: [
      "declare the complete state inventory",
      "write and read the state version reliably",
      "distinguish valid, empty, incomplete, and damaged state",
      "initialize fresh state unambiguously",
      "publish a complete backup and verify it before restore",
      "implement product-specific migrations between supported versions",
      "check technical consistency after restore and migration",
      "abort on errors without partially serving",
    ],
    servingTitle: "Meaning of serving()",
    servingBody:
      "Within the pattern, serving() means only that release, state, and target configuration are compatible enough to start the application. It does not guarantee reachability, availability, or a particular restart time.",
    helpTitle: "Need help",
    helpBody:
      "If you are implementing bartl in an existing product, or unsure where to draw the state boundary, Florian Kessler GmbH works on this kind of system design.",
    helpLinkAria: "Open fke.systems, new tab",
    referenceTitle: "Executable WordPress reference",
    referenceIntro:
      "bartl-wordpress demonstrates the spec for one concrete WordPress, MySQL, and Docker Compose configuration.",
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
    insideTitle: "Part of the pattern",
    inside: [
      "observe state and versions",
      "verify backups before use",
      "initialize, restore, or run product-specific migration",
      "serve valid state or abort in a controlled way",
    ],
    outsideTitle: "Not part of the pattern",
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
