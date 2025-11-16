# Quickstart Guide: Projector-App WebSocket Authentication

**Feature**: 001-projector-auth
**Target Audience**: Developers implementing or testing projector authentication
**Time to Complete**: ~30 minutes

## Overview

This guide walks you through setting up and testing the projector-app WebSocket authentication system locally. By the end, you'll have a working projector-app that authenticates to the socket-server using Firebase service account credentials.

## Prerequisites

- ✅ Node.js >= 18.0.0 installed
- ✅ pnpm >= 8.0.0 installed
- ✅ Firebase emulators installed (`firebase init emulators`)
- ✅ Repository cloned and dependencies installed (`pnpm install`)
- ✅ Basic understanding of Firebase Authentication

## Step 1: Generate Service Account Credentials

### Local Development (Firebase Emulator)

For local development with Firebase Emulator, we'll create a mock service account file.

**1.1 Create service account JSON file**:

```bash
cd /home/tisayama/allstars

# Create service account file (emulator mode - fake credentials are OK)
cat > service-account-dev.json <<EOF
{
  "type": "service_account",
  "project_id": "stg-wedding-allstars",
  "private_key_id": "fake-key-id-for-emulator",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W7TyJC8EzMKz\nExample-This-Is-Mock-Data-For-Emulator-Only\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@stg-wedding-allstars.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
EOF

# Verify file was created
ls -la service-account-dev.json
```

**1.2 Verify .gitignore excludes service account files**:

```bash
# Check that service account patterns are in .gitignore
grep -E "(service-account|firebase-adminsdk)" .gitignore

# If not present, add them:
echo "# Service account files" >> .gitignore
echo "service-account*.json" >> .gitignore
echo "*-service-account.json" >> .gitignore
echo "firebase-adminsdk*.json" >> .gitignore
```

### Production (Real Firebase Project)

For production, download the actual service account JSON from Firebase Console.

**Skip this for local development - emulator doesn't require real credentials.**

<details>
<summary>Production Setup Instructions (Click to Expand)</summary>

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`wedding-allstars`)
3. Navigate to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save file as `service-account-prod.json` in repository root
6. **NEVER commit this file to git**

</details>

---

## Step 2: Configure API Server

The API server needs to know how to generate custom tokens using the service account.

**2.1 Update api-server environment variables**:

```bash
# Edit apps/api-server/.env
cat > apps/api-server/.env <<EOF
# Firebase Emulator Configuration
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
GOOGLE_CLOUD_PROJECT=stg-wedding-allstars

# Service Account (for custom token generation)
GOOGLE_APPLICATION_CREDENTIALS=../../service-account-dev.json

# Projector API Key (static key for /api/projector/auth-token endpoint)
# Generate with: openssl rand -hex 32
PROJECTOR_API_KEY=abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234

# Server Configuration
PORT=5001
EOF
```

**2.2 Generate secure API key** (if you want a real random key):

```bash
# Generate 64-character hex string
openssl rand -hex 32

# Example output: f7a3b9c2d4e6f8a0b1c3d5e7f9a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6

# Copy output and replace PROJECTOR_API_KEY value in .env
```

---

## Step 3: Configure Socket Server

The socket server needs to verify tokens and set up the `/projector-socket` namespace.

**3.1 Update socket-server environment variables**:

```bash
# Edit apps/socket-server/.env
cat > apps/socket-server/.env <<EOF
# Firebase Emulator Configuration
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
GOOGLE_CLOUD_PROJECT=stg-wedding-allstars

# Service Account (for token verification)
GOOGLE_APPLICATION_CREDENTIALS=../../service-account-dev.json

# Server Configuration
PORT=3001
EOF
```

**Note**: Socket server uses the same service account file as API server for token verification.

---

## Step 4: Configure Projector-App

The projector-app needs the API key to request custom tokens and the socket server URL.

**4.1 Update projector-app environment variables**:

```bash
# Edit apps/projector-app/.env.development
cat > apps/projector-app/.env.development <<EOF
# Firebase Configuration (Emulator)
VITE_FIREBASE_API_KEY=fake-api-key
VITE_FIREBASE_PROJECT_ID=stg-wedding-allstars
VITE_FIREBASE_AUTH_DOMAIN=work-ubuntu
VITE_FIREBASE_STORAGE_BUCKET=stg-wedding-allstars.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789

# API Configuration (Emulator)
VITE_API_BASE_URL=http://work-ubuntu:5001/stg-wedding-allstars/us-central1/api
VITE_SOCKET_SERVER_URL=http://work-ubuntu:3001

# Projector Authentication
VITE_PROJECTOR_API_KEY=abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234

# Feature Flags
VITE_USE_EMULATORS=true
VITE_LOG_LEVEL=debug
EOF
```

**IMPORTANT**: The `VITE_PROJECTOR_API_KEY` must match the `PROJECTOR_API_KEY` from api-server .env (Step 2.1).

---

## Step 5: Start Firebase Emulators

