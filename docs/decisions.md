# Decisions

A lightweight record of non-obvious choices for this repo. Not formal ADRs - a few lines each, enough that a recurring "why not X?" has a written answer.

## One philosophy and one normative application contract

[The philosophy](philosophy.md) explains Bartl's complete-service scope across application, infrastructure and operating responsibility. The [README](../README.md#application-contract-and-qualification) owns the normative application contract; its service-recovery sections define the broader recovery obligations.

[How to bartlize](how-to-bartlize.md) explains the implementation method without adding requirements. Application repositories own their concrete design, administrator procedures and exact-version evidence. Historical experiments do not govern new implementation.

`src/content/spec.ts`, rendered by `src/pages/[lang]/spec.astro`, explains the application contract for website readers. It is neither a runtime implementation nor a second normative source. The startup mechanism is one contribution to Bartl, not its complete definition.

The homepage leads with usable service and retained freedom to act, then connects application, infrastructure and responsibility. A bounded Keycloak example makes the approach concrete. Startup pseudocode and the historical WordPress example belong on the technical Contract page, not in the homepage's main argument.

Historical talks and product contexts provide provenance. They do not define a second version of Bartl.

## Documentation alignment and remaining work

The 31 October 2026 correction aligns the local contract and both website languages with native startup and bounded failure handling. WordPress is a historical mechanism example, not a qualified implementation of the current contract; its README and the website describe the actual checksum, publication and migration limits.

The correctness candidate `8c66e3f715c34e40c3462cdcc4d925ba6a164a8d` and WordPress correction `890080350dd637c8db21f09c9b6fae236d0d4dff` were published on 31 October. Codeberg and GitHub mirror heads matched; [deployment 41203824566](https://github.com/bartlapp/bartl-app/actions/runs/41203824566) succeeded. The live DE/EN landing and specification pages exposed the exact candidate and corrected content.

The subsequent website rewrite implements the approved homepage argument and four-page structure. Approach keeps `/derivation/`, Contract keeps `/spec/`, and Implement adds `/implement/`; established URLs remain usable without compatibility routes. Approach and Implement render the existing English Markdown and maintained German translations directly. The old mechanism-first derivation copy and unused static startup components are removed.

The content baseline `b3aab7eb29b0f53e67933008debd799f6e2d262c` remains local. Florian rejected its visual treatment as boring and excessively text-heavy; the substantive argument remains the constraint, not permission to publish this presentation. No application runtime or HZD material is changed. Codeberg issues remain the remote work channel.

Local verification on 31 October: Astro check reported no diagnostics and the static build generated 14 pages. Chromium exercised all four main pages in both languages at 1280, 390 and 320 pixels, checked 226 internal links/anchors across 12 content/legal pages, and exercised all seven Contract scenarios per language, language switching and dark mode. Desktop/mobile screenshots were inspected; no browser errors remained. Prose lint passed. These are website checks, not new application qualification.

### High-fidelity homepage revision: English candidate awaiting review

On 31 October Florian authorized one bounded visual revision before publication. The rendered English candidate is implemented on `polish-bartl-docs-2026-10-31`, retaining the current four-page structure and canonical content ownership.

Use one service throughout the homepage:

1. Keep "Keep the service. Keep your options." Show a person using the service, its application, state and necessary dependencies. Make the outcome that must survive visible.
2. Show ordinary maintenance exercising recovery: reconstruct a replacement from backup, apply the supported update, verify it and switch service. Include the need to coordinate writes.
3. Show what provider loss adds: withdraw the original provider and reveal the recovery inputs, access paths and dependencies that must remain independently available. Application reconstruction must not stand in for complete service recovery.
4. Ground the explanation in Keycloak's qualified package behavior. Distinguish illustrative scenarios from exercised evidence; do not portray an unperformed provider-loss drill as a result.

Place application, infrastructure and responsibility beside their actual contributions rather than repeating three prose columns. Short explanations must retain the causal links and necessary conditions; deeper discussion belongs on Approach, technical detail on Implement and Contract. Prefer static explanatory visuals. Interaction needs a real explanatory purpose; no carousel, decorative animation or framework change.

The English candidate uses a connected sign-in service diagram, a replacement-update sequence, a withdrawn-provider scenario and a separate Keycloak qualification record. `ServiceHomepage.astro` owns the visual treatment; English copy remains in `src/content/landing.ts`. The German homepage retains its previous rendering until Florian approves the English treatment.

Local verification on 31 October: Astro check reported no diagnostics and the static build generated 14 pages. Chromium inspection covered desktop and mobile, light and dark modes. Layout checks at 320, 390, 768, 1280 and 1440 pixels found no overflowing homepage elements. All ten distinct local homepage links and anchors resolved. The service jump, Keycloak implementation link, theme toggle and language switch were exercised; no browser errors were recorded. A mobile collision with DaisyUI's `steps` class was corrected by using a component-specific class.

Next decision: Florian reviews the rendered English homepage for clarity and visual quality. After approval, carry the treatment through German, verify and prepare publication. Neither the visual-work authorization nor the earlier exact-candidate publication approval authorizes publishing this rewrite.


## German and English pages share their structure

The landing route renders `src/components/Landing.astro` for both languages, with copy in `src/content/landing.ts`. During the English review, it selects `ServiceHomepage.astro` for English and retains the established German layout. After approval, the selected visual structure is to be shared again. Approach and Implement share `DocumentArticle.astro`; Contract uses `src/content/spec.ts` with one layout. Header and footer use one primary navigation list.

## Astro over a single-binary static site generator

The site is mostly static prose plus one interactive component: the decision-tree pseudocode highlighter.

Astro was chosen because it sends no client-side JavaScript for static sections and keeps the small interaction local to its component. It also provides static routing, metadata, sitemap generation, and language-specific pages without a client application shell.

A single-binary static site generator would reduce dependency churn. It was considered and rejected because the interactive decision tree and shared component structure would otherwise require more custom wiring. This decision can be revisited if the interaction is removed.
