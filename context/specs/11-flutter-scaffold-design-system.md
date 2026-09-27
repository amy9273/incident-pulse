# Unit 11: Flutter Scaffold & Design System

---

## 1. Goal

Scaffold and build the production-grade Flutter Mobile Responder application in `apps/mobile` adhering to Clean Architecture, Material 3 design system tokens from `context/ui-context.md`, secure JWT authentication storage, and responsive responder ergonomics:

1. **Flutter Mobile Application Architecture**:
   - Modern Flutter project in `apps/mobile` supporting iOS, Android, and Desktop/Web targets.
   - Clean Architecture modular vertical slice:
     - `core/`: Network (`dio`), persistent secure storage (`flutter_secure_storage`), theme system, and reusable UI tokens.
     - `features/auth/`: Domain models, data source, authentication repository, Riverpod state notifier, and login presentation.
     - `features/navigation/`: Bottom navigation app shell transitioning between Incidents, Schedules, and Profile.
2. **Design System & Semantic Tokens (`context/ui-context.md`)**:
   - Material 3 ColorScheme and custom `ThemeExtension` or `AppColors`:
     - Dark Mode (Default): Deep Obsidian `#0B0F19`, Gray-900 `#111827` surface, Gray-800 `#1F2937` secondary surface.
     - Light Mode: Slate-50 `#F8FAFC`, Pure White `#FFFFFF` surface.
     - Sacred Status Tokens:
       - `TRIGGERED`: `#EF4444` (Critical Red) with pulsing beacon indicator.
       - `ACKNOWLEDGED`: `#F59E0B` (Investigating Amber).
       - `RESOLVED`: `#10B981` (Healthy Emerald).
       - `URGENCY_HIGH`: `#F87171` / `#991B1B`.
       - `URGENCY_LOW`: `#94A3B8` / `#475569`.
3. **Mandatory 4-State UI & Reusable Component Library**:
   - `StatusBadgeWidget`: Standardized pill badge with uppercase label and pulsing indicator for `TRIGGERED`.
   - `SkeletonWidget`: Content-shaped shimmer placeholder for asynchronous loading states.
   - `EmptyStateWidget`: Icon + title + description + actionable button.
   - `ErrorStateWidget`: User-friendly error card with prominent "Retry" button.
   - `PrimaryButton`: 56dp minimum touch target height meeting emergency fat-finger responder ergonomics.
4. **Authentication & Session Management**:
   - Secure token storage for JWT access token and user credentials.
   - REST authentication client calling `POST /api/v1/auth/login` and `GET /api/v1/auth/me`.
   - High-contrast login screen with quick-select demo account chips (Admin, Responder Sarah, Responder Alex, Viewer) and manual input form.
   - Auto-login session restoration on app boot.
5. **Quality Gates**:
   - Zero untyped `dynamic` maps in models.
   - `flutter analyze` passes with zero fatal issues or compiler errors.
   - `dart format` passes cleanly.

---

## 2. Directory Structure (`apps/mobile`)

```
apps/mobile/
├── lib/
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart
│   │   │   └── app_keys.dart
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   └── auth_interceptor.dart
│   │   ├── storage/
│   │   │   └── secure_storage_service.dart
│   │   ├── theme/
│   │   │   ├── app_colors.dart
│   │   │   ├── app_theme.dart
│   │   │   └── app_typography.dart
│   │   └── widgets/
│   │       ├── empty_state_widget.dart
│   │       ├── error_state_widget.dart
│   │       ├── primary_button.dart
│   │       ├── skeleton_widget.dart
│   │       └── status_badge_widget.dart
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── auth_remote_data_source.dart
│   │   │   │   └── auth_repository_impl.dart
│   │   │   ├── domain/
│   │   │   │   ├── auth_state.dart
│   │   │   │   ├── auth_user.dart
│   │   │   │   └── i_auth_repository.dart
│   │   │   └── presentation/
│   │   │       ├── controllers/
│   │   │       │   └── auth_controller.dart
│   │   │       └── screens/
│   │   │           └── login_screen.dart
│   │   └── navigation/
│   │       └── screens/
│   │           └── main_navigation_shell.dart
│   └── main.dart
├── test/
│   └── core/
│       └── app_theme_test.dart
├── pubspec.yaml
└── analysis_options.yaml
```

---

## 3. Verification Checklist

- [ ] Flutter app scaffolded in `apps/mobile` with clean `pubspec.yaml` and dependencies.
- [ ] Material 3 theme implements exact tokens from `ui-context.md` (Deep Obsidian dark mode, status colors).
- [ ] Core 4-state UI widgets created and verified.
- [ ] Authentication repository and state notifier handle login, logout, and token persistence.
- [ ] Login screen provides quick-select demo profile credentials and manual form.
- [ ] Authenticated shell transitions into bottom navigation view.
- [ ] `flutter analyze` passes with 0 warnings or errors.
- [ ] `dart test` passes cleanly.
- [ ] `context/progress-tracker.md` updated with progress.
