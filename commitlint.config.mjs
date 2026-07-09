/**
 * Commitlint config — enforces R-Q4 (docs/12_Project_Rules.md §6):
 * conventional commits with module scopes, squash-merged so `main` reads as
 * a changelog. Runs locally via the husky commit-msg hook; CI additionally
 * lints PR titles (the squash-merge commit message).
 */

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // R-Q4 — allowed commit types.
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "docs",
        "chore",
        "test",
        "perf",
        "ci",
        "build",
        "revert",
      ],
    ],
    // R-Q4 / §8 naming — scopes are module names in kebab-case,
    // e.g. `feat(finance): stripe payment links`.
    "scope-case": [2, "always", "kebab-case"],
    // R-Q4 — keep headers changelog-friendly.
    "header-max-length": [2, "always", 100],
  },
};
