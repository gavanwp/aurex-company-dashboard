/**
 * @aurexos/config/eslint — shared ESLint flat-config preset.
 *
 * Encodes the mechanically-enforceable rules of the Engineering Constitution
 * (docs/12_Project_Rules.md) and the import-boundary matrix
 * (docs/13_Folder_Structure.md §5). Rule IDs (R-T2, R-A1, …) are cited inline
 * so lint failures can be traced straight back to the rule they enforce.
 *
 * Usage (root eslint.config.mjs):
 *
 *   import { createConfig } from "@aurexos/config/eslint";
 *   export default createConfig({ rootPath: import.meta.dirname });
 *
 * `rootPath` must be the monorepo root. It anchors both the type-aware parser
 * (projectService) and eslint-plugin-boundaries path matching, so `eslint .`
 * behaves identically whether invoked from the repo root or from a package
 * directory (as `turbo run lint` does).
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

/**
 * R-AI1 — All model calls through the AI gateway. Only.
 * Provider SDK imports are banned everywhere; the packages/ai override below
 * re-allows them inside the gateway package.
 */
const BANNED_PROVIDER_SDKS = [
  {
    name: "@anthropic-ai/sdk",
    message:
      "R-AI1: direct provider SDK imports are banned outside packages/ai. Call the AI gateway instead.",
  },
  {
    name: "openai",
    message:
      "R-AI1: direct provider SDK imports are banned outside packages/ai. Call the AI gateway instead.",
  },
  {
    name: "@google/generative-ai",
    message:
      "R-AI1: direct provider SDK imports are banned outside packages/ai. Call the AI gateway instead.",
  },
];

/**
 * @param {{ rootPath: string }} options
 * @returns {import("typescript-eslint").ConfigArray}
 */
