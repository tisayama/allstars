# Tasks: Admin Dashboard for Pre-Event Quiz Setup

**Input**: Design documents from `/specs/004-admin-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-server.yaml

**Tests**: Following TDD principle from plan.md - tests will be written first for each user story

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend SPA**: `apps/admin-app/src/`, `apps/admin-app/tests/`
- **Shared types**: `packages/types/src/`
- **Public assets**: `apps/admin-app/public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create admin-app directory structure per plan.md at apps/admin-app/
- [ ] T002 Initialize Vite + React + TypeScript project in apps/admin-app/ with package.json
- [ ] T003 [P] Install core dependencies: React 18.2, Vite 5.0, TypeScript 5.3 in apps/admin-app/
- [ ] T004 [P] Install Firebase SDK 10.7 (auth, firestore, functions) in apps/admin-app/
- [ ] T005 [P] Install form dependencies: React Hook Form 7.48, Zod 3.22 in apps/admin-app/
- [ ] T006 [P] Install UI dependencies: Tailwind CSS, qrcode.react 4.0, PapaParse 5.4 in apps/admin-app/
- [ ] T007 [P] Install dev dependencies: Vitest, React Testing Library, ESLint, Prettier in apps/admin-app/
- [ ] T008 Configure TypeScript compiler options in apps/admin-app/tsconfig.json (strict mode, React JSX)
- [ ] T009 [P] Configure Vite build tool in apps/admin-app/vite.config.ts (path aliases, env variables)
- [ ] T010 [P] Configure Tailwind CSS in apps/admin-app/tailwind.config.js and apps/admin-app/src/index.css
- [ ] T011 [P] Configure ESLint + Prettier in apps/admin-app/.eslintrc.js
- [ ] T012 [P] Configure Vitest in apps/admin-app/vitest.config.ts
- [ ] T013 Create .env.local template in apps/admin-app/.env.example with emulator configuration and VITE_PARTICIPANT_APP_URL for QR code generation
- [ ] T014 [P] Initialize shadcn/ui components library in apps/admin-app/ (button, input, label, select, textarea, toast, dialog, dropdown-menu)
- [ ] T015 Create HTML entry point in apps/admin-app/index.html
- [ ] T016 Add workspace dependency @allstars/types to apps/admin-app/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T017 Create shared TypeScript types for Question entity in packages/types/src/Question.ts
- [ ] T018 [P] Create shared TypeScript types for Guest entity in packages/types/src/Guest.ts
- [ ] T019 [P] Create shared TypeScript types for GameSettings entity in packages/types/src/GameSettings.ts
- [ ] T020 [P] Create shared TypeScript types for Choice entity in packages/types/src/Choice.ts
- [ ] T021 Create Zod validation schema for Question in packages/types/src/validators/question.ts
- [ ] T022 [P] Create Zod validation schema for Guest in packages/types/src/validators/guest.ts
- [ ] T023 [P] Create Zod validation schema for GameSettings in packages/types/src/validators/settings.ts
- [ ] T024 [P] Export all types from packages/types/src/index.ts
- [ ] T025 Implement Firebase SDK initialization in apps/admin-app/src/lib/firebase.ts (auth, firestore, storage, emulator connections, validate VITE_PARTICIPANT_APP_URL at startup per FR-053)
- [ ] T026 Implement API client with authentication in apps/admin-app/src/lib/api-client.ts (Bearer token, error handling)
- [ ] T027 Implement auth helper with token refresh logic in apps/admin-app/src/lib/auth.ts (monitor expiration, refresh 5min before expiry)
- [ ] T028 Create useAuth hook in apps/admin-app/src/hooks/useAuth.ts (login, logout, token refresh, user state)
- [ ] T029 [P] Create ErrorBoundary component in apps/admin-app/src/components/shared/ErrorBoundary.tsx
- [ ] T030 [P] Create LoadingSpinner component in apps/admin-app/src/components/shared/LoadingSpinner.tsx
- [ ] T031 Create ProtectedRoute component in apps/admin-app/src/components/layout/ProtectedRoute.tsx (redirects unauthenticated users)
- [ ] T032 Create AppShell layout component in apps/admin-app/src/components/layout/AppShell.tsx (navigation sidebar, header)
- [ ] T033 Create main App router in apps/admin-app/src/App.tsx (React Router, auth provider context)
- [ ] T034 Create main entry point in apps/admin-app/src/main.tsx (render App component)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Dashboard Authentication and Overview (Priority: P1) 🎯 MVP