Start Firestore and Auth emulators for local development.

**5.1 Start emulators**:

```bash
cd /home/tisayama/allstars

# Start Firestore and Auth emulators
# Use timeout to prevent hanging if there are issues
timeout 30 firebase emulators:start --only firestore,auth

# Emulators should start on:
# - Firestore: localhost:8080
# - Auth: localhost:9099
# - Emulator UI: localhost:4000
```

**5.2 Verify emulators are running**:

```bash
# Check Firestore emulator
curl http://localhost:8080

# Check Auth emulator
curl http://localhost:9099

# Should both return responses (not "connection refused")
```

**Keep this terminal open** - emulators must run for the entire development session.

---

## Step 6: Initialize Firestore Data

Populate Firestore emulator with initial game state data.

**6.1 Run initialization script**:

```bash
# Open new terminal (keep emulators running in first terminal)
cd /home/tisayama/allstars

# Set Firestore emulator host and run init script
FIRESTORE_EMULATOR_HOST=localhost:8080 pnpm --filter @allstars/api-server run init:dev

# Expected output:
# ✓ Connected to Firestore emulator
# ✓ Initialized gameState/live document
# ✓ Firestore initialization complete
```

**6.2 Verify data was created**:

```bash
# Visit Firestore Emulator UI
open http://localhost:4000/firestore

# Navigate to: stg-wedding-allstars > gameState collection > live document
# Should see initialized game state data
```

---

## Step 7: Start API Server

Start the API server to provide the token generation endpoint.

**7.1 Start API server**:

```bash
# In a new terminal (terminal 2)
cd /home/tisayama/allstars

# Start API server in development mode
pnpm --filter @allstars/api-server run dev

# Expected output:
# API server listening on port 5001
# Firestore connected to emulator at localhost:8080
```

**7.2 Verify token endpoint is working**:

```bash
# Test the /api/projector/auth-token endpoint
curl -X POST http://work-ubuntu:5001/stg-wedding-allstars/us-central1/api/projector/auth-token \
  -H "X-API-Key: abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234" \
  -H "Content-Type: application/json"

# Expected response (example):
# {
#   "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresAt": 1700003600000,
#   "uid": "projector-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
# }

# If you get 401 Unauthorized, check that PROJECTOR_API_KEY matches in both .env files
```

**Keep this terminal open** - API server must run for projector-app to authenticate.

---

## Step 8: Start Socket Server

Start the WebSocket server with the `/projector-socket` namespace.

**8.1 Start socket server**:

```bash
# In a new terminal (terminal 3)
cd /home/tisayama/allstars

# Start socket server in development mode
pnpm --filter @allstars/socket-server run dev

# Expected output:
# Socket server listening on port 3001
# Firestore connected to emulator at localhost:8080
# Namespace /projector-socket registered
```

**8.2 Verify socket server is running**:

```bash
# Check socket server health endpoint (if available)
curl http://work-ubuntu:3001/health

# Or check that port is listening
lsof -i :3001

# Expected output:
# COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345  user   18u  IPv4  xxxxx      0t0  TCP *:3001 (LISTEN)
```

**Keep this terminal open** - socket server must run for WebSocket connections.

---

## Step 9: Start Projector-App

Finally, start the projector-app and verify authentication works.

**9.1 Start projector-app**:

```bash
# In a new terminal (terminal 4)
cd /home/tisayama/allstars

# Start projector-app in development mode
pnpm --filter @allstars/projector-app run dev

# Expected output:
# VITE ready in XXX ms
# ➜  Local:   http://work-ubuntu:5175/
# ➜  Network: use --host to expose
```

**9.2 Open projector-app in browser**:

```bash
# Open browser (or visit manually)
open http://work-ubuntu:5175
```

**9.3 Verify authentication success**:

In the browser developer console, you should see:

```
Firebase initialized successfully
Requesting custom token from API server...
Custom token received
Signing in with custom token...
Anonymous authentication successful
Connecting to WebSocket...
WebSocket connected
Authenticated: { sessionId: "abc123", uid: "projector-..." }
```

In the projector-app UI, you should see:
- **Green status bar** at the top: "WebSocket: 接続済"
- Game state displayed (if initialized)

---

## Step 10: Test Authentication Flow

Verify the complete authentication flow with various scenarios.

### Test 1: Successful Authentication

**Steps**:
1. Refresh projector-app page (Cmd+R / Ctrl+R)
2. Watch developer console for authentication logs
3. Verify green "WebSocket: 接続済" status

**Expected**:
- Status transitions: disconnected → authenticating → connected
- No errors in console
- Game state displays correctly

---

### Test 2: Invalid API Key

**Steps**:
1. Edit `apps/projector-app/.env.development`
2. Change `VITE_PROJECTOR_API_KEY` to wrong value: `invalid-key-123`
3. Restart projector-app: `pnpm --filter @allstars/projector-app run dev`
4. Open browser and check console

