// SPDX-License-Identifier: Apache-2.0
import contract from "../../README.md?raw";

// Only presentation metadata lives here; the algorithm comes from the contract.
const algorithm = contract.match(/### Startup decision\s+```text\n([\s\S]*?)\n```/)?.[1];
if (!algorithm) throw new Error("README startup decision code block is missing");

const all = "ready upgrade downgrade restore initialize invalid backup-error";
const scenarios = [
  all,
  all,
  "ready upgrade downgrade restore initialize backup-error",
  "ready upgrade downgrade",
  "ready",
  "upgrade",
  "downgrade",
  "restore initialize backup-error",
  "restore initialize backup-error",
  "restore",
  "initialize",
];
const lines = algorithm.split("\n");
if (lines.length !== scenarios.length) {
  throw new Error("Startup decision scenario annotations must match the README algorithm");
}

export const startupCode = lines.map((line, index) => ({
  html: line
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replace(
      /\b(?:until|if|else|abort)\b|(?:serving|observe_local_state|observe_backup|migrate|restore|init)\([^)]*\)|"downgrade"/g,
      (token) => {
        const color = token === "abort" ? "error" : token === '"downgrade"' ? "muted" : "keyword";
        return `<span class="text-code-${color}">${token}</span>`;
      },
    ),
  scenarios: scenarios[index],
}));
