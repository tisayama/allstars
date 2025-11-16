# Feature Specification: Projector-App WebSocket Authentication

**Feature Branch**: `001-projector-auth`
**Created**: 2025-11-16
**Status**: Clarified
**Input**: User description: "Implement WebSocket authentication strategy for projector-app that does not require user interaction"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Projector Connection (Priority: P1)

When the projector application starts, it automatically connects to the WebSocket server and receives real-time game updates without requiring any user login or configuration.

**Why this priority**: This is the core functionality. The projector-app is a display-only application that must work in unattended kiosk mode at wedding venues. Any authentication requiring user interaction would break this use case.

**Independent Test**: Can be fully tested by launching the projector-app and verifying it displays "WebSocket: Connected" status and receives game state updates without any user interaction.

**Acceptance Scenarios**:

1. **Given** projector-app is launched for the first time, **When** the application initializes, **Then** it automatically authenticates with WebSocket server and shows connected status
2. **Given** projector-app loses connection, **When** network is restored, **Then** it automatically re-authenticates and reconnects without user intervention
3. **Given** projector-app is running, **When** socket server restarts, **Then** projector-app automatically re-authenticates and resumes receiving updates

---

### User Story 2 - Secure Unattended Operation (Priority: P2)

The projector application authenticates securely without exposing sensitive credentials in the UI or requiring venue staff to manage authentication.

**Why this priority**: Security is critical, but the application must remain fully automated. This ensures the solution doesn't compromise security while maintaining the unattended operation requirement.

**Independent Test**: Can be tested by inspecting the authentication mechanism to verify no credentials are exposed in the UI, browser console, or network traffic visible to venue staff.

**Acceptance Scenarios**:

1. **Given** projector-app is running at a venue, **When** venue staff inspects the browser console or network tab, **Then** no authentication secrets are visible
2. **Given** projector-app authentication tokens, **When** tokens are compromised, **Then** impact is limited to projector-app scope (read-only game state)
3. **Given** multiple projector-app instances, **When** each authenticates, **Then** each receives a unique session identifier for audit purposes

---

### User Story 3 - Authentication Token Management (Priority: P3)

System administrators can generate, rotate, and revoke projector-app authentication tokens without modifying the application code.

**Why this priority**: This enables proper operational security practices but is not required for basic functionality. Initial deployment can use a single long-lived token.

**Independent Test**: Can be tested by generating a new token, updating the configuration, and verifying the projector-app uses the new token on next startup.

**Acceptance Scenarios**:

1. **Given** administrator generates new projector token, **When** projector-app is restarted with new token, **Then** it authenticates successfully
2. **Given** old token is revoked, **When** projector-app tries to use it, **Then** authentication fails with clear error message displayed on red status bar "認証失敗：設定を確認してください" and administrator alert is generated
3. **Given** token rotation schedule, **When** tokens approach expiration, **Then** system logs warnings visible to administrators

---

### Edge Cases

- What happens when projector-app starts before socket-server is ready?
- How does system handle network interruptions lasting several minutes?
- What happens if authentication token is missing or malformed in configuration?
- How does projector-app behave when authentication fails repeatedly? (Uses exponential backoff: max 10 retries, 1s→2s→4s→8s...→60s, then enters degraded mode showing last known state)
- What happens when socket-server rejects authentication due to token revocation? (3回リトライ後、赤色ステータスバーで「認証失敗：設定を確認してください」を表示、60秒ごとに再試行、管理者向けログアラート発行)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Projector-app MUST authenticate with socket-server automatically on startup without user interaction
- **FR-002**: Projector-app MUST obtain authentication credentials from configuration rather than user input, using environment variable to specify path to Firebase service account JSON file (GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json, file excluded from version control)
- **FR-003**: Projector-app MUST re-authenticate automatically when WebSocket connection is lost and restored, using exponential backoff retry strategy (maximum 10 attempts, starting at 1 second, doubling up to maximum 60 seconds between retries)
- **FR-004**: Socket-server MUST accept projector-app authentication using Firebase service account credentials
- **FR-005**: Socket-server MUST distinguish projector-app connections from participant/host connections for authorization purposes using a dedicated connection endpoint (/projector-socket) separate from the standard participant/host WebSocket endpoint
- **FR-006**: Projector-app MUST display clear connection status (connected/disconnected/authenticating) to venue staff using a large colored status bar at top of screen (5-10% height) with text label, icon, and pulse animation during authentication
- **FR-007**: System MUST log all projector-app authentication attempts (success and failure) for security audit, and generate administrator alerts when authentication fails due to token revocation or configuration errors after 3 retry attempts
- **FR-008**: Projector-app authentication tokens MUST have read-only access to game state updates plus ability to request manual refresh of current state
- **FR-009**: System MUST support multiple simultaneous projector-app connections (e.g., multiple displays at same venue)
- **FR-010**: Projector-app MUST continue to function in degraded mode (showing last known game state) when WebSocket connection fails

