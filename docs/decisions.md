# Decisions

A lightweight record of non-obvious choices for this repo. Not formal ADRs - a
few lines each, enough that a recurring "why not X?" has a written answer.

## Astro over a single-binary static site generator

The site is mostly prose (the thesis in `src/thesis/`) plus a few interactive
components on the landing page (the decision-tree pseudocode highlighter and
friends).

Astro was chosen for its islands architecture: it ships zero JavaScript by
default and hydrates only the interactive pieces - the right fit for "mostly
static with a little interactivity". Markdown and i18n come first-class.

A single-binary SSG (Hugo, Zola) would be lower-maintenance - no `node_modules`
churn, no framework major upgrades. It was considered and rejected because the
interactive components would then have to be hand-rolled in vanilla JavaScript,
and the interactivity here genuinely warrants a framework. If the interactive
pieces are ever dropped and the site becomes pure prose, revisiting a
single-binary SSG would be reasonable.
