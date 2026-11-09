<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Application contract

The [philosophy](https://github.com/bartlapp/bartl-app/blob/main/docs/philosophy.md) explains why Bartl connects applications, infrastructure and operating responsibility. This contract defines their required contributions. [How to bartlize](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.md) explains the implementation method. The website renders this document; application packages own their supported configuration, procedures and evidence.

People authorize the outcome and accepted risks. The application executes its internal procedures without manual technical intervention. An installation administrator may operate the complete customer installation by executing documented commands with its versioned configuration and checking the results. They must not have to invent missing application machinery. Installation-wide automation is a separate, longer-term goal.

## Application contract and qualification

The contract applies to a logical application instance, not independently to each process or replica. It prescribes no Kubernetes dependency, shared runtime, controller or sidecar. Preserve native scaling, restart and update capabilities; declare product limitations and justify package restrictions within the supported profile.

### How the application starts

You install or start the application. It works out what needs doing:

- If its data is already there, it uses it.
- Otherwise, it restores the latest backup.
- If no backup store is configured, or there is no backup yet, it starts with the application's initial data.
- If the software is newer than the data, it performs the necessary supported update.

You do not have to choose or manually perform those internal steps. You supply the release and installation configuration, not an initialization permission, recovery mode or second command to release successful reconstruction.

For a replacement upgrade, the newer installation restores the backup and updates the data through this same procedure. The upgrade therefore also exercises recovery. Choosing its version and destination remains an operating decision; switching the service follows the activation requirements below.

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

`observe_local_state()` distinguishes existing owned state from confirmed absence. A failed observation blocks the dependent startup or transition; it never authorizes initialization. Observation supplies the facts needed to select the procedure, not a full-schema certificate.

Only absent local state requires `observe_backup()`. It returns the latest complete, verified backup for this customer/application, or absence when no store is configured or a successful lookup finds no backup. Lookup and integrity errors stop execution. Existing state needs no backup access.

`restore()` uses the supported native procedure; incomplete reconstruction cannot become the usable target. `native_start()` performs native initialization or supported migration as needed. Unsupported transitions and downgrades must not destructively change state. Use native safeguards and supplement only demonstrated gaps.

`await_native_success()` checks the native transition result and normal readiness. The application may run internally while ordinary access is withheld; `serving()` opens access after success. An ordinary process or Kubernetes restart remains native startup, not a recovery workflow or privileged acceptance ceremony.

Failed initialization, reconstruction or migration remains visibly stopped across restarts. Replacing the failed target and retrying ordinary installation is acceptable only when independently preserved inputs recover the required state within the accepted data-loss boundary. Automatic repair, replay or reconstruction of ambiguous progress is not required.

### Application responsibilities

Inventory all owned mutable data and metadata, their consistency relationships and the external dependencies required for operation and recovery. Consuming a shared service does not authorize resetting it. A stateless application declares an empty persistence inventory rather than inventing backup work.

The application or its maintained operating package owns consistent capture, reconstruction, migration and application-level verification. Automate the native procedures a competent administrator would perform. Every custom mechanism must name the administrator action it automates or the demonstrated native gap it closes.

Assign each state-changing step one owner and exclude conflicting execution. Additional replicas join through native state-sharing or replication; they do not independently initialize or restore shared state. Components may cooperate through an entrypoint or explicit protocol, but completion signals must identify the current installation and operation. Restart, queued work and completion cannot override intentional stop or reopen access through stale results.

Admission, continued operation and withdrawal of authority are distinct decisions. Loss of observation alone does not revoke an already-running application's authority. Each package declares its continued-operation and stop behavior during unavailable observation, including availability and safety limits. An unconfirmed stop request is not proof that execution ended. Continuous schema policing is not required.

Report failure at the affected operation's boundary. If only publication of a complete consistent capture fails, report a failed backup and protect the capture for retry. Resume an otherwise healthy application when state and current running authority permit it; publication failure alone must not keep it stopped. Failed capture, uncertain state or unresolved authority does not permit resumption.

### Portable recovery artifact and storage boundary

A recovery point is one explicitly identified, complete, consistent and verifiable set. It contains the required mutable state, inventory, state-format and release-compatibility information, and integrity information. Database and file exports are ingredients, not separate points an administrator must match later. Preserve required application identity and declare every recovery dependency.

The compatible immutable release remains separately identified and independently available; target configuration is supplied separately. Decryption keys must be independently usable, not available only inside the encrypted artifact. Reconstruction must work without the original installation or provider.

Use native formats. Neither a full-state blob, object store nor universal archive format is prescribed. A required backup client may be part of the package. Only complete, verified publication makes a point eligible; interrupted uploads and missing members must not appear usable. Integrity checks alone do not establish capture consistency, freshness, interruption safety or exclusive write authority.

The backup system stores, protects, retains and retrieves captured data. It need not understand application schema or migration logic. It must provide:

- durable, integrity-verifiable storage and multiple unambiguously selectable points;
- reliable retention, controlled deletion and protection against deletion or overwrite by compromised production credentials;
- independence from production's relevant failure and administrative domain;
- encryption, independent keys and recovery without the source installation;
- automatable interfaces, detectable incomplete backups and failures, and complete handover to a successor provider.

Desired capabilities are changed-data transfer/storage, deduplication and useful compression, fast restore without manual chain assembly, low operating effort, predictable cost and storage-provider changes that preserve required history.

An external path or object store can meet this boundary if it satisfies the required independence, access, encryption, retention and regulatory conditions. Versioning is insufficient when production credentials can erase every version. A storage label does not establish compliance. No application-aware backup server or workflow platform follows from these requirements.

### Supported configuration and catalogue evidence

Start with one justified configuration. Record supported releases and transitions, persistence, target requirements, covered failures and operating limits. Qualify the delivered package with exact artifacts, observed outcomes and limitations:

| Case | Required evidence |
| --- | --- |
| First initialization | Usable vanilla installation on empty owned state, both without a configured store and with a store containing no backup. |
| Normal restart | Existing state and identity survive without backup access, reinitialization or unnecessary restore. |
| Source-independent restore | Create a point through the package, restore it on an empty target without the source or a second technical release command, verify data, identity and useful behavior, perform new work, then produce another usable recovery point. |
| Supported release transition | Native migration succeeds; unsupported transitions and downgrades are refused without destructive fallback. |
| Failed transition and retry | Failure stays visible and stopped across restarts; ordinary retry on an independent target succeeds within the accepted data-loss boundary. Conflicting execution, stale completion and work overriding stop are excluded. |
| Observation and operation failures | Failed observation, configured-store lookup, damaged backups and native failures do not fall through to initialization. Publication failure is separate from application health and respects stop. Established operation follows the declared observation-loss policy. |
| Foreign state boundary | Application failure does not reset shared or externally owned state. |
| Application acceptance | Agreed useful behavior is checked after every supported transition; container or Job success alone is insufficient. |

These cases prescribe no universal test runner. Reuse implementations where responsibilities actually coincide. An isolated passing case does not qualify the whole contract; evidence states which service-recovery conditions below were exercised.

## Service recovery and activation

Application reconstruction needs a usable environment, access paths and enforced production authority. The complete installation must supply them whether a human or automation executes the procedure. Safe activation is a present obligation, not work deferred until an installation controller exists.

### Inputs and authorization

Identify the installation, exact releases and effective configuration, a complete verified recovery point or authorized selection policy, protected credentials and keys, and the target profile. Record permitted interruption, data loss and treatment of the old installation's write authority. A changed target or risk outside that authorization requires a new decision. Decision time counts towards end-to-end interruption.

### Target and provider boundary

The target contract declares runtime and versions, compute and temporary reconstruction capacity, persistence semantics, connectivity, service endpoints and dependencies. Provider-specific provisioning establishes these capabilities without changing application recovery. The environment may be new or existing, but access, authorization and capacity must actually be usable within the recovery objective.

### Execution and result

Recovery procedures and any coordinator, bootstrap, artifacts, state, credentials and keys must survive the source failure or administrative domain being excluded. The executor cannot exist only inside the environment it must reconstruct. Normal service must not depend on its continuous availability.

After authorization, check inputs and target capabilities, establish the environment, restore and migrate in dependency order, validate applications, enforce write-authority transfer and activate access. Success means users can perform the agreed service with the required data and dependencies within authorized limits. Record actual recovery time, selected point, acceptance results and active resource identities.

### Service authority and promotion

Promotion establishes one authoritative production generation. The predecessor must no longer accept production work or cause unauthorized effects through live dependencies. It may remain running with isolated state only if it cannot affect production or rejoin authoritative state without explicit reconciliation. Powering off the old machine is one possible enforcement mechanism, not a universal requirement.

For the declared failure model, the integration identifies:

- every write path, including direct access, existing connections, workers, schedulers and mirrors;
- external effects, systems and credentials, and how old authority is withdrawn at each boundary;
- enforcement for a reachable source and, where source loss is covered, without source-provider cooperation;
- how a returning predecessor is prevented from reclaiming authority;
- how interrupted promotion or a lost activation acknowledgement establishes the active generation before further action.

The application supplies knowledge of writers, effects and controls; infrastructure and dependency integrations enforce what it cannot enforce alone. DNS changes, workflow locks, authority records and expired leases are insufficient unless relevant access paths and resources enforce the decision.

Planned replacement may use confirmed source stop/drain and prevention of restart. Provider-loss recovery needs independently prepared enforcement. Unreachability is not retirement; if authority cannot be withdrawn without the source, stop activation and report the missing capability. Safe refusal is not successful provider-loss recovery.

An isolated candidate may be prepared while the source runs. Before production activation, account for subsequent writes through final capture and reconstruction with renewed checks, or a supported catch-up path, within the authorized data-loss boundary. Selecting an older point accepts only the permitted loss of intervening work, not split-brain or silent merging of abandoned state. If the replacement may have accepted writes or produced effects, do not automatically reactivate the predecessor.

Evidence covers stale access, background effects, interrupted activation and return of the old generation within the claimed failure model. It identifies the active generation and observed enforcement. No universal lease protocol, watchdog or fencing product is prescribed.

## Provider-independent recovery execution contract

The additional, long-term automation goal is to execute the complete authorized service-recovery sequence without manual technical intervention. The current human-operated model need not automate that sequence; its application and service obligations above remain unchanged.

A provider adapter supplies and verifies the target through supported machine interfaces, returning resource identities, endpoints and protected access references. Establish that mapping during provider onboarding before promising hands-free recovery.

Execution retains enough durable intent and observed progress to resume safely or stop without ambiguous ownership or destructive repetition. Missing or inconsistent inputs fail closed. Routine technical steps must not require manual reconstruction; exceptions return the observed state and an explicit decision. Activation remains subject to the service-authority requirements above.

Exercise the complete claim with source access withheld, including provisioning, dependencies and user access. Independent backups alone are insufficient. Automatic incident detection and autonomous failover decisions remain separate service choices, not prerequisites for automatic execution after authorization.
