# Production Deployment Guide

**Feature**: 001-projector-auth
**Document Version**: 1.0.0
**Last Updated**: 2025-11-16

## Overview

This guide provides step-by-step instructions for deploying the projector authentication system to production. This feature enables projector-app to authenticate with Firebase using server-generated custom tokens, supporting 8+ hour unattended operation.

## Prerequisites

Before deploying, ensure you have:

- [x] Access to Firebase Console for the production project
- [x] Access to api-server deployment environment (Cloud Functions or Cloud Run)
- [x] Access to socket-server deployment environment
- [x] Access to projector-app hosting (Firebase Hosting, Vercel, or static host)
- [x] Ability to set environment variables in all environments
- [x] Firebase Admin SDK credentials configured in api-server

## Architecture Overview

```
┌─────────────────┐
│  projector-app  │ (Browser - React/Vite)
│   - Fetches token from api-server using static API key
│   - Authenticates to Firebase with custom token
│   - Connects to socket-server /projector-socket namespace
│   - Auto-refreshes token every 55 minutes
└────────┬────────┘
         │
         │ 1. POST /api/projector/auth-token (X-API-Key header)
         │
         ▼
┌─────────────────┐
│   api-server    │ (Cloud Functions / Cloud Run)
│   - Validates API key
│   - Generates Firebase custom token (1 hour lifetime)
│   - Returns token + expiration + UID
│   - Logs to audit trail
└────────┬────────┘
         │
         │ 2. signInWithCustomToken(token)
         │
         ▼
┌─────────────────┐
│ Firebase Auth   │
│   - Validates custom token
│   - Issues ID token with claims: { role: "projector" }
│   - Returns authenticated user
└────────┬────────┘
         │
         │ 3. Socket.IO connection with auth: { firebaseToken }
         │
         ▼
┌─────────────────┐
│  socket-server  │ (Cloud Functions / Cloud Run)
│   - /projector-socket namespace
│   - Validates Firebase ID token
│   - Verifies role === "projector"
│   - Emits AUTH_SUCCESS or AUTH_FAILED
│   - Broadcasts game events
└─────────────────┘
```

## Deployment Steps

### Step 1: Configure api-server Environment

#### 1.1 Generate Projector API Key

```bash
# Generate a secure 32-character API key
openssl rand -base64 32

# Example output: aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789+/==
```

**IMPORTANT**: Save this key securely - you'll need it for both api-server and projector-app.

#### 1.2 Set api-server Environment Variables

**Firebase Cloud Functions**:

```bash
# Set environment variables
firebase functions:config:set \
  projector.api_key="<generated-key-from-1.1>"

# Verify configuration
firebase functions:config:get
```

**Cloud Run / Docker**:

```bash
# Set environment variable
gcloud run services update api-server \
  --update-env-vars PROJECTOR_API_KEY="<generated-key-from-1.1>"
```

**Local Development**:

```bash
# In apps/api-server/.env
PROJECTOR_API_KEY=<generated-key-from-1.1>
```

#### 1.3 Verify Firebase Admin SDK Configuration

Ensure api-server has Firebase Admin SDK initialized with service account credentials:

```typescript
// apps/api-server/src/index.ts (should already exist)
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // OR
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
```

#### 1.4 Deploy api-server

```bash
cd apps/api-server

# Build
pnpm run build

# Deploy to Firebase Cloud Functions
firebase deploy --only functions:api

# OR deploy to Cloud Run
gcloud run deploy api-server --source .
```

#### 1.5 Verify api-server Deployment

```bash
# Test token generation endpoint
curl -X POST https://your-api-server.com/api/projector/auth-token \
  -H "X-API-Key: <api-key>" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1700000000000,
  "uid": "projector-abc123-def456-789xyz"
}
```

### Step 2: Configure socket-server Environment

#### 2.1 Verify Firebase Admin SDK Configuration

Socket-server needs Firebase Admin SDK to verify ID tokens:

```typescript
// apps/socket-server/src/index.ts (should already exist)
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
```

#### 2.2 Deploy socket-server

