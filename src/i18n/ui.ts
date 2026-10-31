// SPDX-License-Identifier: Apache-2.0
export const languages = {
  en: "English",
  de: "Deutsch",
} as const;

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    "nav.codeberg": "Source code on Codeberg",
    "nav.spec": "Contract",
    "nav.derivation": "Approach",
    "nav.implement": "Implement",
    "nav.darkMode": "Toggle dark mode",
    "nav.language": "Language",
    "nav.main": "Main navigation",
    "nav.secondary": "Source and settings",
    "footer.copyright": "Florian Kessler GmbH",
    "footer.license.code": "Code: Apache-2.0",
    "footer.license.content": "Content: CC-BY-4.0",
    "footer.imprint": "Legal Notice",
    "footer.privacy": "Privacy",
    "footer.language": "Language",
    "skip.content": "Skip to content",
    "404.title": "Page not found",
    "404.description": "The page you are looking for does not exist.",
    "404.back": "Back to home",
  },
  de: {
    "nav.codeberg": "Quellcode auf Codeberg",
    "nav.spec": "Vertrag",
    "nav.derivation": "Ansatz",
    "nav.implement": "Umsetzung",
    "nav.darkMode": "Dunkelmodus umschalten",
    "nav.language": "Sprache",
    "nav.main": "Hauptnavigation",
    "nav.secondary": "Quellcode und Einstellungen",
    "footer.copyright": "Florian Kessler GmbH",
    "footer.license.code": "Code: Apache-2.0",
    "footer.license.content": "Inhalt: CC-BY-4.0",
    "footer.imprint": "Impressum",
    "footer.privacy": "Datenschutz",
    "footer.language": "Sprache",
    "skip.content": "Zum Inhalt springen",
    "404.title": "Seite nicht gefunden",
    "404.description": "Die gesuchte Seite existiert nicht.",
    "404.back": "Zur Startseite",
  },
} as const;
