// SPDX-License-Identifier: CC-BY-4.0
export const derivationCopy = {
  de: {
    pageTitle: "Herleitung",
    description:
      "Warum Bartl Zustand statt Operationsnamen beobachtet, welches Betriebserlebnis das Muster anstrebt und wie es multiplied single tenancy ergänzt.",
    eyebrow: "Designherleitung",
    title: "Vom gewünschten Betriebserlebnis zum gemeinsamen Startpfad.",
    lead: "Bartl begann nicht mit einem neuen Orchestrator. Am Anfang stand die Frage, wie sich eine zustandsbehaftete Anwendung verhalten müßte, damit Wiederherstellung kein selten geprobter Sonderfall bleibt.",
    principle:
      "Komplexität verschwindet nicht. Sie wird einmal in einen ausführbaren Vertrag gelegt, statt bei jedem Start erneut vom Menschen verlangt zu werden.",
    toc: "Auf dieser Seite",
    nav: [
      ["experience", "Mentales Bild"],
      ["journey", "Entstehungsweg"],
      ["observations", "Beobachtungen"],
      ["pressure", "Design-Druck"],
      ["discovery", "Entdeckung"],
      ["effects", "Direkte Wirkungen"],
      ["composition", "Single Tenancy"],
      ["boundary", "Grenze"],
    ],
    experienceEyebrow: "Das gewünschte Erlebnis",
    experienceTitle: "Think iPhone.",
    experienceLead:
      "Eine Anwendung sollte sich so selbstverständlich wieder in Betrieb nehmen lassen wie ein Telefon. Der Nutzer beschreibt nicht die interne Operation. Das System erkennt die vorliegende Situation und führt den zulässigen Pfad aus.",
    phoneCases: [
      ["Neues Gerät ohne vorhandenen Zustand", "initialisieren"],
      ["Ersatzgerät mit Sicherungsstand", "wiederherstellen"],
      ["Neueres System mit älterem Zustand", "migrieren"],
      ["Unvereinbarer Zustand", "sicher anhalten"],
    ],
    analogyTitle: "Ein mentales Bild, kein Architekturbeweis",
    analogyBody:
      "Bartl bildet weder die interne Architektur eines iPhone nach noch übernimmt es dessen geschlossene Betriebsumgebung. Das Bild setzt die Erwartung an die Bedienbarkeit. Unterschiedliche Ausgangslagen sollen nicht unterschiedliche Runbooks verlangen. Die konkrete technische Antwort von Bartl entsteht erst aus den Beobachtungen darunter.",
    journeyEyebrow: "Die Reise",
    journeyTitle: "Das Muster verdichtete sich über mehrere Betriebsfragen.",
    journeyLead:
      "Die Form änderte sich, der Kern blieb gleich. Installation, Änderung und Wiederherstellung sollten nicht als getrennte Welten behandelt werden.",
    journey: [
      {
        year: "2022",
        title: "Die Ausgangsfrage",
        body: "Wie würde ein Kaufmann IT heute entwerfen, wenn Einfachheit, verläßlicher Betrieb und Wiederherstellbarkeit vom Ergebnis her gedacht werden? Das iPhone lieferte das mentale Bild.",
      },
      {
        year: "2023",
        title: "Das Betriebsziel",
        body: "Produktionsänderungen sollten reproduzierbar, prüfbar und unabhängig von der ausführenden Person werden. Weniger unterschiedliche Verfahren wurden zum Qualitätsmerkmal.",
      },
      {
        year: "2025",
        title: "Das wiederkehrende Muster",
        body: "Im Betrieb kundenspezifischer, zustandsbehafteter Stacks zeigte sich dieselbe Entscheidung immer wieder. Vorhandener Zustand, Sicherungsstand und Versionen bestimmen den nächsten Schritt.",
      },
      {
        year: "2026",
        title: "Der offene Schnitt",
        body: "Der Anwendungs-Startpfad wurde als technischer Baustein von Bartl beschrieben und mit einer ausführbaren WordPress-Referenz von seinem ursprünglichen Produktkontext gelöst.",
      },
    ],
    observationsEyebrow: "Fünf Beobachtungen",
    observationsTitle:
      "Die Gestaltung beginnt bei Bedingungen, die sich nicht wegplanen lassen.",
    observations: [
      {
        title: "Wert entsteht in Produktion.",
        body: "Builds, Artefakte und Pläne sind Mittel. Erst eine erreichbare und fachlich richtige Anwendung erbringt die beabsichtigte Leistung.",
      },
      {
        title: "Veränderung ist unvermeidlich.",
        body: "Software, Datenformate, Abhängigkeiten und Zielumgebungen bleiben nicht dauerhaft in derselben Version.",
      },
      {
        title: "Fehler sind unvermeidlich.",
        body: "Auch gute Prävention beseitigt weder Ausfälle noch unvollständige Änderungen oder beschädigte Eingaben vollständig.",
      },
      {
        title: "Seltene manuelle Abläufe sind nicht verläßlich.",
        body: "Ein Recovery-Runbook, das nur im Notfall gebraucht wird, driftet vom regelmäßig ausgeführten Produktionspfad weg.",
      },
      {
        title: "Jedes zusätzliche Glied hat einen Preis.",
        body: "Zwischen Absicht und Ergebnis wachsen mit jeder Übergabe kognitive Last, Fehlerfläche und schwer erkennbare Nebenwirkungen.",
      },
    ],
    pressureEyebrow: "Design-Druck",
    pressureTitle: "Aus den Beobachtungen folgen vier Anforderungen.",
    pressures: [
      [
        "Fehler lassen sich nicht vollständig verhindern.",
        "Recovery muß Teil des Designs sein.",
      ],
      [
        "Ein selten ausgeführter Recovery-Pfad driftet.",
        "Regelmäßige Änderungen sollen die Wiederherstellung mitprüfen, etwa durch eine Ersatzinstallation aus einer Sicherung.",
      ],
      [
        "Manuelle Genauigkeit skaliert nicht.",
        "Der Pfad muß ausführbar, prüfbar und reproduzierbar sein.",
      ],
      [
        "Zusätzliche Steuerungsebenen verlängern die Wirkungskette.",
        "Der Mechanismus muß nahe an Anwendung und Zustand bleiben.",
      ],
    ],
    designObjectiveTitle: "Der Designauftrag",
    designObjective:
      "Zustandsänderung und Wiederherstellung mit möglichst wenigen unterschiedlichen Mechanismen ausführen. Normalstart und Recovery dürfen dabei keine getrennten Wahrheiten entwickeln.",
    discoveryEyebrow: "Die Entdeckung",
    discoveryTitle: "Fünf Operationsnamen, eine Zustandsentscheidung.",
    discoveryLead:
      "Install, Restore, Upgrade, Reboot und Migration beschreiben unterschiedliche Absichten. Am Ziel wiederholen sich jedoch dieselben technischen Tatsachen.",
    facts: [
      "Ist gültiger lokaler Zustand vorhanden?",
      "Nur ohne lokalen Zustand wird ein gültiger Sicherungsstand abgefragt.",
      "Wie verhalten sich Engine- und Zustandsversion?",
    ],
    discoveryBody:
      "Diese Beobachtungen wählen initialisieren, wiederherstellen, produktspezifisch migrieren, bedienen oder kontrolliert abbrechen. Jede zustandsverändernde Aktion führt zurück zur Beobachtung. Nicht der aufgerufene Operationsname, sondern der danach tatsächlich vorliegende Zustand entscheidet.",
    decisionLink: "Entscheidungslogik interaktiv ausprobieren",
    effectsEyebrow: "Was direkt folgt",
    effectsTitle: "Der gemeinsame Pfad verändert die Form des Betriebs.",
    structuralTitle: "Strukturelle Folgen",
    structural: [
      "ein gemeinsamer Startpfad für Normalstart, Initialisierung und Restore",
      "beobachteter Zustand statt eines angeforderten Operationsnamens",
      "produktspezifische Migration am fachlich richtigen Entscheidungspunkt",
      "kontrollierter Abbruch bei Downgrade, Inkonsistenz oder fehlenden Eingaben",
      "derselbe ausführbare Vertrag für regelmäßig ausgeführten Start und Wiederherstellung",
    ],
    expectedTitle: "Erwartete Wirkungen",
    expectedIntro:
      "Wenn ein Produkt den Vertrag vollständig umsetzt, werden diese Wirkungen möglich. Ein normaler Wiederanlauf oder ein In-place-Update prüft jedoch keinen Restore. Der Wiederaufbau auf leerem Zustand aus einer Sicherung mit Prüfung und gegebenenfalls Migration übt diesen Pfad aus; In-place-Updates bleiben möglich.",
    expected: [
      "weniger unterschiedliche Betriebsprozeduren und geringere kognitive Last",
      "bei regelmäßigem Wiederaufbau aus Sicherungen häufiger ausgeführte Recovery-Logik",
      "Sicherungsstände, die vor ihrer Verwendung technisch geprüft werden",
      "Migrationen, deren Entscheidung und Ergebnis beobachtbar bleiben",
    ],
    compositionEyebrow: "Komposition",
    compositionTitle:
      "Der Startmechanismus und multiplied single tenancy lösen verschiedene Probleme.",
    compositionLead:
      "Multiplied single tenancy bedeutet ein eigener Stack je Kunde, wiederholt nach demselben Bauplan. Die Isolation vervielfacht zunächst die Zahl der Betriebsobjekte. Der Startvertrag macht ihren Anwendungs- und Zustandslebenszyklus wiederholbar. Flottensteuerung kann die Wiederholung koordinieren; diese Topologie ist keine Voraussetzung für Bartl.",
    compositionParts: [
      {
        label: "Single tenancy",
        title: "Isolation",
        items: [
          "ein Kunde und ein Zustandsraum je Stack",
          "getrennte Fehler- und Compliance-Grenzen",
          "zusätzliche Infrastruktur- und Betriebsobjekte",
        ],
      },
      {
        label: "Bartl-Startmechanismus",
        title: "Wiederholbarer Lebenszyklus",
        items: [
          "derselbe Startvertrag je Stack",
          "ein Pfad für Initialisierung, Restore und Migration",
          "keine Mandantentrennung und keine Flottensteuerung",
        ],
      },
      {
        label: "Fleet management",
        title: "Konsistenz in der Vielzahl",
        items: [
          "Versionen und Rollouts über die Stacks steuern",
          "Abweichungen und Ergebnisse sichtbar machen",
          "manuelle Einzelpflege vermeiden",
        ],
      },
    ],
    combinedTitle: "Zusammen wird eine belastbare Betriebsform möglich.",
    combinedBody:
      "Getrennte Stacks können einen kleineren Blast Radius, eigene Daten- und Compliance-Grenzen sowie kundenbezogene Releases und Migrationen erhalten. Der gemeinsame Startvertrag macht ihre Lebenszyklen wiederholbar. Flottensteuerung kann Versionen und Rollouts koordinieren; ihr Nutzen muß ihre Kosten und geteilten Steuerungsrisiken rechtfertigen.",
    costBoundary:
      "Der gemeinsame Startpfad beseitigt weder die Ressourcen- noch die Betriebskosten zusätzlicher Stacks. Er reduziert die Zahl unterschiedlicher Verfahren. Wie deren Wiederholung koordiniert wird, hängt von Umfang und Betriebsanforderungen ab, nicht von einer universellen Fleet-Management-Pflicht.",
    boundaryEyebrow: "Saubere Trennung",
    boundaryTitle:
      "Die Herleitung erklärt das Warum. Der Anwendungsvertrag präzisiert einen Baustein.",
    boundaryBody:
      "Bartl umfaßt Anwendung, Infrastruktur und Verantwortung für den vollständigen Service. Der kanonische Rahmen steht in README.md und der dort verlinkten Philosophie. Diese Seite erklärt den Startmechanismus; die technische Spec erläutert dessen Anwendungsvertrag, statt ganz Bartl zu definieren. Zielbereitstellung, sichere Aktivierung und der vollständige Recovery-Prozeß brauchen zusätzliche ausführbare Verfahren und eigene Nachweise.",
    specLink: "Technische Spec lesen",
    referenceLink: "WordPress-Referenz ausführen",
    referenceAria:
      "Ausführbare WordPress-Referenz auf Codeberg öffnen, neuer Tab",
    back: "Zurück zur Startseite",
  },
  en: {
    pageTitle: "Derivation",
    description:
      "Why Bartl observes state instead of operation names, which operating experience the pattern aims for, and how it complements multiplied single tenancy.",
    eyebrow: "Design derivation",
    title: "From the desired operating experience to one shared startup path.",
    lead: "Bartl did not begin with a new orchestrator. It began with the question of how a stateful application would have to behave so that recovery no longer remained a rarely rehearsed special case.",
    principle:
      "Complexity does not disappear. It is placed into an executable contract once instead of being demanded from a person again at every startup.",
    toc: "On this page",
    nav: [
      ["experience", "Mental model"],
      ["journey", "Journey"],
      ["observations", "Observations"],
      ["pressure", "Design pressure"],
      ["discovery", "Discovery"],
      ["effects", "Direct effects"],
      ["composition", "Single tenancy"],
      ["boundary", "Boundary"],
    ],
    experienceEyebrow: "The desired experience",
    experienceTitle: "Think iPhone.",
    experienceLead:
      "An application should return to service as naturally as a phone does. The user does not describe the internal operation. The system recognizes the situation it finds and follows the admissible path.",
    phoneCases: [
      ["New device without existing state", "initialize"],
      ["Replacement device with a backup", "restore"],
      ["Newer system with older state", "migrate"],
      ["Incompatible state", "stop safely"],
    ],
    analogyTitle: "A mental model, not architecture evidence",
    analogyBody:
      "Bartl neither reproduces the internal architecture of an iPhone nor inherits its closed operating environment. The image sets an expectation for ease of use. Different starting situations should not require different runbooks. Bartl's concrete technical answer emerges only from the observations below.",
    journeyEyebrow: "The journey",
    journeyTitle: "The pattern condensed through several operating questions.",
    journeyLead:
      "The form changed while the core remained stable. Installation, change, and recovery should not be treated as separate worlds.",
    journey: [
      {
        year: "2022",
        title: "The opening question",
        body: "How would a businessperson design IT today if simplicity, dependable operation, and recovery were considered from the outcome backwards? The iPhone supplied the mental model.",
      },
      {
        year: "2023",
        title: "The operating objective",
        body: "Production changes should become reproducible, inspectable, and independent of the person executing them. Fewer distinct procedures became a quality attribute.",
      },
      {
        year: "2025",
        title: "The recurring pattern",
        body: "Operating customer-specific stateful stacks exposed the same decision repeatedly. Existing state, a backup, and versions determine the next step.",
      },
      {
        year: "2026",
        title: "The open cut",
        body: "The application startup path was described as one technical contribution to Bartl and separated from its original product context through an executable WordPress reference.",
      },
    ],
    observationsEyebrow: "Five observations",
    observationsTitle:
      "The design starts with conditions that cannot be planned away.",
    observations: [
      {
        title: "Value is created in production.",
        body: "Builds, artifacts, and plans are means. Only an accessible and functionally correct application provides the intended service.",
      },
      {
        title: "Change is inevitable.",
        body: "Software, data formats, dependencies, and target environments do not remain at the same version forever.",
      },
      {
        title: "Errors are inevitable.",
        body: "Good prevention cannot eliminate outages, incomplete changes, or damaged inputs completely.",
      },
      {
        title: "Rare manual procedures are not dependable.",
        body: "A recovery runbook used only during an emergency drifts away from the production path that is exercised regularly.",
      },
      {
        title: "Every additional link has a cost.",
        body: "Every handoff between intent and result adds cognitive load, failure surface, and side effects that are harder to see.",
      },
    ],
    pressureEyebrow: "Design pressure",
    pressureTitle: "Four requirements follow from the observations.",
    pressures: [
      [
        "Failures cannot be prevented completely.",
        "Recovery must be part of the design.",
      ],
      [
        "A rarely used recovery path drifts.",
        "Routine changes should exercise reconstruction too, for example through a replacement installation from a backup.",
      ],
      [
        "Manual precision does not scale.",
        "The path must be executable, inspectable, and reproducible.",
      ],
      [
        "Additional control layers lengthen the chain of effect.",
        "The mechanism must remain close to the application and its state.",
      ],
    ],
    designObjectiveTitle: "The design objective",
    designObjective:
      "Perform state changes and recovery with as few distinct mechanisms as possible. Normal startup and recovery must not develop separate truths.",
    discoveryEyebrow: "The discovery",
    discoveryTitle: "Five operation names, one state decision.",
    discoveryLead:
      "Install, restore, upgrade, reboot, and migration describe different intentions. The same technical facts recur at the target.",
    facts: [
      "Is valid local state present?",
      "Only without local state is a valid backup queried.",
      "How do the engine and state versions compare?",
    ],
    discoveryBody:
      "Those observations select initialize, restore, product-specific migration, serve, or controlled abort. Every state-changing action returns to observation. The operation name that was invoked does not decide. The state that actually exists afterwards does.",
    decisionLink: "Try the decision logic interactively",
    effectsEyebrow: "What follows directly",
    effectsTitle: "The shared path changes the shape of operations.",
    structuralTitle: "Structural consequences",
    structural: [
      "one shared startup path for normal startup, initialization, and restore",
      "observed state instead of a requested operation name",
      "product-specific migration at the correct domain decision point",
      "controlled abort on downgrade, inconsistency, or missing inputs",
      "the same executable contract for routinely exercised startup and recovery",
    ],
    expectedTitle: "Expected effects",
    expectedIntro:
      "A product implementing the complete contract can enable these effects. A normal restart or in-place upgrade does not test restore. Reconstruction from a backup into empty state, with verification and migration when needed, exercises that path; in-place upgrades remain possible.",
    expected: [
      "fewer distinct operating procedures and lower cognitive load",
      "recovery logic exercised more often through routine reconstruction from backups",
      "backups that are checked technically before use",
      "migrations whose decision and result remain observable",
    ],
    compositionEyebrow: "Composition",
    compositionTitle:
      "The startup mechanism and multiplied single tenancy solve different problems.",
    compositionLead:
      "Multiplied single tenancy means one stack per customer, repeated from the same blueprint. Isolation initially multiplies the operating objects. The startup contract makes their application and state lifecycle repeatable. Fleet management can coordinate that repetition; this topology is not a prerequisite for Bartl.",
    compositionParts: [
      {
        label: "Single tenancy",
        title: "Isolation",
        items: [
          "one customer and one state domain per stack",
          "separate failure and compliance boundaries",
          "additional infrastructure and operating objects",
        ],
      },
      {
        label: "Bartl startup mechanism",
        title: "Repeatable lifecycle",
        items: [
          "the same startup contract for every stack",
          "one path for initialization, restore, and migration",
          "no tenant isolation and no fleet control",
        ],
      },
      {
        label: "Fleet management",
        title: "Consistency across the fleet",
        items: [
          "control versions and rollouts across stacks",
          "make deviations and results visible",
          "avoid manual care of every individual stack",
        ],
      },
    ],
    combinedTitle: "Together they can form a dependable operating model.",
    combinedBody:
      "Separate stacks can provide a smaller blast radius, individual data and compliance boundaries, and customer-specific releases and migrations. The shared startup contract makes their lifecycles repeatable. Fleet management can coordinate versions and rollouts; its benefit must justify its costs and shared authority risks.",
    costBoundary:
      "The shared startup path removes neither the resource cost nor the operating work of additional stacks. It reduces distinct procedures. How repetition is coordinated depends on scale and operating requirements, not a universal fleet-management obligation.",
    boundaryEyebrow: "Clean separation",
    boundaryTitle:
      "The derivation explains why. The application contract specifies one contribution.",
    boundaryBody:
      "Bartl covers application, infrastructure and responsibility for the complete service. The canonical framing is in README.md and its linked philosophy. This page explains the startup mechanism; the technical spec presents its application contract rather than defining all of Bartl. Target provisioning, safe activation and the complete recovery process require additional executable procedures and their own evidence.",
    specLink: "Read the technical spec",
    referenceLink: "Run the WordPress reference",
    referenceAria:
      "Open the executable WordPress reference on Codeberg in a new tab",
    back: "Back to the landing page",
  },
} as const;
