# `allstars` - Real-time Wedding Quiz Platform

This repository contains the source code for a real-time, interactive quiz platform designed for a wedding reception. The project is heavily inspired by the famous Japanese TV game show "All-Star Thanksgiving" (オールスター感謝祭 / *All-Star Kanshasai*), aiming to replicate its exciting, fast-paced quiz format for all the guests.

## 🌟 Key Features

* **Real-time Participation:** Guests join using their smartphones via a simple web browser. No app install required.
* **Secure & Simple Auth:** Guests use **Firebase Anonymous Login**, hosts and admins use secure **Google Login**, and projectors use **Firebase Custom Tokens** with automatic refresh for 8+ hour unattended operation.
* **Broadcast Screen:** A dedicated `projector-app` displays questions, answer distributions, and rankings, mimicking the TV show's broadcast.
* **Host Control:** A `host-app` (designed for a tablet) gives the newly-weds full control over the show's pacing, including triggering questions, sounds, and the "Period Gong."
* **Advanced Quiz Logic:** Implements precise "fastest-press" time tracking (with client-server clock synchronization), "drop-out" (予選落ち) rules, and real-time leaderboards.
* **Multiple Quiz Formats:** Supports 4-choice questions, sorting quizzes, and simple audience surveys.
* **System Resilience:** Built with real-time state synchronization (via Firestore) and event-based triggers (via WebSockets) to ensure stability and allow participants to rejoin seamlessly if disconnected.

## 🚀 Architecture: Monorepo

This project is structured as a **monorepo** using `pnpm workspaces` to share code (like types and UI components) efficiently across all applications.

```
/allstars/  (Repository Root)
|
|-- /apps/ (Deployable applications)
|   |-- /participant-app   (Frontend: Guest's client, **Auth: Anonymous Login**)
|   |-- /projector-app     (Frontend: Main broadcast screen, **Auth: Firebase Custom Tokens**)
|   |-- /host-app          (Frontend: Host's control panel, **Auth: Google Login**)
|   |-- /admin-app         (Frontend: Dashboard for managing quizzes, **Auth: Google Login**)
|   |-- /api-server        (Backend: Game logic running on Cloud Functions)
|   |-- /socket-server     (Backend: WebSocket server running on Cloud Run)
|
|-- /packages/ (Shared internal libraries)
|   |-- /types/            (Shared TypeScript types, e.g., Question, GameState)
|   |-- /ui-components/    (Shared UI components, e.g., buttons, logos)
|
|-- /openapi/ (OpenAPI (Swagger) specifications for the api-server)
|
|-- /docs/ (Project documentation and reference materials)
|
|-- package.json (Monorepo root configuration)
|-- firebase.json (Firebase project configuration, incl. Emulators)
```

## 🛠️ Technology Stack

* **Monorepo:** `pnpm` workspaces
* **Language:** `TypeScript`
* **Frontend:** `React` / `Vite`
* **Backend (API / Logic):** `Express` on `Cloud Functions for Firebase`
* **Backend (Real-time):** `Socket.io` on `Cloud Run`
* **Database:** `Firebase Firestore`
* **Authentication:** `Firebase Authentication` (Anonymous & Google Login)
* **API Spec:** `OpenAPI`
* **Development:** `Firebase Emulator Suite` (Auth, Firestore, Functions)

## ⚡ Getting Started

### Prerequisites

* Node.js (**v22.x** or later)
* `pnpm`
* `firebase-cli` (Firebase Command Line Interface)
* A Google Firebase project with **Authentication**, **Firestore**, and **Cloud Functions** enabled.
* Google Cloud project (linked to Firebase) with **Cloud Run** enabled.

### 1. Installation & Setup

1.  Clone the repository:
    ```bash
    git clone [your-repository-url] allstars
    cd allstars
    ```

2.  Install all dependencies from the root:
    ```bash
    pnpm install
    ```

3.  Link your local project to Firebase:
    ```bash
    firebase use --add
    ```

