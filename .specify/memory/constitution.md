<!--
SYNC IMPACT REPORT
==================
Version Change: 1.1.0 → 1.2.0
Bump Rationale: MINOR version - New principle added (VI. Protected Main Branch) establishing mandatory Git workflow with feature branching

Modified Principles:
- None (existing principles unchanged)

Added Sections:
- VI. Protected Main Branch - New principle prohibiting direct commits to master/main branch
  - Mandates feature branch workflow for all development work
  - Requires branch naming convention: feature/<issue-number>-<feature-name>
  - Establishes branch protection as non-negotiable rule

Removed Sections:
- None

Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md - Branch Strategy section already aligns with new principle
- ✅ .specify/templates/spec-template.md - No changes needed (principle-agnostic)
- ✅ .specify/templates/tasks-template.md - No changes needed (principle-agnostic)
- ✅ .specify/templates/agent-file-template.md - Not reviewed in detail, likely no impact
- ✅ .specify/templates/checklist-template.md - Not reviewed in detail, may benefit from Git workflow verification step

Follow-up TODOs:
- Configure branch protection rules in GitHub repository settings for master/main branch
- Update CI/CD pipelines to enforce branch naming conventions
- Add pre-commit hooks to prevent accidental commits to master/main
- Document exception process for emergency hotfixes (if needed)
- Review checklist-template.md to add Git workflow verification steps

Date: 2025-11-05
-->

# AllStars Game Platform Constitution

## Core Principles

### I. Monorepo Architecture

This project MUST maintain a monorepo structure with the following mandatory organization:

**Repository Structure**:
```
/allstars/  (Repository Root)
├── /apps/               (Deployable applications)
│   ├── /participant-app (Guest's smartphone client - Frontend)
│   ├── /projector-app   (Main broadcast screen - Frontend)
│   ├── /host-app        (Host's control panel - Frontend)
│   ├── /admin-app       (Admin dashboard - Frontend)
│   ├── /api-server      (Game logic API server - Backend)
│   └── /socket-server   (WebSocket real-time server - Backend)
├── /packages/           (Shared internal libraries)
│   ├── /types/          (Shared TypeScript types e.g., Question, GameState)
│   ├── /ui-components/  (Shared UI components e.g., buttons, logos)
│   └── /openapi/        (OpenAPI/Swagger specifications)
├── /docs/               (Documentation and reference materials)
├── package.json         (Monorepo root configuration with pnpm workspaces)
└── firebase.json        (Firebase project configuration, incl. Emulators)
```

**Rationale**: The monorepo structure ensures atomic commits across all components, shared tooling configuration, and unified version control. The apps/ and packages/ separation enables clear distinction between deployable artifacts and shared code libraries. Each application serves a distinct architectural role in the game platform while maintaining clear separation of concerns. Shared packages eliminate code duplication across frontends while maintaining single sources of truth for types and UI components. This structure prevents version drift between clients and servers while enabling coordinated releases.

**Non-negotiable rules**:
- All new features that span multiple apps MUST be implemented as coordinated changes within a single branch
- Application boundaries MUST NOT be violated (e.g., projector-app cannot directly access api-server database)
- Each app MUST have its own package.json with explicit dependencies
- Shared code MUST be extracted to /packages/ and referenced as workspace dependencies, not duplicated
- All apps MUST consume shared types from /packages/types/ for API contracts
- Frontend apps MUST share UI components through /packages/ui-components/
- The /packages/ directory MUST use workspace protocol for internal dependencies (e.g., "workspace:*")
- Breaking changes in /packages/ MUST coordinate updates across all dependent apps in the same commit

### II. Test-Driven Development (TDD)

All implementation MUST follow the Test-Driven Development discipline:

1. **Write tests first**: Tests are written before implementation code
2. **Verify test failure**: Tests MUST fail initially (red state)
3. **Implement to pass**: Write minimal code to make tests pass (green state)
4. **Refactor**: Improve code quality while keeping tests green

**Rationale**: TDD ensures every feature is testable, reduces debugging time, provides living documentation, and prevents regression. The discipline of writing tests first forces clear thinking about requirements and interfaces before implementation details.

