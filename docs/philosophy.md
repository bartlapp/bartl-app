<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bartl: retaining the ability to act

If we take resilience and sovereignty seriously as requirements, how must applications, infrastructure and the operating organization be designed?

Resilience means that we can continue the required work despite disruption, or recover within acceptable interruption and data-loss limits. Sovereignty means retaining the ability to decide how we use IT, including rejecting an unacceptable operating arrangement without losing the service. A provider's promises or the contractual right to leave do not establish either capability on their own.

These requirements affect ordinary operation, not just emergencies. Software must remain useful as needs change. Installation, updates and recovery must deliver the required quality with the people and resources available, without depending on a particular person's memory.

Bartl works backwards from that outcome. It connects what the application, infrastructure and organization must each contribute, then asks whether their combined procedures actually work. It is an operating philosophy, not a particular runtime or a claim that these practices are new.

## What must the application provide?

The application must know its complete state, how to capture it consistently, how to reconstruct it and which migrations it supports. It must distinguish what needs preserving from what can be rebuilt or discarded, and check the result. That knowledge belongs in executable procedures, not in instructions that someone must reinterpret for each installation.

A recovery point contains the application's complete, consistent state, with inventory, compatibility information and integrity checks. Its components form one explicitly identified set and are restored together; an operator must not have to match separate database and file backups. Preserve native formats. Additional packaging needs a concrete benefit, not merely fewer files. The immutable release and target-specific configuration remain separate; required application identity must survive recovery.

The application also declares what its environment must supply: runtime, storage semantics, connectivity and dependencies. Its recovery mechanism should consume that contract rather than depend on a particular provider's implementation.

## What must the infrastructure provide?

The infrastructure must supply those capabilities through supported machine interfaces. Provider-specific provisioning establishes the target environment without changing the application's reconstruction procedure. Any environment satisfying the contract can be a target, but credentials, capacity, access and provisioning must actually be usable within the required time.

Storage preserves and retrieves the recovery artifact. It need not understand the application. An independent path or object store can suffice if access, durability, overwrite/deletion protection and regulatory requirements are met. Keys must remain available. A checksum cannot prove that the application captured a consistent state.

For provider-loss recovery, both the inputs and the execution path must survive the failure being claimed. A backup unlocked only by the lost provider, or a recovery runner available only inside the lost cluster, fails that test. Moving the dependency into a central control service does not remove it; normal service must not depend on that coordinator's continuous availability either.

Self-healing is not the same as high availability. A single node can restart failed workloads, not survive its own disappearance. The required availability determines redundancy. Neither replacement upgrades nor provider-independent reconstruction universally requires an HA deployment.

## What must the organization provide?

Someone must remain responsible for the complete service: application, infrastructure, user access and dependencies, including contributions supplied by others. The organization sets the required functionality, protection, interruption, data-loss and cost limits, and provides the authority and resources to meet them. Approval and procurement are part of target readiness. Prepare beforehand whatever cannot be obtained during the permitted interruption.

People decide what should happen, when and at which risk. Each bartlized application executes its supported internal procedures without manual technical intervention, verifies the result and reports success or stops safely. An installation administrator may install and maintain the customer installation by copying and executing documented commands with its versioned customer configuration and checking the documented results. The administrator must not have to invent missing application procedures or manually assemble the application's internal initialization, restore or migration steps.

Automating that administrator's work across the complete customer installation with an installation controller is the long-term goal, not a prerequisite for the current human-operated model. Whether that controller is implemented as a Kubernetes operator or otherwise remains open. Automatic incident decisions are a separate choice; human decision and execution time still count towards the interruption.

Represent the application, infrastructure and operating procedures as versioned code. Review, test and release them; use the same logic and verified artifacts wherever the work is the same. The benefit is dependable quality, not merely faster execution. A correction belongs in that shared implementation so the next administrator does not have to rediscover it. Exceptions can require judgment; ordinary cases repeatedly labelled exceptions indicate unfinished engineering.

We need not operate everything ourselves, but must retain the ability to judge and replace what we buy. A successor must be able to operate the environment without depending on the former service provider's central machinery. Replacing a service provider does not necessarily remove a dependency on the software manufacturer; the alternative must address the dependency that matters.

## How do the contributions become a working service?

A complete service can contain several applications without making them one upgrade or restore unit. Updating a forge need not reconstruct the same customer's file service. Actual state dependencies determine what must recover together; the complete operating responsibility covers their integration and handover.

Reconstruction alone is not enough. Users still need access, identity and working dependencies. The old installation may also still be serving requests or running background work. Changing DNS does not necessarily withdraw its authority.

Promotion must leave one authoritative production generation. The old copy can remain running if effectively isolated, but must not accept production work or cause unauthorized effects through live dependencies. The application exposes its writers and effects; the surrounding infrastructure enforces the relevant boundaries. Interrupted promotion must not blindly restart the old copy.

If activation cannot be made safe without the source provider's help, the installation does not yet support that provider-loss recovery claim. Stopping safely is necessary, not success. Accepting an older recovery point does not permit continuing split-brain.

## How do we keep that capability usable?

We have to update the application anyway. Why not use that work to find out whether we can recover it?

Installation, upgrade and recovery need much of the same knowledge. Maintain their shared machinery together. Build a replacement from a backup, apply the supported update, test it, then switch production. The upgrade now also exercises reconstruction. The candidate needs its own mutable state, but can run on the same machine or cluster if capacity permits.

There is a price: extra capacity, copying and migration time, and coordination of writes. If production continues changing, the candidate needs a final restore and renewed checks or a supported catch-up path. After it accepts new writes, the old slot is no longer a lossless fallback.

Use replacement-based upgrades where that cost buys worthwhile recovery evidence. In-place upgrades may also be supported, but do not test restoration; exercise it separately. Neither proves provider independence merely by succeeding inside the same provider.

A demonstration proves what worked under its conditions, not permanent capability. Assign ownership and resources to keeping procedures, dependencies and evidence current. Exercise the complete service under the claimed failure conditions, including withheld source access. Measure when people can work again and which data returned. Test handover rather than merely handing over documents.

## Is it worth maintaining?

Count implementation, maintenance and coordination, not just manual steps removed. Reusable procedures can make separate customer installations economical. Multiplied single tenancy can then buy independent changes, recovery and exit. Fleet management coordinates the repetition, but brings its own costs and shared authority risks. These are tradeoffs, not automatic benefits or universal topology requirements.

If we cannot sustain the promised capability, change the service profile or explicitly accept the dependency. Do not advertise a capability that exists only when the right specialist intervenes. The measure is whether the intended team can operate, change, recover and leave within the agreed limits, not a preferred technology or the amount of automation.

Bartl's startup pattern is one implementation mechanism: use existing state through normal native startup; when state is absent, restore an available backup or initialize. Native startup performs supported migration. Failed observation or a failed procedure stops visibly rather than authorizing initialization or automatic repair. The [detailed contracts](https://codeberg.org/bartlapp/bartl-app#provider-independent-recovery-execution-contract) describe the broader obligations; implementations still have to demonstrate them.
