# Unit 07: Next.js App Shell & Design System

---

## 1. Goal

Scaffold and build the production-ready Next.js Web Frontend application in `apps/web` with the complete design system, dark/light theme engine, reusable UI component library following the strict 4-state UI rules, authentication context, and authenticated dashboard shell layout:

1. **Next.js App Router Architecture**:
   - Modern Next.js 14+ App Router in `apps/web` configured with strict TypeScript, PostCSS, and Tailwind CSS.
   - Monorepo package integration referencing `@incident-pulse/shared`.
2. **Design System & Semantic Tokens (`context/ui-context.md`)**:
   - Strict CSS variable mappings for light and dark themes (Deep Obsidian `#0B0F19` dark background, `#111827` cards, `#F8FAFC` light background).
   - Non-arbitrary incident status semantic tokens (`--status-triggered`, `--status-acknowledged`, `--status-resolved`, `--urgency-high`, `--urgency-low`).
   - Dark/light mode switching using `next-themes` with zero layout shift or hydration flicker.
3. **Strict 4-State UI & Core Reusable Component Library**:
   - `Button`: Primary, secondary, outline, destructive, ghost, and icon styles with accessible states and loading spinners.
   - `StatusBadge`: Standardized status pill with live pulsing beacons (`animate-ping`) for `TRIGGERED`, countdown timer styling for `ACKNOWLEDGED`, and emerald check for `RESOLVED`.
   - `Skeleton`: Content-shaped skeleton loaders with subtle shimmer for the mandatory loading state.
   - `EmptyState`: Standardized empty state card with icon, title, description, and primary CTA.
   - `ErrorState`: Standardized error view with clear explanation and prominent "Retry" CTA.
   - `LiveStatusIndicator`: Real-time WebSocket connection beacon in the top header displaying live sync health (`Connected (Live)` vs `Connecting...` / `Offline`).
4. **App Shell Navigation & Layout (`AppLayout`, `AppSidebar`, `AppHeader`)**:
   - Responsive sidebar with active link highlighting, badge counts, and user profile drawer.
   - Top navbar featuring page breadcrumbs, WebSocket live indicator, theme toggle, and user dropdown menu.
   - Accessible keyboard shortcut listener (`/` focus search, `Esc` dismissals).
5. **Authentication State & Client Guards**:
   - `AuthContext` + `useAuth()` hook managing JWT token persistence, user profile, login, logout, and automatic session restoration.
   - Interactive `/login` page with pre-filled demo quick-login credentials (`Admin`, `Responder Sarah`, `Responder Alex`, `Viewer`).
   - Authenticated Route protection redirecting unauthorized users to `/login`.

---

## 2. Directory Structure (`apps/web`)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        # High-contrast login view with demo accounts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Authenticated App Shell layout (Sidebar + Header)
│   │   │   ├── page.tsx            # Root redirect or incidents overview
│   │   │   ├── incidents/
│   │   │   │   └── page.tsx        # Incidents dashboard feed placeholder
│   │   │   ├── schedules/
│   │   │   │   └── page.tsx        # On-call rotation placeholder
│   │   │   ├── services/
│   │   │   │   └── page.tsx        # Services & keys placeholder
│   │   │   └── settings/
│   │   │       └── page.tsx        # Profile & preferences
│   │   ├── layout.tsx              # Root HTML layout with ThemeProvider & QueryProvider
│   │   └── globals.css             # CSS variables, tokens, and animations
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx       # Top navbar with live status and user menu
│   │   │   ├── AppSidebar.tsx      # Left navigation drawer
│   │   │   └── UserDropdown.tsx    # User profile and logout menu
│   │   └── ui/
│   │   │   ├── Badge.tsx           # Semantic badges & status pills
│   │   │   ├── Button.tsx          # Reusable button with variants
│   │   │   ├── Card.tsx            # Styled card container
│   │   │   ├── EmptyState.tsx      # 4-State UI empty view
│   │   │   ├── ErrorState.tsx      # 4-State UI error view with retry
│   │   │   ├── LiveStatusIndicator.tsx # WebSocket connection beacon
│   │   │   ├── Skeleton.tsx        # 4-State UI shimmer loader
│   │   │   └── ThemeToggle.tsx     # Dark / Light mode toggle
│   ├── context/
│   │   └── AuthContext.tsx         # Auth state provider and session hooks
│   ├── lib/
│   │   ├── api.ts                  # Fetch client with Bearer auth headers
│   │   ├── query-client.ts         # TanStack Query client configuration
│   │   └── utils.ts                # cn() class utility (clsx + twMerge)
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## 3. Verification Checklist

- [ ] `apps/web` builds cleanly with `npm run build --workspace=apps/web`.
- [ ] `npm run typecheck --workspace=apps/web` passes with zero TypeScript errors.
- [ ] `npx prettier --check "apps/**/*.{ts,tsx,js,json,md}"` passes with zero formatting issues.
- [ ] Dark and Light theme switching works seamlessly using CSS variables matching `context/ui-context.md`.
- [ ] Status badges match semantic colors (`TRIGGERED` red pulse, `ACKNOWLEDGED` amber, `RESOLVED` emerald).
- [ ] 4-state UI components (`Skeleton`, `EmptyState`, `ErrorState`, populated views) adhere to anti-slop rules.
- [ ] Login screen allows seamless authentication against API or offline demo credentials.
- [ ] `context/progress-tracker.md` updated with progress.
