# Decisions

A lightweight record of non-obvious choices for this repo. Not formal ADRs - a few lines each, enough that a recurring "why not X?" has a written answer.

## One philosophy and one normative application contract

[The philosophy](philosophy.md) explains Bartl's complete-service scope across application, infrastructure and operating responsibility. The [README](../README.md#application-contract-and-qualification) owns the normative application contract; its service-recovery sections define the broader recovery obligations.

[How to bartlize](how-to-bartlize.md) explains the implementation method without adding requirements. Application repositories own their concrete design, administrator procedures and exact-version evidence. Historical experiments do not govern new implementation.

`src/content/spec.ts`, rendered by `src/pages/[lang]/spec.astro`, explains the application contract for website readers. It is neither a runtime implementation nor a second normative source. The startup mechanism is one contribution to Bartl, not its complete definition.

The homepage starts from resilience and sovereignty as requirements, then derives the operating consequences for applications, infrastructure and responsibility. Continuing maintenance precedes the recovery example. Keycloak supplies separate application-package evidence. Startup pseudocode belongs on the technical Contract page. WordPress is removed from the current reader journey; historical publication records below remain historical evidence.

Historical talks and product contexts provide provenance. They do not define a second version of Bartl.

## North Star: take resilience and sovereignty seriously

The governing question is: "What would operating IT look like if we took resilience and sovereignty seriously?" Its consequence is: "If we treat them as requirements, what must change in how we build applications, provide infrastructure and organize responsibility?"

Requirements establish what is needed; claims describe what evidence can substantiate. The explanation therefore starts with requirements, not with a challenge to existing claims. It derives useful work beyond component health, usable alternatives beyond contractual permission, dependable organizational capability beyond specialist improvisation, and continuing maintenance beyond a one-time demonstration. The limits remain explicit: prepare for specified conditions, not every conceivable failure or complete independence.

Preserve the agreed causal wording when transferring it to the website and Approach pages. Do not turn it into a new writing brief, a slogan or a list of preferred mechanisms. Keep observation and consequence together; examples develop the argument rather than replace it. The application contract remains unchanged.

The focused revision places this question and its four consequences directly at the beginning of both homepages and both Approach pages. It replaces the generic introduction and restores explicit causal wording about whole-service responsibility, changing prerequisites and reuse of operating procedures. The opening uses a readable single-column layout rather than splitting its reasoning into separate display blocks.

Verification of this revision: Astro check reported zero errors, warnings or hints and the build produced 14 pages. German prose lint passed. Both homepages and Approach pages were exercised at 320, 390, 768 and 1440 pixels without horizontal overflow. Desktop English and mobile German openings were visually inspected; language switching, the link into the operating explanation, recovery-example expansion and onward navigation to Approach worked without browser errors. No publication was performed.

## Explain the operating model before demonstrating recovery

On 31 October, after publication of `f436267`, Florian reopened the explanation, not just its visual treatment. Existing wording, pictures and page structure are no longer constraints. The earlier reviews established fidelity and visual improvement, but did not establish that a newcomer could explain what to do differently and why.

The first causal revision, `9f46c92`, established the gap between functioning components and useful service, then between a nominal choice and a prepared alternative. The subsequent North Star revision replaces its generic introduction with the agreed requirements argument. Application, infrastructure and organizational contributions develop that argument; continuing maintenance explains how the capability survives change.

Replacement updates and provider-loss recovery now demonstrate the approach rather than define it. Their main lessons remain visible; native expandable sections carry the existing detailed pictures and conditions. The document service stays illustrative, and Keycloak evidence retains its exact package scope. The Approach pages carry the same causal links into the existing detailed philosophy. Implement and Contract remain unchanged because the application behavior and integration method have not changed.

The general philosophy does not prescribe a customer-specific broker or portfolio model. This revision is local and does not authorize publication.

Verification: both homepages were exercised at 320, 390, 768 and 1440 pixels, including opening both technical examples. No page overflow or clipped SVG text was observed. Browser inspection caught and corrected a heading overlap caused by a shared CSS class name. Desktop and mobile views, dark mode, language switching and navigation into Approach were inspected. All eight main language/page combinations loaded at mobile width without overflow; 46 distinct internal main-content links and anchors resolved. German philosophy prose lint passed. These checks establish rendering and navigation, not independent reader comprehension.

