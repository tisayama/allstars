# Feature Specification: TV-Style Rankings Display

**Version**: 1.0
**Status**: Draft
**Created**: 2025-11-07
**Last Updated**: 2025-11-07

---

## Overview

### Feature Name
TV-Style Rankings Display for Projector App

### Purpose
Transform the projector app's ranking display to emulate a professional Japanese TV game show aesthetic, specifically for showing the "早押しワースト10" (fastest incorrect answers worst 10) rankings and other leaderboards.

### Target Users
- **Primary**: Game show hosts and event organizers projecting rankings to large screens
- **Secondary**: Audience members viewing the projector display
- **Tertiary**: Game participants indirectly affected by the visual presentation

---

## Clarifications

### Session 2025-11-07

- Q: Should animation degradation be automatic based on performance monitoring, or manually controlled by the host? → A: Automatic - System monitors FPS and disables animations if dropping below 25 FPS
- Q: How should the projector display handle network disconnection while showing rankings? → A: Freeze current display and show subtle connection lost indicator in corner
- Q: How should the display handle missing or failed branding assets? → A: Show rankings with fallback text/placeholder where logo would appear
- Q: When should ranking entries animate in with the stagger effect? → A: Only on initial display of rankings for each question
- Q: How should participant names be formatted when displaying on rankings? → A: System receives pre-formatted display name string (e.g., "土屋桂子(ウィッツ)")

---

## Problem Statement

### Current Situation
The projector app currently lacks a polished, TV-broadcast-quality visual design for displaying rankings and game results. The presentation does not capture the excitement and professional look of Japanese variety game shows.

### User Needs
- Hosts need a visually engaging way to present rankings that maintains audience attention
- Rankings must be clearly readable from a distance on large projection screens
- The visual style should match the entertainment and excitement level of TV game shows
- Different ranking types (worst performers, top performers, period champions) need distinct visual treatments

### Expected Outcome
A projector display that mimics professional Japanese TV game show graphics with:
- Vibrant gradient backgrounds with subtle animations
- Clear ranking numbers and participant information
- Color-coded entries (e.g., red highlight for special positions)
- TV show branding elements (logo, live broadcast indicators)
- Smooth transitions between different ranking screens

---

## User Scenarios & Testing

### Primary Scenarios

#### Scenario 1: Displaying Worst 10 Rankings
**Actor**: Game show host
**Preconditions**: Game question has been answered, results are calculated
**Flow**:
1. Host advances game to "show results" phase
2. System displays "早押しワースト10" (fastest incorrect worst 10) screen
3. Rankings appear showing:
   - Rank number (1-10)
   - Participant name with nickname/team
   - Response time in seconds
   - Color highlighting for slowest responder
4. Audience views rankings on projection screen
5. Host discusses results then advances to next phase

**Expected Results**:
- Rankings are clearly visible from back of venue
- Slowest responder is visually distinct (red background)
- Times are displayed with 2 decimal precision
- Layout matches TV show aesthetic

#### Scenario 2: Displaying Top 10 Rankings
**Actor**: Game show host
**Preconditions**: Period-final question completed, correct answers exist
**Flow**:
1. Host advances to period results
2. System displays "早押しトップ10" (fastest correct top 10) screen
3. Rankings show fastest correct responders
4. Screen includes period identifier (e.g., "前半" for first half)
5. Host reviews top performers with audience

**Expected Results**:
- Top performers prominently displayed
- Response times show performance differences
- Period information clearly labeled
- Visual excitement matches achievement significance

#### Scenario 3: Visual Transition Between Phases
**Actor**: Game show host
**Preconditions**: Multiple ranking types to display
**Flow**:
1. Host displays worst 10 rankings
2. Host advances to show top 10 rankings
3. Screen smoothly transitions between displays
4. Background and layout adapt to new ranking type

**Expected Results**:
- Transitions are smooth and professional
- No jarring visual jumps
- Consistent branding maintained across screens
- Audience maintains engagement through transition

### Edge Cases

#### Edge Case 1: Fewer Than 10 Entries
**Scenario**: Only 4 participants answered incorrectly
**Expected Behavior**: Display only 4 rankings, adjust layout to fill space gracefully

#### Edge Case 2: Tied Response Times
**Scenario**: Two participants have identical 1.52 second times
**Expected Behavior**: Display both at same rank, use tiebreaker rules from game logic

#### Edge Case 3: Very Long Participant Names
**Scenario**: Participant name with nickname exceeds 30 characters
**Expected Behavior**: Truncate with ellipsis while keeping nickname readable

#### Edge Case 4: All Incorrect Answers
**Scenario**: Question where nobody answered correctly
**Expected Behavior**: Show all participants in worst rankings, indicate special "all incorrect" status

