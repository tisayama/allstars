# Quick Start: Firestore Development Environment Initialization

**Feature**: 002-firestore-init
**Audience**: Developers setting up local development environment
**Time to Complete**: < 5 minutes

## Overview

This script initializes your local Firestore emulator with the required `gameState/live` document, eliminating manual database setup and preventing "GameState document does not exist" errors when starting applications.

## Prerequisites

Before running the initialization script, ensure you have:

1. **Firestore Emulator Running**
   ```bash
   firebase emulators:start --only firestore --project stg-wedding-allstars
   ```
   The emulator must be running on `localhost:8080` (default port).

2. **Dependencies Installed**
   ```bash
   pnpm install
   ```
   Ensures Firebase Admin SDK and tsx are available.

3. **Environment Variable (Optional)**
   ```bash
   export FIRESTORE_EMULATOR_HOST=localhost:8080
   ```
   While not strictly required (the script configures this programmatically), setting this environment variable is good practice for consistency.

## Usage

### First-Time Setup

From the repository root, run:

```bash
pnpm run init:dev
```

**Expected Output**:
```
Initializing Firestore development environment...
✓ gameState/live created successfully
✓ Initialization complete
```

**Exit Code**: `0` (success)

### Subsequent Runs (Idempotent)

Running the script multiple times is safe and will not overwrite existing data:

```bash
pnpm run init:dev
```

**Expected Output**:
```
Initializing Firestore development environment...
✓ gameState/live already exists, skipping initialization
✓ Initialization complete
```

**Exit Code**: `0` (success)

## Common Scenarios

### Scenario 1: Fresh Environment Setup

**When**: You've just cloned the repository or restarted your development machine.

**Steps**:
1. Start Firebase emulators: `firebase emulators:start --only firestore`
2. In a new terminal, run: `pnpm run init:dev`
3. Start applications: `pnpm run dev`

**Result**: All applications load without database errors.

### Scenario 2: Emulator Data Reset

**When**: You've cleared emulator data (e.g., deleted `emulator-data/` directory) and need to reinitialize.

**Steps**:
1. Ensure emulator is running
2. Run: `pnpm run init:dev`
3. Continue development

**Result**: Fresh gameState document created with initial values.

### Scenario 3: Corrupted GameState

**When**: Manual edits or bugs have corrupted the gameState document.

**Steps**:
1. Delete the document via Firestore Emulator UI (http://localhost:4000/firestore)
2. Run: `pnpm run init:dev`

**Result**: Clean gameState document recreated.

## Troubleshooting

### Error: "FIRESTORE_EMULATOR_HOST not set"

**Symptom**:
```
✗ FIRESTORE_EMULATOR_HOST not set - refusing to run against production
  Set FIRESTORE_EMULATOR_HOST=localhost:8080 to use emulator
```

**Cause**: Script detected it might connect to production Firestore.

**Solution**:
```bash
export FIRESTORE_EMULATOR_HOST=localhost:8080
pnpm run init:dev
```

### Error: "Firestore emulator is not running on localhost:8080"

**Symptom**:
```
✗ Initialization failed: Error: connect ECONNREFUSED 127.0.0.1:8080
  Hint: Ensure Firestore emulator is running on localhost:8080
  Start with: firebase emulators:start --only firestore
```

**Cause**: Firestore emulator is not running or running on different port.

**Solution**:
1. Check if emulator is running: `lsof -ti:8080`
2. If not running, start it: `firebase emulators:start --only firestore --project stg-wedding-allstars`
3. If running on different port, update script or use default port

### Error: "Timeout"

**Symptom**:
```
Command timed out after 10 seconds
```

**Cause**: Script took longer than expected (very rare, typically <3 seconds).

**Solution**:
1. Check network connectivity to localhost
2. Verify Firestore emulator is responding: `curl http://localhost:8080`
3. Restart Firestore emulator and try again

### Applications Still Show Errors After Initialization

**Symptom**: Projector-app shows "GameState document does not exist" even after running `pnpm run init:dev`.

**Possible Causes & Solutions**:

1. **Wrong Project ID**: Applications might be connecting to different Firestore project.
   - Check `.env.development` files for `VITE_FIREBASE_PROJECT_ID`
   - Ensure it matches `stg-wedding-allstars`

2. **Caching Issue**: Application cached old Firebase connection.
   - Restart the application
   - Clear browser cache (for frontend apps)

3. **Wrong Emulator Port**: Application connecting to wrong port.
   - Verify emulator running on port 8080: `lsof -ti:8080`
   - Check application Firebase config for correct emulator settings

## Verification

### Manual Verification

1. **Via Firestore Emulator UI**:
   - Navigate to http://localhost:4000/firestore
   - Expand `gameState` collection
   - Verify `live` document exists
   - Check fields: currentPhase should be "ready_for_next"

2. **Via Projector App**:
   - Start projector-app: `pnpm --filter @allstars/projector-app dev`
   - Navigate to http://localhost:5185
   - Should display: "Get ready for the next question..."
   - No error messages in browser console

### Automated Verification

Run the unit tests:

```bash
pnpm test tests/unit/scripts/init-firestore-dev.test.ts
```

**Expected**: All tests pass (idempotency, document structure, error handling).

## Integration with Development Workflow

### Recommended Setup Order

1. **Install dependencies**: `pnpm install`
2. **Start Firebase emulators**: `firebase emulators:start --only firestore`
3. **Initialize Firestore**: `pnpm run init:dev` (this script)
4. **Start all applications**: `pnpm run dev`

### Automation (Optional)

For convenience, you can add initialization to your startup script:

```bash
#!/bin/bash
# start-dev.sh

# Start emulators in background
firebase emulators:start --only firestore --project stg-wedding-allstars &
EMULATOR_PID=$!

# Wait for emulator to be ready
sleep 5

# Initialize Firestore
pnpm run init:dev

# Start all apps
pnpm run dev

# Cleanup on exit
trap "kill $EMULATOR_PID" EXIT
```

**Note**: The script's idempotency ensures this is safe even if data already exists.

## Performance

- **First Run** (document creation): 1-2 seconds
- **Subsequent Runs** (existence check): <1 second
- **Timeout Threshold**: 10 seconds (should never be reached)

Performance meets success criteria:
- ✓ SC-002: Completes in <3 seconds
- ✓ SC-004: Error detection within 2 seconds

## Security Notes

- **Development Only**: Script refuses to run without `FIRESTORE_EMULATOR_HOST` set
- **No Production Risk**: Cannot accidentally write to production Firestore
- **No Credentials Required**: Firestore emulator doesn't require authentication

## Next Steps

After successful initialization:

1. **Start Development**: Run `pnpm run dev` to start all applications
2. **Verify Applications**: Check projector-app, host-app load without errors
3. **Begin Development**: GameState is ready for game logic implementation

## Support

If you encounter issues not covered in troubleshooting:

1. Check Firestore emulator logs: `cat /tmp/firestore-emulator.log`
2. Verify script source: `/home/tisayama/allstars/scripts/init-firestore-dev.ts`
3. Review test cases: `/home/tisayama/allstars/tests/unit/scripts/init-firestore-dev.test.ts`
4. Consult data model: `/home/tisayama/allstars/specs/002-firestore-init/data-model.md`

## Related Documentation

- [Feature Specification](./spec.md) - Requirements and user stories
- [Implementation Plan](./plan.md) - Technical approach and architecture
- [Data Model](./data-model.md) - GameState document schema details
- [Research](./research.md) - Technical decisions and alternatives considered