The final Astro check reported zero errors, warnings or hints; the static build produced 14 pages. The existing development environment warns that its installed Vite 8 is outside Astro's required Vite 7 range; dependency changes are outside this explanation revision.

## Documentation alignment and remaining work

The 31 October 2026 correction aligned the local contract and both website languages with native startup and bounded failure handling. At that stage the website documented the historical WordPress mechanism and its checksum, publication and migration limits; it did not qualify that implementation under the current contract.

The correctness candidate `8c66e3f715c34e40c3462cdcc4d925ba6a164a8d` and WordPress correction `890080350dd637c8db21f09c9b6fae236d0d4dff` were published on 31 October. Codeberg and GitHub mirror heads matched; [deployment 41203824566](https://github.com/bartlapp/bartl-app/actions/runs/41203824566) succeeded. The live DE/EN landing and specification pages exposed the exact candidate and corrected content.

The subsequent website rewrite implements the approved homepage argument and four-page structure. Approach keeps `/derivation/`, Contract keeps `/spec/`, and Implement adds `/implement/`; established URLs remain usable without compatibility routes. Approach and Implement render the existing English Markdown and maintained German translations directly. The old mechanism-first derivation copy and unused static startup components are removed.

The content baseline `b3aab7eb29b0f53e67933008debd799f6e2d262c` remains local. Florian rejected its visual treatment as boring and excessively text-heavy; the substantive argument remains the constraint, not permission to publish this presentation. No application runtime or HZD material is changed. Codeberg issues remain the remote work channel.

Local verification on 31 October: Astro check reported no diagnostics and the static build generated 14 pages. Chromium exercised all four main pages in both languages at 1280, 390 and 320 pixels, checked 226 internal links/anchors across 12 content/legal pages, and exercised all seven Contract scenarios per language, language switching and dark mode. Desktop/mobile screenshots were inspected; no browser errors remained. Prose lint passed. These are website checks, not new application qualification.

### High-fidelity homepage revision: bilingual local candidate

On 31 October Florian authorized one bounded visual revision before publication. The rendered English candidate is implemented on `polish-bartl-docs-2026-10-31`, retaining the current four-page structure and canonical content ownership.

Use one illustrative, product-independent document service throughout the main story:

1. Keep "Keep the service. Keep your options." Show a person finding, reading and updating a shared document, supported by the application, consistent document/file and database state, user access and required dependencies. Authentication is one dependency, not the outcome.
2. Show ordinary maintenance exercising recovery of that service: reconstruct a replacement from a consistent recovery point, apply the supported update, verify the document, permissions and editing, then switch service. Include the need to coordinate writes.
3. Show what provider loss adds: independently available recovery inputs and execution, a usable destination, working access and dependencies, and controlled transfer of production authority. Application reconstruction must not stand in for complete service recovery.
4. Keep Keycloak only in the evidence section as a real qualified application package demonstrating part of the approach. Its evidence does not qualify the illustrative document service or complete provider-loss recovery.

Place application, infrastructure and responsibility beside their actual contributions rather than repeating three prose columns. Short explanations must retain the causal links and necessary conditions; deeper discussion belongs on Approach, technical detail on Implement and Contract. Prefer static explanatory visuals. Interaction needs a real explanatory purpose; no carousel, decorative animation or framework change.

Florian accepted the document-service candidate `149a264`, retaining its design and bounded Keycloak evidence. Before German rollout he required two corrections: the introduction must explain continued service usefulness and usable alternatives, not recovery alone; the prepared alternative must be approved and ready within the agreed interruption, data-loss and protection limits. Both corrections and their German equivalents are implemented.

Both languages now use the same visual component and language-specific copy in `src/content/landing.ts`. The obsolete German layout and copy are removed. The illustrative document service remains distinct from exercised Keycloak package evidence.

Local verification on 31 October: Astro check reported no diagnostics; the static build generated 14 pages. Both languages were visually inspected at desktop and mobile sizes. Layout checks at 320, 390, 768 and 1440 pixels found no overflow after adding language-aware hyphenation and wrapping for long German words. All five distinct main-content links and anchors per language resolved, including the language-specific Keycloak section. No browser errors were recorded. The bilingual candidate remains local; publication is not authorized.

The subsequent visual revision uses recurring document, file/database and permission objects instead of labelled containers and a numbered step list. Reconstruction preserves recognizable state while changing the application release. Provider-loss pictures distinguish the withdrawn source from surviving recovery inputs, execution, access and dependencies. The production path visibly closes at the old installation while the replacement alone receives production traffic. Supporting text retains consistency, final-write coordination, authorization and independent-enforcement conditions. These remain illustrations, not new qualification evidence.

The picture revision was inspected in both languages at desktop and mobile sizes, including dark mode. Bounds checks at 320, 390, 768 and 1440 pixels found no page overflow or clipped SVG labels. Across the eight main language/page combinations, all 104 checked internal links and anchors resolved; neither visible text nor HTML contained WordPress. Astro check reported no diagnostics, the build generated 14 pages, and German prose lint passed. Browser inspection corrected clipped labels and routes crossing labels before the local candidate was retained.

### Release checks and publication proposal, 31 October

Florian accepted the visual direction and explanation at `6c9c17e6057621e78601f6b7fe48d0d882479a0e`. The release pass preserves that content and design. Its only UI fix enables wrapping and hyphenation on the privacy page after the German title overflowed at mobile widths.

Release verification: all eight main language/page combinations rendered at 320, 390, 768 and 1440 pixels without page overflow or clipped diagram labels. Navigation and language switching retained all four page destinations on desktop and mobile. All seven Contract scenarios per language responded correctly. All 104 main-page internal links/anchors and six distinct external targets resolved. The unpublished footer commit link becomes available only after publication. Legal pages, the root entrypoint and the 404 page were exercised; the privacy fix passed at all four widths. Dark mode was inspected; no browser errors remained. Astro check reported zero diagnostics, the build produced 14 pages, and prose checks passed. The illustrative document service remains separate from qualified Keycloak evidence.

The proposed destination is `refs/heads/main` at `ssh://git@codeberg.org/bartlapp/bartl-app.git`. SSH fetch and the live Codeberg API agreed on destination tip `8c66e3f715c34e40c3462cdcc4d925ba6a164a8d`, an ancestor of the candidate. Forgejo's API reports `/api/v1`; authenticated user `fke` is active, unrestricted and not prohibited from login. The repository is not archived, grants push/admin access, and reports `main` unprotected, no effective protection rule, zero required approvals, no required status checks, and effective push/merge permission. The proposal is an ordinary fast-forward preserving all seven outgoing commits, including referenced review versions, not a squash or history rewrite. Recheck the destination tip and effective policy immediately before any authorized push.

Deployment follows the existing Codeberg push mirror to `ssh://github.com/bartlapp/bartl-app.git` (`sync_on_commit: true`, no last error). The GitHub mirror tip matches Codeberg. A push to GitHub `main` triggers `.github/workflows/deploy.yml`: Node 22, `npm ci`, Astro check/build, upload `dist/`, then GitHub Pages deployment to `bartl.app`. The public API reports an active workflow and a `github-pages` environment restricted to `main`, with no review or wait rule. The latest run `41203824566` succeeded at the destination tip.

Authenticated GitHub inspection returned 401; the Pages settings endpoint was unavailable without authentication. Public branch, rules, workflow, environment, branch-policy and run evidence was available. No direct GitHub write or settings change is proposed. Codeberg policy/access preflight passed; GitHub administrative settings were not verified. After authorization, verify mirror convergence, the deployment run at the exact candidate SHA and the live bilingual pages. Publication has not been authorized or performed.


## German and English pages share their structure

The landing route renders `src/components/Landing.astro`, which selects language-specific copy for the shared `ServiceHomepage.astro`. Approach and Implement share `DocumentArticle.astro`; Contract uses `src/content/spec.ts` with one layout. Header and footer use one primary navigation list.

## Astro over a single-binary static site generator

The site is mostly static prose plus one interactive component: the decision-tree pseudocode highlighter.

Astro was chosen because it sends no client-side JavaScript for static sections and keeps the small interaction local to its component. It also provides static routing, metadata, sitemap generation, and language-specific pages without a client application shell.

A single-binary static site generator would reduce dependency churn. It was considered and rejected because the interactive decision tree and shared component structure would otherwise require more custom wiring. This decision can be revisited if the interaction is removed.
