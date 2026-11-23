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

ACME is the repeatable reference litmus test. Execute the documented defaults without editing variables, using the supplied infrastructure and DNS credentials, verify useful behavior through the real service address, then remove the run's disposable resources. Ask the operator only for missing credentials; supplying access is a prerequisite, not a credential-procurement exercise repeated on every run. Keep reusable operator identities and bootstrap credentials intact. The authorized spending limit and lifetime still apply. A base-plus-Keycloak run establishes that path only, not backup, recovery or qualification of other packages.

## Kubernetes operating packages

The current Keycloak, Paperless, Forgejo and Restic packages use Kubernetes and Helm. This is their selected implementation, not a requirement for every Bartl application. Start from a package's supported profile and native procedures, not by copying its controller wholesale. [Keycloak's design](https://github.com/bartlapp/bartl-keycloak/blob/main/DESIGN.md) explains one implementation; the other packages document their different state and capture boundaries.

Helm selects the immutable package, effective configuration and run/stop intent. One namespace-scoped application controller owns lifecycle decisions for one logical application, including its owned database and supporting components. It reconciles workloads, finite native Jobs and access. Native tools retain initialization, migration, capture and restore semantics. Entrypoints, Jobs and Helm hooks must not make competing lifecycle decisions. Keep intent, observed generation and completed operation distinct; a successful Helm command is not application acceptance.

Use a separate cluster for each independently handed-over customer installation in this operating model. Applications within it retain independent releases, state and lifecycles. Additional clusters, HA, replicated storage and database failover follow the agreed failure model, not a fixed node count. [base-k3s](https://github.com/bartlapp/base-k3s) supplies a single-node Hetzner recipe, not a general HA or provider-loss guarantee. Runtime, storage semantics, networking, TLS, credentials and resource capacity must satisfy each selected package.

The [Restic package](https://github.com/bartlapp/bartl-restic) owns backup storage, protection, replication and endpoint recovery; each application owns consistent capture and reconstruction. Give each application its own repository, encryption key and scoped reader/writer credentials. Keep destructive maintenance authority separate. Native reader locks require narrowly permitted lock writes, not backup-content mutation. For primary-provider loss, independently usable secondary history, keys and access must already exist. Primary publication alone does not establish that protection.

The installation administrator coordinates applications, infrastructure, endpoints and source retirement through their documented interfaces. No company or installation controller is required. A future controller may automate that sequence; it must not become necessary for ordinary application operation or successor handover. Required application controllers, native procedures, backup interfaces and scheduling remain with the installation.

## Installation inputs

Each customer installation has exactly one authoritative `installation.yaml`. It holds installation and application identities, effective configuration, selected releases, resource relationships, protected-input references and the resource identities needed for operation. An installation may contain standalone VMs, self-managed or provider-managed Kubernetes clusters and networks; it is not a mandatory installation-to-cluster-to-VM hierarchy. Operators must not reconcile directory names, shell variables and separate inventories to determine what belongs to an installation. A Git repository and a particular secret-store implementation are not prerequisites for standalone package operation.

Normally, one installation covers one customer's environment and operational credentials; its ID defaults to the customer ID. Separate installations where administrative access must be kept separate, not merely because another cluster, application or upgrade slot is needed. Each installation's protected store and access grants follow that boundary. Separate stores do not isolate installations if their provider credentials grant access across the intended boundary.

The installation repository is the operational customer instance, not an execution log or qualification report. Keep the following inputs and bindings available:

| Record | Required installation content |
| --- | --- |
| Composition and identity | Stable installation/application identities, selected services and dependencies, cluster/context/namespace/Helm-release mapping, endpoints and responsible operators. Placement and package version are not application identity. |
| Releases and configuration | Exact chart/image references, supported transitions, complete effective Helm values and resource/storage requirements. Retain independently obtainable artifacts; a source commit or mutable tag is insufficient. |
| Protected inputs | Customer-controlled credentials, identity secrets, keys, certificates and recovery access, with a documented retrieval procedure. Recovery must not require the lost cluster, its Keycloak or the author. Keep plaintext secrets and live kubeconfigs out of shared source and evidence. |
| Operating decisions | Permitted interruption and data loss, source-retirement method, backup/replication schedules, retention policy, capacity and alerting responsibilities, useful acceptance checks and required handling of restored identities or records. |
| Operating procedures and state | Links to the applicable package procedures, active resource identities, selected recovery points and state needed to resume interrupted operations. Keep desired configuration separate from actual resource bindings. |

Verification remains part of execution; it does not require commissioning checklists, success narratives or debugging histories in the customer repository. Resolve a failed step in its responsible procedure or package and repeat the run. Preserve partial resource identities until reconciliation or disposal is complete. Reusable defects and product qualification belong with the package and release. A customer README supplies only necessary installation-specific information not already expressed by the configuration or linked procedures.

### One installation record

Keep stable application settings under `services.<instance>`. Placement and package version do not define application identity: moving an application to another cluster must not create a new identity or rename its retained secrets. Each `deployments.<deployment>` entry selects an `instance`, `cluster`, actual Kubernetes `namespace`, Helm `release` and `package` reference. The selected `packages` entry identifies the release artifacts. Multiple deployment targets may refer to one logical instance during replacement; this does not authorize concurrent production writers.

The operator selects a deployment; the procedure reads its application identity, target and package from the record. Existing recorded choices are authoritative; defaults initialize missing choices, not overwrite them. Store target-specific lifecycle intent under `operations.deployments.<deployment>` when a replacement needs different source and target settings. Commands derive any necessary Helm overrides from that intent rather than maintaining another values file.

After recording newly selected settings, a procedure can keep using those shell values in the same session; resumption loads the retained settings rather than choosing them again.

Provisioning extracts only required resource identities and addresses from provider responses and records each resource immediately in `installation.yaml`, preserving unrelated entries. Operations use those retained identifiers and check current provider state and ownership before destructive changes. If creation succeeds but recording fails, stop and reconcile the created resource before retrying. Recorded state identifies resources; it does not prove their current existence or authorize deletion.

Secret values remain in the selected protected store. Retain independently selected references beside their consumers where the schema provides them, or derive conventional entry paths unambiguously from the installation and deployment identities. Keep only protected content in the store, not ordinary infrastructure inventory. Independently preserve required credentials and keys before relying on them. A successor must be able to retrieve and use them without the original workstation or cluster.

### Versioned resource contract

The authoritative shared structure is [installation.schema.json](https://github.com/bartlapp/bartl-app/blob/main/schemas/installation.schema.json), a JSON Schema Draft 7 document. `schemaVersion: 1` identifies this resource model, independently of package versions. `customer` (`CUSTOMER_ID`, for example `acme`) identifies the customer in the operator's inventory; `installation` (`INSTALLATION_ID`) identifies the operational and administrative-access unit within that customer. Keep customer IDs distinct in that inventory and installation IDs distinct within each customer. The new-installation recipe defaults `INSTALLATION_ID` to `CUSTOMER_ID`; the schema does not populate it. Select a schema from the same retained source revision as the installation's procedures rather than validating against a moving branch.

An installation groups resources operated and handed over together; it does not prescribe a containment hierarchy. Standalone VMs need no Kubernetes cluster, provider-managed Kubernetes need not expose independently managed VMs, and networks can serve multiple resources. Therefore, the record expresses these relationships through references rather than nesting resources under an assumed owner.

Version 1 separates VMs from clusters. Each VM selects a named provider configuration and records its machine settings under `configuration`. A self-managed cluster references VM IDs under `nodes`; a provider-managed cluster selects its provider directly. Provider configurations identify both the API type and administrative scope with a protected access reference. A token or profile must actually grant access to that scope; declaring a project or account in YAML is not verification.

A desired-only Base record, before any provider resources have been created:

```yaml
schemaVersion: 1
customer: acme
installation: production
dns:
  root: acme.fke.systems
providers:
  primary:
    type: hetzner
    scope:
      project: acme-production
    credentials:
      environment: HCLOUD_TOKEN
vms:
  vm-1:
    provider: primary
    ownership: managed
    configuration:
      name: production-cluster-1
      location: hel1
      serverType: cpx32
      image: debian-13
clusters:
  cluster-1:
    management: self-managed
    ownership: managed
    configuration:
      distribution: k3s
    nodes:
      vm-1:
        role: server
    kubeconfig:
      context: acme-production-cluster-1
```

The project scope above is a retained administrative designation, not an API selector. `HCLOUD_TOKEN` names the environment variable containing the credential, not its value. No provider type is repeated on a VM or network; its provider reference selects the appropriate configuration profile. Context and provider-visible resource names are retained operational identifiers.

Use stable installation-local map keys such as `clusters.cluster-1` (`CLUSTER_ID=cluster-1`) and `vms.vm-1` (`VM_ID=vm-1`), not positional numbering that changes after deletion. Keys are unique within their respective installation maps; another installation may reuse them. Cluster membership references VM keys explicitly, not provider names or IDs.

For a new Base cluster, the operator recipe derives the desired provider-visible VM `configuration.name` (`VM_NAME`) as `<installation>-<cluster>` and the kubectl `kubeconfig.context` (`KUBE_CONTEXT`) as `<customer>-<installation>-<cluster>`. With the default customer and installation `acme` and cluster `cluster-1`, these are `acme-cluster-1` and `acme-acme-cluster-1`. The YAML example above instead selects installation `production`. Check provider-name collisions in the selected provider scope and context-name collisions in the operator's kubeconfig inventory. These are recipe derivations, not schema defaults or uniqueness guarantees. Retain existing names and contexts unchanged on resumption.

`dns.root` (`BASE_DOMAIN`, for example `acme.fke.systems`) is the DNS base domain from which packages derive application endpoints, not an identity derived from `CUSTOMER_ID`. Select an authorized DNS namespace without colliding with other installations; it may differ from the provider's delegated zone. Shell variable names clarify operator choices without renaming any YAML field.

Networks are independent resources with their own provider and named subnets. VM attachments reference a network and subnet instead of copying their configuration. A managed cluster can select its provider networks directly. Network membership does not establish firewall policy, Kubernetes NetworkPolicy enforcement or cross-provider reachability. Provider networks and Kubernetes pod/service networks have separate address spaces and operating requirements.

Keep desired settings under each resource's `configuration` and provider results under that resource's `observed`. Provider-issued identifiers such as `vms.vm-1.observed.server.id`, Primary IP IDs and typed firewall IDs identify actual resources within their provider binding and resource type; they are not `VM_ID`, `CLUSTER_ID` or `VM_NAME` and must be recorded from provider results, not derived from names. VM observations and IP allocations belong to the VM, not its cluster. Cluster access belongs to the cluster; Kubernetes supplies the observed `kubeSystemUid`, not the context-naming recipe. Partial observations are valid: a recorded firewall without a server is a legitimate interrupted provisioning state. Structural validity does not mean provisioning has completed.

Every resource declares `ownership` as `managed` or `external`. Managed resources are administered as part of this installation; external resources are referenced, not adopted. Neither designation is permission to destroy data. A cluster-to-VM or VM-to-network reference grants no deletion authority over its target. Before removing a managed resource, establish authorization, live identity and ownership, remaining consumers and data disposition. Removing a cluster does not implicitly delete a shared network or external VM. Retain observations until absence is verified; an unreachable API is not evidence of deletion.

Common fields are closed against unknown keys. Package-owned service settings and resolved connection inputs remain package-owned; the shared schema does not duplicate their configuration definitions. Validate those inputs against the selected immutable package's interface as well. A shared-schema pass is not application qualification.

The repository's [validation command](https://github.com/bartlapp/bartl-app#validate-an-installation-record) checks structure and references without contacting providers or clusters. Provider, VM, network, subnet, deployment, package and instance references must resolve. A VM belongs to at most one self-managed cluster; attachments must remain within the selected provider binding. Subnet ranges must fit their network and not overlap each other. Deployment IDs may share an instance during replacement, but cannot claim the same cluster/namespace/Helm-release target. Operation and recovery references must address the matching deployment and instance.

Operational checks still establish accessible credentials, usable capacity, current ownership and the prerequisites of the requested operation. The validator does not check application dependency cycles or package-owned connection semantics; the selected package procedures remain responsible for those checks. Schema defaults do not populate configuration, and validation does not derive or rewrite values.

**Adoption boundary:** the coordinated Base/package recipes, reference walkthrough and customer template use version 1. Base provisions only the existing single-VM Hetzner/K3s profile; the broader schema does not add managed-Kubernetes or private-network provisioning. Use the matching retained procedure revisions together. Older unversioned records require moving VM configuration and observations, adding node references, provider scope/credential references and explicit ownership, and updating every consumer before setting `schemaVersion: 1`. Local schema and command checks do not renew live Base/Keycloak qualification; the historical evidence remains attached to its original procedures and artifacts.

### Working files and protected storage

Select the absolute installation root as `WORK_DIR`, then derive `VALUES="$WORK_DIR/installation.yaml"`. `WORK_DIR` contains the installation record and local working files, not the package source checkout. For new standalone installations, select `WORK_DIR_ROOT` (default `$HOME/bartl`) and derive `$WORK_DIR_ROOT/$CUSTOMER_ID/${INSTALLATION_ID}-installation`. Operators may choose `$HOME/repos` or another storage root; no Git repository is required. For existing installations or a company-workflow handoff, select the actual `WORK_DIR` directly rather than reconstructing its location. Local storage paths are not installation configuration. Every package procedure uses the derived `VALUES` path, including operation and recovery. A rendered `connections.yaml` contains derived declarations, not another configuration source. Only materialize local files where the invoked tools need them.

For the Git-backed arrangement with a sibling GPG-backed `pass` store, the layout is:

```text
acme-installation/
  installation.yaml
  README.md
  .gitignore
  .envrc                            # Installation context and shared context loaders
  packages/                         # Explicitly downloaded chart cache; ignored
  clusters/
    cluster-1/
      .envrc                        # Two-line cluster selector
      base/                         # kubeconfig and SSH working files
      applications/
        keycloak/
          .envrc                    # Deployment selector; tracked
          deployments/
            keycloak-recovery/
              .envrc                # Replacement selector; tracked
        paperless/
    cluster-2/
      .envrc
      base/
      applications/
        restic/
acme-secrets/                       # Independently retained encrypted store
  .gpg-id
  providers/
  clusters/                         # Cluster-specific protected access
  applications/                     # Stable instance-specific secrets
```

The actual namespace is recorded in the deployment mapping, not introduced as a local directory category. A deployment whose ID equals its instance uses `clusters/<cluster>/applications/<instance>/`; other deployments use its `deployments/<deployment>/` subdirectory. Source and replacement directories select their own namespace and package without changing application identity.

Base's root `.envrc` defines `load_cluster` and `load_deployment`. A cluster selector sources the root and selects its cluster key. A deployment selector sources its cluster selector and calls `load_deployment` with the recorded deployment key. The loader checks cluster membership and directory identity, then exports `DEPLOYMENT`, `INSTANCE`, `NS`, `RELEASE`, `PACKAGE`, `PACKAGE_VERSION`, `CHART_REF`, `INSTALL_DIR` and `CHART`. It reads `installation.yaml`; selectors contain only keys, not copied configuration.

At the next shell prompt, entering a deployment selects its context; returning to cluster scope clears deployment fields, and returning to installation scope clears cluster selection too. Leaving the installation restores the previous environment. Activation reads context only: it neither creates working files, downloads charts, contacts Kubernetes nor retrieves credentials. Credential restoration still writes to the selected `KUBECONFIG`.

`CHART` identifies the normalized unpacked chart cache at `packages/<package>/<version>`. Package procedures acquire it explicitly when absent and expose it only after a complete download. Reuse package entries for the same recorded chart/version; selecting a different artifact requires a new package entry. Cache files are disposable, not independently retained recovery inputs. Fresh installation and replacement select a release once; routine operation uses the recorded release.

Retain root, cluster and deployment `.envrc` files, tracking them in Git-backed installations while ignoring runtime files. For an existing installation, update the shared root through [Base's procedure](https://github.com/bartlapp/base-k3s/blob/main/README.md) before using deployment selectors. Package READMEs own selector creation and entry paths; the customer workflow owns retrieval and approval on another workstation.

In this arrangement, each installation has its own sibling store named by `credentials.passStore`; `passEntry` names an entry within that store. Select the store explicitly; never fall back to the operator's personal store. Its recipients identify authorized GPG keys; private keys remain outside both repositories. Cluster and application secret paths need no additional installation prefix within this store, and application references remain independent of cluster placement. Existing store and entry references remain authoritative. Restrict local plaintext access, keep it out of Git and remove it when no longer needed. Application data and backups live on their designated volumes and backup targets, not in these working directories.

The customer workflow owns repository access, retention and handover. Package READMEs own executable procedures and accept supplied protected inputs without requiring this particular storage arrangement.

The [reference walkthrough](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md) uses a working directory for configuration, protected access files and small operational records. The required inputs must remain accessible during the covered failure and transferable to a successor. Shared package documentation describes reusable procedures, not a particular installation's values or risk decisions.

### Helm configuration and connections

The Kubernetes packages use Helm as their service-configuration interface. Each chart accepts shared installation context, its own entry under `services.<instance>` and its documented connection inputs under `resolved`. Independent releases consume the same absolute `VALUES` path to `installation.yaml`; they do not require an umbrella chart, generated per-service values files or recovery configuration copies.

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
