/**
 * Root ESLint flat config for the AurexOS monorepo.
 *
 * All rules live in the shared preset (packages/config/eslint) so every
 * package lints identically — see docs/12_Project_Rules.md ("Engineering
 * Constitution") and docs/13_Folder_Structure.md §5 (import boundaries).
 *
 * Per-package `eslint .` (run by `turbo run lint`) resolves to this file by
 * walking up the directory tree; `rootPath` keeps boundary matching and the
 * type-aware parser anchored to the repo root regardless of lint cwd.
 */

import { createConfig } from "@aurexos/config/eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      // Deno runtime — linted separately with the Deno toolchain, not here.
      "supabase/functions/**",
      // Colocated web unit tests run under Vitest, not the Next app tsconfig
      // (they're excluded from apps/web/tsconfig.json), so the type-aware
      // project service can't see them — lint them via their Vitest run.
      "apps/web/**/*.test.ts",
      "apps/web/**/*.test.tsx",
      // Generated declaration files, except Next's marker file (re-included
      // below; the preset disables the one rule it would trip).
      "**/*.d.ts",
      "!**/next-env.d.ts",
    ],
  },
  ...createConfig({ rootPath: import.meta.dirname }),
];
