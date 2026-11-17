# Repository instructions

Before changing package configuration, lifecycle behavior, installation procedures or qualification, read this repository's README and both governing documents:

- [Bartl application contract](https://github.com/bartlapp/bartl-app/blob/main/docs/application-contract.md), including Standalone operation and Supported configuration and catalogue evidence.
- [How to bartlize](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.md), including the applicable package interface and qualification procedure.

Read the documents before implementation; listing them as future reading is insufficient. They govern implementation and acceptance. For coordinated local work, use the bartl-app checkout carrying the approved contract changes; in bartl-app itself, read docs/application-contract.md and docs/how-to-bartlize.md. Otherwise use the canonical public documents linked above. Identify the source revision used. Resolve conflicting governing versions before implementation rather than silently choosing one.

Preserve the contract's standalone operating path. Company-specific installation tooling may compose packages but must not become necessary to operate them. The contract, not this instruction file, owns the detailed requirements.

Before declaring affected package behavior or operating procedures complete, provide the standalone qualification evidence required by the contract, tied to the exact delivered artifacts, in the existing package qualification or release record. Existing evidence may be reused only where it still covers the behavior and applicable artifacts. Passing installation-generator tests is not a substitute. If required verification cannot be performed, report implementation progress and the outstanding acceptance requirement; do not declare the behavior complete. Documentation-only changes require document verification, not an unrelated deployment exercise.
