# Quick Start: Development Server Configuration

**Feature**: 001-dev-server-config | **Status**: Implementation Ready

## What Changed

The development environment now starts **all applications** (including projector-app) with a single command and uses **fixed port numbers** to ensure consistent URLs across restarts.

### Port Assignments

| Application | Port | URL |
|-------------|------|-----|
| admin-app | 5170 | http://localhost:5170 |
| host-app | 5175 | http://localhost:5175 |
| participant-app | 5180 | http://localhost:5180 |
| projector-app | 5185 | http://localhost:5185 |
| socket-server | (existing) | WebSocket server |
| firebase-emulators | (existing) | See Firebase UI |

### Console Labels

When running `pnpm run dev`, each service is identified with a color-coded label:
- **admin** - Blue background
- **host** - Magenta background
- **participant** - Green background
- **projector** - Cyan background (NEW)
- **socket** - Yellow background
- **firebase** - Red background

## Starting the Development Environment

```bash
# From project root
pnpm run dev
```

This single command now starts:
1. admin-app (Vite dev server on port 5170)
2. host-app (Vite dev server on port 5175)
3. participant-app (Vite dev server on port 5180)
4. projector-app (Vite dev server on port 5185)
5. socket-server (WebSocket server)
6. Firebase emulators (Auth, Firestore)

**Expected startup time**: < 30 seconds for all services

## Verifying the Setup

After running `pnpm run dev`, verify each service started correctly:

1. **Check terminal output** - Look for cyan-labeled "projector" logs
2. **Test each URL** - Open each port in your browser:
   - http://localhost:5170 → Should load admin-app
   - http://localhost:5175 → Should load host-app
   - http://localhost:5180 → Should load participant-app
   - http://localhost:5185 → Should load projector-app

3. **Verify port consistency** - Restart `pnpm run dev` and confirm the same ports are used

## Troubleshooting

### Port Conflict Errors

If you see `EADDRINUSE` errors, another process is using one of the assigned ports.

**Find the conflicting process:**

```bash
# macOS/Linux
lsof -i :5170  # Replace with the conflicting port number

# Windows
netstat -ano | findstr :5170  # Replace with the conflicting port number
```

**Resolution options:**
1. Stop the conflicting process
2. Kill the process using the port: `kill -9 <PID>` (macOS/Linux) or `taskkill /PID <PID> /F` (Windows)
3. Wait for automatic timeout if it's a stale process

**Why ports are strict now**: The configuration uses `strictPort: true` in Vite, which prevents automatic fallback to the next available port. This ensures URL consistency but requires resolving conflicts manually.

### Projector-app Not Starting

If projector-app fails to start:

1. **Verify dev script exists** in `apps/projector-app/package.json`:
   ```json
   {
     "scripts": {
       "dev": "vite"
     }
   }
   ```

2. **Check port 5185 availability** using the commands above

3. **Review terminal logs** - Look for the cyan "projector" label for error messages

### Partial Service Startup

If some services start but others fail:
- **Working services will continue running** (concurrently doesn't stop on individual failures)
- **Check terminal output** for the specific service label showing errors
- **Common causes**: Port conflicts, missing dependencies, configuration errors

### No Console Colors

If you don't see colored labels in your terminal:
- Ensure your terminal supports ANSI color codes
- Try a different terminal emulator (Windows: Windows Terminal, macOS: iTerm2, Linux: GNOME Terminal)
- Labels will still appear, just without background colors

## Configuration Reference

### Vite Configuration Files

Each Vite app's `vite.config.ts` follows this pattern:

```typescript
export default defineConfig({
  server: {
    port: 5170, // Unique port per app
    strictPort: true, // Fail if port unavailable (no fallback)
    host: true, // Network access (where needed)
  },
});
```

**Location of config files:**
- `apps/admin-app/vite.config.ts` (port 5170)
- `apps/host-app/vite.config.ts` (port 5175)
- `apps/participant-app/vite.config.ts` (port 5180)
- `apps/projector-app/vite.config.ts` (port 5185)

### Root Dev Script

The `pnpm run dev` command in `package.json` uses concurrently:

```json
{
  "scripts": {
    "dev": "concurrently -n admin,host,participant,projector,socket,firebase -c bgBlue,bgMagenta,bgGreen,bgCyan,bgYellow,bgRed \"pnpm --filter @allstars/admin-app dev\" \"pnpm --filter @allstars/host-app dev\" \"pnpm --filter @allstars/participant-app dev\" \"pnpm --filter @allstars/projector-app dev\" \"pnpm --filter @allstars/socket-server dev\" \"firebase emulators:start --import=./emulator-data --export-on-exit\""
  }
}
```

## Developer Workflow Impact

### Before This Change
- Run `pnpm run dev` to start 5 services (admin, host, participant, socket, firebase)
- Manually start projector-app in a separate terminal
- Port numbers could change on restart (e.g., 5173 → 5174 if port was busy)
- Update bookmarks and mobile device test URLs after each restart

### After This Change
- Run `pnpm run dev` to start **all 6 services** including projector-app
- Port numbers remain consistent: 5170, 5175, 5180, 5185
- Bookmarks and URLs work across restarts
- Port conflicts fail fast with clear error messages (fix once, not every restart)

## Testing Mobile Devices

With fixed ports, you can now:
1. Configure your mobile device test URLs once (e.g., `http://192.168.1.100:5180` for participant-app)
2. Add URLs to home screen bookmarks
3. URLs remain valid across development server restarts

**Network access**: host-app and projector-app have `host: true` in their Vite configs, enabling access from devices on the same network.

## Related Documentation

- Feature Specification: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- Research Decisions: [research.md](./research.md)
- Requirements Checklist: [checklists/requirements.md](./checklists/requirements.md)

## Support

If you encounter issues not covered in this guide:
1. Check the terminal output for specific error messages
2. Review [research.md](./research.md) for technical decisions
3. Verify port availability using the troubleshooting commands above
4. Ensure all dependencies are installed: `pnpm install`
