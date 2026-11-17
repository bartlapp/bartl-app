<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# How to bartlize an application

Turn the supported procedures a competent administrator would perform into a maintained operating package. Preserve the application's native work; automate the missing steps and coordination.

The [application contract](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md) defines the behavior. This guide explains how to implement it, without prescribing Kubernetes or a shared runtime.

Developers start with the procedure below. Administrators start with [installation inputs](#installation-inputs) and [operation and handover](#operate-and-hand-over-an-installation). Shared procedures live in the `bartlapp` repositories and their referenced upstream documentation. Keep actual installation values and protected inputs separate from shared source.

## Start with one supported configuration

Name the release, persistence, dependencies, target requirements and supported version transition. Establish the useful behavior that must survive reconstruction, covered failures, permitted interruption and data loss, and the dependencies and operating effort the team can accept. Choose the smallest native procedure meeting those limits, counting implementation, operation and maintenance. Start with a configuration someone needs, not a speculative compatibility matrix.

Separate owned mutable state, derived or disposable state, immutable software and target configuration. Identify external keys and dependencies needed for recovery.

## Establish the native procedure

For startup, capture, restore and the selected upgrade, identify the native commands and prerequisites, which processes must run, drain or stop, the state they may change, and their success signals. Establish what failure leaves behind and how an administrator can retry safely.

Use upstream documentation and source, then exercise uncertain behavior. Reuse exact-version evidence where it answers the question. A successful container start does not establish a usable application procedure. Native initialization or migration may need to run internally before ordinary access is permitted; observe enough to choose and complete that procedure, not to certify the entire schema.

## Add only the missing coordination

For each custom mechanism, answer:

> Which concrete administrator action does it automate, or which demonstrated gap in the native procedure does it close?

Put the answer beside the mechanism in the application's design. If neither has an answer, omit it. A failure within the declared supported failure model is a valid design input even if it has not occurred yet. Speculation outside that model is not. Challenge an expansive acceptance criterion rather than build a subsystem to satisfy it.

Assign each state-changing step one owner. Use native transactions, exclusion, supervision and readiness; add only what connects them into the procedure. Identify observations required to begin work and guarantees needed to continue it. Explain the chosen failure and stop behavior rather than copying another package's guard.

Apply the contract's [failure, retry and publication boundaries](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md#application-responsibilities) to the actual procedure. Keep authoritative state recoverable and diagnostics available. Neither an automatic repair engine nor a supervisor with authority to stop a healthy application follows from the need to coordinate native work.

Review the first complete path before extending it. Existing code and passing tests establish neither a mechanism's necessity nor permission to add dependencies, privileges, operator steps or failure policy.

## Deliver a usable package

Keep the operator recipe separate from implementation reasoning. It states the supported configuration, choices, commands and expected results. Release, installation identity, effective configuration and protected input references must suffice to invoke the application work through its ordinary interface. A successor needs independently available software, configuration, backup history and keys, not the author's private machinery.

Define stop and removal alongside installation. If removal retains state for reuse, exercise authorized reinstall without admitting a competing predecessor. Retained data alone does not establish that procedure. Keep the coordination needed to finish removal available until its work is done.

For replacement, translate the [service-authority requirements](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md#service-authority-and-promotion) into concrete source retirement, final-write handling and activation steps. Preparing a candidate and promoting it are different operations.

## Qualify the delivered path

Exercise the actual package and administrator interface against the [contract's evidence cases](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md#supported-configuration-and-catalogue-evidence), not another implementation checklist. Check the limits on our intervention too: restart must not acquire recovery dependencies, failed work must not silently initialize or replay, and completion must not override stop. Qualification accounts and functional probes do not automatically become startup dependencies.

Qualify the same immutable artifacts operators obtain. Source-tested code does not qualify a published package. Keep repeatable checks in source, raw output outside Git, and exact artifact identities, observed results and consequential limits in the release/integration description. Do not create per-session evidence files or qualification reports. Keep historical limits attached to their exact releases, outside current instructions.

Test the claimed failure boundary: another namespace does not establish survival of host or provider loss. Renew affected evidence when the package changes.

## Kubernetes operating packages

The current Keycloak, Paperless, Forgejo and Restic packages use Kubernetes and Helm. This is their selected implementation, not a requirement for every Bartl application. Start from a package's supported profile and native procedures, not by copying its controller wholesale. [Keycloak's design](https://github.com/bartlapp/bartl-keycloak/blob/main/DESIGN.md) explains one implementation; the other packages document their different state and capture boundaries.

Helm selects the immutable package, effective configuration and run/stop intent. One namespace-scoped application controller owns lifecycle decisions for one logical application, including its owned database and supporting components. It reconciles workloads, finite native Jobs and access. Native tools retain initialization, migration, capture and restore semantics. Entrypoints, Jobs and Helm hooks must not make competing lifecycle decisions. Keep intent, observed generation and completed operation distinct; a successful Helm command is not application acceptance.

Use a separate cluster for each independently handed-over customer installation in this operating model. Applications within it retain independent releases, state and lifecycles. Additional clusters, HA, replicated storage and database failover follow the agreed failure model, not a fixed node count. [base-k3s](https://github.com/bartlapp/base-k3s) supplies a single-node Hetzner recipe, not a general HA or provider-loss guarantee. Runtime, storage semantics, networking, TLS, credentials and resource capacity must satisfy each selected package.

The [Restic package](https://github.com/bartlapp/bartl-restic) owns backup storage, protection, replication and endpoint recovery; each application owns consistent capture and reconstruction. Give each application its own repository, encryption key and scoped reader/writer credentials. Keep destructive maintenance authority separate. Native reader locks require narrowly permitted lock writes, not backup-content mutation. For primary-provider loss, independently usable secondary history, keys and access must already exist. Primary publication alone does not establish that protection.

The installation administrator coordinates applications, infrastructure, endpoints and source retirement through their documented interfaces. No company or installation controller is required. A future controller may automate that sequence; it must not become necessary for ordinary application operation or successor handover. Required application controllers, native procedures, backup interfaces and scheduling remain with the installation.

## Installation inputs

Operating and recovering an installation requires its effective configuration, selected releases and protected inputs. Their storage is an operational choice, not a requirement to create another repository.

Keep these installation-specific inputs and results available:

| Record | Required installation content |
| --- | --- |
| Composition and identity | Stable installation/application identities, selected services and dependencies, cluster/context/namespace/Helm-release mapping, endpoints and responsible operators. Placement and package version are not application identity. |
| Releases and configuration | Exact chart/image references, supported transitions, complete effective Helm values and resource/storage requirements. Retain independently obtainable artifacts; a source commit or mutable tag is insufficient. |
| Protected inputs | Customer-controlled credentials, identity secrets, keys, certificates and recovery access, with a documented retrieval procedure. Recovery must not require the lost cluster, its Keycloak or the author. Keep plaintext secrets and live kubeconfigs out of shared source and evidence. |
| Operating decisions | Permitted interruption and data loss, source-retirement method, backup/replication schedules, retention policy, capacity and alerting responsibilities, useful acceptance checks and required handling of restored identities or records. |
| Procedure and results | Dependency order, links to package commands, installation-specific deviations, active target/resource identities, selected recovery points, acceptance results and unresolved failures. Keep desired values separate from observed outcomes. |

The [reference walkthrough](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md) uses a working directory for configuration, protected access files and small operational records. The required inputs must remain accessible during the covered failure and transferable to a successor. Shared package documentation describes reusable procedures, not a particular installation's values or risk decisions.

### Helm configuration and connections

The Kubernetes packages use Helm as their service-configuration interface. Each chart accepts shared installation context, its own entry under `services.<instance>` and its documented connection inputs under `resolved`. Independent releases can consume the same values file; they do not require an umbrella chart or generated per-service values files. The filename, storage location and preparation tooling are the operator's choice.

The package distinguishes required operator inputs, optional overrides and advanced settings normally left at their supported defaults. A value required by the application is not necessarily a required operator input. Derive it when the package has enough information. Shared context is supplied once; conditional inputs are required only for the selected configuration. Supported advanced settings remain accessible through the same Helm interface, not a second onboarding configuration language.

For example, these choices connect Paperless to Keycloak and override Keycloak's conventional hostname:

```yaml
installation: acme
dns:
  root: acme.example
services:
  keycloak:
    hostname: login2.acme.example
  paperless:
    identityProvider: keycloak
```

This excerpt shows service choices; package selection, target access and connection inputs complete the installation configuration. Selecting a consumer does not implicitly select its provider.

#### Defaults and validation

Keep defaults in the chart and context-dependent derivation in its Helm helpers. Explicit values take precedence; omission restores inheritance, derivation or defaults. Preserve explicit `false`. Override individual map entries without replacing their siblings; replace lists as a whole. Validate explicit values against the supported configuration. JSON Schema describes types, constraints and conditional requirements; it does not execute derivation.

Each package validates the shared inputs it consumes and its own service and connection fields. It permits unrelated service and infrastructure sections in the same file without interpreting them. Reject unknown fields within the package-owned interface and report unresolved required inputs with their owner and reason. Installation preparation validates cross-service references, incompatible connections, ambiguity and dependency cycles.

Do not copy expanded defaults into operator choices. Removing a hostname override must restore the package's naming rule, including after the root domain changes. Stable application identity remains distinct from chart version, Helm release name and placement.

#### Information exchanged between services

Expose an offline Helm rendering procedure for nonsecret connection declarations alongside ordinary deployment rendering. Both use the same package-owned helpers. Declarations identify the provided or required interface, effective endpoints, consumer settings, credential requirements and runtime Secret bindings. Rendering declarations neither contacts infrastructure nor creates credentials; it must work before the connected services are running.

For identity, the provider declares its issuer and the consumer its client and callback requirements. The consumer does not reproduce the provider's URL rules. For backup, the endpoint declares its repository interface and each consumer its requirements. Preparation connects the selected parties and supplies matching repository and credential references to both sides. Each application retains its own repository, encryption key and scoped reader/writer access; endpoint administration authority is not passed to consumers.

The chart documents the connection fields it consumes under `resolved` so an operator can supply them manually or through other tooling. Derived connection values must be refreshed when their source choices change, not treated as overrides. Actual operational results remain distinct from these calculations. Credential requirements distinguish generated, externally issued and recovered material; configuration rendering must not regenerate retained credentials or claim that an identity client or backup repository already exists.

For [standalone operation](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md#standalone-operation), the user supplies the documented service inputs, including any compatible external backup endpoint and protected access. The chart and its package procedure MUST perform the package-owned mapping and derivation. The user MUST NOT have to invent intermediate connection data, reproduce package calculations or assemble cross-service `resolved` data merely to operate one package. Installation-wide preparation is a convenience for composing services, not a prerequisite for this path.

Package documentation includes the declaration command, field meanings, required native setup and the ordinary Helm command. Connection declarations travel with the selected chart release, not a separate onboarding-profile checkout. Bartl owns this package interface; an operator may maintain their own preparation workflow. Ordinary operation and configuration changes must not depend on private orchestration code or undocumented knowledge.

## Operate and hand over an installation

Select the package releases and create complete installation values first. Establish the base, independently usable access and backup service, then identity and dependent applications in their documented order. Follow each package's installation and current-generation status checks, then verify the agreed useful behavior through the real access path. The [manual Restic/Keycloak/Forgejo walkthrough](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md) provides a complete worked sequence using operator-supplied infrastructure, DNS and credentials.

During operation, check scheduled and manual backup outcomes, capture age, independent replication where required, storage/staging capacity, certificate validity and application health. Assign alert delivery and response to an operator through a path that survives the covered failure. Configure retention and maintenance through the backup service's supported procedures with separate authority. Do not assume that installing a chart provides monitoring or qualified automatic retention; keep history until a safe supported retention procedure and sufficient capacity are established.

For upgrades and recovery, retain the chosen release and effective values, use the supported native transition and independently available recovery inputs, and check the resulting application before promotion. Account for final writes and every old access/write path; DNS changes alone are not retirement. Verify new work and a subsequent usable backup after recovery. Do not turn a failed or ambiguous transition into success by deleting markers, changing status or rolling software back against migrated state.

For stop, removal and retained-state reinstall, follow the selected package's procedure and wait for its current operation to finish or fail visibly. Keep finalization machinery alive until it has drained owned work. Retain or destroy data only under the customer's explicit decision, then remove only identified infrastructure and DNS resources. Application removal and infrastructure teardown are separate operations.

A successor receives administrative control, effective installation configuration, usable release artifacts and licenses, backup history, protected inputs and the operating/acceptance procedures. Confirm that backups and necessary scheduling continue without our services; arrange replacement monitoring, stop old automation and revoke outgoing access. The successor may supply their own tools, but must not invent missing application procedures.

## Worked example: Keycloak

The 0.5.0 operating package pairs Keycloak 26.6.2 with PostgreSQL 17.6 and supports the forward transition from Keycloak 26.6.1. Its reconstruction path illustrates the method:

| Native procedure | Missing coordination supplied by the package |
| --- | --- |
| PostgreSQL starts and exposes the owned database. | Determine whether application state exists. Existing state goes to native Keycloak startup; only absence selects backup lookup. |
| PostgreSQL reconstructs a native dump transactionally. | Select and verify the latest matching backup, keep conflicting writers stopped and bind exclusion to the restore transaction. One finite Job performs the work. |
| `kc.sh start` initializes or performs native migration. | Start after required reconstruction succeeds; withhold ordinary access until native readiness, without independent schema certification. |
| Native realm administration revokes restored sessions. | Perform this after recovery, not ordinary restart, before admitting traffic. |

Failed or uncertain mutation leaves the target unavailable with diagnostics. Preserved recovery inputs permit reconstruction on another empty target instead of automatic repair. The controller connects native procedures; its Kubernetes layout and recovery-only session policy are package choices, not additional Bartl requirements.