**Goal**: Event organizers can log in with Google and see dashboard with quiz/guest statistics

**Independent Test**: Log in with Google account in Firebase emulator, verify dashboard displays "X Questions in Y Periods" and "Z Guests Registered", navigate to Quiz Management and Guest Management links

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T035 [P] [US1] Unit test for useAuth hook in apps/admin-app/tests/unit/hooks/useAuth.test.ts (login, logout, token refresh)
- [ ] T036 [P] [US1] Component test for LoginPage in apps/admin-app/tests/component/LoginPage.test.tsx (render, button click, redirect)
- [ ] T037 [P] [US1] Integration test for authentication flow in apps/admin-app/tests/integration/auth.test.ts (Google OAuth, Firebase emulator)
- [ ] T038 [P] [US1] Component test for DashboardPage in apps/admin-app/tests/component/DashboardPage.test.tsx (statistics display, navigation links)

### Implementation for User Story 1

- [ ] T039 [US1] Implement LoginPage component in apps/admin-app/src/pages/LoginPage.tsx (Google sign-in button, signInWithPopup)
- [ ] T040 [US1] Implement DashboardPage component in apps/admin-app/src/pages/DashboardPage.tsx (fetch question/guest counts, display statistics, navigation links)
- [ ] T041 [US1] Add /login and / routes to App.tsx router (/ protected, redirects to /login if unauthenticated)
- [ ] T042 [US1] Add error handling for expired tokens (redirect to login on 401, preserve form state)
- [ ] T043 [US1] Add loading states for dashboard statistics (LoadingSpinner component)
- [ ] T044 [US1] Verify tests pass and authentication flow works in Firebase emulator

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - admins can log in and see dashboard

---

## Phase 4: User Story 2 - Quiz Question Management (Priority: P1)

**Goal**: Event organizers can create, edit, delete, and view quiz questions with full CRUD operations

**Independent Test**: Create a new question with period=1, questionNumber=1, type=four_choice, add 4 choices, submit; edit the question; delete the question; verify all operations succeed via API calls

### Tests for User Story 2

- [ ] T045 [P] [US2] Unit test for useQuestions hook in apps/admin-app/tests/unit/hooks/useQuestions.test.ts (fetch, create, update, delete)
- [ ] T046 [P] [US2] Unit test for question form validation in apps/admin-app/tests/unit/utils/questionValidation.test.ts (Zod schema validation)
- [ ] T047 [P] [US2] Component test for QuestionForm in apps/admin-app/tests/component/QuestionForm.test.tsx (form fields, dynamic choices, submit)
- [ ] T048 [P] [US2] Component test for QuestionList in apps/admin-app/tests/component/QuestionList.test.tsx (render grouped questions, edit/delete buttons)
- [ ] T049 [P] [US2] Integration test for question CRUD flow in apps/admin-app/tests/integration/questions.test.ts (create → edit → delete via API)

### Implementation for User Story 2

- [ ] T050 [P] [US2] Implement useQuestions hook in apps/admin-app/src/hooks/useQuestions.ts (GET /admin/quizzes, POST, PUT, DELETE)
- [ ] T051 [P] [US2] Implement QuestionChoiceField component in apps/admin-app/src/components/questions/QuestionChoiceField.tsx (choice id, text, imageUrl inputs, add/remove buttons)
- [ ] T052 [US2] Implement QuestionForm component in apps/admin-app/src/components/questions/QuestionForm.tsx (React Hook Form + Zod validation, dynamic choices, submit handler)
- [ ] T053 [US2] Implement QuestionList component in apps/admin-app/src/components/questions/QuestionList.tsx (group by period, sort by questionNumber, edit/delete buttons)
- [ ] T054 [US2] Implement QuestionsPage component in apps/admin-app/src/pages/QuestionsPage.tsx (render QuestionList, "New Question" button, modal for QuestionForm)
- [ ] T055 [US2] Add /questions route to App.tsx router (protected route)
- [ ] T056 [US2] Add client-side validation with user-friendly error messages (highlight invalid fields, preserve input, actionable guidance per FR-014)
- [ ] T057 [US2] Add confirmation dialog for delete operations (prevent accidental deletion)
- [ ] T058 [US2] Add error handling for duplicate (period, questionNumber) combinations (display "Period X, Question Y already exists" message)
- [ ] T059 [US2] Verify tests pass and question CRUD works end-to-end in Firebase emulator

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - admins can manage quiz questions

---

