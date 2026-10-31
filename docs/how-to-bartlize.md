<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# How to bartlize an application

Turn the supported procedures a competent administrator would perform into a maintained operating package. Preserve the application's native work; automate the missing steps and coordination.

The [application contract](https://codeberg.org/bartlapp/bartl-app#application-contract-and-qualification) defines the required behavior. This guide explains how to implement it. It prescribes neither Kubernetes nor a shared runtime.

## Start with one supported configuration

Name the application release, persistence and dependencies, target requirements and supported version transition. Identify the useful behavior that must survive reconstruction. Start with a configuration someone needs, not a speculative compatibility matrix.

Separate owned mutable state, derived or disposable state, immutable software and target configuration. Include external keys and dependencies needed for recovery. A shared database or external service is not ours to reset merely because the application uses it.

## Establish the native procedure

For startup, capture, restore and the selected upgrade, identify:

- the supported native commands and prerequisites;
- which processes must run, drain or stop, and which state may change;
- the native success signal and normal readiness;
- what a failed attempt leaves behind and how an administrator can retry safely.

Use upstream documentation and source, then exercise uncertain behavior. Reuse existing exact-version evidence where it answers the question. Do not infer a working application procedure from a successful container start.

Observation supplies the facts needed to choose the procedure, not an independent certificate of application integrity. Native startup may itself initialize or migrate the application. It may therefore need to run internally before ordinary access is permitted.

## Add only the missing coordination

For each custom mechanism, answer:

> Which concrete administrator action does it automate, or which demonstrated gap in the native procedure does it close?

Put that answer beside the mechanism in the application's design. If neither has an answer, omit the mechanism. A hypothetical failure or an expansive acceptance criterion is not sufficient justification; challenge the criterion rather than build a subsystem to satisfy it.

Assign each state-changing step one owner. Use native transactions, exclusion, process supervision and readiness where they already provide the needed behavior. Add only what connects those facilities into the supported procedure. Do not turn state observation into full-schema certification or continuous supervision with authority to stop a healthy application.

A failed state-changing attempt may remain visibly unavailable, with diagnostics retained, while an administrator replaces the failed target and retries from independently available inputs. Preserve authoritative state and backups. No automatic repair, replay or reconstruction of ambiguous progress is required. This does not disable ordinary platform process restarts.

Review the first complete path against this mapping before extending it. Existing code and passing tests establish neither the necessity of a mechanism nor permission to add dependencies, privileges, operator steps or new failure policy.

## Deliver a usable package

The administrator supplies release, installation identity, effective configuration and protected input references. The package performs the application-specific work through the ordinary installation and operating interface.

Keep the operator recipe separate from implementation reasoning. State the supported configuration, required choices, optional overrides, commands and expected results. Keep evidence and historical limitations attached to their exact releases, not interleaved with current instructions. Independently available software, configuration, backup history and keys must suffice for a successor to operate the application without the original installation or the author's private machinery.

## Qualify the delivered path

Use the [contract's evidence cases](https://codeberg.org/bartlapp/bartl-app#supported-configuration-and-catalogue-evidence), not a second checklist invented by the implementation. Exercise the actual package and administrator interface, including usable recovery, supported migration and failure behavior.

Check the limits on our intervention as well as successful operation: ordinary restart must not acquire recovery dependencies; failed work must not silently initialize or replay; completion must not override an intentional stop. Qualification accounts and functional probes do not automatically become startup dependencies.

Retain exact artifact identities, observed outcomes and consequential limits. Test the claimed failure boundary: recovery into another namespace does not establish survival of host or provider loss. Renew affected evidence when the package changes.

## Worked example: Keycloak

The 0.5.0 operating package pairs Keycloak 26.6.2 with PostgreSQL 17.6 and supports the forward transition from Keycloak 26.6.1. Its reconstruction path illustrates the method:

| Native procedure | Missing coordination supplied by the package |
| --- | --- |
| PostgreSQL starts and exposes the owned database. | Establish whether application state exists. Existing state goes directly to native Keycloak startup; only absence selects backup lookup. |
| PostgreSQL reconstructs a native database dump transactionally. | Select and verify the latest matching backup, keep conflicting writers stopped and bind exclusion to the actual restore transaction. One finite Job does the work. |
| `kc.sh start` initializes or performs the supported native migration. | Start only after required reconstruction succeeds; withhold ordinary access until native startup is ready. Do not independently certify the schema. |
| Keycloak's native realm administration revokes restored sessions. | Perform this after backup recovery, not ordinary restart, before admitting ordinary traffic. |

If the state-changing attempt fails or its outcome is uncertain, keep the target unavailable and retain diagnostics. The administrator can reconstruct another empty target from the preserved backup rather than repair the failed one automatically.

The controller connects these procedures; it does not replace PostgreSQL transactions or Keycloak startup. Its Kubernetes layout and recovery-only session policy are application-package choices, not additional Bartl requirements.
