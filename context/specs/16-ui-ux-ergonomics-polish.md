# Unit 16: UI/UX & Ergonomics Overhaul (Web & Mobile)

---

## 1. Goal

Elevate the user experience, interaction fidelity, visual hierarchy, and sensory ergonomics across both the **Next.js Web Dashboard** (`apps/web`) and the **Flutter Mobile Responder App** (`apps/mobile`) to a world-class enterprise SaaS standard (Linear / Vercel / Apple tier), strictly adhering to `context/ui-context.md`:

1. **Next.js Web Dashboard Visual & Ergonomic Polish**:
   - **Real-Time Row Flash Animation (`/incidents`)**: When an alert arrives via WebSocket `incident:created`, flash the newly created incident row with a smooth 1.5s radial glow animation (`bg-red-500/20` fading to transparent) to immediately direct the NOC operator's attention without list disorientation.
   - **Synthesized Emergency Audio Alert Engine (`Web Audio API`)**: Add a header audio toggle (`AudioAlertToggle`) that plays a high-contrast emergency chime on incoming `TRIGGERED` incidents using browser-native Web Audio API synthesis (zero external audio file dependencies).
   - **Syntax-Highlighted JSON Inspector (`IncidentDetailDrawer`)**: Replace plain `<pre>` JSON blocks with a color-coded JSON tree inspector (colored keys, strings, booleans, and numbers) with 1-click clipboard copy and toast feedback.
   - **Schedule Timeline "Now Indicator" & Shift Handoff Badge (`/schedules`)**: Add a dynamic vertical time cursor tracking the active day/hour across the weekly schedule grid and display a live countdown badge (_"Shift ends in Xh Ym → Next: Sarah Chen"_).
   - **24-Hour Service Uptime History Bar (`/services`)**: Add 24-segmented visual status pills (green = healthy, red = active incident) to each service catalog card.
   - **Login Screen Aesthetics (`/login`)**: Introduce a radial backdrop glow, avatar initials, and role badge pills (`L1 Primary`, `L2 Lead`, `Admin`) on quick-select demo buttons.

2. **Flutter Mobile Responder App Ergonomics Polish**:
   - **Sticky Button Safe-Area Ergonomics (`incident_detail_screen.dart`)**: Wrap sticky 56dp action buttons with dynamic `SafeArea` bottom padding (`MediaQuery.of(context).padding.bottom`) to prevent overlap with iOS Home Indicator and Android gesture pills.
   - **Swipe-to-Triage Gesture on Incident Cards (`incident_card_widget.dart`)**: Enable a swipe-right gesture on `TRIGGERED` incident cards to trigger immediate **Acknowledge** with medium haptic confirmation directly from the feed.
   - **Collapsible Payload Viewer (`incident_detail_screen.dart`)**: Render raw alert payloads collapsed by default with an informative pill summary (_"Payload: 4 attributes (latencyMs, cluster) [Expand]"_), letting responders access the chronological audit timeline with minimal scrolling.
   - **Interactive Active On-Call Card (`main_navigation_shell.dart`)**: Replace the static placeholder in `_SchedulesTab` with a live on-call card showing active rotation details, handoff timer, and secondary escalation contacts.
   - **Enhanced Pull-to-Refresh & Shimmer Alignment**: Standardize all loading shimmer skeletons and pull-to-refresh spinner colors to match `AppColors.triggered` and Deep Obsidian tokens.

---

## 2. Directory Structure & File Map

```
apps/web/src/
├── components/
│   ├── ui/
│   │   ├── AudioAlertToggle.tsx      # Web Audio API emergency chime synthesizer & toggle
│   │   └── JsonViewer.tsx            # Syntax-highlighted JSON viewer with copy action
│   ├── incidents/
│   │   ├── IncidentRow.tsx           # Incoming alert CSS pulse/flash animation
│   │   └── IncidentDetailDrawer.tsx  # Syntax-highlighted drawer with copy action
│   ├── schedules/
│   │   └── OnCallTimelineGrid.tsx    # "Now" cursor and shift handoff countdown badge
│   └── services/
│       └── ServiceUptimeBar.tsx      # 24-hour segmented service uptime bar
└── app/
    └── (auth)/login/page.tsx         # Radial glow, avatar initials & role badge pills

apps/mobile/lib/
├── core/
│   ├── audio/
│   │   └── alert_sound_service.dart  # Emergency alert chime player
│   └── widgets/
│       └── dismissible_triage.dart   # Swipe-to-acknowledge gesture container
├── features/
│   ├── incidents/
│   │   ├── presentation/
│   │   │   ├── widgets/
│   │   │   │   ├── incident_card_widget.dart    # Integrated swipe gesture
│   │   │   │   └── raw_payload_viewer.dart     # Collapsible summary with expand action
│   │   │   └── screens/
│   │   │       └── incident_detail_screen.dart  # Safe-area padding & sticky bottom triggers
│   └── navigation/
│       └── screens/
│           └── main_navigation_shell.dart       # Interactive On-Call card in Schedules tab
```

