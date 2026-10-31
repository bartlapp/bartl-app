// SPDX-License-Identifier: Apache-2.0
import contract from "../../README.md?raw";

// Only presentation metadata lives here; the algorithm comes from the contract.
const algorithm = contract.match(/### Startup decision\s+```text\n([\s\S]*?)\n```/)?.[1];
if (!algorithm) throw new Error("README startup decision code block is missing");

const all = "ready upgrade downgrade restore initialize invalid backup-error";
const scenarios = [
  all,
  all,
  "restore initialize backup-error",
  "restore initialize backup-error",
  "restore",
  "ready upgrade downgrade restore initialize",
  "ready upgrade downgrade restore initialize",
  "ready upgrade restore initialize",
];
const lines = algorithm.split("\n");
if (lines.length !== scenarios.length) {
  throw new Error("Startup decision scenario annotations must match the README algorithm");
}

export const startupCode = lines.map((line, index) => ({
  html: line
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replace(
      /\b(?:if|not)\b|(?:serving|observe_local_state|observe_backup|native_start|await_native_success|restore)\([^)]*\)/g,
      (token) => {
        return `<span class="text-code-keyword">${token}</span>`;
      },
    ),
  scenarios: scenarios[index],
}));
