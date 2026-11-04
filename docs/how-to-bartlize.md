<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# How to bartlize an application

Turn the supported procedures a competent administrator would perform into a maintained operating package. Preserve the application's native work; automate the missing steps and coordination.

The [application contract](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md) defines the behavior. This guide explains how to implement it, without prescribing Kubernetes or a shared runtime.

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

Apply the contract's [failure, retry and publication boundaries](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#application-responsibilities) to the actual procedure. Keep authoritative state recoverable and diagnostics available. Neither an automatic repair engine nor a supervisor with authority to stop a healthy application follows from the need to coordinate native work.

Review the first complete path before extending it. Existing code and passing tests establish neither a mechanism's necessity nor permission to add dependencies, privileges, operator steps or failure policy.

## Deliver a usable package

Keep the operator recipe separate from implementation reasoning. It states the supported configuration, choices, commands and expected results. Release, installation identity, effective configuration and protected input references must suffice to invoke the application work through its ordinary interface. A successor needs independently available software, configuration, backup history and keys, not the author's private machinery.

Define stop and removal alongside installation. If removal retains state for reuse, exercise authorized reinstall without admitting a competing predecessor. Retained data alone does not establish that procedure. Keep the coordination needed to finish removal available until its work is done.

For replacement, translate the [service-authority requirements](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#service-authority-and-promotion) into concrete source retirement, final-write handling and activation steps. Preparing a candidate and promoting it are different operations.

## Qualify the delivered path

Exercise the actual package and administrator interface against the [contract's evidence cases](https://codeberg.org/bartlapp/bartl-app/src/branch/main/docs/application-contract.md#supported-configuration-and-catalogue-evidence), not another implementation checklist. Check the limits on our intervention too: restart must not acquire recovery dependencies, failed work must not silently initialize or replay, and completion must not override stop. Qualification accounts and functional probes do not automatically become startup dependencies.

Qualify the same immutable artifacts operators obtain. Source-tested code does not qualify a published package. Keep repeatable checks in source, raw output outside Git, and exact artifact identities, observed results and consequential limits in the release/integration description. Do not create per-session evidence files or qualification reports. Keep historical limits attached to their exact releases, outside current instructions.

Test the claimed failure boundary: another namespace does not establish survival of host or provider loss. Renew affected evidence when the package changes.

## Worked example: Keycloak

The 0.5.0 operating package pairs Keycloak 26.6.2 with PostgreSQL 17.6 and supports the forward transition from Keycloak 26.6.1. Its reconstruction path illustrates the method:

| Native procedure | Missing coordination supplied by the package |
| --- | --- |
| PostgreSQL starts and exposes the owned database. | Determine whether application state exists. Existing state goes to native Keycloak startup; only absence selects backup lookup. |
| PostgreSQL reconstructs a native dump transactionally. | Select and verify the latest matching backup, keep conflicting writers stopped and bind exclusion to the restore transaction. One finite Job performs the work. |
| `kc.sh start` initializes or performs native migration. | Start after required reconstruction succeeds; withhold ordinary access until native readiness, without independent schema certification. |
| Native realm administration revokes restored sessions. | Perform this after recovery, not ordinary restart, before admitting traffic. |

Failed or uncertain mutation leaves the target unavailable with diagnostics. Preserved recovery inputs permit reconstruction on another empty target instead of automatic repair. The controller connects native procedures; its Kubernetes layout and recovery-only session policy are package choices, not additional Bartl requirements.
