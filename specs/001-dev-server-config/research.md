# Research: Development Server Configuration

**Feature**: 001-dev-server-config
**Date**: 2025-11-05
**Status**: Complete

## Research Questions

### Q1: How to disable Vite's automatic port fallback behavior?

**Decision**: Use `strictPort: true` in Vite server configuration

**Rationale**:
- Vite's `server.strictPort` option explicitly controls port fallback behavior
- When `strictPort: true`, Vite will fail with an error if the configured port is unavailable
- When `strictPort: false` (default), Vite automatically tries the next available port
- This aligns with FR-006 requirement to "prevent Vite from automatically using a different port"

**Current State Analysis**:
- admin-app: No `strictPort` setting → defaults to `false` (allows fallback)
- host-app: Already has `strictPort: false` explicitly set in vite.config.ts:16
- participant-app: Has `strictPort: false` explicitly set in vite.config.ts:16
- projector-app: Has `strictPort: false` explicitly set in vite.config.ts:16

**Implementation**:
```typescript
// In vite.config.ts
export default defineConfig({
  server: {
    port: 5170, // or assigned port
    strictPort: true, // Fail if port unavailable instead of using fallback
    host: true, // Keep existing host setting where present
  },
});
```

**Alternatives Considered**:
1. **Custom port detection script** - Rejected: Adds complexity, Vite native option is simpler
2. **Environment variable per app** - Rejected: Less discoverable, requires runtime logic
3. **Keep strictPort: false with documented ports** - Rejected: Violates FR-006, doesn't prevent unpredictable ports

**References**:
- Vite Server Options Documentation: https://vitejs.dev/config/server-options.html#server-strictport

---

### Q2: How to configure concurrently to add projector-app with distinct label and color?

**Decision**: Update concurrently command with projector entry using `-n` (names) and `-c` (colors) flags

**Rationale**:
- Concurrently supports up to 9 parallel processes with labeled output
- The `-n` flag defines comma-separated service names for log prefixes
- The `-c` flag defines comma-separated background colors (bgBlue, bgCyan, etc.)
- Colors must be in same order as names

**Current Configuration** (root package.json line 7):
```json
"dev": "concurrently -n admin,host,participant,socket,firebase -c bgBlue,bgMagenta,bgGreen,bgYellow,bgRed \"pnpm --filter @allstars/admin-app dev\" \"pnpm --filter @allstars/host-app dev\" \"pnpm --filter @allstars/participant-app dev\" \"pnpm --filter @allstars/socket-server dev\" \"firebase emulators:start --import=./emulator-data --export-on-exit\""
```

**Implementation**:
```json
"dev": "concurrently -n admin,host,participant,projector,socket,firebase -c bgBlue,bgMagenta,bgGreen,bgCyan,bgYellow,bgRed \"pnpm --filter @allstars/admin-app dev\" \"pnpm --filter @allstars/host-app dev\" \"pnpm --filter @allstars/participant-app dev\" \"pnpm --filter @allstars/projector-app dev\" \"pnpm --filter @allstars/socket-server dev\" \"firebase emulators:start --import=./emulator-data --export-on-exit\""
```

**Key Changes**:
- Add `projector` to `-n` list (4th position, before socket)
- Add `bgCyan` to `-c` list (4th position, matching projector)
- Add `\"pnpm --filter @allstars/projector-app dev\"` command (4th position)

**Alternatives Considered**:
1. **Append projector at end** - Rejected: Logical grouping puts all Vite apps before backend services
2. **Use different color** - Rejected: bgCyan chosen in clarification Q3, distinct from existing colors
3. **Separate dev:projector script** - Rejected: Violates US1 requirement for single command startup

**References**:
- Concurrently Documentation: https://github.com/open-cli-tools/concurrently#usage
- Supported colors: black, red, green, yellow, blue, magenta, cyan, white, gray, and bg variants

---

### Q3: Best practices for documenting development port assignments?

**Decision**: Add port mapping table to project README.md with links to source configs

**Rationale**:
- Centralized documentation in README provides single source of truth
- Table format enables quick reference during development
- Links to vite.config.ts files allow verification and updates
- Aligns with FR-010 requirement for documented port configuration

**Implementation Location**:
Create new "Development Server Ports" section in README.md or create dedicated docs/development.md if README is crowded

**Table Format**:
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

