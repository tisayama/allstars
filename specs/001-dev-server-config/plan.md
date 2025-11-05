# Implementation Plan: Development Server Configuration

**Branch**: `001-dev-server-config` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-dev-server-config/spec.md`

## Summary

Configure `pnpm run dev` to include projector-app and assign fixed ports to all Vite applications (admin-5170, host-5175, participant-5180, projector-5185). This eliminates the need for developers to manually start projector-app and prevents port conflicts by disabling V ite's automatic port fallback behavior. Changes are limited to configuration files (package.json, vite.config.ts) with no application code modifications required.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+ (Vite development servers)
**Primary Dependencies**: Vite 5.0, Concurrently 9.2, PNPM workspaces
**Storage**: N/A (configuration-only changes)
**Testing**: Manual verification of port assignments and service startup
**Target Platform**: Development environment (Linux, macOS, Windows)
**Project Type**: Monorepo with multiple frontend applications
**Performance Goals**: Complete environment startup in <30 seconds
**Constraints**: Must maintain cross-platform compatibility, no production build changes
**Scale/Scope**: 4 Vite applications + 2 existing services (socket-server, Firebase emulators)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS
- **Compliant**: All changes are configuration-only within existing apps/ structure
- No new apps or packages created
- Changes affect root package.json and individual app vite.config.ts files
- Maintains workspace dependencies and structure

### Principle II: Test-Driven Development (TDD) ⚠️ PARTIAL
- **Status**: Configuration changes are inherently difficult to unit test
- **Mitigation**: Manual verification tests will be documented in plan
- **Acceptance**: Configuration correctness verified by:
  1. Starting `pnpm run dev` and confirming all 6 services start
  2. Verifying each Vite app uses assigned port
  3. Testing port conflict scenarios with intentional conflicts
  4. Checking concurrently log labels show correct colors

### Principle III: OpenAPI-First API Design ✅ N/A
- **Not Applicable**: No API changes, only configuration modifications

### Principle IV: Code Quality Gates ✅ PASS
- **Linting**: JSON and TypeScript config files will be validated
- **Tests**: Manual verification protocol documented
- **Verification**: Multi-stage validation (service startup, port binding, label display)

### Principle V: Shell Command Safety ✅ PASS
- **Compliant**: No new shell commands introduced
- Existing concurrently commands maintain timeout behavior via process management

### Principle VI: Protected Main Branch ✅ PASS
- **Compliant**: Working on feature branch `001-dev-server-config`
- Changes will be merged via pull request
- No direct commits to master

**Gate Result**: ✅ PROCEED - All applicable principles satisfied. TDD partial compliance justified by configuration-only nature of changes.

## Project Structure

### Documentation (this feature)

```text
specs/001-dev-server-config/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output - N/A for config-only feature
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/           # Phase 1 output - N/A for config-only feature
```

### Source Code (repository root)

```text
/allstars/ (Monorepo Root)
├── package.json                        # UPDATE: Add projector to dev script, update concurrently config
├── apps/
│   ├── admin-app/
│   │   └── vite.config.ts             # UPDATE: Set port to 5170, strictPort: true
│   ├── host-app/
│   │   └── vite.config.ts             # UPDATE: Set port to 5175, strictPort: true
│   ├── participant-app/
│   │   └── vite.config.ts             # UPDATE: Set port to 5180, strictPort: true
│   └── projector-app/
│       └── vite.config.ts             # UPDATE: Set port to 5185, strictPort: true
└── README.md or docs/development.md   # UPDATE: Document port assignments
```

**Structure Decision**: Changes are isolated to configuration files in the existing monorepo structure. No source code modifications required. All changes affect development workflow only, with zero impact on production builds or runtime application logic.

## Complexity Tracking

> **No Constitution violations requiring justification**

All principles are satisfied or appropriately N/A for this configuration-focused feature.