**Expected**:
- Console shows: "Failed to get custom token: 401 Unauthorized"
- Red status bar: "認証失敗：設定を確認してください"
- No WebSocket connection established

**Cleanup**: Revert `VITE_PROJECTOR_API_KEY` to correct value

---

### Test 3: Socket Server Restart (Reconnection)

**Steps**:
1. With projector-app running and connected, stop socket server (Ctrl+C in terminal 3)
2. Wait 5 seconds
3. Restart socket server: `pnpm --filter @allstars/socket-server run dev`
4. Watch projector-app developer console

**Expected**:
- Projector-app detects disconnection (red status)
- Attempts reconnection with exponential backoff
- Successfully reconnects when socket server is back
- Status changes back to green "WebSocket: 接続済"

---

### Test 4: Network Interruption Simulation

**Steps**:
1. Open browser developer tools → Network tab
2. Select "Offline" from network throttling dropdown
3. Wait 10 seconds
4. Select "Online" to restore network
5. Watch console for reconnection logs

**Expected**:
- Status changes to red "WebSocket: 切断"
- Displays last known game state (degraded mode)
- After network restored: automatic reconnection
- Status back to green within 3 seconds (SC-002)

---

### Test 5: Manual State Refresh

**Steps**:
1. With projector-app connected, open socket server terminal
2. Manually update Firestore `gameState/live` document in Emulator UI
3. Change `currentPhase` from `waiting` to `showing_question`
4. Verify projector-app receives update automatically
5. Test manual refresh (if implemented): Click refresh button in UI

**Expected**:
- Projector-app automatically updates when Firestore changes
- Manual refresh button triggers `REQUEST_STATE_REFRESH` event
- Game state immediately refreshes

---

## Troubleshooting

### Problem: "ECONNREFUSED" when connecting to socket server

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solutions**:
1. Verify socket server is running: `lsof -i :3001`
2. Check `VITE_SOCKET_SERVER_URL` uses correct hostname: `work-ubuntu` (not `localhost`)
3. Verify `/etc/hosts` has entry: `127.0.0.1 work-ubuntu`

---

### Problem: "401 Unauthorized" when requesting token

**Symptoms**:
```
Failed to get custom token: 401 Unauthorized
```

**Solutions**:
1. Verify `VITE_PROJECTOR_API_KEY` in projector-app matches `PROJECTOR_API_KEY` in api-server
2. Check API server logs for authentication errors
3. Verify API endpoint URL is correct: includes `/api` suffix
4. Test endpoint manually with curl (see Step 7.2)

---

### Problem: "AUTH_FAILED: INVALID_ROLE"

**Symptoms**:
```
WebSocket authentication failed: INVALID_ROLE
```

**Solutions**:
1. Verify custom token generation includes `role: 'projector'` claim
2. Check api-server token generation code: `createCustomToken(uid, { role: 'projector' })`
3. Inspect token JWT claims with [jwt.io](https://jwt.io)

---

### Problem: Status bar stays yellow "認証中..." forever

**Symptoms**:
- Status bar shows yellow "認証中..." (authenticating)
- Never transitions to green or red

**Solutions**:
1. Check if `AUTH_REQUIRED` event is received (console log)
2. Verify `authenticate` event is being sent by client
3. Check socket server logs for token verification errors
4. Verify Firestore emulator is running (token verification needs it)

---

### Problem: Projector-app shows blank screen

**Symptoms**:
- App loads but shows nothing
- No status bar visible

**Solutions**:
1. Check browser console for React errors
2. Verify Vite build is successful (no TypeScript errors)
3. Check that React components are rendering: `npm run dev` shows no errors
4. Verify environment variables are loaded: `console.log(import.meta.env)`

---

## Next Steps

After completing this quickstart:

1. **Implement UI Components**: Build the connection status bar (FR-006)
2. **Add Error Handling**: Implement retry logic and error displays (FR-003)
3. **Write Tests**: Create unit and integration tests for authentication flow
4. **Monitor Logs**: Set up structured logging for audit trail (FR-007)
5. **Production Deployment**: Replace dev service account with prod credentials

## Reference

- **Feature Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contract**: [contracts/projector-auth-api.yaml](./contracts/projector-auth-api.yaml)
- **WebSocket Events**: [contracts/projector-socket-events.md](./contracts/projector-socket-events.md)
- **Research**: [research.md](./research.md)

## Development Workflow Summary

**Terminal 1**: Firebase Emulators
```bash
firebase emulators:start --only firestore,auth
```

**Terminal 2**: API Server
```bash
pnpm --filter @allstars/api-server run dev
```

**Terminal 3**: Socket Server
```bash
pnpm --filter @allstars/socket-server run dev
```

**Terminal 4**: Projector-App
```bash
pnpm --filter @allstars/projector-app run dev
```

**Browser**: http://work-ubuntu:5175

---

**Quickstart Complete!** 🎉

You now have a fully functional projector-app authentication system running locally. The projector-app can authenticate to the socket server using Firebase custom tokens without any user interaction.
