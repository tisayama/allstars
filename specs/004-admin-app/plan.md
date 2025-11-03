# Implementation Plan: Admin Dashboard for Pre-Event Quiz Setup

**Branch**: `004-admin-app` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-admin-app/spec.md`

## Summary

The admin-app is a React-based web dashboard that enables event organizers (newly-weds) to prepare quiz content and guest lists before the wedding event. It provides full CRUD interfaces for quiz questions, guest management with CSV bulk upload, QR code generation for guest authentication, and game settings configuration.

**Technical Approach**: React 18 + TypeScript + Vite for the frontend, Firebase Authentication (Google OAuth) for admin access, REST API integration with the existing api-server (Firebase Cloud Functions), and Firebase emulator support for local development. The app uses shadcn/ui for UI components, React Hook Form with Zod for form validation, and integrates with the monorepo's shared type packages.

## Technical Context

**Language/Version**: TypeScript 5.3 (React 18.2+, ES2020 target)
**Primary Dependencies**: React 18.2, Vite 5.0, Firebase SDK 10.7, React Hook Form 7.48, Zod 3.22, shadcn/ui (Radix UI + Tailwind CSS), qrcode.react 4.0, PapaParse 5.4
**Storage**: Firebase Firestore (via api-server REST API), Firebase Storage (for question choice images)
**Testing**: Vitest (unit tests), React Testing Library (component tests)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+), deployed to Firebase Hosting
**Project Type**: Web application (frontend SPA)
**Performance Goals**: Dashboard loads in <2 seconds, form submissions complete in <500ms, QR code generation <5 seconds for 100+ guests
**Constraints**: <200ms p95 for API calls, client-side CSV parsing for 100+ row files, print-optimized QR code layouts, Firebase emulator compatibility
**Scale/Scope**: 2-5 concurrent admin users, manage 40-80 quiz questions, 50-200 guests per event, 5-10 pages/routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Monorepo Architecture ✅ PASS

**Compliance**: Admin-app will be created in `/apps/admin-app/` following the monorepo structure. It will consume shared types from `/packages/types/` for API contracts and may use shared UI components from `/packages/ui-components/` if applicable.

**Workspace Dependencies**:
- `@allstars/types` (workspace:*) - for Question, Guest, GameSettings types
- Shared Zod schemas for validation

**No Violations**: The admin-app is a new application fitting within the existing 6-app structure (participant-app, projector-app, host-app, admin-app, api-server, socket-server).

### Principle II: Test-Driven Development (TDD) ✅ PASS

**Compliance**: Implementation will follow Red-Green-Refactor cycle:
1. Write tests for each feature (question form, guest list, QR code generation)
2. Verify tests fail initially
3. Implement minimum code to pass tests
4. Refactor for code quality

**Test Coverage**: Target 80%+ coverage for business logic, form validation, API integration.

**Test Organization**:
```
apps/admin-app/tests/
├── unit/           # Form validation, utils, hooks
├── integration/    # API client, Firebase auth flow
└── component/      # React component tests
```

### Principle III: OpenAPI-First API Design ✅ PASS

**Compliance**: All REST API endpoints consumed by admin-app are defined in `/specs/004-admin-app/contracts/api-server.yaml` (OpenAPI 3.0.3 specification) BEFORE implementation.

**Contract Coverage**:
- `GET/POST/PUT/DELETE /admin/quizzes` (Question management)
- `GET/POST/PUT/DELETE /admin/guests` (Guest management)
- `GET/PUT /admin/settings` (Game settings)

**Type Generation**: TypeScript types will be generated from OpenAPI spec for API request/response validation.

**Note**: The api-server implementation of these endpoints is out of scope for this feature (assumes endpoints will be implemented separately or already exist).

### Principle IV: Code Quality Gates ✅ PASS

**Compliance**: All commits will pass quality gates:
1. **Linting**: ESLint + Prettier configured for React/TypeScript
2. **Tests**: All tests pass before commit (unit + integration + component)
3. **Verification**: Manual testing in Firebase emulator environment

**Pre-commit Checks**:
```bash
pnpm lint        # ESLint + TypeScript compiler
pnpm test        # Vitest test suite
pnpm build       # Vite production build
```

### Principle V: Shell Command Safety ✅ PASS

**Compliance**: All script commands use appropriate timeouts:
- Build: `timeout 300 pnpm build` (5 minutes max)
- Tests: `timeout 120 pnpm test` (2 minutes max)
- Linting: `timeout 60 pnpm lint` (1 minute max)

**Post-Design Re-check**: ✅ All principles remain compliant. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-app/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (tech stack research)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (developer setup guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── api-server.yaml  # OpenAPI 3.0.3 specification
├── checklists/
│   └── requirements.md  # Specification quality validation
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```text
apps/admin-app/          # New application
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components (Button, Input, etc.)
│   │   ├── questions/   # Question management components
│   │   │   ├── QuestionForm.tsx
│   │   │   ├── QuestionList.tsx
│   │   │   └── QuestionChoiceField.tsx
│   │   ├── guests/      # Guest management components
│   │   │   ├── GuestForm.tsx
│   │   │   ├── GuestList.tsx
│   │   │   ├── GuestCSVUpload.tsx
│   │   │   └── GuestQRCode.tsx
│   │   ├── layout/      # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PrintLayout.tsx
│   │   └── shared/      # Shared utilities
│   │       ├── ErrorBoundary.tsx
│   │       └── LoadingSpinner.tsx
│   ├── lib/             # Core utilities
│   │   ├── firebase.ts  # Firebase SDK initialization
│   │   ├── api-client.ts  # REST API client
│   │   └── auth.ts      # Auth helpers
│   ├── hooks/           # React hooks
│   │   ├── useAuth.ts
│   │   ├── useQuestions.ts
│   │   └── useGuests.ts
│   ├── pages/           # Route pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── QuestionsPage.tsx
│   │   ├── GuestsPage.tsx
│   │   ├── QRCodePrintPage.tsx
│   │   └── SettingsPage.tsx
│   ├── types/           # Local type definitions
│   │   └── api.ts
│   ├── utils/           # Utility functions
│   │   ├── csv-parser.ts
│   │   └── qr-generator.ts
│   ├── App.tsx          # Router + auth provider
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind imports
├── tests/               # Test suite
│   ├── unit/
│   ├── integration/
│   └── component/
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── .env.local           # Git-ignored environment variables
└── README.md

packages/types/          # Existing shared package (updated)
└── src/
    ├── Question.ts      # Question entity types
    ├── Guest.ts         # Guest entity types
    ├── GameSettings.ts  # Settings entity types
    └── validators/      # Zod schemas
        ├── question.ts
        ├── guest.ts
        └── settings.ts
```

**Structure Decision**: This is a frontend web application following Option 2 (Web application) structure from the template, but simplified to a frontend-only SPA since the backend (api-server) already exists in `/apps/api-server/`. The admin-app consumes REST APIs from the existing api-server via Firebase Cloud Functions.

The application lives in `/apps/admin-app/` per monorepo convention, with shared types in `/packages/types/`. No new backend code is created; all server-side logic is handled by the existing api-server (or will be added to api-server separately).

## Complexity Tracking

**No Constitution Violations** - This section is empty as all principles are compliant.
