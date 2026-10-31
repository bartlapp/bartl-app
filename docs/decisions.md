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

The rewrite remains local pending review of the rendered candidate and separate publication authorization. No application runtime or HZD material is changed. Codeberg issues remain the remote work channel; this section records the current local review boundary without creating an additional backlog.

Local verification on 31 October: Astro check reported no diagnostics and the static build generated 14 pages. Chromium exercised all four main pages in both languages at 1280, 390 and 320 pixels, checked 226 internal links/anchors across 12 content/legal pages, and exercised all seven Contract scenarios per language, language switching and dark mode. Desktop/mobile screenshots were inspected; no browser errors remained. Prose lint passed. These are website checks, not new application qualification.

## German and English pages share their structure

The landing route renders `src/components/Landing.astro` for both languages, with copy in `src/content/landing.ts`. Approach and Implement share `DocumentArticle.astro`; Contract uses `src/content/spec.ts` with one layout. Header and footer use one primary navigation list. Copy remains language-specific, but section order, links, semantics and claim boundaries share their implementation.

## Astro over a single-binary static site generator

The site is mostly static prose plus one interactive component: the decision-tree pseudocode highlighter.

Astro was chosen because it sends no client-side JavaScript for static sections and keeps the small interaction local to its component. It also provides static routing, metadata, sitemap generation, and language-specific pages without a client application shell.

A single-binary static site generator would reduce dependency churn. It was considered and rejected because the interactive decision tree and shared component structure would otherwise require more custom wiring. This decision can be revisited if the interaction is removed.
