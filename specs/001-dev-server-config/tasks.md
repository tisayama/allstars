# Tasks: Development Server Configuration

**Input**: Design documents from `/specs/001-dev-server-config/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), research.md (technical decisions), quickstart.md (verification procedures)

**Tests**: Configuration changes are validated through manual verification protocol (no unit tests for config files)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with apps/ structure:
- Configuration files: `apps/<app-name>/vite.config.ts`
- Root configuration: `package.json` at repository root
- Documentation: `README.md` or `docs/development.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and prerequisites

- [X] T001 Verify projector-app has "dev" script in apps/projector-app/package.json
- [X] T002 Verify concurrently version supports 6 parallel processes in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

> **Note**: This feature has minimal foundational work since all infrastructure already exists. Configuration changes can proceed directly to user story implementation.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Start All Applications Simultaneously (Priority: P1) 🎯 MVP

**Goal**: Enable developers to start complete development environment (including projector-app) with single `pnpm run dev` command

**Independent Test**:
1. Run `pnpm run dev` from project root
2. Verify all 6 services start successfully (admin, host, participant, projector, socket, firebase)
3. Check terminal output shows cyan-labeled "projector" logs
4. Open http://localhost:5185 to verify projector-app loads

### Implementation for User Story 1

- [X] T003 [US1] Update root package.json dev script to add projector-app with concurrently configuration
- [X] T004 [US1] Verify projector-app starts with `pnpm run dev` and displays cyan label in terminal output

**Checkpoint**: At this point, User Story 1 should be fully functional - all 6 services start with single command

---

## Phase 4: User Story 2 - Consistent Port Assignment (Priority: P1)

**Goal**: Ensure each Vite application always uses the same port number across restarts, preventing URL/bookmark changes

**Independent Test**:
1. Run `pnpm run dev` and note port numbers for all apps
2. Stop development server (Ctrl+C)
3. Run `pnpm run dev` again
4. Verify same port numbers are used: admin-5170, host-5175, participant-5180, projector-5185
5. Test port conflict: Start process on port 5170, verify admin-app fails with clear error (not fallback)

### Implementation for User Story 2

- [X] T005 [P] [US2] Update apps/admin-app/vite.config.ts to set port 5170 and strictPort: true
- [X] T006 [P] [US2] Update apps/host-app/vite.config.ts to set port 5175 and strictPort: true (preserve host: true)
- [X] T007 [P] [US2] Update apps/participant-app/vite.config.ts to set port 5180 and strictPort: true
- [X] T008 [P] [US2] Update apps/projector-app/vite.config.ts to set port 5185 and strictPort: true (preserve host: true)
- [X] T009 [US2] Verify port consistency across restarts for all 4 Vite applications
- [X] T010 [US2] Test port conflict scenario to verify strictPort prevents fallback behavior

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - all apps start with single command AND use fixed ports

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final verification

- [X] T011 [P] Add port assignment documentation table to README.md (or docs/development.md if README is crowded)
- [X] T012 Verify complete workflow per quickstart.md validation steps
- [X] T013 Test multi-platform compatibility (if possible - Linux/macOS/Windows)
- [X] T014 Update any existing documentation that references old port numbers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - minimal work required
- **User Stories (Phase 3-4)**: Technically independent but US2 enhances US1's developer experience
  - **US1**: Can be completed and tested independently
  - **US2**: Can be completed and tested independently, but delivers most value after US1
- **Polish (Phase 5)**: Depends on US1 and US2 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1) - No dependencies on other stories
  - Task T003 (update package.json) is the core implementation
  - Task T004 verifies the change works

- **User Story 2 (P1)**: Can start after Setup (Phase 1) - Logically follows US1 but technically independent
  - Tasks T005-T008 can all run in parallel (different files, no conflicts)
  - Task T009 verifies consistency after all configs updated
  - Task T010 tests the strictPort enforcement

### Within Each User Story

**User Story 1**:
- T003 must complete before T004 (verification depends on implementation)

**User Story 2**:
- T005, T006, T007, T008 can all run in parallel [P] (different files)
- T009 and T010 run after all config updates complete (verification tasks)

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel [P] if needed (verification tasks in different files)
- **User Story 2**: T005, T006, T007, T008 can all run in parallel [P] (updating 4 different vite.config.ts files)
- **Phase 5**: T011 can run in parallel with other polish tasks
- **User Stories 1 and 2**: Could technically be worked on in parallel by different developers, though US1 should complete first for logical flow

---

## Parallel Example: User Story 2

```bash
# Launch all Vite config updates together (T005-T008):
Task: "Update apps/admin-app/vite.config.ts to set port 5170 and strictPort: true"
Task: "Update apps/host-app/vite.config.ts to set port 5175 and strictPort: true (preserve host: true)"
Task: "Update apps/participant-app/vite.config.ts to set port 5180 and strictPort: true"
Task: "Update apps/projector-app/vite.config.ts to set port 5185 and strictPort: true (preserve host: true)"

# After all configs updated, run verification tasks sequentially:
Task: "Verify port consistency across restarts for all 4 Vite applications"
Task: "Test port conflict scenario to verify strictPort prevents fallback behavior"
```

---

## Implementation Strategy

### MVP First (Both P1 User Stories)

Since both User Stories are P1 priority and configuration changes are low-risk:

1. Complete Phase 1: Setup (verify prerequisites)
2. Complete Phase 2: Foundational (minimal work)
3. Complete Phase 3: User Story 1 (add projector-app to dev script)
4. Complete Phase 4: User Story 2 (fix all port numbers)
5. **STOP and VALIDATE**: Test complete workflow per quickstart.md
6. Complete Phase 5: Polish (documentation)

