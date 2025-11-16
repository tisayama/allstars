# 001-projector-auth: DEPRECATED

**Status**: Deprecated - Requirements changed before implementation
**Date**: 2025-11-16
**PR**: #26 (Closed)

## Why This Feature Was Not Implemented

After completing the full implementation and creating PR #26, requirements were clarified and this approach was determined to be **unnecessary**.

## Original Plan

The original plan was to implement **API key-based Firebase custom token authentication** for projector-app:

- **US1**: API server generates Firebase custom tokens using API key authentication
- **US2**: Socket server validates custom tokens for /projector-socket namespace
- **US3**: Projector app automatically refreshes tokens for 8+ hour operation

**Implementation included**:
- API key middleware (api-server)
- Custom token generation service (api-server)
- Projector-specific WebSocket namespace (socket-server)
- Automatic token refresh hook (projector-app)
- Environment variable security validation
- Comprehensive audit logging
- 47 unit/integration/contract/E2E tests
- 800+ lines of production deployment documentation

## Why It's Not Needed

After review, we determined that:

1. **projector-app is read-only**:
   - Only reads Firestore gameState (no write operations)
   - Only receives WebSocket events (no commands sent)
   - Display-only application

2. **Access control not required**:
   - External access to projector screen is acceptable
   - Firestore gameState will allow public read access
   - URL protection handled by other means (not application-level auth)

3. **Simpler approach available**:
   - Use **Anonymous Authentication** (same as participant-app)
   - Consistent with other read-only clients
   - No API key management needed
   - No custom token generation required

## New Approach

projector-app will use **Firebase Anonymous Authentication**:

```typescript
// Simple anonymous auth (like participant-app)
const auth = getAuth();
await signInAnonymously(auth);

// Connect to WebSocket with anonymous token
const socket = io('/projector-socket', {
  auth: { firebaseToken: await auth.currentUser.getIdToken() }
});
```

**Benefits**:
- ✅ Much simpler implementation
- ✅ No API key management overhead
- ✅ Consistent with participant-app
- ✅ Still provides Firebase token for WebSocket auth
- ✅ Firestore security rules still enforced

## Lessons Learned

1. **Clarify read-only requirements early**: Could have avoided custom token implementation
2. **Question authentication needs for display-only apps**: Not all apps need write access control
3. **Consider Anonymous Auth first**: Often sufficient for read-only clients

## References

- **Closed PR**: https://github.com/tisayama/allstars/pull/26
- **Branch**: `001-projector-auth` (reset to 8dc53b7)
- **Commit (removed)**: b3ecfdb - feat(projector-auth): add Firebase custom token authentication

## Files That Were Created (Now Deleted)

**API Server**:
- src/middleware/apiKeyMiddleware.ts
- src/routes/projectorAuthRoutes.ts
- src/services/customTokenService.ts
- src/services/auditLogger.ts
- tests/contract/projectorAuth.contract.test.ts
- tests/integration/projectorAuth.integration.test.ts
- tests/unit/apiKeyMiddleware.test.ts
- tests/unit/auditLogger.test.ts
- tests/unit/customTokenService.test.ts

**Socket Server**:
- src/middleware/projectorAuthMiddleware.ts
- src/namespaces/projectorNamespace.ts
- src/services/sessionManager.ts
- src/services/auditLogger.ts
- tests/contract/projectorSocket.contract.test.ts
- tests/integration/projectorSocket.integration.test.ts
- tests/unit/projectorAuthLogging.test.ts
- tests/unit/projectorAuthMiddleware.test.ts
- tests/unit/projectorPermissions.test.ts
- tests/unit/sessionManager.test.ts

**Projector App**:
- src/hooks/useProjectorAuth.ts
- src/services/authService.ts
- src/services/socketService.ts
- src/utils/envValidator.ts
- tests/unit/authService.test.ts
- tests/unit/envSecurity.test.ts
- tests/unit/tokenRefresh.test.ts
- tests/unit/useProjectorAuth.test.ts

**Types**:
- packages/types/src/ProjectorAuth.ts

**Documentation**:
- specs/001-projector-auth/ (entire directory)
  - DEPLOYMENT.md (500+ lines)
  - ROTATION.md (300+ lines)
  - spec.md, plan.md, tasks.md
  - contracts/, checklists/

**E2E Tests**:
- tests/e2e/projector-auth.spec.ts
- tests/e2e/projector-security.spec.ts

**Total**: 56 files changed, 10,473 insertions

---

**Note**: This was a complete, well-tested implementation that would have worked perfectly. It was simply not needed for this use case. The code quality was high with comprehensive testing and documentation.