## Phase 5: User Story 3 - Guest List Management (Priority: P2)

**Goal**: Event organizers can create, edit, delete guests individually and bulk import via CSV template

**Independent Test**: Add a guest manually with name="John Doe", tableNumber=5, attributes=["groom_friend"]; download CSV template, fill with 5 guests, upload; verify all guests appear in list; delete a guest

### Tests for User Story 3

- [ ] T060 [P] [US3] Unit test for useGuests hook in apps/admin-app/tests/unit/hooks/useGuests.test.ts (fetch, create, update, delete)
- [ ] T061 [P] [US3] Unit test for CSV parser in apps/admin-app/tests/unit/utils/csv-parser.test.ts (PapaParse, template validation, error messages)
- [ ] T062 [P] [US3] Component test for GuestForm in apps/admin-app/tests/component/GuestForm.test.tsx (form fields, attribute tags, submit)
- [ ] T063 [P] [US3] Component test for GuestList in apps/admin-app/tests/component/GuestList.test.tsx (render table, edit/delete buttons)
- [ ] T064 [P] [US3] Component test for GuestCSVUpload in apps/admin-app/tests/component/GuestCSVUpload.test.tsx (file input, upload, validation errors)
- [ ] T065 [P] [US3] Integration test for guest CRUD flow in apps/admin-app/tests/integration/guests.test.ts (create → edit → delete via API)
- [ ] T066 [P] [US3] Integration test for CSV bulk import in apps/admin-app/tests/integration/csvImport.test.ts (upload template, validate, create multiple guests)

### Implementation for User Story 3

- [ ] T067 [P] [US3] Implement useGuests hook in apps/admin-app/src/hooks/useGuests.ts (GET /admin/guests, POST, PUT, DELETE)
- [ ] T068 [P] [US3] Create CSV template file in apps/admin-app/public/guest-template.csv with headers and 3 sample rows per FR-034a: "John Doe,5,\"groom_friend,speech_guest\"", "Jane Smith,3,\"bride_family\"", "Robert Johnson,7,\"\""
- [ ] T069 [P] [US3] Implement CSV parser utility in apps/admin-app/src/utils/csv-parser.ts (PapaParse config, validate structure, parse attributes)
- [ ] T070 [US3] Implement GuestForm component in apps/admin-app/src/components/guests/GuestForm.tsx (React Hook Form + Zod validation, attribute tag input)
- [ ] T071 [US3] Implement GuestList component in apps/admin-app/src/components/guests/GuestList.tsx (table with Name, Table, Attributes columns, edit/delete buttons)
- [ ] T072 [US3] Implement GuestCSVUpload component in apps/admin-app/src/components/guests/GuestCSVUpload.tsx (file input, template download link, upload handler, validation errors)
- [ ] T073 [US3] Implement GuestsPage component in apps/admin-app/src/pages/GuestsPage.tsx (render GuestList, "Add Guest" button, "Upload CSV" button, modals for forms)
- [ ] T074 [US3] Add /guests route to App.tsx router (protected route)
- [ ] T075 [US3] Add CSV validation with template reference in error messages (FR-032, FR-033: "Row 5, Column 'TableNumber': must be a positive integer. Please check guest-template.csv for correct format.")
- [ ] T076 [US3] Add error handling for malformed CSV files (block action, show specific row/column errors, preserve file for correction)
- [ ] T077 [US3] Add bulk import progress indicator (show "Importing 50 guests..." during API calls)
- [ ] T078 [US3] Verify tests pass and guest management works end-to-end in Firebase emulator

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - admins can manage guests via UI and CSV

---

## Phase 6: User Story 4 - QR Code Generation and Printing (Priority: P2)

**Goal**: Event organizers can generate unique QR codes for all guests and print them as physical cards

