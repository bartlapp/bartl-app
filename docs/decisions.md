# Decisions

A lightweight record of non-obvious choices for this repo. Not formal ADRs - a few lines each, enough that a recurring "why not X?" has a written answer.

## One philosophy and one normative application contract

[The philosophy](philosophy.md) explains Bartl's complete-service scope across application, infrastructure and operating responsibility. The [README](../README.md#application-contract-and-qualification) owns the normative application contract; its service-recovery sections define the broader recovery obligations.

[How to bartlize](how-to-bartlize.md) explains the implementation method without adding requirements. Application repositories own their concrete design, administrator procedures and exact-version evidence. Historical experiments do not govern new implementation.

`src/content/spec.ts`, rendered by `src/pages/[lang]/spec.astro`, explains the application contract for website readers. It is neither a runtime implementation nor a second normative source. The startup mechanism is one contribution to Bartl, not its complete definition.

The landing page currently concentrates on that mechanism and the WordPress example. The derivation explains its reasoning and history. Neither page adds requirements to the canonical contracts. Website changes must preserve that distinction; a reference demonstrates only its stated product configuration.

Historical talks and product contexts provide provenance. They do not define a second version of Bartl.

## German and English pages share their structure

The landing route renders `src/components/Landing.astro` for both languages. Landing, derivation, and spec copy live in `src/content/landing.ts`, `src/content/derivation.ts`, and `src/content/spec.ts`; each page keeps one shared layout across languages. Copy remains language-specific, but section order, links, semantics, and claim boundaries cannot drift through separate page implementations.

## Astro over a single-binary static site generator

The site is mostly static prose plus one interactive component: the decision-tree pseudocode highlighter.

Astro was chosen because it sends no client-side JavaScript for static sections and keeps the small interaction local to its component. It also provides static routing, metadata, sitemap generation, and language-specific pages without a client application shell.

A single-binary static site generator would reduce dependency churn. It was considered and rejected because the interactive decision tree and shared component structure would otherwise require more custom wiring. This decision can be revisited if the interaction is removed.