### Key Entities

- **Projector Authentication Token**: A credential that identifies and authorizes projector-app connections. Unlike user authentication, this is deployment-scoped rather than user-scoped.
- **Projector Session**: A WebSocket connection session for projector-app established through dedicated /projector-socket endpoint, including authentication state, connection metadata, and read-only access permissions.
- **Authentication Configuration**: Storage mechanism for projector authentication credentials using environment variable GOOGLE_APPLICATION_CREDENTIALS pointing to Firebase service account JSON file, which is excluded from version control and managed separately per deployment environment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Projector-app connects to socket-server within 5 seconds of launch without user interaction
- **SC-002**: Projector-app successfully re-authenticates within 3 seconds when connection is restored after network interruption
- **SC-003**: 100% of projector-app authentication attempts are logged with timestamp and outcome
- **SC-004**: Projector-app operates for entire wedding event (8+ hours) without requiring manual authentication
- **SC-005**: Venue staff can verify projector connectivity status at a glance (visual indicator visible from 3 meters away: green status bar for connected, red for disconnected, yellow with pulse animation for authenticating)

## Assumptions

- Projector-app deployment environment has secure configuration storage (not publicly accessible)
- Network connectivity between projector-app and socket-server is generally stable with occasional brief interruptions
- Projector-app only requires read-only access to game state (no write operations)
- Single venue deployment may have 1-3 projector instances (primary display, backup, DJ screen)
- Authentication tokens can be rotated during venue setup (not during active game)

## Dependencies

- Socket-server authentication middleware must be extended to support projector-app authentication method on dedicated /projector-socket endpoint
- Deployment infrastructure must support secure configuration storage for authentication tokens
- Firebase Admin SDK (if using Firebase service accounts) or alternative authentication backend

## Out of Scope

- User-based authentication for projector-app (explicitly out of scope - no login UI)
- Dynamic token generation from projector-app UI
- Participant or host authentication mechanisms (separate feature)
- Network security beyond WebSocket authentication (TLS/SSL, VPN, etc.)

## Clarifications

### Session 2025-11-16

**Q1: 認証失敗時の再試行戦略**
A: 最大10回、指数バックオフ（1秒、2秒、4秒...最大60秒）で再試行（オプションB選択）
影響範囲: FR-003に詳細追加、エッジケースに具体的な動作記載

**Q2: 接続状態の可視性要件**
A: 画面上部の大きな色付きステータスバー（高さ5-10%）+ テキスト + アイコン + パルスアニメーション（認証中）（オプションB選択）
影響範囲: FR-006とSC-005に具体的な視覚要件を追加

**Q3: 認証情報の設定ストレージ方法**
A: 環境変数でJSONファイルのパスを指定、ファイルは.gitignoreで除外（GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json）（オプションB選択）
影響範囲: FR-002に具体的な設定方法を追加、Key Entitiesの「Authentication Configuration」に詳細を追加

**Q4: 認証トークンの失効・無効化時の動作**
A: 3回リトライ後、赤色ステータスバーでエラー表示「認証失敗：設定を確認してください」を表示し、60秒ごとに再試行 + 管理者向けログアラート（オプションB選択）
影響範囲: FR-007にアラート要件追加、エッジケース「トークン失効時の動作」に具体的な動作記載、User Story 3のAcceptance Scenario 2に詳細追加

**Q5: Socket-serverでの認証区別の実装方法**
A: 専用の接続エンドポイント（/projector-socket）を用意、通常の参加者/ホストとは別URL（オプションB選択）
影響範囲: FR-005に専用エンドポイント要件追加、Key Entitiesの「Projector Session」に接続方法記載、Dependenciesに実装要件追加
