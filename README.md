<!-- SPDX-License-Identifier: Apache-2.0 -->

# bartl-app

Source of [bartl.app](https://bartl.app), the bilingual website for Bartl. Development, issues and pull requests belong on [GitHub](https://github.com/bartlapp/bartl-app).

- [Operating philosophy](docs/philosophy.md): why resilience and sovereignty change how we build and operate services.
- [Application contract](docs/application-contract.md): required application behavior, complete-service recovery and the additional automation goal.
- [How to bartlize and operate](docs/how-to-bartlize.md): native procedures, the selected Kubernetes package architecture, customer installation repositories, qualification and handover.
- [Reference installation walkthrough](docs/reference-installation/README.md): build three independent bases, install Restic, Keycloak and Forgejo, exercise replacement/recovery and remove the lab using your own inputs.

Application repositories own their supported configurations, operator instructions, design and release evidence. Historical experiments do not govern current implementation.

For development, start with the contract and implementation guide, then the relevant package's design, source and release evidence. For operation, start with your customer installation repository and the selected packages' procedures. Together with independently available artifacts, protected inputs and infrastructure access, these are the handover boundary; no company-internal repository or chat history is required. Cross-application work is performed by the administrator until an installation controller exists.

## Website maintenance

Start from the question: "What would operating IT look like if we took resilience and sovereignty seriously?" Derive the operating consequences before introducing mechanisms. Preserve the causal argument, not a wall of principles: pictures must show relationships, not merely labels. Keep the illustrative document service distinct from qualified Keycloak evidence. A changed prerequisite creates uncertainty until checked, not proof of failure. Replacement and provider-loss recovery illustrate the approach; they do not define its entire scope. No customer-specific broker or portfolio model is implied.

Both languages share the homepage, navigation and four-page structure. Approach, Implement and Contract render the maintained Markdown documents and their German translations. The English contract is normative; the website does not maintain another account. The interactive decision uses that contract's pseudocode.

| Page or responsibility | Source |
| --- | --- |
| Homepage | `src/components/ServiceHomepage.astro`, `src/content/landing.ts` |
| Approach `/derivation/` | `docs/philosophy.md`, `docs/philosophy.de.md` |
| Implement `/implement/` | `docs/how-to-bartlize.md`, `docs/how-to-bartlize.de.md` |
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