4.  Set up environment variables:

    **Projector App Authentication (Required for projector-app):**

    Generate a secure API key for projector authentication:
    ```bash
    # Generate a 32-character API key
    openssl rand -base64 32
    ```

    Configure API server (`apps/api-server/.env`):
    ```bash
    PROJECTOR_API_KEY=<generated-key>
    ```

    Configure projector app (`apps/projector-app/.env`):
    ```bash
    # API Server Configuration
    VITE_API_BASE_URL=http://localhost:5001/api
    VITE_PROJECTOR_API_KEY=<same-key-as-above>

    # Socket Server Configuration
    VITE_SOCKET_SERVER_URL=http://localhost:3001

    # Firebase Configuration
    VITE_FIREBASE_API_KEY=<from-firebase-console>
    VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=<project-id>
    VITE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
    VITE_FIREBASE_APP_ID=<app-id>
    ```

    **Other Apps:**
    * Configure your other frontend apps (in their respective `.env` files) with the Firebase client-side config.
    * Ensure your backend apps (`api-server`, `socket-server`) are configured to receive Firebase credentials via their runtime environment (Cloud Functions/Cloud Run).

    **Important**: Never commit `.env` files to version control. Use `.env.example` files as templates.

### 2. Running in Development Mode (with Emulators)

For local development, we use the Firebase Emulator Suite to simulate Auth, Firestore, and Cloud Functions.

**Start all development services with a single command:**
```bash
pnpm run dev
```

This command starts all frontend apps, socket server, and Firebase emulators concurrently. Each service is labeled with a color-coded prefix in the terminal output:
- **admin** (blue) - Admin dashboard
- **host** (magenta) - Host control panel
- **participant** (green) - Guest participation app
- **projector** (cyan) - Broadcast display
- **socket** (yellow) - WebSocket server
- **firebase** (red) - Firebase emulators

**Alternatively, run services individually:**
```bash
# Run a specific frontend app
pnpm run dev --filter=admin-app
pnpm run dev --filter=host-app
pnpm run dev --filter=participant-app
pnpm run dev --filter=projector-app

# Run backend services
pnpm run dev --filter=socket-server
firebase emulators:start
```

### 3. Development Server Ports

| Service | Port | Configuration File | URL |
|---------|------|-------------------|-----|
| admin-app | 5170 | [apps/admin-app/vite.config.ts](apps/admin-app/vite.config.ts) | http://localhost:5170 |
| host-app | 5175 | [apps/host-app/vite.config.ts](apps/host-app/vite.config.ts) | http://localhost:5175 |
| participant-app | 5180 | [apps/participant-app/vite.config.ts](apps/participant-app/vite.config.ts) | http://localhost:5180 |
| projector-app | 5185 | [apps/projector-app/vite.config.ts](apps/projector-app/vite.config.ts) | http://localhost:5185 |
| socket-server | 3001 | N/A - WebSocket server | http://localhost:3001 |
| Firebase Emulators | 4000 | firebase.json | http://localhost:4000 |
| Auth Emulator | 9099 | firebase.json | localhost:9099 |
| Firestore Emulator | 8080 | firebase.json | localhost:8080 |
| Functions Emulator | 5001 | firebase.json | http://localhost:5001 |

**Port Conflict Resolution**: If you encounter "EADDRINUSE" errors, ensure no other processes are using these ports. Use `lsof -i :PORT` (macOS/Linux) or `netstat -ano | findstr :PORT` (Windows) to identify conflicting processes.

**Note**: Ports 5170, 5175, 5180, and 5185 are fixed and will not automatically fall back to other ports if unavailable. This ensures consistent URLs for development and testing.

### 4. Running E2E Tests

The project includes a comprehensive End-to-End test suite that validates the complete system across all four applications.

**Run all E2E tests with a single command:**
```bash
pnpm run e2e
```

This command automatically:
1. Starts Firebase Emulator Suite (Firestore + Auth)
2. Launches all 4 applications (admin, host, participant, projector)
3. Runs complete E2E test scenarios
4. Generates HTML test report
5. Cleans up all processes

**E2E Test Coverage:**
- **Admin Setup Flow**: Questions, Guests, and Settings CRUD operations
- **Participant Flow**: Joining games, submitting answers, receiving feedback
- **Projector Display**: Question display, rankings, period champions
- **Host Control**: Game progression, phase transitions, special events
- **Infrastructure**: Emulator lifecycle, hostname configuration, artifacts

**View Test Results:**
```bash
# Open interactive HTML report
pnpm exec playwright show-report

# Run specific test file
pnpm exec playwright test tests/e2e/scenarios/admin-setup.spec.ts

# Run tests in debug mode
pnpm exec playwright test --debug
```

**Requirements:**
- Hostname `work-ubuntu` must resolve to `127.0.0.1` (add to `/etc/hosts` if needed)
- Ports 5173-5176 (apps) and 8080, 9099 (emulators) must be available

See [E2E Test Quick Start Guide](specs/001-system-e2e-tests/quickstart.md) for detailed instructions.

