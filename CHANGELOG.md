# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.2](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.2.1...v0.2.2) (2026-02-xx)

### Breaking Changes

Migrated to `@mysten/sui@2` and `@scallop-io/sui-kit@2`. Minimum Node.js version is now 22+ (ESM-only).

- Update all API calls to use `SuiGrpcClient` with `client.core.*` namespace ([9e399bd](https://github.com/scallop-io/scallop-deepbook-kit/commit/9e399bd))
- Change transaction result access from `result.effects.status.status` to `(result.Transaction ?? result.FailedTransaction).status.success` ([9e399bd](https://github.com/scallop-io/scallop-deepbook-kit/commit/9e399bd))
- Change object access from `.data.content` to `.object` and `.json` for field access ([9e399bd](https://github.com/scallop-io/scallop-deepbook-kit/commit/9e399bd))

### Removed

- Nested `.fields` access patterns (v2 auto-unwraps fields from `.json`) ([9e399bd](https://github.com/scallop-io/scallop-deepbook-kit/commit/9e399bd))

### [0.2.1](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.2.0...v0.2.1) (2026-02-12)

### Changed

- ESM entrypoint now points to `dist/index.js` instead of `dist/index.mjs` in `package.json` exports (fixes ESM import resolution)

### [0.2.0](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.7...v0.2.0) (2026-02-12)

### Breaking Changes

- Set `"type": "module"` in `package.json` (all `.js` files are now ESM by default; update your imports and tooling if you relied on CommonJS)

### Changed

- Rename `env` to `network` in `DeepBookMarginPool` class
- Adjust tests
- Update `@mysten/deepbook-v3` package version
- Migrate from `jest` to `vitest`

### [0.1.7](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.6...v0.1.7) (2026-01-17)

### Fixed

- Avoid juggling between `Number` and `BigInt` conversion in `DeepBookMarginPool` class

### Changed

- Improve `DeepBookMarginPool` class test coverage

### [0.1.6](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.5...v0.1.6) (2026-01-17)

### Changed

- Update `MarginPoolParams` type

### [0.1.5](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.4...v0.1.5) (2026-01-16)

### Added

- Mainnet package support
- Add support to pass custom `DeepbookConfig` instance instead of changing constant config values

### Changed

- Default env value to `mainnet`

### Removed

- Hardcoded testnet and mainnet configs
- Config utils

### [0.1.4](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.3...v0.1.4) (2025-11-24)

### Fixed

- Fix interest calculation and model ([7dec47a](https://github.com/scallop-io/scallop-deepbook-kit/pull/9/commits/7dec47a9c756b8d8b1f52dfb728fff276ef7d62e))

### [0.1.3](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.2...v0.1.3) (2025-11-20)

### Changes

- Bump version

### [0.1.2](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.1...v0.1.2) (2025-11-20)

### Changes

- Bump version

### [0.1.1](https://github.com/scallop-io/scallop-deepbook-kit/compare/v0.1.0...v0.1.1) (2025-11-20)

### Changes

- Bump version

### [0.1.0](https://github.com/scallop-io/scallop-deepbook-kit) (2025-11-20)

### Added

- Initial version release
