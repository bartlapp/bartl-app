<!-- SPDX-License-Identifier: Apache-2.0 -->

# bartl-app

Source of [bartl.app](https://bartl.app), the bilingual website for Bartl. Development, issues and pull requests belong on [GitHub](https://github.com/bartlapp/bartl-app).

- [Operating philosophy](docs/philosophy.md): why resilience and sovereignty change how we build and operate services.
- [Application contract](docs/application-contract.md): required application behavior, complete-service recovery and the additional automation goal.
- [How to bartlize and operate](docs/how-to-bartlize.md): native procedures, the selected Kubernetes package architecture, installation inputs, qualification and handover.
- [Installation schema](schemas/installation.schema.json): versioned shared resource structure; [resource and ownership rules](docs/how-to-bartlize.md#versioned-resource-contract) distinguish the new contract from existing, unmigrated procedures.
- [Operator workstation setup](docs/operator-workstation.md): ordinary tools, explicit customer access selection and independently usable operator identities; no directory hook is required.
- [Reference installation walkthrough](docs/reference-installation/README.md): build three independent bases, install Restic, Keycloak and Forgejo, exercise replacement/recovery and remove the lab using your own inputs.

Application repositories own their supported configurations, operator instructions, design and release evidence. Historical experiments do not govern current implementation.

For development, start with the contract and implementation guide, then the relevant package's design, source and release evidence. For operation, use the selected packages' procedures with the effective installation configuration. Handover requires independently available artifacts, protected inputs and infrastructure access, not a separate installation repository or chat history. Cross-application work is performed by the administrator until an installation controller exists.

## Validate an installation record

The version-1 schema defines the new resource graph; existing Base/application procedures are not migrated by this change. From this checkout, using the Node version in `.nvmrc`:

```sh
npm ci
npm run validate:installation -- /absolute/path/installation.yaml
npm run test:installation
```

The validator is read-only and offline. It rejects duplicate YAML keys, invalid shared fields, dangling references, conflicting placements and incompatible provider/network relationships. It does not validate package-owned configuration, credentials, live infrastructure or deletion authorization. The schema describes Hetzner and AWS infrastructure, K3s and EKS; accepting a record does not provide provisioning support for those profiles.


## Website maintenance

Start from the question: "What would operating IT look like if we took resilience and sovereignty seriously?" Derive the operating consequences before introducing mechanisms. Preserve the causal argument, not a wall of principles: pictures must show relationships, not merely labels. Keep the illustrative document service distinct from qualified Keycloak evidence. A changed prerequisite creates uncertainty until checked, not proof of failure. Replacement and provider-loss recovery illustrate the approach; they do not define its entire scope. No customer-specific broker or portfolio model is implied.

Both languages share the homepage, navigation and four-page structure. Approach and Contract render their maintained Markdown documents and German translations. Implement renders the canonical English operating guide in both language routes, without a translated copy. The English contract is normative; the website does not maintain another account. The interactive decision uses that contract's pseudocode.

| Page or responsibility | Source |
| --- | --- |
| Homepage | `src/components/ServiceHomepage.astro`, `src/content/landing.ts` |
| Approach `/derivation/` | `docs/philosophy.md`, `docs/philosophy.de.md` |
| Implement `/implement/` | `docs/how-to-bartlize.md` for both languages |
| Contract `/spec/` | `docs/application-contract.md`, `docs/application-contract.de.md` |
| Shared document layout | `src/components/DocumentArticle.astro` |
| Interactive decision | `src/components/InteractivePseudoCode.astro`, `src/content/startup-code.ts` |
| Legal content | `src/legal/` |

Astro provides static routing, shared components and Markdown rendering without a client application shell. Only the decision example needs client-side interaction. A single-binary generator was considered, but would require more custom wiring for this interaction and shared structure.

## Develop and publish

Use the Node version in `.nvmrc`.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static build into dist/
npm run preview  # serve the build locally
```

After authorized integration on GitHub, `.github/workflows/deploy.yml` builds and publishes to GitHub Pages at `bartl.app`. Verify the deployment for the exact revision and the live bilingual result; local rendering alone is not publication.

## License

Code is licensed under Apache 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Website prose is licensed under CC BY 4.0 as stated in the site footer.