```bash
cd apps/socket-server

# Build
pnpm run build

# Deploy to Firebase Cloud Functions
firebase deploy --only functions:socket

# OR deploy to Cloud Run
gcloud run deploy socket-server --source .
```

#### 2.3 Verify socket-server Deployment

```bash
# Check socket-server health endpoint
curl https://your-socket-server.com/health

# Expected response (200 OK):
{
  "status": "healthy",
  "timestamp": 1700000000000
}
```

### Step 3: Configure projector-app Environment

#### 3.1 Set projector-app Environment Variables

**IMPORTANT**: Never commit `.env` files to version control!

Create `apps/projector-app/.env.production`:

```bash
# API Server Configuration
VITE_API_BASE_URL=https://your-api-server.com/api
VITE_PROJECTOR_API_KEY=<same-key-from-step-1.1>

# Socket Server Configuration
VITE_SOCKET_SERVER_URL=https://your-socket-server.com

# Firebase Configuration (public - safe to expose)
VITE_FIREBASE_API_KEY=<from-firebase-console>
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
```

**Security Note**: The `VITE_PROJECTOR_API_KEY` is a **static API key** that is acceptable to expose in client-side builds. It's validated server-side and cannot be used to directly access Firebase or other sensitive resources.

#### 3.2 Build projector-app

```bash
cd apps/projector-app

# Build for production (reads .env.production)
pnpm run build

# Output directory: dist/
```

#### 3.3 Verify Build Contains Correct Environment Variables

```bash
# Check that build contains environment variables
grep -r "VITE_API_BASE_URL" dist/

# Should find references in bundled JavaScript files
```

#### 3.4 Deploy projector-app

**Firebase Hosting**:

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting:projector

# OR specify target
firebase target:apply hosting projector your-projector-site
firebase deploy --only hosting:projector
```

**Vercel**:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (set env vars in Vercel dashboard first)
vercel --prod
```

**Static Host (Netlify, AWS S3, etc.)**:

```bash
# Upload dist/ directory to your static host
# Ensure environment variables are set before build
```

#### 3.5 Verify projector-app Deployment

1. **Open projector-app URL** in browser
2. **Check browser console** for authentication logs:
   ```
   [Auth] Token refresh scheduled in 3300s
   [Auth] Projector authenticated, userId: projector-abc123-def456-789xyz
   ```
3. **Check connection status indicator** - should show green "Connected"
4. **Verify Socket.IO connection** in Network tab:
   - WebSocket connection to `/projector-socket` namespace
   - Should see `AUTH_SUCCESS` event

### Step 4: Configure Monitoring and Logging

#### 4.1 Enable Audit Logging

Audit logs are automatically written to console output. Configure log aggregation:

**Firebase Cloud Functions**:

```bash
# Logs are automatically sent to Cloud Logging
# View logs in Firebase Console > Functions > Logs
# Or use gcloud CLI:
gcloud logging read "resource.type=cloud_function" --limit 50
```

**Cloud Run**:

```bash
# View logs in Cloud Console > Cloud Run > Logs
# Or use gcloud CLI:
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

#### 4.2 Set Up Alerts

**Token Generation Failures**:

```bash
# Create log-based metric for failed token generation
gcloud logging metrics create token_generation_failures \
  --description="Failed projector token generation attempts" \
  --log-filter='jsonPayload.event="AUTH_FAILED"'

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --display-name="Projector Token Failures" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --condition-display-name="More than 5 failures in 5 minutes"
```

**Invalid API Keys**:

```bash
# Create log-based metric for invalid API keys
gcloud logging metrics create invalid_api_keys \
  --description="Invalid API key attempts" \
  --log-filter='jsonPayload.message=~"Invalid API key"'