**Non-negotiable rules**:
- NO implementation code may be committed without corresponding tests
- Tests MUST be committed in the same commit as the implementation they verify
- Tests MUST fail before implementation (verified by running test suite)
- Test coverage MUST NOT decrease with new commits
- Red-Green-Refactor cycle is mandatory for all feature work

### III. OpenAPI-First API Design

All REST APIs MUST be defined in OpenAPI specifications before implementation:

1. API contracts defined in **/packages/openapi/** directory
2. Implementation in **/apps/api-server/** MUST conform to specifications
3. Client implementations (frontend apps) MUST use generated types/clients from OpenAPI specs
4. API changes MUST update OpenAPI specs first, then implementation

**Rationale**: Contract-first API design ensures client-server compatibility, enables parallel frontend/backend development, provides automatic documentation, and supports API validation and mocking. The OpenAPI specification serves as the source of truth for all REST API contracts. Centralizing specs in /packages/openapi/ allows all apps to consume the same contract definitions.

**Non-negotiable rules**:
- All REST endpoints MUST have OpenAPI definitions before implementation
- OpenAPI specs MUST be validated with standard tools (e.g., swagger-cli validate)
- Breaking API changes MUST increment API version numbers
- Response schemas MUST include error cases and status codes
- API implementations MUST be validated against their OpenAPI contracts (contract testing)
- Frontend apps MUST generate TypeScript types from /packages/openapi/ specs
- OpenAPI specs MUST be the single source of truth shared across all apps

### IV. Code Quality Gates

Before every commit, the following quality gates MUST pass:

1. **Linting**: Code MUST be formatted with project linters
2. **Tests**: All tests MUST pass (unit, integration, contract)
3. **Verification**: Manual or automated functional verification MUST be performed

**Rationale**: Consistent code quality prevents technical debt accumulation, reduces code review friction, catches bugs early, and maintains a high standard across all contributors. Quality gates shift-left problem detection to the earliest possible point.

**Non-negotiable rules**:
- Linters MUST run automatically before commit (via pre-commit hooks or manual execution)
- Code that fails linting MUST NOT be committed
- All existing tests MUST pass before pushing
- New features MUST include verification steps documented in commit messages or PR descriptions
- No commented-out code, console.log/print debugging statements, or TODO comments without tracking tickets

### V. Shell Command Safety

All shell command executions MUST use timeout mechanisms to prevent hanging processes:

**Required pattern**:
```bash
timeout 60 command-that-might-hang
```

**Rationale**: Long-running or hung processes can block CI/CD pipelines, developer workflows, and automated testing. Explicit timeouts ensure predictable failure modes and prevent resource exhaustion.

**Non-negotiable rules**:
- Every shell command in scripts, CI/CD, and automation MUST have an explicit timeout
- Timeout values MUST be appropriate for the operation (e.g., 60s for npm install, 300s for builds)
- Commands that timeout MUST fail with clear error messages
- Interactive commands requiring user input MUST NOT be used in automation
- Timeout thresholds MUST be documented in script headers or CI configuration

### VI. Protected Main Branch

Direct commits to the master/main branch are STRICTLY PROHIBITED. All development work MUST be performed on feature branches.

**Rationale**: Branch protection prevents accidental or unauthorized changes to production-ready code, enforces code review processes, maintains a clean commit history, and enables parallel development without conflicts. The master/main branch represents the stable, deployable state of the project and must be protected from direct modifications.

**Non-negotiable rules**:
- NO direct commits to master/main branch under any circumstances
- ALL work MUST be performed on feature branches created from latest master/main
- Feature branches MUST follow naming convention: `<issue-number>-<feature-name>` (e.g., `042-firebase-emulator-config`)
- Feature branches MUST be merged to master/main only via pull requests after code review
- Emergency hotfixes MUST also follow feature branch workflow (expedited review acceptable)
- Branch protection MUST be configured in repository settings to enforce this rule technically
- Attempts to commit directly to master/main MUST be blocked by pre-commit hooks or repository settings

## Quality Assurance Requirements

### Testing Strategy

- **Unit Tests**: Required for all business logic, utilities, and pure functions
- **Integration Tests**: Required for API endpoints, database operations, and external service integrations
- **Contract Tests**: Required for all REST API endpoints (validate against OpenAPI specs in /packages/openapi/)
- **End-to-End Tests**: Recommended for critical user journeys across multiple apps

### Test Organization

Each app MUST maintain its own test directory structure:
```
apps/<app-name>/
├── src/
└── tests/
    ├── unit/
    ├── integration/
    └── contract/
```

Shared packages MUST also maintain test directories:
```
packages/<package-name>/
├── src/
└── tests/
    └── unit/
```

### Continuous Integration

- All tests MUST run on every pull request
- Pull requests MUST NOT be merged with failing tests
- Test results MUST be visible in PR status checks
- Flaky tests MUST be fixed or quarantined within 48 hours
- Monorepo CI MUST run tests for all affected apps and packages (detect via dependency graph)

## Development Workflow

### Branch Strategy

- **main/master**: Production-ready code only - PROTECTED (no direct commits)
- **Feature branches**: Named `<issue-number>-<feature-name>` (e.g., `123-player-authentication`)
- Feature branches MUST be created from latest main/master
- Feature branches MUST be rebased or merged with main/master before PR creation
- Feature branches SHOULD be short-lived (< 1 week) to minimize merge conflicts

### Commit Discipline

1. Ensure you are on a feature branch (NOT master/main)
2. Run linters and auto-format code
3. Run full test suite and verify all tests pass
4. Perform manual verification of changed functionality
5. Write descriptive commit message following conventional commits format
6. Commit with verified changes only

### Code Review Requirements

- All code MUST be reviewed before merging to main/master
- Reviewers MUST verify:
  - TDD compliance (tests exist and were written first)
  - OpenAPI spec alignment (for API changes)
  - Linting compliance
  - Test coverage adequacy
  - Architecture principle compliance
  - Monorepo workspace dependency correctness
  - Branch is NOT master/main (must be feature branch)

### Pull Request Standards

- PR title MUST follow conventional commits format (e.g., `feat(api-server): add player authentication`)
- PR description MUST link to OpenAPI specs for API changes (reference /packages/openapi/)
- PR description MUST include verification steps performed
- PRs MUST pass all CI checks before review
- PRs SHOULD be small and focused (< 400 lines changed when possible)
- PRs affecting shared packages MUST validate impact on all dependent apps
- PRs MUST originate from feature branches, never from master/main

## Governance

### Constitution Authority

This constitution supersedes all other development practices, guidelines, and conventions. When conflicts arise between this constitution and other documentation, the constitution takes precedence.

### Amendment Process

1. Propose amendment with clear rationale and impact analysis
2. Document affected systems and required migration steps
3. Obtain approval from project maintainers or technical lead
4. Update constitution version following semantic versioning
5. Propagate changes to dependent templates and documentation
6. Communicate changes to all team members

### Version Semantics

Constitution versions follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Backward-incompatible governance changes, principle removals, or redefinitions that invalidate prior work
- **MINOR**: New principles added, sections materially expanded, new mandatory requirements
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- Constitution compliance MUST be verified during code reviews
- Violations MUST be documented and justified in PR descriptions
- Repeated violations require team discussion and potential process improvement
- Complexity that violates principles MUST be justified with:
  - Clear explanation of why the principle cannot be followed
  - Documentation of simpler alternatives considered and rejected
  - Explicit approval from technical lead or team consensus

### Exceptions

Temporary exceptions to principles may be granted when:
- Technical debt is consciously accepted with documented repayment plan
- External constraints prevent compliance (third-party library limitations)
- Experimental features are being prototyped (must be in separate branch, clearly marked)

All exceptions MUST:
- Be documented in code comments and PR descriptions
- Include expiration dates or completion criteria
- Be tracked in project issue tracker
- Be reviewed monthly for resolution

**Version**: 1.2.0 | **Ratified**: 2025-11-02 | **Last Amended**: 2025-11-05