**Alternatives Considered**:
1. **Inline comments in vite.config.ts** - Rejected: Not discoverable, requires opening each file
2. **Separate ports.md file** - Rejected: Less visible than README
3. **Environment variables** - Rejected: Configuration-as-code in vite.config.ts is more explicit

---

### Q4: Fallback port configuration strategy (FR-011 optional requirement)

**Decision**: Defer fallback port implementation to future iteration

**Rationale**:
- FR-011 is explicitly marked as "MAY" (optional), not "MUST"
- Primary requirements (FR-001 through FR-010) can be satisfied without fallback logic
- Vite's `strictPort: true` deliberately prevents fallback to enforce predictable ports
- Fallback implementation would require:
  - Custom wrapper script or Vite plugin
  - Additional configuration complexity
  - Testing matrix for fallback scenarios
- Current approach (fail fast with clear error) aligns with clarification answer "retry with fallback if configured" - no fallback configured means fail

**Future Implementation Approach** (if needed):
- Create shared script `scripts/dev-with-fallback.sh` that wraps Vite startup
- Check port availability before launching Vite
- Pass alternate port via Vite CLI (`vite --port 5171`) if primary unavailable
- Update documentation with fallback port ranges

**Acceptance**:
This decision satisfies all mandatory requirements. Fallback support can be added in a future feature if developers encounter frequent port conflicts in practice.

---

## Technology Stack Confirmation

### Vite Configuration
- **Version**: 5.0 (confirmed in package.json dependencies)
- **Configuration Format**: TypeScript (vite.config.ts in all apps)
- **Required Changes**: Add/update `server.port` and `server.strictPort` properties
- **Impact**: Development server only, zero production build changes

### Concurrently
- **Version**: 9.2.1 (confirmed in root package.json devDependencies)
- **Current Usage**: Managing 5 parallel processes (admin, host, participant, socket, firebase)
- **New Requirement**: Add 6th process (projector)
- **Capacity**: Supports up to 9 processes, well within limits

### PNPM Workspaces
- **Current Setup**: Monorepo with workspace protocol
- **Filter Syntax**: `--filter @allstars/<app-name>` already used for admin/host/participant
- **New Usage**: `--filter @allstars/projector-app dev` (matches existing pattern)
- **Verification Needed**: Confirm projector-app has "dev" script in its package.json

---

## Risk Assessment

### Risk 1: Port conflicts with existing developer environments
**Likelihood**: Medium
**Impact**: Low (fails fast with clear error)
**Mitigation**: Documentation includes port conflict resolution steps

### Risk 2: Projector-app missing "dev" script
**Likelihood**: Low (assumption validated)
**Impact**: Medium (concurrently would fail to start projector)
**Mitigation**: Verify projector-app/package.json has "dev": "vite" script before implementation

### Risk 3: Cross-platform port binding differences
**Likelihood**: Low (ports 5170-5185 are non-privileged)
**Impact**: Low (same behavior across Linux/macOS/Windows)
**Mitigation**: Manual testing on different platforms during verification

### Risk 4: Existing developer workflows broken
**Likelihood**: Low
**Impact**: Medium (developers may have bookmarks/scripts with old ports)
**Mitigation**:
- Announce port changes in PR description
- Update any existing documentation referencing old ports
- Consider adding --help output showing new ports

---

## Implementation Checklist

- [ ] Update admin-app/vite.config.ts (port 5170, strictPort: true)
- [ ] Update host-app/vite.config.ts (port 5175, strictPort: true)
- [ ] Update participant-app/vite.config.ts (port 5180, strictPort: true)
- [ ] Update projector-app/vite.config.ts (port 5185, strictPort: true)
- [ ] Update root package.json dev script (add projector with bgCyan label)
- [ ] Add port documentation table to README.md or docs/development.md
- [ ] Verify projector-app has "dev" script in package.json
- [ ] Test manual startup: `pnpm run dev` and verify all 6 services start
- [ ] Test port assignment: Check each Vite app binds to correct port
- [ ] Test port conflict: Start service on 5170, verify admin-app fails with clear error
- [ ] Test log labels: Verify projector shows cyan background in terminal
- [ ] Update CLAUDE.md if port conventions should be documented

---

## References

- [Vite Server Configuration](https://vitejs.dev/config/server-options.html)
- [Concurrently CLI Documentation](https://github.com/open-cli-tools/concurrently)
- [PNPM Workspace Documentation](https://pnpm.io/workspaces)
- Feature Specification: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
