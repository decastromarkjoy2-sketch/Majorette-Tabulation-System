---
name: Node TypeScript test imports
description: How to keep dependency-free Node 24 tests working when they directly import TypeScript source.
---

When a Node 24 test runs TypeScript source with `--experimental-strip-types`, use an explicit `.ts` extension for imports between the source modules reached by that test, and enable `allowImportingTsExtensions` in that package's no-emit TypeScript configuration.

**Why:** Node's native type stripping does not resolve extensionless TypeScript ESM imports, while the production esbuild bundle does. Without the explicit source specifier, tests fail before running even though the production build succeeds.

**How to apply:** Keep this convention limited to modules that must be imported directly by the dependency-free Node test runner. Confirm both `node --experimental-strip-types --test` and the production bundle after changing an import.