#### Edge Case 5: Network Disconnection During Display
**Scenario**: Real-time connection is lost while rankings are being displayed
**Expected Behavior**: Freeze current ranking display, show subtle connection indicator (small icon or text) in corner, maintain visibility of existing rankings until connection restored

#### Edge Case 6: Branding Asset Loading Failure
**Scenario**: Show logo or branding image fails to load or is missing at display time
**Expected Behavior**: Display rankings as normal, show fallback text or placeholder graphic in branding area, maintain overall layout integrity and visual consistency

---

## Functional Requirements

### FR-001: TV-Style Visual Design
**Priority**: MUST HAVE
**Description**: Projector display must replicate Japanese TV game show aesthetics

**Acceptance Criteria**:
- Background uses vibrant gradient (teal/blue to purple) with animated elements
- Layout includes dedicated ranking list area (center-left)
- Side panel displays vertical text labels (e.g., "早押しワースト10")
- Top banner shows show branding, episode info, and "生放送" (live broadcast) indicator
- Color scheme matches sample image: blue gradients, white text, red highlights

**Rationale**: Creates professional, engaging visual experience that maintains audience attention

---

### FR-002: Ranking List Display
**Priority**: MUST HAVE
**Description**: Display participant rankings with clear visual hierarchy

**Acceptance Criteria**:
- Each ranking entry shows: rank number, participant name, response time
- Rank numbers use bold, large font in rounded rectangles
- Participant names displayed as pre-formatted strings (e.g., "土屋桂子(ウィッツ)" with name and nickname/team)
- Response times displayed in seconds with 2 decimal places (e.g., "0.72", "2.04")
- Special position (e.g., rank 4 worst) highlighted with red background
- Maximum 10 entries displayed simultaneously
- Text uses high-contrast colors for readability (white on dark blue)

**Rationale**: Ensures rankings are immediately understandable from any viewing distance

---

### FR-003: Color-Coded Highlighting
**Priority**: MUST HAVE
**Description**: Use color to emphasize significant rankings

**Acceptance Criteria**:
- Slowest incorrect responder (last place in worst 10) uses red background
- Fastest correct responder (first place in top 10) uses gold/yellow accent
- Standard entries use semi-transparent blue background
- Highlight colors maintain sufficient contrast for text legibility
- Color coding is consistent across all ranking types

**Rationale**: Draws attention to notable performances, enhances entertainment value

---

### FR-004: Branding and Context Elements
**Priority**: MUST HAVE
**Description**: Display show branding and contextual information with graceful fallback handling

**Acceptance Criteria**:
- Top-right corner shows show logo/title
- "生放送" (live broadcast) badge visible in upper right
- Period identifier (前半/後半) shown for period-final questions
- Vertical side label identifies ranking type (ワースト10 / トップ10)
- Question context displayed in top banner when relevant
- All branding elements use consistent visual style
- If logo/branding assets fail to load, display fallback text or placeholder graphic
- Asset loading failure does not block rankings display or affect layout integrity
- Fallback elements maintain visual consistency with overall design

**Rationale**: Maintains show identity, provides context for displayed rankings, ensures resilient operation during asset loading issues

---

### FR-005: Animated Background Effects
**Priority**: SHOULD HAVE
**Description**: Subtle background animations enhance TV aesthetic with automatic performance management

**Acceptance Criteria**:
- Gradient background has slow, gentle animation (color shifts or particles)
- Circular bubble/particle effects float across background
- Animations do not distract from ranking content
- Animation performance maintains 30+ FPS on target hardware
- System automatically monitors frame rate and disables animations if FPS drops below 25 FPS
- Animation degradation happens transparently without host intervention
- Once disabled, animations remain off for the current session to prevent flickering

**Rationale**: Adds production value, matches professional TV broadcast quality while ensuring smooth performance during live events

---

### FR-006: Ranking Type Variations
**Priority**: MUST HAVE
**Description**: Support multiple ranking display types

**Acceptance Criteria**:
- "早押しワースト10" mode: Shows slowest incorrect responders
- "早押しトップ10" mode: Shows fastest correct responders
- "総合ランキング" mode: Shows overall standings if applicable
- Each mode uses appropriate color scheme and labels
- Side panel text updates to match current ranking type
- Transition between modes is smooth

**Rationale**: Different game phases require different ranking presentations

---

### FR-007: Responsive Text Sizing
**Priority**: MUST HAVE
**Description**: Text scales appropriately for projection displays

