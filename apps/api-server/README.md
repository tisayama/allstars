# AllStars Quiz Game API Server

Express-based REST API server for a real-time wedding quiz game, built on Firebase Cloud Functions.

## Overview

This API server powers a live quiz game where:
- **Admin** creates and manages quiz questions
- **Host** controls the game flow through multiple phases
- **Participants** (wedding guests) submit answers in real-time

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript 5.3
- **Framework**: Express 4.x
- **Platform**: Firebase Cloud Functions (2nd generation)
- **Database**: Cloud Firestore with composite indexes
- **Authentication**: Firebase Authentication (Google + Anonymous)
- **Validation**: Zod 3.x for runtime type checking
- **Testing**: Jest 29.x + Supertest

## Project Structure

```
apps/api-server/
├── src/
│   ├── middleware/      # Auth, role guards, error handling
│   ├── routes/          # Admin, host, participant endpoints
│   ├── services/        # Business logic (questions, answers, game state, guests)
│   ├── models/          # Validators and Firestore collection names
│   └── utils/           # Firestore client, custom errors
├── tests/
│   ├── unit/            # Unit tests for services and middleware
│   ├── integration/     # Integration tests for workflows
│   └── contract/        # OpenAPI contract tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── firestore.indexes.json
```

## API Endpoints

### Admin (Google Authentication Required)

- `POST /admin/quizzes` - Create a new quiz question
- `GET /admin/quizzes` - List all questions (ordered by period, questionNumber)
- `PUT /admin/quizzes/:questionId` - Update an existing question
- `GET /admin/guests` - List all registered guests

### Host (Google Authentication Required)

- `POST /host/game/advance` - Advance game state with 6 actions:
  - `START_QUESTION` - Begin accepting answers for a question
  - `TRIGGER_GONG` - Activate gong sound effect
  - `SHOW_DISTRIBUTION` - Display answer distribution
  - `SHOW_CORRECT_ANSWER` - Reveal the correct answer
  - `SHOW_RESULTS` - Show top 10 fastest correct + worst 10 slowest incorrect
  - `REVIVE_ALL` - Revive all eliminated guests

### Participant (Anonymous Authentication for POST, Public for GET)

- `GET /participant/time` - Server time synchronization (public)
- `POST /participant/answer` - Submit answer (anonymous auth required)

## Setup

### Prerequisites

- Node.js 18+
- pnpm 8.0+
- Firebase CLI

### Installation

```bash
# From repository root
pnpm install

# Navigate to api-server
cd apps/api-server
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables for local development:
```
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FUNCTIONS_EMULATOR=true
NODE_ENV=development
LOG_LEVEL=debug
```

### Firebase Emulator Setup

Start Firebase Emulator Suite (from repository root):

```bash
pnpm emulator
```

This starts:
- Firestore Emulator: `localhost:8080`
- Authentication Emulator: `localhost:9099`
- Functions Emulator: `localhost:5001`
- Emulator UI: `localhost:4000`

## Development

### Build

```bash
pnpm build
```

### Run Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Lint & Format

```bash
# Lint
pnpm lint

# Format
pnpm format
```

## Key Features

### Authentication & Authorization

- **Firebase ID Token** validation on all protected endpoints
- **Role-based access control**:
  - Google sign-in → Admin/Host access
  - Anonymous sign-in → Participant access
- Custom middleware: `auth` → `requireGoogleLogin` / `requireAnonymousLogin`

### Data Validation

- **Zod schemas** for runtime validation
- **Duplicate prevention**:
  - Questions: `period + questionNumber` uniqueness (Firestore composite index)
  - Answers: `guestId + questionId` uniqueness (Firestore transaction)

### Concurrency Control

- **Firestore transactions** for:
  - Answer submission (duplicate check + creation)
  - Game state updates (prevent race conditions)
- **Batch updates** for:
  - Revive all eliminated guests

### Error Handling

- **Standardized error format** (RFC 7807-inspired JSON):
  ```json
  {
    "code": "DUPLICATE_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "questionId", "message": "Specific error detail" }
    ]
  }
  ```
- **Service unavailability** handling with `Retry-After` header

### Performance

- **Time synchronization** endpoint targets <50ms variance
- **Composite indexes** for efficient leaderboard queries:
  - Top 10: `questionId + isCorrect(true) + responseTimeMs(asc)`
  - Worst 10: `questionId + isCorrect(false) + responseTimeMs(desc)`

## Testing

Tests follow **TDD principles** - written before implementation:

- **Unit tests**: Services and middleware in isolation
- **Integration tests**: Complete workflows with mocked Firestore
- **Contract tests**: OpenAPI specification compliance

Coverage target: **80%** (branches, functions, lines, statements)

## Deployment

### Build for Production

```bash
pnpm build
```

### Deploy to Firebase

```bash
firebase deploy --only functions
```

### Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## OpenAPI Specification

Full API contract available at: `packages/openapi/api-server.yaml`

Validate with:
```bash
npx swagger-cli validate packages/openapi/api-server.yaml
```

## Architecture Decisions

See `/specs/001-api-server/research.md` for technical decisions:
- Why Zod over other validators
- Why Firestore transactions for duplicates
- Why composite indexes for leaderboards
- Error format rationale
- Time synchronization approach

## Contributing

1. Follow TDD - write tests first
2. Ensure `pnpm lint` passes
3. Maintain 80%+ test coverage
4. Update OpenAPI spec for endpoint changes
5. Follow error format conventions

## License

Private project - All rights reserved
