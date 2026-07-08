<!-- SPDX-License-Identifier: CC-BY-4.0 -->

_Dies ist eine KI-gestützte Übersetzung. Die [englische Version](README.md) ist maßgeblich._

# Bartl

Ein Entwurfsmuster für den Anwendungslebenszyklus. Eine einzige Startentscheidung auf Grundlage des beobachteten Systemzustands und der Version - der Mechanismus verzweigt anhand dessen, was er vorfindet, nicht anhand der angeforderten Operation.

Website: [bartl.app](https://bartl.app)

## Das Problem

Wenn die Produktion ausfällt, entscheiden drei Fragen über das Geschäftsergebnis: Wie viele Kunden betroffen, wie schnell wieder online, wie viele Daten verloren.

Die meisten Organisationen können keine dieser Fragen beantworten, bevor die Krise im Gange ist.

Bartl macht die letzten beiden Antworten zu automatischen Konsequenzen der Betriebsweise. Kombiniert mit vervielfachter Single Tenancy - ein Kunde, ein Stack - schrumpft die erste Antwort auf ihr Minimum.

Nicht durch Hinzufügen von etwas - sondern durch Ersetzen von fünf getrennten Verfahren durch einen einheitlichen Mechanismus. Die Operationen unterscheiden sich tatsächlich in ihren Eingaben, aber der Mechanismus, der sie ausführt, ist identisch. Er betrachtet, welcher State existiert und welche Version die Engine hat, und tut das Richtige.

## Die Prämissen

Fünf Prämissen bestimmen das Design:

1. Software liefert Wert nur in der Produktion.
2. Veränderung ist unvermeidlich.
3. Fehler sind unvermeidlich.
4. Menschen können Veränderungen nicht zuverlässig anwenden.
5. Jedes Glied in der Kette zwischen Absicht und Ergebnis verursacht Kosten: kognitive Last, Fehleroberfläche, Seiteneffekte.

Diese beseitigen jeden Ausweg: Man kann nicht alle Fehler verhindern (muß für Wiederherstellung entwerfen), man kann keine sorgfältigen manuellen Verfahren anwenden (muß automatisieren), man kann keine Schicht hinzufügen, um es zu verwalten (muß die Kette verkürzen). Was alle fünf Filter überlebt: vollautomatisiertes Disaster Recovery mit der kürzestmöglichen Kette.

Und wir können - weil Anwendungen, Infrastruktur und beider Betrieb jetzt als Code ausdrückbar sind. Versionskontrolliert, testbar, reproduzierbar. Das war das letzte fehlende Stück.

## Die Entdeckung

Und wenn man darüber nachdenkt, was DR tatsächlich ist und wie man es automatisiert: DR = von Grund auf erstellen + Daten wiederherstellen. Das liefert automatisierte Installation gratis mit. Versionserkennung hinzufügen, und man hat Upgrades. Auf einem anderen Server ausführen, und man hat Migration.

Nun das Backup portabel halten - keine anbieterspezifischen Snapshots, nur ein Blob - und man kann auf jedem Server überall wiederherstellen.

Katastrophe, Kostendruck, Vertragsende, Neugier: der Grund für den Wechsel ändert nicht die Operation. Der Zeitrahmen auch nicht - ob man dreißig Sekunden oder dreißig Tage hat, es ist dasselbe Restore. Das ist Wechselfähigkeit.

## Der Mechanismus

Das Beste: der Entscheidungsbaum paßt in 9 Zeilen.

```python
until serving():
    if local state exists:
        engine version vs state version:
            equal:    serving()
            engine >: migrate()
            engine <: abort("downgrade")
    else:
        if fetch_backup(): restore(backup)
        else:              init()

serving(): run app, schedule backups
```

Drei Fakten bestimmen die Operation: Existiert lokaler State, ist ein gültiges Backup verfügbar (fetch_backup() umfaßt Abruf und Integritätsprüfung), und wie verhält sich die Engine-Version zur State-Version. Jeder Zweig außer serving() und abort() verändert den State und springt zurück.

- Neustart: State existiert, gleich -> serving().
- Neuinstallation: kein State, kein Backup -> init() -> State erstellt -> gleich -> serving().
- In-place Upgrade: State existiert, Engine > -> migrate() -> gleich -> serving().
- DR Restore: kein State, Backup -> restore() -> State erstellt -> gleich -> serving().
- Out-of-place Upgrade: kein State, Backup -> restore() -> State erstellt -> Engine > -> migrate() -> gleich -> serving(). Wählt man diesen Weg statt In-place Upgrade (eine geschäftliche Entscheidung, keine technische Anforderung), wird bei jedem Upgrade der Restore-Pfad durchlaufen. Nicht vom Muster vorgeschrieben - nur eine Eigenschaft, die ohne zusätzliche Kosten entsteht.
- Migration: wie DR Restore, anderer Server. Dieselbe Operation.
- Evakuierung: wie DR Restore, anderer Anbieter. Dieselbe Operation.
- Downgrade-Versuch: State existiert, Engine < -> abort(). Alten Code gegen ein neues Schema laufen zu lassen ist gefährlich - die Branche hat sich aus gutem Grund auf Fix-Forward geeinigt. Bartl verhindert das Gefährliche. Muß man zurück, Restore aus dem Backup vor dem Upgrade + Neustart: das ist der DR-Pfad, bereits eine erstklassige Operation (setzt voraus, daß das Backup vor dem Upgrade erstellt wurde - durch Konvention erzwungen, nicht durch den Mechanismus).

Dies deckt alle Lebenszyklus-Operationen ab. Explizit außerhalb des Scope: Infrastruktur (Skalierung, Provisionierung), Datenintegrität (Korruption ohne Versionswechsel) und Runtime-Belange (Monitoring, Zertifikatsrotation). Diese beobachten oder erhalten das System, bewegen aber keinen State.

Voraussetzungen (Datenbank nimmt Verbindungen an, Speicher eingehängt, Netzwerk verfügbar) sind Aufgabe der Runtime, nicht von Bartl. Jede Runtime erzwingt Reihenfolge bereits nativ: depends_on in Compose, initContainers in K8s, After= in systemd. Bartl braucht erfüllte Voraussetzungen. Wie sie erfüllt werden, ist nicht seine Sache.

Fehlerbehandlung: Init(), Restore() und Migrate() können mittendrin fehlschlagen und partiellen State hinterlassen. Die Loop-Struktur ist der Wiederherstellungsmechanismus: beim nächsten Start wertet der Loop dieselben drei Fakten neu aus und setzt dort fort, wo abgebrochen wurde. Was der Loop nicht kann, ist Korruption innerhalb von ansonsten gültig aussehendem State zu erkennen - das ist anwendungsspezifische Produktarbeit (siehe Punkt 21 unten).

## Was folgt

### Aus dem Muster

Strukturelle Eigenschaften:

1. Einheitliche State-Maschinerie (ein Mechanismus für alle produktiven Operationen)
2. Automatisierte Installation (DR erzwingt es)
3. Automatisiertes DR (das Designziel)
4. Verzweigung anhand des beobachteten Systemzustands statt der deklarierten Operation
5. Migration = derselbe Mechanismus, anderer Server

Erwarteter Nutzen (abhängig von Nutzungsmustern):

6. Verbessertes RTO (automatisierte Wiederherstellung, keine manuellen Schritte)
7. Vertrauenswürdige Backups (Restore-Pfad wird bei jedem Out-of-place Upgrade durchlaufen - Einschränkung: In-place Upgrades durchlaufen ihn nicht)
8. Reduzierte kognitive Last (ein Verfahren zu lernen statt getrennter Install-/Restore-/Upgrade-Verfahren)
9. Wachsendes Betriebsvertrauen (derselbe Codepfad läuft für Install, Upgrade und Restore - wiederholte Ausführung baut Vertrauen in den Mechanismus auf)

Erfordert Konventionsentscheidungen:

10. Portable Backups (erfordert ein anbieterunabhängiges Blob-Format - z.B. Datenbankdumps + Dateisystem-Tar, keine anbieterspezifischen Snapshots)
11. Evakuierungsfähigkeit (abhängig von portablem Blob + keine anbieterspezifischen APIs im kritischen Pfad)
12. Souveränität - die "dünne Taille": anwendungsspezifischer Blob darüber, Standardplattform darunter (Linux/Compose, K8s). Der Blob gehört einem, die Plattform ist Massenware. Souveränität folgt daraus, den Blob portabel und die Plattform standardisiert zu halten. Infrastrukturumstellung (DNS, Firewall, Zertifikate) ist ein Orchestrierungsbelang außerhalb von Bartls Scope.

Erfordert Produktarbeit:

13. Versionserkennungslogik
14. Migrationsskripte (Produktcode, nicht Bartl-Code)
15. State-Deklaration (welche Pfade und Datenbanken eine Neuinstallation überleben)
16. Backup-Skript (State in einen Blob sichern)
17. Backup-Planung, -Rotation, -Aufbewahrung
18. Backup-Verifikation (Prüfsummen, Roundtrip-Tests)
19. Multi-Service-Konsistenz beim Backup (Anwendungsebene)
20. Durchsetzung der Voraussetzungen (an Runtime delegiert)
21. Erkennung und Wiederherstellung von partiellem State (fehlgeschlagenes Init/Restore/Migrate mit beschädigtem State)

### Aus dem Muster + vervielfachter Single Tenancy

Warum Single Tenancy jetzt tragfähig ist: die Kosten, die Multi-Tenancy unvermeidlich machten, waren der Betrieb - jeder zusätzliche Stack bedeutete mehr manuelle Arbeit, mehr Stammwissen, mehr Fehlerquellen. Wenn der Mechanismus Code ist - einmal getestet, N-mal angewandt - skalieren diese Kosten nicht mehr mit der Anzahl der Stacks. Infrastrukturkosten skalieren weiterhin (Cloud ist pro Einheit teurer als On-Premises), aber sie waren nie die dominierenden Kosten. Der Betrieb war es.

Strukturelle Eigenschaften:

22. Minimierter Blast Radius (ein Fehler = ein Kunde)
23. Datenisolation by Design
24. Getrennte Compliance-Grenzen pro Kunde
25. Einfaches Onboarding (Stack hochfahren)
26. Einfaches Offboarding (Stack und seine Backups löschen)
27. Agilität pro Kunde (Version Pinning, Rollbacks)
28. Migrationen pro Kunde (kein Big Bang, schrittweiser Rollout)

Erwarteter Nutzen (abhängig von Fleet-Tooling):

29. Lineares operatives Skalieren (der N-te Stack fügt operative Arbeit hinzu, nicht kognitive Komplexität - erfordert Fleet-Tooling zur Konsistenzwahrung; ohne es bedeuten N Stacks N-mal den manuellen Aufwand)
30. Belegschaft: kurze Kette (Prämisse 5) plus kleiner Scope (Single Tenancy) machen jeden Stack für eine Person erfaßbar. Keines allein reicht aus. Wo beides gilt, ist das erforderliche Qualifikationsniveau ein Fachanwendungsverantwortlicher, kein Platform-Engineering-Team.
31. Talent-Onboarding/-Offboarding (erlernbarer Scope + klare Zuständigkeit = schnelle Einarbeitung - erfordert sowohl kurze Kette als auch kleinen Scope)

Erfordert Arbeit:

Bartl-spezifisch:

32. Channels / Fleet Management
33. Bless/Tag Workflow
34. Forge-Runner-Infrastruktur
35. Instanz-Repos pro Kunde

Standardmäßige operative Belange (nicht durch Bartl eingeführt):

36. Monitoring-Aggregation über N Stacks
37. Secret Management
38. Infrastruktur-Provisionierung
