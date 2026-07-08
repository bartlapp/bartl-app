<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bartl

A design pattern for application lifecycle. One startup decision based on observed system state and version - the mechanism branches on what it finds, not on what operation was requested.

Website: [bartl.app](https://bartl.app)

## The problem

When production goes down, three questions decide your business outcome: how many customers affected, how fast back online, how much data lost.

Most organizations can't answer any of these until the crisis is underway.

Bartl makes the last two answers automatic consequences of how you operate. Combined with multiplied single tenancy - one customer, one stack - the first answer shrinks to its minimum.

Not by adding something - by replacing five separate procedures with one unified mechanism. The operations are genuinely different in their inputs, but the mechanism that executes them is identical. It looks at what state exists and what version the engine is, and does the right thing.

## The premises

Five premises inform the design:

1. Software delivers value only in production.
2. Change is inevitable.
3. Errors are inevitable.
4. Humans can't apply change reliably.
5. Every link in the chain between intent and result adds cost: cognitive load, failure surface, side effects.

These kill every escape route: you can't prevent all failures (must design for recovery), you can't use careful manual procedures (must automate), you can't add a layer to manage it (must shorten the chain). What survives all five filters: fully automated disaster recovery with the shortest possible chain.

And we can - because apps, infrastructure, and both their operations are now expressible as code. Version-controlled, testable, reproducible. That was the last missing piece.

## The discovery

And when you think about what DR actually is and how to automate it: DR = create from scratch + restore data. That gives you automated installation for free. Add version detection, and you have upgrades. Do it on a different server, and you have migration.

Now keep the backup portable - no provider-specific snapshots, just a blob - and you can restore on any server, anywhere.

Disaster, cost pressure, contract end, curiosity: the reason you're moving doesn't change the operation. The timeline doesn't either - whether you have thirty seconds or thirty days, it's the same restore. That is Wechselfähigkeit.

## The mechanism

Best of all: the decision tree fits in 9 lines.

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

Three facts determine the operation: does local state exist, is a valid backup available (fetch_backup() includes retrieval and integrity verification), and how does the engine version compare to the state version. Every branch except serving() and abort() changes state and loops back.

- Reboot: state exists, equal -> serving().
- Fresh install: no state, no backup -> init() -> state created -> equal -> serving().
- In-place upgrade: state exists, engine > -> migrate() -> equal -> serving().
- DR restore: no state, backup -> restore() -> state created -> equal -> serving().
- Out-of-place upgrade: no state, backup -> restore() -> state created -> engine > -> migrate() -> equal -> serving(). If you choose this path over in-place upgrade (a business decision, not a technical requirement), every upgrade exercises the restore path. Not prescribed by the pattern - just a property that comes at no additional cost.
- Migration: same as DR restore, different server. Same operation.
- Evacuation: same as DR restore, different provider. Same operation.
- Downgrade attempt: state exists, engine < -> abort(). Running old code against a new schema is dangerous - the industry converged on fix-forward for good reason. Bartl prevents the dangerous thing. If you need to go back, restore from pre-upgrade backup + restart: that's the DR path, already a first-class operation (requires that the backup was taken before the upgrade - enforced by convention, not by the mechanism).

This covers all lifecycle operations. Explicitly out of scope: infrastructure (scaling, provisioning), data integrity (corruption without version change), and runtime concerns (monitoring, cert rotation). These observe or maintain the system but don't move state.

Preconditions (database accepting connections, storage mounted, network available) are the runtime's job, not Bartl's. Every runtime already enforces ordering natively: depends_on in compose, initContainers in K8s, After= in systemd. Bartl needs preconditions met. How they're met is not its concern.

Error handling: init(), restore(), and migrate() can fail partway through, leaving partial state. The loop structure is the recovery mechanism: on next startup, the loop re-evaluates the same three facts and picks up where it left off. What the loop cannot do is detect corruption within otherwise valid-looking state - that is application-specific product work (see item 21 below).

## What follows

### From the pattern

Structural properties:

1. Unified state-moving machinery (one mechanism for all productive operations)
2. Automated installation (DR forces it)
3. Automated DR (the design objective)
4. Branching on observed system state rather than declared operation
5. Migration = same mechanism, different server

Expected benefits (contingent on usage patterns):

6. Improved RTO (automated recovery, no manual steps)
7. Trustworthy backups (restore path exercised with every out-of-place upgrade - caveat: in-place upgrades do not exercise it)
8. Reduced cognitive load (one procedure to learn instead of separate install/restore/upgrade procedures)
9. Growing operational confidence (the same code path runs for install, upgrade, and restore - repeated exercise builds trust in the mechanism)

Requires convention choices:

10. Portable backups (requires a provider-independent blob format - e.g. database dumps + filesystem tar, not provider-specific snapshots)
11. Evacuation capability (depends on portable blob + no provider-specific APIs in critical path)
12. Sovereignty - the "thin waist": application-specific blob above, standard platform below (Linux/compose, K8s). The blob is yours, the platform is commodity. Sovereignty follows from keeping the blob portable and the platform standard. Infrastructure cutover (DNS, firewall, certs) is an orchestration concern outside Bartl's scope.

Requires product work:

13. Version detection logic
14. Migration scripts (product code, not Bartl code)
15. State declaration (what paths and databases survive a reinstall)
16. Backup script (snapshot state into a blob)
17. Backup scheduling, rotation, retention
18. Backup verification (checksums, round-trip testing)
19. Multi-service consistency during backup (application-level concern)
20. Precondition enforcement (delegated to runtime)
21. Partial state detection and recovery (failed init/restore/migrate leaving corrupted state)

### From the pattern + multiplied single tenancy

Why single tenancy is viable now: the cost that made multi-tenancy unavoidable was operations - every additional stack meant more manual work, more tribal knowledge, more things to get wrong. When the mechanism is code - tested once, applied N times - that cost no longer scales with the number of stacks. Infrastructure cost still scales (cloud is more expensive per unit than on-prem), but it was never the dominant cost. Operations was.

Structural properties:

22. Minimized blast radius (one error = one customer)
23. Data isolation by design
24. Separate compliance boundaries per customer
25. Simple onboarding (spin up a stack)
26. Simple offboarding (delete the stack and its backups)
27. Per-customer agility (version pinning, rollbacks)
28. Per-customer migrations (no big bang, gradual rollout)

Expected benefits (contingent on fleet tooling):

29. Linear operational scaling (Nth stack adds operational work, not cognitive complexity - requires fleet tooling to maintain consistency; without it, N stacks is N times the manual work)
30. Workforce: short chain (premise 5) plus small scope (single tenancy) make each stack comprehensible by one person. Neither alone is sufficient. Where both hold, the required skill level is a Fachanwendungsverantwortlicher, not a platform engineering team.
31. Talent on/offboarding (learnable scope + clear ownership = fast ramp-up - requires both short chain and small scope)

Requires work:

Bartl-specific:

32. Channels / fleet management
33. Bless/tag workflow
34. Forge runner infrastructure
35. Instance repos per customer

Standard operational concerns (not introduced by Bartl):

36. Monitoring aggregation across N stacks
37. Secret management
38. Infrastructure provisioning