**Independent Test**: Navigate to Guests page, click "Print All", verify print page displays all guests with QR codes in print-optimized layout, scan a QR code with phone to verify URL format (https://[participant-app-domain]/join?token=[token])

### Tests for User Story 4

- [ ] T079 [P] [US4] Unit test for QR code generator in apps/admin-app/tests/unit/utils/qr-generator.test.ts (URL format, qrcode.react integration)
- [ ] T080 [P] [US4] Component test for GuestQRCode in apps/admin-app/tests/component/GuestQRCode.test.tsx (render QR code SVG, guest name)
- [ ] T081 [P] [US4] Component test for QRCodePrintPage in apps/admin-app/tests/component/QRCodePrintPage.test.tsx (render all guests, print layout CSS)
- [ ] T082 [P] [US4] Integration test for print flow in apps/admin-app/tests/integration/qrPrint.test.ts (fetch guests, generate QR codes, verify URLs)

### Implementation for User Story 4

- [ ] T083 [P] [US4] Implement QR code generator utility in apps/admin-app/src/utils/qr-generator.ts (URL format: {VITE_PARTICIPANT_APP_URL}/join?token={authToken} per FR-040)
- [ ] T084 [P] [US4] Implement GuestQRCode component in apps/admin-app/src/components/guests/GuestQRCode.tsx (qrcode.react SVG, guest name, table number)
- [ ] T085 [P] [US4] Implement PrintLayout component in apps/admin-app/src/components/layout/PrintLayout.tsx (remove header/sidebar for print, optimize card layout)
- [ ] T086 [US4] Implement QRCodePrintPage component in apps/admin-app/src/pages/QRCodePrintPage.tsx (fetch all guests, render grid of GuestQRCode components, print CSS)
- [ ] T087 [US4] Add /print route to App.tsx router (protected route, uses PrintLayout)
- [ ] T088 [US4] Add "Print All" button to GuestsPage (link to /print route)
- [ ] T089 [US4] Add print-optimized CSS for QR code cards (page breaks, card sizing for standard paper, @media print)
- [ ] T090 [US4] Add loading state for QR code generation (show spinner while generating 100+ QR codes)
- [ ] T091 [US4] Verify tests pass and QR code generation works in Firebase emulator (use test tokens)

**Checkpoint**: At this point, User Stories 1-4 should all work independently - admins can print QR code cards

---

## Phase 7: User Story 5 - Game Configuration (Priority: P3)

**Goal**: Event organizers can configure default game settings (dropout rule, ranking rule) before the event

**Independent Test**: Navigate to Settings page, verify current settings display, change dropout rule to "worst_one" and ranking rule to "point", save, verify gameState/live document updated via API

### Tests for User Story 5

- [ ] T092 [P] [US5] Unit test for useSettings hook in apps/admin-app/tests/unit/hooks/useSettings.test.ts (GET /admin/settings, PUT /admin/settings)
- [ ] T093 [P] [US5] Component test for SettingsPage in apps/admin-app/tests/component/SettingsPage.test.tsx (render current settings, dropdowns, save button)
- [ ] T094 [P] [US5] Integration test for settings update flow in apps/admin-app/tests/integration/settings.test.ts (fetch → update → verify via API)

### Implementation for User Story 5

- [ ] T095 [US5] Implement useSettings hook in apps/admin-app/src/hooks/useSettings.ts (GET /admin/settings, PUT /admin/settings with merge: true per FR-048)
- [ ] T096 [US5] Implement SettingsPage component in apps/admin-app/src/pages/SettingsPage.tsx (React Hook Form, dropdowns for dropout/ranking rules, save button with Firestore merge operation)
- [ ] T097 [US5] Add /settings route to App.tsx router (protected route)
- [ ] T098 [US5] Add settings navigation link to AppShell sidebar
- [ ] T099 [US5] Add success toast notification after saving settings ("Settings updated successfully")
- [ ] T100 [US5] Add error handling for failed settings updates (display error message, preserve form state)
- [ ] T101 [US5] Verify tests pass and settings configuration works end-to-end in Firebase emulator

**Checkpoint**: All user stories (1-5) should now be independently functional - full admin dashboard ready

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T102 [P] Add form auto-save draft functionality to QuestionForm and GuestForm (localStorage backup)
- [ ] T103 [P] Add search/filter functionality to QuestionList (filter by period, search by text)
- [ ] T104 [P] Add search/filter functionality to GuestList (filter by table, search by name)
- [ ] T105 [P] Add pagination to QuestionList and GuestList (load 50 items per page)
- [ ] T106 [P] Add sorting controls to GuestList (sort by name, table number)
- [ ] T107 [P] Implement image upload for question choices per FR-016a (Firebase Storage client-side upload, store download URL in imageUrl field)
- [ ] T108 [P] Add keyboard shortcuts for common actions (Ctrl+N for new question, Ctrl+S for save)
- [ ] T109 [P] Add dark mode support (Tailwind dark: classes, user preference toggle)
- [ ] T110 [P] Optimize bundle size (code splitting by route, lazy loading)
- [ ] T111 [P] Add analytics tracking for admin actions (Google Analytics or Firebase Analytics)
- [ ] T112 [P] Add comprehensive error logging (Sentry or Firebase Crashlytics integration)
- [ ] T113 [P] Write README.md for admin-app in apps/admin-app/README.md (setup instructions, deployment guide)
- [ ] T114 Run quickstart.md validation (follow all steps, verify setup works)
- [ ] T115 Run full test suite (pnpm test) and verify 80%+ coverage
- [ ] T116 Run linting and formatting (pnpm lint, pnpm format)
- [ ] T117 Run production build (pnpm build) and verify no errors
- [ ] T118 Deploy to Firebase Hosting staging environment for user acceptance testing
- [ ] T119 [P] Validate performance benchmarks per SC-003, SC-005, SC-009 using Lighthouse and performance profiling (dashboard load <2s, QR generation <5s for 100 guests, CSV import 100+ rows)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational - No dependencies on other stories
  - US2 (P1): Can start after Foundational - No dependencies on other stories (parallel with US1)
  - US3 (P2): Can start after Foundational - No dependencies on other stories (parallel with US1/US2)
  - US4 (P2): Depends on US3 (needs guests to exist for QR codes)
  - US5 (P3): Can start after Foundational - No dependencies on other stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: **Depends on User Story 3** (needs guests for QR code generation)
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD principle)
- Hooks before components (data layer before UI)
- Utility functions before components that use them
- Components before pages that compose them
- Pages before router integration
- Core implementation before error handling polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - US1, US2, US3, US5 can all start in parallel (US4 waits for US3)
  - If solo developer: prioritize US1 → US2 → US3 → US4 → US5
