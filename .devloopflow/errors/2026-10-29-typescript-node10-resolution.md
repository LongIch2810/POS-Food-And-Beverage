Status: resolved locally; awaiting review

# TypeScript 6 rejects the API module resolution setting

- Symptom: TS5107 reports `moduleResolution=node10` is deprecated for `POS_API/tsconfig.json`.
- Reproduction: TypeScript 6.0.2 with `--module commonjs --moduleResolution node` exits 2; see [compiler output](../qa-evidence/2026-10-29-173344-49f0f8d-ts6-config/ts6-old-resolution.log).
- Cause: `moduleResolution: "node"` aliases `node10`. The API runs directly on Node.js, while its config still used the legacy resolution mode.
- Fix: set both `module` and `moduleResolution` to `NodeNext` in `POS_API/tsconfig.json`.
- Verification: the configured TypeScript 5.9.3 build and TypeScript 6.0.2 compile exit 0; see [run.md](../qa-evidence/2026-10-29-173344-49f0f8d-ts6-config/run.md). Runtime and integration tests were not run for this config change.
- Related branch: `fix/typescript-module-resolution`.
