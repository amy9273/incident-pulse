# Unit 09: Visual On-Call Schedule Builder

---

## 1. Goal

Implement the visual on-call scheduling and rotation builder across the backend API, shared types, and Next.js web application:

1. **Shared Schemas & DTOs (`@incident-pulse/shared`)**:
   - `ScheduleSchema`: Schedule details with timezone, active on-call user, and shifts.
   - `ScheduleShiftSchema`: Shift time blocks linked to users (`userId`, `userName`, `userEmail`, `startTime`, `endTime`).
   - `CreateScheduleSchema` & `CreateShiftSchema`: Input validation schemas (Zod).
2. **Backend API Endpoints (`apps/api`)**:
   - `GET /api/v1/schedules`: List all schedules with current on-call engineer and shifts.
   - `GET /api/v1/schedules/:id`: Get schedule details by ID with shifts within a date window.
   - `POST /api/v1/schedules`: Create a new schedule.
   - `POST /api/v1/schedules/:id/shifts`: Add a shift rotation to a schedule.
   - `DELETE /api/v1/schedules/:id/shifts/:shiftId`: Remove a shift.
   - `GET /api/v1/users`: List available responders and engineers for assignment.
3. **Web Frontend Schedule Builder (`apps/web`)**:
   - **Active On-Call Summary Banner**: Prominently displays who is on-call right now per team/schedule with countdown to shift end.
   - **Visual Timeline / Calendar View**: Interactive visual 7-day / 14-day timeline displaying shift blocks, engineer color badges, time boundaries, and coverage gaps.
   - **Create Shift Modal**: Modal allowing assigning engineers to shifts with start/end date-time selection and quick presets (1 Day, 7 Days).
   - **Create Schedule Modal**: Modal to create new team rotation policies.
   - **4-State UI Handling**: Skeleton loading shimmer, Empty state, Error state with retry, and Populated calendar.

---

## 2. Directory & Component Structure

```
packages/shared/src/
└── schemas/schedule.schema.ts      # Zod validation schemas and TypeScript types

apps/api/src/
├── controllers/
│   ├── schedule.controller.ts     # Request/response controller
│   └── user.controller.ts         # User listing controller
├── services/
│   ├── schedule.service.ts        # Database queries and on-call resolver
│   └── user.service.ts            # User queries
└── routes/
    ├── schedule.routes.ts         # Express routes for schedules & shifts
    └── user.routes.ts             # Express routes for users

apps/web/src/
├── hooks/
│   ├── useSchedules.ts            # TanStack Query hooks for schedules & shifts
│   └── useUsers.ts                # TanStack Query hook for responders list
├── components/
│   └── schedules/
│       ├── ActiveOnCallSummary.tsx # Active on-call cards
│       ├── ScheduleTimeline.tsx    # Visual weekly timeline calendar
│       ├── CreateShiftModal.tsx    # Shift assignment modal
│       └── CreateScheduleModal.tsx # New schedule modal
└── app/(dashboard)/schedules/
    └── page.tsx                    # Full schedule builder dashboard
```

---

## 3. Verification Checklist

- [ ] `GET /api/v1/schedules` returns seeded schedules with active on-call responders.
- [ ] `POST /api/v1/schedules/:id/shifts` creates a new shift and validates start/end times.
- [ ] `DELETE /api/v1/schedules/:id/shifts/:shiftId` deletes a shift.
- [ ] Visual timeline in `apps/web` renders shift blocks on a 7-day grid with engineer badges.
- [ ] Clicking "Add Shift" opens modal, creates shift in DB, and refreshes the timeline.
- [ ] 4-state UI rules respected (Skeleton, Empty, Error, Populated).
- [ ] `npm run typecheck --workspaces` passes with 0 errors.
- [ ] `npm run lint` passes with 0 warnings.
- [ ] `npm test` passes with 100% success.