---

## 3. Step-by-Step Implementation Workflow

### Step 1: Web Dashboard Real-Time Flash & Audio Engine

1. Implement `AudioAlertToggle.tsx` in `apps/web/src/components/ui/` using native `AudioContext` to generate a two-tone emergency chime (`880Hz -> 1760Hz`) when critical alerts arrive.
2. Mount `AudioAlertToggle` into `AppHeader.tsx`.
3. Update `useSocket.ts` to trigger audio chime and row flash state on `incident:created` when audio is enabled.
4. Add CSS keyframe `@keyframes flash-incident` in `apps/web/src/app/globals.css` with radial red glow fade.

### Step 2: Web JSON Inspector & Drawer Polish

1. Create `apps/web/src/components/ui/JsonViewer.tsx` supporting syntax highlighting (keys in cyan, strings in emerald, numbers in amber, booleans in blue) and a 1-click clipboard copy button with checkmark animation.
2. Integrate `JsonViewer` into `IncidentDetailDrawer.tsx`.
3. Enhance audit timeline nodes with vertical dashed connecting lines and status-colored dot indicators.

### Step 3: Web Schedule "Now" Marker & Handoff Countdown

1. Add dynamic vertical time cursor tracking the active day/hour across the weekly schedule grid in `apps/web/src/app/(dashboard)/schedules/page.tsx`.
2. Add a live countdown badge (_"Shift ends in 4h 12m → Next: Sarah Chen"_).

### Step 4: Web 24-Hour Service Uptime Segmented History Bar

1. Create `ServiceUptimeBar.tsx` rendering 24 segmented horizontal pills with tooltip breakdown (timestamp, status, incidents).
2. Embed the uptime bar in each service card on `/services`.

### Step 5: Web Login Screen Polish

1. Enhance `apps/web/src/app/(auth)/login/page.tsx` with radial backdrop glow, avatar initials circles, and role badge pills (`L1 Primary`, `L2 Lead`, `Admin`) on quick-select demo buttons.

### Step 6: Mobile Sticky Button Safe-Area & Touch Ergonomics

1. Update `apps/mobile/lib/features/incidents/presentation/screens/incident_detail_screen.dart` with `SafeArea(bottom: true)` and dynamic bottom padding based on `MediaQuery.of(context).padding.bottom`.
2. Ensure touch target minimum height of 56dp and edge-to-edge full width with 16dp horizontal padding.

### Step 7: Mobile Swipe-to-Triage Gesture

1. Add `Dismissible` swipe-right behavior to `IncidentCardWidget` for `TRIGGERED` incidents.
2. Reveal amber background with `Icons.check_circle_outline` and trigger `hapticServiceProvider.acknowledgeImpact()` upon swipe release.

### Step 8: Mobile Collapsible Payload Viewer

1. Update `raw_payload_viewer.dart` with a compact summary pill displaying key count and primary attributes.
2. Expand into formatted JSON upon user tap.

### Step 9: Mobile Interactive On-Call Rotation Card

1. Replace static placeholder in `_SchedulesTab` of `main_navigation_shell.dart` with an interactive card showing active on-call responder, rotation schedule, and shift handoff countdown.

---

## 4. Architectural Invariants & Anti-Slop Guardrails

- **Invariant #1 (Timer Cancellation)**: 1-tap mobile swipe and web button triage must continue to atomically cancel BullMQ delayed jobs.
- **Invariant #2 (Zero Magic Numbers)**: No inline styles or raw hex values. All web components must reference semantic Tailwind tokens; all mobile widgets must reference `context.colors` or `AppColors`.
- **Invariant #3 (4-State Rule)**: All modified and new UI components must explicitly implement Loading (Skeleton), Empty, Error, and Populated states.
- **Invariant #4 (Accessibility)**: Tooltips on all icon buttons, keyboard shortcut hints, minimum 40px touch targets on web, 56dp on mobile.

---

## 5. Verification & Acceptance Criteria

- [ ] Web incoming alert triggers row flash animation on `incident:created`.
- [ ] Web audio alert synthesizer plays emergency chime when toggled on.
- [ ] Web drawer displays syntax-highlighted JSON with functioning 1-click copy action.
- [ ] Web schedules grid displays active "Now" timeline cursor and shift countdown badge.
- [ ] Web services catalog displays 24-hour segmented uptime history bars.
- [ ] Mobile incident detail screen buttons respect device bottom safe-area.
- [ ] Mobile incident cards support swipe-to-acknowledge gesture with haptic feedback.
- [ ] Mobile payload viewer defaults to collapsed summary pill with 1-tap expand.
- [ ] Mobile schedules tab displays active on-call card with rotation handoff timer.
- [ ] Prettier check passes: `npm run format:check`.
- [ ] TypeScript typecheck passes: `npm run typecheck`.
- [ ] ESLint passes: `npm run lint`.
- [ ] Flutter analysis passes: `flutter analyze` (0 issues).
- [ ] Flutter test suite passes: `flutter test` (100% passing).