```

#### 4.3 Monitor Key Metrics

Track these metrics in production:

- **Token Generation Rate**: Should be ~1 token per projector per hour
- **Token Generation Failures**: Should be 0 (investigate spikes)
- **WebSocket Authentication Rate**: Should match projector count
- **WebSocket Authentication Failures**: Should be 0 (investigate any failures)
- **Token Refresh Success Rate**: Should be 100% for active projectors

### Step 5: Test End-to-End Flow

#### 5.1 Manual Testing

1. **Load projector-app** in browser
2. **Wait for authentication** - should see "Connected" within 2-3 seconds
3. **Check audit logs** in api-server for token generation:
   ```
   [AUDIT] TOKEN_GENERATED { uid: "projector-...", expiresAt: ... }
   ```
4. **Check socket-server logs** for successful authentication:
   ```
   [Auth] Projector authenticated: projector-... (session: abc123)
   ```
5. **Leave projector running for 1+ hour** - should auto-refresh token at 55 minutes
6. **Check browser console** for refresh logs:
   ```
   [Auth] Automatic token refresh triggered
   [Auth] Token refreshed, expires at: 2025-11-16T12:00:00.000Z
   ```

#### 5.2 Automated Testing

```bash
# Run E2E tests against production (if configured)
cd tests/e2e
PROJECTOR_URL=https://your-projector.com pnpm test:e2e
```

### Step 6: Post-Deployment Verification

#### 6.1 Security Checklist

- [ ] API keys are stored in environment variables, not committed to version control
- [ ] `.env` files are listed in `.gitignore`
- [ ] Firebase Admin SDK credentials are secure (service account key rotation enabled)
- [ ] Audit logging is enabled and monitored
- [ ] No sensitive credentials exposed in client-side builds
- [ ] CORS configured correctly on api-server (if applicable)
- [ ] Rate limiting enabled on token generation endpoint (optional, recommended)

#### 6.2 Performance Checklist

- [ ] Token generation takes <500ms (check api-server logs)
- [ ] WebSocket connection establishes within 2-3 seconds
- [ ] Token refresh happens automatically at 55 minutes
- [ ] No memory leaks in long-running projector instances (check after 8+ hours)
- [ ] Reconnection works correctly after temporary network loss

#### 6.3 Operational Checklist

- [ ] Runbook documented for token rotation (see `ROTATION.md`)
- [ ] Alert recipients configured for authentication failures
- [ ] Backup projector instances tested (can multiple projectors authenticate?)
- [ ] Rollback procedure tested (can revert to previous version?)
- [ ] On-call team trained on troubleshooting authentication issues

## Troubleshooting

### Issue: Projector Can't Authenticate

**Symptoms**:
- Red connection indicator
- Error: "Failed to fetch custom token"
- 401 response from `/api/projector/auth-token`

**Diagnosis**:

```bash
# Check api-server logs
gcloud logging read "resource.type=cloud_function" --limit 50 | grep "AUTH_FAILED"

# Check if API key matches
echo $PROJECTOR_API_KEY  # on api-server
# vs.
grep VITE_PROJECTOR_API_KEY apps/projector-app/.env.production
```

**Solution**:
1. Verify API key matches in both api-server and projector-app
2. Verify api-server environment variable is set: `gcloud run services describe api-server`
3. Rebuild projector-app if environment variables changed
4. Check api-server deployment logs for errors

### Issue: WebSocket Authentication Fails

**Symptoms**:
- Yellow connection indicator (connected but not authenticated)
- Error: "Projector authentication failed"
- `AUTH_FAILED` event received

**Diagnosis**:

```bash
# Check socket-server logs
gcloud logging read "resource.type=cloud_function" --limit 50 | grep "AUTH_FAILED"

# Check Firebase ID token
# In browser console:
firebase.auth().currentUser.getIdToken().then(token => console.log(token))
```

**Solution**:
1. Verify Firebase custom token is valid (check `expiresAt`)
2. Verify socket-server has Firebase Admin SDK initialized
3. Check ID token claims include `role: "projector"`
4. Verify socket-server can validate ID tokens (check logs for errors)

### Issue: Token Refresh Fails

**Symptoms**:
- Projector disconnects after 1 hour
- Error: "Token refresh failed"
- No automatic reconnection

**Diagnosis**:

```bash
# Check browser console logs
# Should see refresh attempt:
[Auth] Automatic token refresh triggered
[Auth] Token refresh failed: <error-message>
```

**Solution**:
1. Verify api-server is reachable from projector-app
2. Check if API key is still valid (not rotated without updating projector)
3. Verify token generation endpoint returns 200 OK
4. Check network connectivity (firewall rules, DNS resolution)

### Issue: Multiple Projectors Conflict

**Symptoms**:
- One projector connects, others fail
- Error: "Session already exists"

**Diagnosis**:

```bash
# Check socket-server logs for concurrent connections
gcloud logging read "resource.type=cloud_function" \
  --filter='jsonPayload.message=~"Projector authenticated"' \
  --limit 50
