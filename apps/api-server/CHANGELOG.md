# Changelog

All notable changes to the AllStars Quiz Game API Server will be documented in this file.

## [Unreleased]

### Phase 1: Setup
- Initial project structure with TypeScript, Jest, ESLint
- Firebase Emulator Suite configuration
- Firestore composite indexes for questions and answers
- Monorepo workspace setup with shared types package

### Phase 2: Foundational
- Shared TypeScript types (Question, GameState, Guest, Answer, ErrorResponse)
- Firestore client initialization with emulator detection
- Custom error classes (ValidationError, NotFoundError, etc.)
- Global error handler middleware with RFC 7807-inspired format

### Phase 3: Authentication (User Story 4)
- Firebase ID token validation middleware
- Role-based access control (Google vs Anonymous)
- Service unavailability handling with Retry-After header
- Comprehensive authentication test coverage

### Phase 4: Admin Quiz Management (User Story 1)
- POST /admin/quizzes - Create questions with duplicate prevention
- GET /admin/quizzes - List all questions ordered by period/number
- PUT /admin/quizzes/:id - Update existing questions
- GET /admin/guests - List all registered guests
- Zod validation for create and update operations
- Period + questionNumber uniqueness enforcement

### Phase 5: Participant Answers (User Story 3)
- GET /participant/time - Server time synchronization (public endpoint)
- POST /participant/answer - Submit answers with duplicate prevention
- Firestore transaction-based duplicate detection
- Correctness validation against question's correctAnswer
- Top 10 and worst 10 query functions for leaderboards

### Phase 6: Host Game Control (User Story 2)
- POST /host/game/advance - Single endpoint for 6 game actions:
  - START_QUESTION - Begin accepting answers
  - TRIGGER_GONG - Activate sound effect
  - SHOW_DISTRIBUTION - Display answer distribution
  - SHOW_CORRECT_ANSWER - Reveal correct answer
  - SHOW_RESULTS - Show leaderboards with guest names
  - REVIVE_ALL - Reset all eliminated guests
- Transaction-based state management
- State transition validation
- Guest name hydration for results denormalization

### Phase 7: Polish
- End-to-end integration tests
- Comprehensive README documentation
- Seed data script for emulator
- Package.json scripts for development workflow
- CHANGELOG documentation

## Implementation Decisions

### Why Zod for Validation?
- TypeScript-first with automatic type inference
- Excellent error messages for API responses
- Runtime validation prevents invalid data in Firestore

### Why Firestore Transactions?
- Prevents duplicate answers with atomic check-and-create
- Handles concurrent game state updates safely
- Better than application-level locking for distributed systems

### Why Composite Indexes?
- Efficient leaderboard queries without full collection scans
- Enforces uniqueness constraints (period + questionNumber)
- Minimal latency for real-time game requirements

### Error Format
- RFC 7807-inspired structure for consistency
- Machine-readable codes for client-side error handling
- Detailed field-level validation errors

### Time Synchronization
- Public endpoint to avoid authentication overhead
- <50ms target ensures accurate response time measurement
- Clients calculate offset for local time adjustments

## Testing Strategy

- **TDD approach**: Tests written before implementation
- **Unit tests**: Services and middleware in isolation
- **Integration tests**: Complete workflows with mocked Firestore
- **Contract tests**: OpenAPI specification compliance
- **80% coverage**: Minimum threshold for all metrics

## Security

- Firebase Authentication required for all endpoints except /health and /participant/time
- Role-based access via sign-in provider (google.com vs anonymous)
- No personal data in logs (FR-033 compliance)
- Service unavailability returns 503 with Retry-After header

## Performance

- Time sync endpoint: <50ms target (SC-005)
- Game state updates: <2s target (SC-004)
- Concurrent submissions: 500 simultaneous answers supported (SC-007)
- Composite indexes for O(log n) leaderboard queries
