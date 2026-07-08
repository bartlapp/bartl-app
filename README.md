<!-- SPDX-License-Identifier: Apache-2.0 -->

# bartl-app

Source of the [bartl.app](https://bartl.app) website - the presentation of the Bartl design pattern for application lifecycle.

The thesis text itself is not in this README. It lives in `src/thesis/` and is rendered onto the site (see below).

## Where things live

| What                                         | Where                                                        |
| -------------------------------------------- | ------------------------------------------------------------ |
| Thesis prose (English / German)              | `src/thesis/derivation.en.md`, `src/thesis/derivation.de.md` |
| Derivation page (renders the thesis)         | `src/pages/[lang]/derivation.astro`                          |
| Landing page                                 | `src/pages/[lang]/index.astro`                               |
| Components (Navbar, Footer, PseudoCode, ...) | `src/components/`                                            |
| UI strings and labels                        | `src/i18n/ui.ts`                                             |
| Site configuration                           | `src/data/constants.ts`                                      |
| Page shell / layout                          | `src/layouts/MainLayout.astro`                               |
| Static assets                                | `public/`                                                    |

To change the argument, edit the Markdown in `src/thesis/`. The derivation page reads those files directly and builds its table of contents from their headings, so the two never drift apart.

## Develop

Built with [Astro](https://astro.build). Node version is pinned in `.nvmrc` (currently 22).

```
npm install
npm run dev      # http://localhost:4321
npm run build    # static build into dist/
npm run preview  # serve the build locally
```

The site is fully static and deployed via GitHub Pages.

## Source of truth

This repository is developed on Codeberg. The GitHub copy is a read-only mirror.

- Development home: https://codeberg.org/bartlapp/bartl-app
- Please open issues and pull requests on Codeberg. Pull requests opened on the GitHub mirror are closed automatically.

One consequence for maintainers: the mirror cannot push changes to files under `.github/workflows/`. When a workflow file changes on Codeberg, it must be pushed to the GitHub mirror once by hand over SSH. Every other change syncs automatically.

## License

Code is licensed under Apache 2.0 (see [LICENSE](LICENSE) and [NOTICE](NOTICE)). The thesis prose in `src/thesis/` is licensed under CC-BY-4.0.