- All tests for a user story marked [P] can run in parallel
- Utilities and hooks within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 2 (Quiz Question Management)

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for useQuestions hook in apps/admin-app/tests/unit/hooks/useQuestions.test.ts"
Task: "Unit test for question form validation in apps/admin-app/tests/unit/utils/questionValidation.test.ts"
Task: "Component test for QuestionForm in apps/admin-app/tests/component/QuestionForm.test.tsx"
Task: "Component test for QuestionList in apps/admin-app/tests/component/QuestionList.test.tsx"
Task: "Integration test for question CRUD flow in apps/admin-app/tests/integration/questions.test.ts"

# After tests fail, launch parallel implementation tasks:
Task: "Implement useQuestions hook in apps/admin-app/src/hooks/useQuestions.ts"
Task: "Implement QuestionChoiceField component in apps/admin-app/src/components/questions/QuestionChoiceField.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T016)
2. Complete Phase 2: Foundational (T017-T034) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 - Authentication (T035-T044)
4. **VALIDATE US1**: Test login, dashboard display independently
5. Complete Phase 4: User Story 2 - Quiz Management (T045-T059)
6. **VALIDATE US2**: Test question CRUD independently
7. **STOP and DEMO**: MVP ready - admins can log in and manage questions (core value delivered)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T034)
2. Add US1 → Test independently → Deploy/Demo (login + dashboard - MVP milestone 1)
3. Add US2 → Test independently → Deploy/Demo (question management - MVP milestone 2)
4. Add US3 → Test independently → Deploy/Demo (guest management)
5. Add US4 → Test independently → Deploy/Demo (QR code printing - event-ready milestone)
6. Add US5 → Test independently → Deploy/Demo (game configuration)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T034)
2. Once Foundational is done:
   - Developer A: User Story 1 (T035-T044)
   - Developer B: User Story 2 (T045-T059)
   - Developer C: User Story 3 (T060-T078)
   - Developer D: User Story 5 (T092-T101)
3. After US3 completes: Developer C continues with User Story 4 (T079-T091)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Write tests first (TDD) - verify they fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Use Firebase emulator for all development and testing
- Use @allstars/types shared package for type safety across monorepo
- Follow error handling strategy from spec.md: block action, show user-friendly error, preserve input
- CSV template (guest-template.csv) must be downloadable from UI with 3 sample rows demonstrating edge cases per FR-034a
- Token refresh happens automatically 5 minutes before expiry (FR-003, FR-004)
- All validation errors must include actionable guidance (e.g., "Period 2, Question 3 already exists. Please use a different question number or edit the existing question.")
- VITE_PARTICIPANT_APP_URL environment variable must be validated at app startup per FR-053
- Image uploads use Firebase Storage with client-side upload per FR-016a
- Game settings updates use Firestore merge operation (merge: true) per FR-048 to preserve other gameState fields
- FR-007 (api-server admin privilege verification) is out of scope for this feature per plan.md - handled by api-server implementation
