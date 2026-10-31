// SPDX-License-Identifier: Apache-2.0
export const SITE = {
  title: "Bartl",
  author: "Florian Kessler GmbH",
  url: "https://bartl.app",
  description:
    "Keep a complete service usable and retain useful alternatives through how we build applications, provide infrastructure and organize responsibility.",
  codeberg: "https://codeberg.org/bartlapp/bartl-app",
  reference: "https://codeberg.org/bartlapp/bartl-wordpress",
} as const;

export const PRIMARY_NAVIGATION = [
  { path: "derivation", label: "nav.derivation" },
  { path: "implement", label: "nav.implement" },
  { path: "spec", label: "nav.spec" },
] as const;
