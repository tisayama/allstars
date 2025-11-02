# `allstars` - Real-time Wedding Quiz Platform

This repository contains the source code for a real-time, interactive quiz platform designed for a wedding reception. The project is heavily inspired by the famous Japanese TV game show "All-Star Thanksgiving" (オールスター感謝祭 / *All-Star Kanshasai*), aiming to replicate its exciting, fast-paced quiz format for all the guests.

## 🌟 Key Features

* **Real-time Participation:** Guests join using their smartphones via a simple web browser. No app install required.
* **Broadcast Screen:** A dedicated `projector-app` displays questions, answer distributions, and rankings, mimicking the TV show's broadcast.
* **Host Control:** A `host-app` (designed for a tablet) gives the newly-weds full control over the show's pacing, including triggering questions, sounds, and the "Period Gong."
* **Advanced Quiz Logic:** Implements precise "fastest-press" time tracking (with client-server clock synchronization), "drop-out" (予選落ち) rules, and real-time leaderboards.
* **Multiple Quiz Formats:** Supports 4-choice questions, sorting quizzes, and simple audience surveys.
* **System Resilience:** Built with real-time state synchronization (via Firestore) and event-based triggers (via WebSockets) to ensure stability and allow participants to rejoin seamlessly if disconnected.

## 🚀 Architecture: Monorepo

This project is structured as a **monorepo** using `pnpm workspaces` to share code (like types and UI components) efficiently across all applications.
/allstars/ (Repository Root)
|
|-- /apps/ (Deployable applications)
| |-- /participant-app (Frontend: Guest's client on smartphone)
| |-- /projector-app (Frontend: Main broadcast screen)
| |-- /host-app (Frontend: Host's control panel on tablet)
| |-- /admin-app (Frontend: Dashboard for managing quizzes)
| |-- /api-server (Backend: Game logic running on Cloud Functions)
| |-- /socket-server (Backend: WebSocket server running on Cloud Run)
|
|-- /packages/ (Shared internal libraries)
| |-- /types/ (Shared TypeScript types, e.g., Question, GameState)
| |-- /ui-components/ (Shared UI components, e.g., buttons, logos)
| |-- /openapi/ (OpenAPI (Swagger) specifications for the api-server)
|
|-- /docs/ (Project documentation and reference materials)
|
|-- package.json (Monorepo root configuration)
|-- firebase.json (Firebase project configuration, incl. Emulators)

## 🛠️ Technology Stack

* **Monorepo:** `pnpm` workspaces
* **Language:** `TypeScript`
* **Frontend:** `React` / `Vite`
* **Backend (API / Logic):** `Express` on `Cloud Functions for Firebase`
* **Backend (Real-time):** `Socket.io` on `Cloud Run`
* **Database:** `Firebase Firestore`
* **API Spec:** `OpenAPI`
* **Development:** `Firebase Emulator Suite` (especially Firestore)

## ⚡ Getting Started

### Prerequisites

* Node.js (**v22.x** or later)
* `pnpm`
* `firebase-cli` (Firebase Command Line Interface)
* A Google Firebase project with **Firestore** and **Cloud Functions** enabled.
* Google Cloud project (linked to Firebase) with **Cloud Run** enabled.

### 1. Installation & Setup

1.  Clone the repository:
    ````bash
    git clone [your-repository-url] allstars
    cd allstars
    ````

2.  Install all dependencies from the root:
    ````bash
    pnpm install
    ````

3.  Link your local project to Firebase:
    ````bash
    firebase use --add
    ````

4.  Set up environment variables:
    * Configure your frontend apps (in their respective `.env` files) with the Firebase client-side config.
    * Ensure your backend apps (`api-server`, `socket-server`) are configured to receive Firebase credentials via their runtime environment (Cloud Functions/Cloud Run).

### 2. Running in Development Mode (with Emulators)

For local development, we use the Firebase Emulator Suite to simulate Firestore and Cloud Functions.

1.  **Start the Firebase Emulators:**
    This command will start the Firestore emulator and run the `api-server` functions locally.
    ````bash
    firebase emulators:start
    ````

2.  **Run the Frontend Apps:**
    In separate terminals, run each frontend application you need:
    ````bash
    # Terminal 2: Run Participant App
    pnpm run dev --filter=participant-app

    # Terminal 3: Run Projector App
    pnpm run dev --filter=projector-app

    # ...and so on
    ````

3.  **Run the Socket Server (Locally):**
    The Cloud Run service (`socket-server`) also needs to be run locally.
    ````bash
    # Terminal 4: Run Socket Server
    pnpm run dev --filter=socket-server
    ````

### 3. Application URLs (Default)

* **Firebase Emulators:** `http://localhost:4000` (Emulator Suite UI)
* **Firestore Emulator:** `localhost:8080`
* **Functions Emulator (`api-server`):** `http://localhost:5001/[project-id]/[region]/...`
* **Socket Server (Local):** `http://localhost:3001`
* **Frontend Apps:** `http://localhost:5173` (Participant), `http://localhost:5174` (Projector), etc.

