<!-- SPDX-License-Identifier: Apache-2.0 -->

# bartl-app

> Developed on Codeberg: [codeberg.org/bartlapp/bartl-app](https://codeberg.org/bartlapp/bartl-app). The GitHub copy is a read-only mirror. Please open issues and pull requests on Codeberg.

Source of [bartl.app](https://bartl.app), the bilingual website for Bartl. This repository is the canonical home for Bartl's general philosophy and public explanation.

Start with [Bartl: retaining the ability to act](docs/philosophy.md) for the operating philosophy. The [application contract](#application-contract-and-qualification) below defines required behavior; [How to bartlize an application](docs/how-to-bartlize.md) explains the implementation method. Each application owns its supported configuration, operating instructions, design and release evidence.

## Scope

Bartl is an operating philosophy for making resilience and sovereignty capabilities we can actually exercise, through how we build applications, provide infrastructure and organize responsibility. Its scope is the complete service, not only the application startup mechanism.

People authorize the outcome and accepted risks. Each bartlized application executes its supported application procedures without manual technical intervention, verifies the result and reports success or stops safely. Unexpected conditions can require a new decision; routine execution must not depend on an installation administrator supplying missing application machinery.

An installation administrator is the human responsible for operating a customer installation across its clusters and applications. They may install and maintain it by copying and executing the documented commands with the configuration held in its versioned customer repository and checking the documented results. This is a supported operating model, not a failure to meet the application contract. Automating that work with an installation controller is the long-term goal, outside the current implementation scope. Such a controller could be implemented as a Kubernetes operator; neither that implementation nor Kubernetes is required by this general contract. Automatic incident detection and autonomous failover decisions remain separate choices.

Application recovery depends on an explicit target-environment contract rather than a particular provider. Provider-specific provisioning establishes that contract; it does not redefine application recovery. Any environment satisfying the contract can be a target, provided access, capacity and required dependencies are actually usable. The complete recovery path, including its execution and inputs, must remain available without help from the provider whose loss or withdrawal it is intended to withstand.

The application startup pattern is one technical expression of this philosophy. It distinguishes existing from absent local state, restores the latest available backup only when state is absent, and uses native startup for initialization and supported migration. Errors stop execution rather than imply absence. The executable reference is [bartl-wordpress](https://codeberg.org/bartlapp/bartl-wordpress). It demonstrates this mechanism for one WordPress, MySQL, and Docker Compose configuration, not automatic provisioning or complete service recovery across providers.

## Application contract and qualification

This section is the canonical application contract. The website specification presents it; Kubernetes designs and application packages implement it without redefining the decision. Bartl's broader purpose remains in the [philosophy](docs/philosophy.md).

### How the application starts

<!-- startup-explanation:en -->
You install or start the application. It works out what needs doing:

- If its data is already there, it uses it.
- Otherwise, it restores the latest backup.
- If no backup store is configured, or there is no backup yet, it starts with the application's initial data.
- If the software is newer than the data, it performs the necessary update.

You do not have to choose or manually perform those internal steps.

For routine upgrades, we can install the newer version as a replacement rather than change the running installation. The replacement restores the backup and updates the data through that same procedure. Each such upgrade therefore also exercises recovery.

This is an operating choice, not a different application mechanism: we select the version and where it should run; the application determines the steps.

Choosing a replacement changes the destination and requires switching service to it, but does not introduce another initialization/recovery interface.
<!-- /startup-explanation:en -->

### Wie die Anwendung startet

<!-- startup-explanation:de -->
Du installierst oder startest die Anwendung. Sie stellt selbst fest, was zu tun ist:

- Sind ihre Daten bereits vorhanden, verwendet sie diese.
- Andernfalls stellt sie die neueste Sicherung wieder her.
- Ist kein Backup-Speicher konfiguriert oder gibt es noch keine Sicherung, startet sie mit den Ausgangsdaten der Anwendung.
- Ist die Software neuer als die Daten, führt sie die notwendige Aktualisierung durch.

Du mußt diese internen Schritte weder auswählen noch von Hand ausführen.

Für regelmäßige Updates können wir die neuere Version als Ersatzinstallation aufbauen, statt die laufende Installation zu verändern. Der Ersatz stellt die Sicherung wieder her und aktualisiert die Daten mit demselben Verfahren. Jedes solche Update übt damit auch die Wiederherstellung.

Das ist eine Betriebsentscheidung, kein anderer Anwendungsmechanismus. Wir wählen die Version und den Ort, an dem sie laufen soll; die Anwendung bestimmt die Schritte.

Die Ersatzinstallation ändert das Ziel und erfordert die Umschaltung des Dienstes darauf, aber keine weitere Schnittstelle für Initialisierung oder Wiederherstellung.
<!-- /startup-explanation:de -->

### Startup decision

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

- `observe_local_state()` distinguishes existing owned state from confirmed absence. Failed observation stops execution; it never authorizes initialization. This is not full-schema certification.
- `observe_backup()` returns the latest complete verified backup for this customer/application, or absence when no store is configured or the configured store contains no backup for it. Lookup or integrity errors stop execution. Existing local state does not require backup access.
- `restore()` reconstructs the backup through the supported native procedure; incomplete reconstruction must not become the usable target. `native_start()` uses the product's normal startup, including native initialization when state remains absent and supported migration when needed. Unsupported transitions and downgrades must not destructively change state; rely on native behavior and add only a demonstrated missing safeguard.
- `await_native_success()` checks the native initialization or migration result and normal readiness. The application may run internally while ordinary access is withheld. `serving()` opens ordinary access after success; it is not a second command for the installation administrator.
- A failed state-changing attempt stops visibly and remains stopped across ordinary restarts. Discarding the failed target and retrying the ordinary installation procedure is an acceptable recovery path. Automatic repair, replay or reconstruction of ambiguous progress is not required.

Installing the customer's application invokes this procedure. The installation administrator supplies the selected release and installation configuration, not an initialization permission, a recovery mode or a second command to release successful reconstruction. The package also supplies native capture and publication into the configured backup store so another installation can use that history.

### Application responsibilities

Each application implements the decision within its owned state and supported configuration. No shared runtime, application controller, sidecar or Kubernetes dependency is prescribed.

| Obligation | Required application contribution |
| --- | --- |
| State boundary | Inventory all owned mutable data and metadata and their consistency relationships. Identify shared or externally owned services separately; consuming them does not authorize resetting them. |
| Observation | Distinguish existing owned state from confirmed absence. Dependency or observation failures stop execution rather than imply absence; no independent full-schema validity engine is required. |
| State-driven lifecycle | Implement the startup decision above through normal native startup, including supported initialization and migration. |
| Capture and reconstruction | Produce a complete consistent recovery point and reconstruct an authorized point without the original installation. Declare compatible software, keys, target requirements and all recovery dependencies. |
| Safe execution | Exclude conflicting state changes and withhold ordinary access until native transition success. Failed transitions remain visibly stopped; discarding the failed target and ordinary retry is sufficient. If components exchange completion signals, they must identify the current installation and operation. |
| Result verification | Use native transition results and normal readiness. Package qualification demonstrates agreed usable behavior; neither a privileged acceptance ceremony on every restart nor continuous schema policing is required. |

Automate the procedures a competent administrator would perform using the product's native tools. Every custom mechanism must name the administrator action it automates or the demonstrated native gap it closes. Collaborating components may use an entrypoint or an explicit protocol; keep transition ownership and completion unambiguous. A stateless application declares an empty owned persistence inventory rather than inventing backup work.

The contract applies to a logical application instance, not to an independent installation per process or replica. Additional replicas join that instance through the product's supported state-sharing or replication mechanisms; they do not independently initialize or restore shared application state. Explicitly assigned components own transitions and exclude conflicting execution. An ordinary process or Kubernetes restart remains ordinary native startup, not a complete recovery workflow.

Preserve native application and platform capabilities for scaling, restart and supported updates rather than imposing a uniform topology. Document product limitations and justify restrictions introduced by the operating package. Supported profiles still require qualification; this principle does not promise arbitrary replica counts, high availability or uninterrupted upgrades.

### Supported configuration and catalogue evidence

Each application records its supported releases and transitions, persistence choices, target requirements and operating limits in its own maintained documentation. Start with one justified configuration, not a speculative matrix. Catalogue inclusion requires executable evidence for that configuration, with exact artifacts, outcomes and limitations:

| Case | Required evidence |
| --- | --- |
| First initialization | Empty owned state produces a usable vanilla installation both without a configured backup store and with a configured store containing no backup. |
| Normal restart | Existing state and identity survive ordinary native startup without backup access, reinitialization or unnecessary restore. |
| Source-independent restore | Installing on an empty target restores the latest backup for the customer/application and reaches normal startup without a second technical release command. |
| Supported release transition | Native startup performs supported migration; unsupported transitions and downgrades are rejected without destructive fallback, using native behavior or a justified minimal safeguard. |
| Failed transition and retry | Failure remains visible and stopped across restarts. Discarding the failed target and an ordinary retry can succeed; no automatic resumption of ambiguous progress is required. Conflicting transitions are excluded and stale completion signals cannot release access. |
| Observation and operation failures | Failed local observation, a failed configured-store lookup, damaged backups and failed native operations stop visibly without falling through to initialization. |
| Foreign state boundary | Failure of the application does not reset a shared database, another application or an external service. |
| Application acceptance | The maintained procedure checks the agreed usable behavior after each supported transition; a successful container or job is insufficient. |

These are common evidence requirements, not a mandate for a universal test runner. Reuse implementations only where applications actually share a responsibility. An isolated passing case does not establish the full contract. The service recovery contract below additionally covers target provisioning, access and authorized activation; catalogue evidence must state which of those conditions it has exercised.

## Provider-independent recovery execution contract

This is the design contract for the long-term goal of automated service recovery, beyond the current application-package scope. It does not require the current human-operated customer installation to automate the complete sequence, nor claim that the startup specification or WordPress reference implements it. Its end-to-end obligations apply when claiming this automated recovery capability; the application contract above applies to each bartlized application now.

> Recover this installation from the authorized recovery point into the authorized target environment, verify the required service and establish exclusive production authority without manual technical intervention.

### Inputs and authorization

The operation identifies the installation, exact releases and effective configuration, a complete and verified recovery point or an authorized selection policy, protected access to required credentials and keys, and the target profile. It also records the permitted interruption, data loss and treatment of the old installation's write authority. A changed target or risk outside that authorization requires a new decision, not an improvised technical workaround. Decision time remains part of end-to-end interruption.

### Portable recovery artifact and storage boundary

A bartlized application produces a complete, consistent, verifiable recovery point. Its components form one explicitly identified complete set, with every dependency declared and independently available. Neither an object store nor a full-state blob is prescribed. A required backup/restore client may be part of the application contract. No universal archive format is prescribed.

Under the application contract above, the application or its maintained operating package owns consistent capture, reconstruction, migration and application-level verification. It may use the chosen backup system's capabilities for these tasks. That system is responsible for storing, protecting, retaining and making the captured data available, not for application consistency.

Required backup-system capabilities:

- Durable, integrity-verifiable storage.
- Multiple unambiguously selectable recovery points.
- Reliable retention and controlled deletion.
- Protection against deletion and overwrite even when production is compromised.
- Independence from production's failure and administrative domain.
- Encryption and independently available keys.
- Restore without the source installation; complete handover to a successor service provider.
- Automatable interfaces; detectable incomplete backups and failures.

Desired backup-system capabilities:

- Transfer and additionally store only changes; deduplication and, where useful, compression.
- Fast restore without manually assembling backup chains.
- Low operating effort and predictable total cost.
- Ability to change storage providers without losing the required backup history.

The recovery artifact includes the required mutable state, an inventory, state-format and release-compatibility information, and integrity information. Database exports are ingredients of this artifact, not independently selected recovery points that an installation administrator must match later. Prefer supported native application procedures; supplement only their demonstrated gaps.

Only complete, verified publication makes a recovery point eligible. Interrupted uploads or missing members must not be mistaken for a usable backup. The application reconstructs from the artifact without the original installation or provider. Its compatible immutable release remains separately identified and independently available; target-specific configuration is supplied separately. Required application identity is preserved, while decryption keys must remain independently usable and must not be available only inside the encrypted artifact.

Storage durably publishes, protects and retrieves the artifact; it need not understand the application's database, files or migration logic. An external path or object store can satisfy this boundary when it is independent of the source provider's relevant failure and administrative domain and meets access, encryption, retention, deletion and regulatory requirements. Protect against unauthorized deletion as well as overwrite, including by compromised production credentials. Versioning alone is insufficient if those credentials can erase all versions. A storage label or retention feature does not by itself establish regulatory compliance.

The [WordPress example](https://codeberg.org/bartlapp/bartl-wordpress#export-backup) uses an archive and checksum sidecar. That historical format is not a universal requirement or evidence that every publication and consistency obligation above is implemented. No application-aware backup server or workflow platform follows from this contract. Any additional machinery must justify its contribution. Artifact integrity does not replace consistency, final-state freshness, interrupted-operation handling or exclusive write authority.

### Target and provider boundary

The target profile declares the runtime and compatible versions, compute and temporary reconstruction capacity, persistent-storage semantics, network and service endpoints, and identity or other dependencies required by the application contracts. A compatible environment may be newly provisioned or already available. Access, authorization and capacity must be usable within the recovery objective; a provider name alone is not a target.

A provider adapter supplies and verifies that environment through supported machine interfaces. It returns resource identities, endpoints and protected access references. The application recovery mechanism consumes the target contract without requiring changes for each provider. Initial onboarding of a provider must establish this mapping before hands-free recovery can be promised.

### Execution and result

Recovery coordination, its bootstrap procedure, artifacts, state, credentials and decryption keys must remain usable outside the source failure or administrative domain being excluded. The executor cannot exist only inside the environment it must reconstruct. Normal customer service must not depend on the recovery coordinator being continuously available.

After authorization, the procedure checks inputs and target capabilities, establishes the environment, restores and migrates applications in dependency order, validates them, enforces the authorized transfer of write authority and activates the required access paths. Success means users can perform the agreed service with the required data and dependencies within the authorized limits. Running containers or a successful restore job alone do not establish that result. The outcome records actual recovery time, recovery point, acceptance results and active resource identities.

### Service authority and promotion

Promotion establishes one authoritative production generation for the declared service. The previous generation must no longer accept work as that service or produce unauthorized effects through its live dependencies. It may remain running or retain and modify isolated local state only if those activities cannot be mistaken for production, affect live dependencies or re-enter the authoritative state without an explicitly authorized reconciliation.

This is an enforced service boundary, not a universal requirement to power off the old machine. Each application/service integration must declare:

- User-facing write paths, including direct access and existing connections, and background actors such as workers, schedulers and mirrors.
- External effects, affected systems and credentials, and how old-generation authority is withdrawn at each relevant boundary.
- The enforcement path for a reachable source and the path that remains usable without source-provider cooperation.
- How a restarted or recovered old generation is prevented from reclaiming production authority.
- How interrupted promotion, including a lost acknowledgement after activation, establishes the authoritative generation before further action.

The application supplies knowledge of its writers, effects and supported controls. Infrastructure and dependency integrations supply the enforcement the application cannot provide alone. The complete service contract owns the result. A DNS change, workflow lock, authority record or expired lease is not sufficient by itself; demonstrate how the relevant access paths and resources enforce the decision under the declared failure assumptions.

For a planned replacement, stopping and draining the reachable source and preventing its restart may provide that enforcement. For provider-loss recovery, the enforcement path must be prepared independently of the source. If that path cannot be established, stop activation and report the missing capability; safe refusal is not a successful provider-loss recovery claim.

A service whose public access paths and write permissions are controlled only inside the source environment may be reconstructable elsewhere without being safely promotable there. If the source becomes unreachable but remains active, independent backups and a new DNS destination do not withdraw its production authority. Such an installation has not yet established complete provider-loss recovery.

Selecting an older recovery point explicitly accepts only the permitted loss of intervening work. It does not authorize two generations to keep accepting production work. Changes retained in an abandoned copy must not silently merge back into production. If the replacement may have accepted writes or produced effects before completion was recorded, do not automatically reactivate the old generation.

Evidence must cover the declared failure model, including stale access, background effects, interrupted activation and return of the old generation. The retained result identifies the active generation and the observed enforcement at its boundaries. This contract selects no universal lease protocol, watchdog or fencing product and does not establish implementation evidence.

### Interruption and safe failure

Execution retains enough durable intent and observed progress to resume safely or stop without ambiguous ownership or destructive repetition. Missing or inconsistent inputs fail closed. An unreachable source is not proof that its production authority has been withdrawn. If the service-authority boundary above cannot be enforced without the source's cooperation, activation must stop rather than create competing production generations. No manual reconstruction of routine steps is an accepted success path; exceptions return an explicit decision and the observed state.

The complete claim must be exercised with source access withheld, including provisioning, dependencies and user access. Independently stored backups alone are insufficient. Automated incident detection and autonomous failover decisions are separate service choices, not prerequisites for automatic execution after authorization.

## Site structure

| What | Where |
| --- | --- |
| Homepage routing, English visual candidate, and DE/EN copy | `src/components/Landing.astro`, `src/components/ServiceHomepage.astro`, `src/content/landing.ts` |
| DE/EN homepage route | `src/pages/[lang]/index.astro` |
| Approach, retaining the established derivation URL | `src/pages/[lang]/derivation.astro` |
| Philosophy rendered directly, with German translation | `docs/philosophy.md`, `docs/philosophy.de.md` |
| Implementation guide route | `src/pages/[lang]/implement.astro` |
| Guide rendered directly, with German translation | `docs/how-to-bartlize.md`, `docs/how-to-bartlize.de.md` |
| Shared document typography and section navigation | `src/components/DocumentArticle.astro` |
| Contract explanation, retaining the established spec URL | `src/pages/[lang]/spec.astro`, `src/content/spec.ts` |
| Interactive startup decision on Contract, sourced from this README | `src/components/InteractivePseudoCode.astro`, `src/content/startup-code.ts` |
| Navigation and footer | `src/components/Navbar.astro`, `src/components/Footer.astro` |
| UI strings and language utilities | `src/i18n/` |
| Site metadata and repository links | `src/data/constants.ts` |
| Page shell and metadata | `src/layouts/MainLayout.astro` |
| Design tokens and global styles | `src/assets/styles/global.css` |
| Legal pages and copy | `src/pages/[lang]/`, `src/legal/` |
| Static assets | `public/` |

Both languages share navigation and the four-page structure. The English homepage is a local visual review candidate; the German homepage retains the previous treatment until approval, as recorded in [Decisions](docs/decisions.md#high-fidelity-homepage-revision-english-candidate-awaiting-review). The English candidate explains the complete-service argument through an illustrative document service, with separate Keycloak application-package evidence. Approach and Implement render the maintained Markdown documents, not independent English website copies. German Markdown files are translations of those same documents. The Contract page explains the normative application contract above; it does not redefine it. WordPress remains historical supporting material on the technical path.

## Develop

Built with [Astro](https://astro.build). The Node version is pinned in `.nvmrc`.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static build into dist/
npm run preview  # serve the build locally
```

The site is fully static. Development happens on Codeberg; the GitHub repository is a read-only deployment mirror.

## License

Code is licensed under Apache 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Website prose is licensed under CC BY 4.0 as stated in the site footer.