**Acceptance Criteria**:
- Rank numbers: Minimum 48px font size
- Participant names: Minimum 36px font size
- Response times: Minimum 40px font size
- Side panel vertical text: Minimum 44px font size
- All text remains crisp on 1920x1080 minimum resolution
- Text sizing adapts to screen aspect ratio

**Rationale**: Ensures readability from 10+ meters away in venue settings

---

### FR-008: Smooth Phase Transitions
**Priority**: SHOULD HAVE
**Description**: Seamless visual transitions between game phases

**Acceptance Criteria**:
- Fade transition duration: 0.3-0.5 seconds
- Ranking entries animate in sequentially (stagger effect) on initial display for each question
- Stagger effect does not repeat if host navigates back to previously viewed rankings
- No blank screens during transitions
- Branding elements persist across transitions
- Background animation continues smoothly through transitions

**Rationale**: Maintains professional appearance, prevents jarring visual breaks, creates impactful first reveal without becoming repetitive

---

### FR-009: Connection Monitoring and Failure Handling
**Priority**: MUST HAVE
**Description**: Monitor real-time connection and handle disconnections gracefully

**Acceptance Criteria**:
- System continuously monitors socket connection status
- On connection loss, freeze current display state (no updates applied)
- Display subtle connection indicator in corner (icon or text, non-intrusive)
- Indicator appears within 2 seconds of connection loss
- Existing rankings remain visible and readable during disconnection
- On reconnection, indicator disappears and updates resume automatically
- Connection state changes do not trigger jarring visual effects

**Rationale**: Ensures continuous display during network issues without losing audience engagement or creating confusion

---

## Success Criteria

### Quantitative Metrics
1. **Readability**: 95% of audience members can read rankings from 15 meters away
2. **Performance**: Display maintains 30+ FPS with animations enabled
3. **Transition Speed**: Phase transitions complete within 0.5 seconds
4. **Load Time**: Ranking screen appears within 0.2 seconds of phase change
5. **Text Clarity**: Font sizes meet minimum requirements at 1920x1080 resolution

### Qualitative Measures
1. **Visual Appeal**: Host feedback confirms "TV-like" aesthetic achieved
2. **Audience Engagement**: Audience attention maintained during ranking display
3. **Professional Quality**: Visual design matches reference sample image
4. **Brand Consistency**: All ranking screens use cohesive design language
5. **Ease of Use**: Host can navigate ranking phases without technical issues

---

## Assumptions

1. **Display Resolution**: Target projection displays are 1920x1080 minimum
2. **Viewing Distance**: Audience members are 5-20 meters from screen
3. **Hardware**: Projector hardware supports 60Hz refresh rate
4. **Browser Compatibility**: Modern browsers with CSS3 and Canvas support
5. **Asset Availability**: Show logo and branding assets are provided
6. **Language**: Primary language is Japanese with UTF-8 encoding
7. **Lighting**: Venues have moderate ambient lighting (not bright daylight)
8. **Audio**: Visual display coordinates with separate audio system
9. **Network**: Stable connection for receiving real-time game state updates
10. **Data Format**: Ranking data includes pre-formatted participant display names, response times, and correctness flags

---

## Constraints

### Technical Constraints
- Must work within existing projector app architecture
- Real-time updates from game state changes
- Browser rendering limitations for animations
- Image/video assets must load quickly

### Design Constraints
- Must maintain Japanese TV game show aesthetic
- Color schemes must work with venue lighting
- Layout must adapt to different screen aspects
- Branding guidelines must be followed

### Business Constraints
- Implementation must not delay existing feature timeline
- Must reuse existing data structures where possible
- Should minimize additional asset creation burden

---

## Dependencies

### Internal Dependencies
- Game state service providing ranking data
- Socket connection for real-time phase updates
- Existing phase management system
- Current gameState data structure

### External Dependencies
- Show logo/branding image assets
- Font files for Japanese text rendering
- Any licensed TV show elements

---

## Out of Scope

### Explicitly Excluded
- Audio/sound effects (separate system handles this)
- Touch/mouse interaction on projected screen
- Administrative controls on projector display
- Participant-facing screens (separate app)
- Historical ranking data (only current game)
- Video playback or live camera feeds
- Custom animation editor for hosts
- Multiple simultaneous ranking displays

---

## Open Questions

None - All requirements are sufficiently specified for planning phase.

---

## References

### Visual References
- Sample image: `.sample/Screenshot_20251013_163241_X.jpg`
- Reference: Japanese TV variety game shows (アメトーーク!, VS嵐, etc.)

### Technical References
- Current projector app codebase: `apps/projector-app/`
- GameState type definitions: `@allstars/types`
- Existing phase components: `apps/projector-app/src/components/phases/`

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-07 | System | Initial specification created |