```

**Solution**:
1. Verify socket-server supports multiple connections (it should)
2. Check if UIDs are unique (should be `projector-<uuid>`)
3. Verify namespace is `/projector-socket` (not shared with other apps)

## Rollback Procedure

If issues arise after deployment, follow this rollback procedure:

### 1. Rollback projector-app

```bash
# Firebase Hosting
firebase hosting:clone <previous-version-id>:<current-site-id>

# Vercel
vercel rollback <deployment-url>
```

### 2. Rollback api-server (if needed)

```bash
# Firebase Cloud Functions
firebase deploy --only functions:api --force --revision <previous-revision>

# Cloud Run
gcloud run services update-traffic api-server \
  --to-revisions <previous-revision>=100
```

### 3. Rollback socket-server (if needed)

```bash
# Firebase Cloud Functions
firebase deploy --only functions:socket --force --revision <previous-revision>

# Cloud Run
gcloud run services update-traffic socket-server \
  --to-revisions <previous-revision>=100
```

### 4. Verify Rollback

Repeat Step 5 (Test End-to-End Flow) to ensure rollback was successful.

## Maintenance

### Token Rotation

Follow the procedures in `ROTATION.md` to rotate API keys every 90 days or when compromised.

### Firebase Admin SDK Credential Rotation

1. Generate new service account key in Firebase Console
2. Update environment variables with new credentials
3. Deploy api-server and socket-server
4. Verify authentication still works
5. Delete old service account key

### Monitoring Dashboard

Recommended metrics to track in Cloud Monitoring:

- **Token Generation Rate**: `cloud_function/execution_count` filtered by function name
- **Authentication Success Rate**: Custom metric from audit logs
- **WebSocket Connection Count**: Socket.IO metrics (if exposed)
- **Error Rate**: `cloud_function/execution_times` with `status != 200`

## Support Contacts

For issues during deployment:

- **Development Team**: [your-team-email@example.com]
- **Firebase Support**: Firebase Console > Support
- **Infrastructure Team**: [infra-team@example.com]

## Appendix

### Environment Variable Reference

| Variable | Location | Required | Example | Description |
|----------|----------|----------|---------|-------------|
| `PROJECTOR_API_KEY` | api-server | Yes | `abc123xyz789` | Static API key for projector auth |
| `VITE_API_BASE_URL` | projector-app | Yes | `https://api.example.com/api` | API server base URL |
| `VITE_PROJECTOR_API_KEY` | projector-app | Yes | `abc123xyz789` | Same as `PROJECTOR_API_KEY` |
| `VITE_SOCKET_SERVER_URL` | projector-app | Yes | `https://socket.example.com` | Socket server URL |
| `VITE_FIREBASE_*` | projector-app | Yes | (see Firebase Console) | Firebase client config |
| `FIREBASE_PROJECT_ID` | api-server, socket-server | Yes | `your-project-id` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | api-server, socket-server | Yes | `firebase-adminsdk@...` | Service account email |
| `FIREBASE_PRIVATE_KEY` | api-server, socket-server | Yes | `-----BEGIN PRIVATE KEY-----\n...` | Service account private key |

### Deployment Checklist

Use this checklist for each deployment:

- [ ] Generate or rotate API key (if needed)
- [ ] Set environment variables in all services
- [ ] Build and deploy api-server
- [ ] Build and deploy socket-server
- [ ] Build and deploy projector-app
- [ ] Verify end-to-end authentication flow
- [ ] Check audit logs for errors
- [ ] Monitor for 24 hours post-deployment
- [ ] Document any issues or deviations from this guide

---

**Document Maintained By**: Development Team
**Review Schedule**: Every 6 months or after major infrastructure changes
