# UI & Design System Standards — IncidentPulse

This document defines the strict visual language, ergonomics, and **non-negotiable UI consistency rules** across both the Next.js Web Dashboard and the Flutter Mobile App.

---

## 1. Non-Negotiable Consistency Rules (Anti-Slop Guardrails)

Every AI coding agent and human contributor must follow these rules without exception:

### Rule 1: Zero Arbitrary Styles (No Magic Numbers or Hex Codes)
* **Web**: NEVER use inline styles (`style={{ color: '#ef4444' }}`) or arbitrary Tailwind classes like `bg-[#ef4444]`. Use semantic tokens and Tailwind config tokens only (`bg-status-triggered`, `text-muted-foreground`).
* **Mobile**: NEVER instantiate ad-hoc colors in widgets (`Color(0xFFEF4444)`). Always reference `AppTheme.colors(context).triggered` or `AppColors.triggered`.
* **Spacing**: Follow a strict 4px/8px grid system (`p-2`, `p-4`, `p-6`, `gap-4`). No random margins (`mt-[17px]`).

### Rule 2: The Mandatory 4-State UI Rule
Every screen, table, or card that consumes asynchronous data **MUST** explicitly implement four states:
1. **Loading State**: Content-shaped **Skeleton loaders** with subtle shimmer. Never slap a solitary spinner in the center of an empty screen.
2. **Empty State**: Icon + clear title + descriptive copy + primary Call-to-Action (e.g., *"No active incidents. You are all caught up! — [Send Test Alert]"*).
3. **Error State**: Non-technical explanation + clear error badge + prominent **"Retry"** button.
4. **Populated State**: Full data view with proper pagination, sorting, and optimistic updates.

### Rule 3: Uniform Incident Status Semantics
Status colors and semantics are sacred. They must match 1:1 across Web and Mobile:

| Status | Semantic Meaning | Tailwind Class (Web) | Flutter Theme Token | Icon | Visual Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TRIGGERED` | Critical / Action Required | `bg-red-500/10 text-red-600 border-red-500/30` | `AppColors.triggered` | `AlertTriangle` | Pulsing beacon indicator (`animate-ping`) |
| `ACKNOWLEDGED` | Under Investigation | `bg-amber-500/10 text-amber-600 border-amber-500/30` | `AppColors.acknowledged` | `Clock` | Static countdown timer badge |
| `RESOLVED` | Closed / Healthy | `bg-emerald-500/10 text-emerald-600 border-emerald-500/30` | `AppColors.resolved` | `CheckCircle2` | Muted, no pulse |

---

## 2. Color Palette & Semantic Tokens

### Incident Status Tokens
- **Critical Red (`--status-triggered`)**: Light: `#DC2626` | Dark: `#EF4444` | Glow: `rgba(239, 68, 68, 0.25)`
- **Investigating Amber (`--status-acknowledged`)**: Light: `#D97706` | Dark: `#F59E0B` | Glow: `rgba(245, 158, 11, 0.25)`
- **Healthy Emerald (`--status-resolved`)**: Light: `#059669` | Dark: `#10B981` | Glow: `rgba(16, 185, 129, 0.25)`
- **Urgency High**: Deep Crimson `#991B1B` | Accent: `#F87171`
- **Urgency Low**: Neutral Slate `#475569` | Accent: `#94A3B8`

### Base Surface & Neutral Hierarchy
| Token | Light Mode Hex | Dark Mode Hex | Usage |
| :--- | :--- | :--- | :--- |
| `background` | `#F8FAFC` (Slate-50) | `#0B0F19` (Deep Obsidian) | Screen background |
| `surface` | `#FFFFFF` (Pure White) | `#111827` (Gray-900) | Cards, panels, sidebars |
| `surface-secondary`| `#F1F5F9` (Slate-100) | `#1F2937` (Gray-800) | Sub-sections, table headers, hover |
| `border` | `#E2E8F0` (Slate-200) | `#374151` (Gray-700) | Card borders, dividers |
| `text-primary` | `#0F172A` (Slate-900) | `#F9FAFB` (Gray-50) | Headers, active titles |
| `text-secondary` | `#64748B` (Slate-500) | `#9CA3AF` (Gray-400) | Metadata, timestamps, helper text |
| `brand-primary` | `#2563EB` (Blue-600) | `#3B82F6` (Blue-500) | Primary CTA buttons, active links |

---

## 3. Cross-Platform Component Mapping

Ensure consistent component interaction and hierarchy across platforms:

| UI Pattern | Web (Next.js + shadcn/ui) | Mobile (Flutter) | Standards |
| :--- | :--- | :--- | :--- |
| **Status Badge** | `<Badge variant="outline" className="...">` | `StatusBadgeWidget(...)` | Pill shape (`rounded-full`), border matching text color, small uppercase font |
| **Primary Action** | `<Button size="default">` | `FilledButton(...)` | Minimum height: 40px (Web), 56px (Mobile) |
| **Danger Action** | `<Button variant="destructive">` | `FilledButton(style: red...)` | Reserved strictly for escalation overrides, service deletions |
| **Incident Card** | `<Card className="hover:border-primary/50">` | `InkWell(child: Card(...))` | Left border accent strip ($4\text{px}$) colored by incident status |
| **Timestamps** | Formatted relative (`"3m ago"`) with hover tooltip showing absolute UTC ISO | Formatted relative (`"3m ago"`) with tap to expand UTC time |

---

## 4. Platform-Specific Ergonomics

### Web Dashboard (Operator Density & Speed)
- **High-Density Data**: Tables must display: Status Pill, Severity, Title, Service Name, Assignee Avatar, Duration, and Action Buttons in a single row without horizontal scroll on desktop ($1280\text{px}+$ screen).
- **Live Indicator**: The global header must show a green pulsating dot indicating an active WebSocket connection: `"Connected (Live)"` vs red `"Disconnected (Reconnecting...)"`.
- **Keyboard Shortcuts**:
  - `A`: Acknowledge highlighted incident
  - `R`: Resolve highlighted incident
  - `/`: Focus search filter
  - `Esc`: Close modals/drawers

### Mobile Responder App (Emergency Ergonomics)
- **Fat-Finger Friendly**: All emergency triage triggers (**Acknowledge** & **Resolve**) must be sticky at the bottom of the screen with a minimum touch height of $56\text{dp}$.
- **Haptic Feedback**:
  - Tapping **Acknowledge**: Medium haptic impact.
  - Tapping **Resolve**: Light double-click haptic confirmation.
  - Incoming critical alert: Heavy notification haptic pattern.
- **High-Contrast Dark Mode**: Designed for emergency 3:00 AM wake-ups. Avoid pure stark white flashes; use deep obsidian backgrounds with soft, legible text and distinct color-coded buttons.