export function createConfig({ rootPath }) {
  return tseslint.config(
    // ── Base recommended sets ────────────────────────────────────────────
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // ── Type-aware parsing (needed for no-floating-promises, R-Q6) ──────
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: rootPath,
        },
      },
      rules: {
        // R-Q6 — no swallowed promise rejections.
        "@typescript-eslint/no-floating-promises": "error",
      },
    },

    // ── Constitution rules (docs/12_Project_Rules.md) ────────────────────
    {
      linterOptions: {
        reportUnusedDisableDirectives: "error",
      },
      rules: {
        // R-T2 — No `any`. Ever.
        "@typescript-eslint/no-explicit-any": "error",
        // R-T2 — @ts-ignore banned outright; @ts-expect-error requires an
        // adjacent description (why + tracked issue link).
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
            "ts-check": false,
            minimumDescriptionLength: 10,
          },
        ],
        // R-T5 — No non-null assertions outside tests (test override below).
        "@typescript-eslint/no-non-null-assertion": "error",
        // R-Q6 — no empty blocks / empty catch: errors are handled or
        // propagated deliberately.
        "no-empty": ["error", { allowEmptyCatch: false }],
        // R-Q1 — no TODO-driven development. Deferred work becomes a tracked
        // issue, not a comment. Error (not warn) per docs/12 §6.
        "no-warning-comments": [
          "error",
          { terms: ["todo", "fixme"], location: "anywhere" },
        ],
        // R-S3 — env vars are Zod-validated at boot; raw process.env access
        // is banned outside the env module / packages/config (override below).
        "no-restricted-properties": [
          "error",
          {
            object: "process",
            property: "env",
            message:
              "R-S3: raw process.env is banned. Import the Zod-validated env module (apps/web/lib/env.ts) or a packages/config preset instead.",
          },
        ],
        // R-AI1 — provider SDKs only inside packages/ai (override below).
        "no-restricted-imports": ["error", { paths: BANNED_PROVIDER_SDKS }],
      },
    },

    // ── Import hygiene & boundaries (R-A1, R-A5; docs/13 §5) ─────────────
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        boundaries,
        import: importPlugin,
      },
      settings: {
        // Anchor boundaries matching to the monorepo root so per-package
        // `eslint .` (turbo) and root `eslint .` agree on element types.
        "boundaries/root-path": rootPath,
        // Track re-exports and dynamic imports too, not just static imports.
        "boundaries/dependency-nodes": ["import", "dynamic-import", "export"],
        // First match wins — most specific patterns first.
        "boundaries/elements": [
          // Each feature module inside apps/web is its own element so the
          // public-surface rule (docs/13 §3) can be enforced per module.
          {
            type: "module",
            pattern: ["apps/web/modules/*"],
            mode: "folder",
            capture: ["moduleName"],
          },
          // The rest of the app: routes (app/), lib/, middleware.
          { type: "app", pattern: ["apps/*"], mode: "folder", capture: ["appName"] },
          { type: "ui", pattern: ["packages/ui"], mode: "folder" },
          { type: "core", pattern: ["packages/core"], mode: "folder" },
          // packages/ai may not exist yet (Phase 1 scaffold) — defined ahead
          // of time so the matrix is already enforced the day it lands.
          { type: "ai", pattern: ["packages/ai"], mode: "folder" },
          { type: "db", pattern: ["packages/db"], mode: "folder" },
          { type: "config", pattern: ["packages/config"], mode: "folder" },
        ],
        // Resolve TS path aliases (@/*) and workspace packages (@aurexos/*)
        // to their real source files so boundaries sees them as local elements.
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"],
        },
        "import/resolver": {
          typescript: { alwaysTryTypes: true },
          node: { extensions: [".js", ".mjs", ".ts", ".tsx"] },
        },
        "import/extensions": [".js", ".mjs", ".ts", ".tsx"],
      },
      rules: {
        // R-A1 / R-A5 — the import-boundary matrix from docs/13 §5.
        // Anything not explicitly allowed is a lint error.
        "boundaries/element-types": [
          "error",
          {
            default: "disallow",
            message:
              "R-A1/R-A5: '${file.type}' code may not import '${dependency.type}' (docs/13_Folder_Structure.md §5).",
            rules: [
              // apps/web → everything (modules cross-import via public surface,
              // enforced separately by boundaries/entry-point below).
              {
                from: ["app", "module"],
                allow: ["app", "module", "ui", "core", "ai", "db", "config"],
              },
              // ui → ui, core (types/schemas), config. Never db/ai/app.
              { from: ["ui"], allow: ["ui", "core", "config"] },
              // core is the dependency root: itself and config only.
              { from: ["core"], allow: ["core", "config"] },
              // ai runs headless: never ui, never app.
              { from: ["ai"], allow: ["ai", "core", "db", "config"] },
              // db runs headless: never ui, never ai, never app.
              { from: ["db"], allow: ["db", "core", "config"] },
              { from: ["config"], allow: ["config"] },
            ],
          },
        ],
        // R-A1 / docs/13 §3 — module public surface: other code reaches a
        // module ONLY through its root index.ts. A module importing its own
        // internals is a same-element (internal) import, which the boundaries
        // plugin correctly leaves alone — this is why entry-point is used here
        // instead of a no-restricted-imports pattern approximation.
        "boundaries/entry-point": [
          "error",
          {
            default: "disallow",
            message:
              "R-A1: cross-module imports go through the module's public surface (modules/*/index.ts) — never its internals (docs/13 §3).",
            rules: [
              { target: ["module"], allow: ["index.ts", "index.tsx"] },
              // Packages define their own public surface via package.json
              // "exports"; the app element has no entry-point restriction.
              { target: ["app", "ui", "core", "ai", "db", "config"], allow: "**" },
            ],
          },
        ],
        // R-A5 — circular imports are failures (madge double-checks in CI).
        "import/no-cycle": "error",
        // R-A5 — packages import each other by name (@aurexos/*), never by
        // relative path; relative escapes would bypass package "exports".
        "import/no-relative-packages": "error",
        "import/no-self-import": "error",
      },
    },

    // ── Scoped overrides ─────────────────────────────────────────────────

    // R-T5 — test files may use non-null assertions.
    {
      files: ["**/*.test.*", "**/*.spec.*", "**/e2e/**"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },

    // R-S3 — the only legitimate homes of raw process.env: the Zod-validated
    // env module and shared tooling presets. Build-time framework config
    // (next.config.ts, tailwind.config.ts, …) runs outside the app boundary
    // before env.ts exists, so *.config.* files are exempted too.
    {
      files: [
        "**/lib/env.ts",
        "packages/config/**",
        "**/*.config.{js,mjs,cjs,ts}",
      ],
      rules: {
        "no-restricted-properties": "off",
      },
    },

    // R-AI1 — the AI gateway package is the one place provider SDKs may be
    // imported; the global ban is lifted here and only here.
    {
      files: ["packages/ai/**"],
      rules: {
        "no-restricted-imports": "off",
      },
    },

    // packages/config has no tsconfig project of its own (it *is* the tooling
    // package) — type-aware rules can't run there.
    {
      files: ["packages/config/**/*.ts"],
      ...tseslint.configs.disableTypeChecked,
    },

    // Plain JS/config files (eslint.config.mjs, commitlint.config.mjs, …)
    // are not part of any TS project — disable type-aware rules.
    {
      files: ["**/*.{js,mjs,cjs}"],
      ...tseslint.configs.disableTypeChecked,
    },

    // next-env.d.ts is Next.js-generated and uses triple-slash references by
    // design; don't flag generated code we cannot change.
    {
      files: ["**/next-env.d.ts"],
      rules: {
        "@typescript-eslint/triple-slash-reference": "off",
      },
    },

    // ── Prettier last: silence stylistic rules; formatting is Prettier's job.
    prettier
  );
}

export default createConfig;
