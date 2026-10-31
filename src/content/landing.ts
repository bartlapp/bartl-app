// SPDX-License-Identifier: CC-BY-4.0
export const landingCopy = {
  en: {
    title: "Keep the service. Keep your options.",
    lead: "Software must remain useful through updates, failures and changes of provider. That takes more than a backup or a contractual right to leave.",
    introduction: "Bartl is an operating philosophy that connects application procedures, usable infrastructure and clear responsibility. The measure is whether people can continue their work within agreed limits, including when the current provider can no longer be used.",
    approachLink: "Understand the approach",
    implementLink: "Bartlize an application",
    alternative: {
      title: "An alternative only counts if you can use it",
      paragraphs: [
        "Resilience means continuing the required work despite disruption, or recovering within acceptable interruption and data-loss limits. Sovereignty means being able to reject an unacceptable operating arrangement without losing the service.",
        "Both require preparation. If the alternative needs credentials, capacity, approvals or knowledge that you cannot obtain in time, it is not yet a usable alternative.",
        "A provider change succeeds when people can work at the destination with the required data and dependencies. Moving an application is only part of that result.",
      ],
    },
    contributionsTitle: "Three contributions make the service recoverable",
    contributions: [
      {
        title: "The application carries its operating knowledge",
        paragraphs: [
          "The application’s maintained operating package knows what state belongs to it, how to capture that state consistently, how to reconstruct it and which upgrades it supports.",
          "It uses the product’s native procedures. The administrator chooses the release and supplies the installation configuration; the package performs the internal initialization, restore and migration steps and checks their result.",
          "That knowledge should not have to be reinvented for each installation.",
        ],
      },
      {
        title: "The infrastructure makes the alternative usable",
        paragraphs: [
          "The destination supplies the required runtime, storage, capacity, access and dependencies. Application recovery uses those capabilities without having to be rewritten for each provider.",
          "Software, backups, keys and the recovery procedure must remain available outside the failure they are intended to survive. A backup that can only be unlocked through the lost environment is not enough.",
        ],
      },
      {
        title: "The organization owns the complete result",
        paragraphs: [
          "People set the required service, protection, interruption, data-loss and cost limits. They authorize changes and make sure the necessary resources and responsibilities are in place.",
          "Someone remains accountable for the whole service, including contributions supplied by other teams and providers. After reconstruction, users still need access, dependencies must work, and the old installation must no longer act as the authoritative service.",
        ],
      },
    ],
    maintenance: {
      title: "Use ordinary maintenance to exercise recovery",
      paragraphs: [
        "We have to update applications anyway. Why not use that work to find out whether we can recover them?",
        "Build a replacement from a backup, let the application perform its supported upgrade, check the result and switch service to it. The update now exercises reconstruction instead of leaving recovery as a rarely used emergency procedure.",
        "This has a cost: temporary capacity, restore time and coordination of writes. Use it where the recovery evidence justifies that cost. When upgrading in place is the better choice, exercise restoration separately.",
        "A replacement on the same cluster tests reconstruction. A provider-loss claim needs a further drill with the original provider unavailable.",
      ],
    },
    example: {
      title: "A concrete example: Keycloak",
      paragraphs: [
        "A Keycloak installation contains more than a running login page. Its users, realms, roles and authentication configuration must survive reconstruction.",
        "The Bartl Keycloak package uses PostgreSQL’s native database tools and Keycloak’s normal startup. Existing state follows the ordinary startup path. An empty target restores the latest available backup; native startup handles initialization or a supported migration. Ordinary access opens after successful preparation.",
        "The qualified 0.5.0 package has exercised installation, backup, fresh-target recovery, supported upgrades and browser authentication with restored identities. Failed state-changing work stays isolated; the administrator can replace the failed target and retry.",
        "This establishes application-package behavior. Target provisioning, complete service access and provider-loss recovery require their own evidence.",
      ],
    },
    exampleLink: "See how the package was designed",
    exampleAnchor: "worked-example-keycloak",
    sustain: {
      title: "Demonstrate it. Keep it working.",
      paragraphs: [
        "A successful exercise establishes what worked under its tested conditions. Changes to applications, dependencies and infrastructure can invalidate that result.",
        "Keep the procedures versioned, assign responsibility for maintaining them, and repeat the relevant exercises. Measure when people can work again and which data returned. Test whether a successor can operate the installation without your private machinery.",
        "The goal is not the greatest amount of automation. It is a capability the intended team can sustain.",
      ],
    },
    philosophyLink: "Read the operating philosophy",
    contractLink: "Implement the application contract",
  },
  de: {
    title: "Den Service erhalten. Die Wahl behalten.",
    lead: "Software muß bei Updates, Ausfällen und Providerwechseln nutzbar bleiben. Dafür braucht es mehr als eine Sicherung oder das vertragliche Recht zu gehen.",
    introduction: "Bartl ist eine Betriebsphilosophie, die Anwendungsverfahren, nutzbare Infrastruktur und klare Verantwortung verbindet. Der Maßstab ist, ob Menschen ihre Arbeit innerhalb vereinbarter Grenzen fortführen können, auch wenn der bisherige Provider nicht mehr genutzt werden kann.",
    approachLink: "Den Ansatz verstehen",
    implementLink: "Eine Anwendung bartlisieren",
    alternative: {
      title: "Eine Alternative zählt erst, wenn sie nutzbar ist",
      paragraphs: [
        "Resilienz bedeutet, die benötigte Arbeit trotz Störungen fortzuführen oder innerhalb vertretbarer Unterbrechungs- und Datenverlustgrenzen wieder aufzunehmen. Souveränität bedeutet, eine untragbare Betriebsvereinbarung zurückweisen zu können, ohne den Service zu verlieren.",
        "Beides verlangt Vorbereitung. Braucht die Alternative Zugangsdaten, Kapazität, Freigaben oder Wissen, die nicht rechtzeitig verfügbar sind, ist sie noch keine nutzbare Alternative.",
        "Ein Providerwechsel gelingt, wenn Menschen am Ziel mit den erforderlichen Daten und Abhängigkeiten arbeiten können. Die Anwendung umzuziehen ist nur ein Teil dieses Ergebnisses.",
      ],
    },
    contributionsTitle: "Drei Beiträge machen den Service wiederherstellbar",
    contributions: [
      {
        title: "Die Anwendung bringt ihr Betriebswissen mit",
        paragraphs: [
          "Das gepflegte Betriebspaket der Anwendung weiß, welcher Zustand zu ihr gehört, wie er konsistent erfaßt und rekonstruiert wird und welche Updates unterstützt werden.",
          "Es nutzt die nativen Verfahren des Produkts. Der Administrator wählt das Release und liefert die Installationskonfiguration; das Paket führt die internen Schritte für Initialisierung, Restore und Migration aus und prüft ihr Ergebnis.",
          "Dieses Wissen sollte nicht für jede Installation neu erarbeitet werden müssen.",
        ],
      },
      {
        title: "Die Infrastruktur macht die Alternative nutzbar",
        paragraphs: [
          "Das Ziel stellt den benötigten Runtime, Storage, Kapazität, Zugang und Abhängigkeiten bereit. Die Wiederherstellung der Anwendung nutzt diese Fähigkeiten, ohne für jeden Provider neu geschrieben werden zu müssen.",
          "Software, Sicherungen, Schlüssel und das Wiederherstellungsverfahren müssen außerhalb des Ausfalls verfügbar bleiben, den sie überstehen sollen. Eine Sicherung, die nur über die verlorene Umgebung entschlüsselt werden kann, genügt nicht.",
        ],
      },
      {
        title: "Die Organisation verantwortet das vollständige Ergebnis",
        paragraphs: [
          "Menschen bestimmen den benötigten Service sowie Schutz-, Unterbrechungs-, Datenverlust- und Kostengrenzen. Sie autorisieren Änderungen und sorgen dafür, daß die nötigen Mittel und Verantwortlichkeiten vorhanden sind.",
          "Jemand bleibt für den gesamten Service verantwortlich, einschließlich der Beiträge anderer Teams und Provider. Nach der Rekonstruktion brauchen Nutzer weiterhin Zugang, Abhängigkeiten müssen funktionieren, und die alte Installation darf nicht mehr als maßgeblicher Service wirken.",
        ],
      },
    ],
    maintenance: {
      title: "Mit gewöhnlicher Wartung die Wiederherstellung üben",
      paragraphs: [
        "Wir müssen Anwendungen ohnehin aktualisieren. Warum diese Arbeit nicht nutzen, um herauszufinden, ob wir sie wiederherstellen können?",
        "Eine Ersatzinstallation aus einer Sicherung aufbauen, die Anwendung ihr unterstütztes Update ausführen lassen, das Ergebnis prüfen und den Service umschalten. Das Update übt damit die Rekonstruktion, statt Recovery als selten benutztes Notfallverfahren liegenzulassen.",
        "Das kostet zusätzliche Kapazität, Restore-Zeit und Abstimmung der Schreibzugriffe. Der Wiederherstellungsnachweis muß diesen Aufwand rechtfertigen. Ist ein In-place-Update die bessere Wahl, wird der Restore gesondert geübt.",
        "Eine Ersatzinstallation im selben Cluster prüft die Rekonstruktion. Eine Aussage über Providerverlust verlangt einen weiteren Drill, bei dem der ursprüngliche Provider nicht verfügbar ist.",
      ],
    },
    example: {
      title: "Ein konkretes Beispiel: Keycloak",
      paragraphs: [
        "Eine Keycloak-Installation besteht aus mehr als einer laufenden Anmeldeseite. Ihre Benutzer, Realms, Rollen und Authentisierungskonfiguration müssen die Rekonstruktion überstehen.",
        "Das Bartl-Keycloak-Paket nutzt die nativen Datenbankwerkzeuge von PostgreSQL und den normalen Start von Keycloak. Vorhandener Zustand folgt dem gewöhnlichen Startpfad. Ein leeres Ziel stellt die neueste verfügbare Sicherung wieder her; der native Start übernimmt Initialisierung oder unterstützte Migration. Gewöhnlicher Zugriff wird nach erfolgreicher Vorbereitung freigegeben.",
        "Das qualifizierte Paket 0.5.0 hat Installation, Sicherung, Wiederherstellung auf einem frischen Ziel, unterstützte Updates und Browser-Anmeldung mit wiederhergestellten Identitäten durchlaufen. Fehlgeschlagene zustandsändernde Arbeit bleibt isoliert; der Administrator kann das fehlgeschlagene Ziel ersetzen und erneut beginnen.",
        "Das belegt das Verhalten des Anwendungspakets. Zielbereitstellung, vollständiger Servicezugang und Wiederherstellung bei Providerverlust brauchen eigene Nachweise.",
      ],
    },
    exampleLink: "Den Aufbau des Pakets verstehen",
    exampleAnchor: "beispiel-keycloak",
    sustain: {
      title: "Nachweisen. Funktionsfähig halten.",
      paragraphs: [
        "Eine erfolgreiche Übung belegt, was unter den geprüften Bedingungen funktioniert hat. Änderungen an Anwendungen, Abhängigkeiten und Infrastruktur können dieses Ergebnis entwerten.",
        "Verfahren versioniert halten, Verantwortung für ihre Pflege zuweisen und die maßgeblichen Übungen wiederholen. Messen, wann Menschen wieder arbeiten können und welche Daten zurückgekehrt sind. Prüfen, ob ein Nachfolger die Installation ohne die eigenen privaten Werkzeuge betreiben kann.",
        "Das Ziel ist nicht möglichst viel Automation. Es ist eine Fähigkeit, die das vorgesehene Team dauerhaft erhalten kann.",
      ],
    },
    philosophyLink: "Die Betriebsphilosophie lesen",
    contractLink: "Den Anwendungsvertrag umsetzen",
  },
} as const;