### Incremental Delivery

If cautious approach needed:

1. Complete Setup + Foundational → Verify prerequisites
2. Add User Story 1 → Test independently → Commit (projector starts with dev command)
3. Add User Story 2 → Test independently → Commit (ports are fixed)
4. Add Polish → Final validation → Commit

### Single-Developer Strategy

Recommended execution order:

1. **Verify prerequisites** (T001-T002) - 2 minutes
2. **Add projector to dev script** (T003) - 2 minutes
3. **Verify projector starts** (T004) - 2 minutes
4. **Update all 4 Vite configs in parallel** (T005-T008) - 5 minutes
5. **Verify port consistency** (T009-T010) - 3 minutes
6. **Document port assignments** (T011) - 5 minutes
7. **Final validation** (T012-T014) - 5 minutes

**Total estimated time**: ~25 minutes

---

## Detailed Task Specifications

### T003: Update root package.json dev script

**Current configuration** (package.json line ~7):
```json
"dev": "concurrently -n admin,host,participant,socket,firebase -c bgBlue,bgMagenta,bgGreen,bgYellow,bgRed \"pnpm --filter @allstars/admin-app dev\" \"pnpm --filter @allstars/host-app dev\" \"pnpm --filter @allstars/participant-app dev\" \"pnpm --filter @allstars/socket-server dev\" \"firebase emulators:start --import=./emulator-data --export-on-exit\""
```

**New configuration**:
```json
"dev": "concurrently -n admin,host,participant,projector,socket,firebase -c bgBlue,bgMagenta,bgGreen,bgCyan,bgYellow,bgRed \"pnpm --filter @allstars/admin-app dev\" \"pnpm --filter @allstars/host-app dev\" \"pnpm --filter @allstars/participant-app dev\" \"pnpm --filter @allstars/projector-app dev\" \"pnpm --filter @allstars/socket-server dev\" \"firebase emulators:start --import=./emulator-data --export-on-exit\""
```

**Changes**:
- Add `projector` to `-n` list (4th position, before socket)
- Add `bgCyan` to `-c` list (4th position, matching projector)
- Add `\"pnpm --filter @allstars/projector-app dev\"` command (4th position)

**Reference**: research.md Q2

### T005-T008: Update Vite config files

Each `vite.config.ts` should follow this pattern:

```typescript
export default defineConfig({
  // ... other config
  server: {
    port: [ASSIGNED_PORT], // 5170, 5175, 5180, or 5185
    strictPort: true, // NEW: Fail if port unavailable
    host: true, // PRESERVE if already present (host-app, projector-app)
  },
});
```

**Port assignments** (from spec.md):
- admin-app: 5170
- host-app: 5175 (preserve `host: true`)
- participant-app: 5180
- projector-app: 5185 (preserve `host: true`)

**Reference**: research.md Q1

### T009: Verify port consistency

**Test procedure**:
1. Run `pnpm run dev`
2. Note port numbers from terminal output or browser
3. Stop server (Ctrl+C)
4. Run `pnpm run dev` again
5. Verify same ports used

**Expected results**:
- admin-app: http://localhost:5170
- host-app: http://localhost:5175
- participant-app: http://localhost:5180
- projector-app: http://localhost:5185

### T010: Test port conflict scenario

**Test procedure**:
1. Start a process on port 5170 (e.g., `python3 -m http.server 5170`)
2. Run `pnpm run dev`
3. Verify admin-app fails with clear error message (not fallback to 5171)
4. Check terminal output shows EADDRINUSE error
5. Kill blocking process and verify admin-app starts successfully

**Expected behavior**: With `strictPort: true`, Vite will fail with error instead of using next available port

### T011: Add port documentation

Add table to README.md (or docs/development.md):

```markdown
## Development Server Ports

| Service | Port | Configuration File | URL |
|---------|------|-------------------|-----|
| admin-app | 5170 | [apps/admin-app/vite.config.ts](apps/admin-app/vite.config.ts) | http://localhost:5170 |
| host-app | 5175 | [apps/host-app/vite.config.ts](apps/host-app/vite.config.ts) | http://localhost:5175 |
| participant-app | 5180 | [apps/participant-app/vite.config.ts](apps/participant-app/vite.config.ts) | http://localhost:5180 |
| projector-app | 5185 | [apps/projector-app/vite.config.ts](apps/projector-app/vite.config.ts) | http://localhost:5185 |
| socket-server | (existing) | N/A - WebSocket server | - |
| firebase-emulators | (existing) | firebase.json | See Firebase UI |

**Port Conflict Resolution**: If you encounter "EADDRINUSE" errors, ensure no other processes are using these ports.
Use `lsof -i :5170` (macOS/Linux) or `netstat -ano | findstr :5170` (Windows) to identify conflicting processes.
```

**Reference**: research.md Q3, quickstart.md

### T012: Complete workflow validation

Follow verification steps from quickstart.md:

1. Run `pnpm run dev` from project root
2. Verify all 6 services start successfully
3. Check terminal output for color-coded labels (cyan "projector")
4. Open each URL and verify correct app loads:
   - http://localhost:5170 → admin-app
   - http://localhost:5175 → host-app
   - http://localhost:5180 → participant-app
   - http://localhost:5185 → projector-app
5. Stop and restart server, verify ports remain consistent
6. Test port conflict scenario (T010)

**Acceptance**: All success criteria from spec.md are met (SC-001 through SC-007)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Configuration changes are low-risk and fast to implement
- Manual verification replaces unit tests for configuration files
- Commit after completing each user story or logical group
- Total implementation time: ~25 minutes for experienced developer
- Zero risk to production builds (development configuration only)
