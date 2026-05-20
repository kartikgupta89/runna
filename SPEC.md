# Personal Running Coach — Build Specification

> A self-hosted, no-subscription replica of Runna focused on personalized running training plans. Built for individual use.

---

## 1. Project Goal

Build a local-first running training app that:
- Generates personalized, science-based training plans for 5K, 10K, half marathon, and marathon
- Adapts paces to the runner's current fitness (VDOT)
- Shows daily workouts, weekly structure, and overall progress
- Lets the user log completed runs and view stats
- Runs locally on the user's machine (no auth, no cloud, no subscription)

Stretch goals: GPX import, Strava read-only sync, audio cues, race time predictor.

---

## 2. Recommended Tech Stack

Pick one of these two paths:

### Path A — Web app (recommended for desktop + mobile via browser)
- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite via `better-sqlite3` (file-based, zero-config) accessed through Drizzle ORM
- **Charts:** Recharts
- **State:** React Server Components + Zustand for client UI state
- **Date handling:** `date-fns`
- **PWA:** add `next-pwa` so it installs to a phone home screen
- **Hosting:** runs locally with `npm run dev`, or deploy to Vercel free tier

### Path B — Native mobile
- **Framework:** Expo + React Native + TypeScript
- **Database:** `expo-sqlite` with Drizzle
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind for RN)

**Default to Path A unless you specifically want a native iOS/Android binary.** Everything below assumes Path A.

---

## 3. Core Features (MVP)

1. **Onboarding** — capture name, age, recent race/time-trial result, goal race + date, days/week available
2. **Plan generation** — produce a full week-by-week, day-by-day training plan from goal + fitness
3. **Today view** — the workout for today with detailed structure
4. **Calendar view** — full plan as a calendar/week grid
5. **Workout detail** — segments (warmup, intervals, cooldown) with target paces in min/km and min/mile
6. **Log workout** — mark complete, log actual distance/time/perceived effort
7. **Progress dashboard** — weekly mileage chart, VDOT trend, completion rate

### Post-MVP
- Adaptive plan adjustment (if user misses workouts or runs faster than expected)
- GPX/Strava import to auto-log workouts
- Race time predictor
- Audio interval cues during workouts
- Multiple concurrent plans / history of past plans

---

## 4. Training Plan Algorithm (the important part)

This is based on **Jack Daniels' Running Formula**, which is the closest publicly available approximation of what apps like Runna do under the hood.

### 4.1 VDOT — measuring current fitness

VDOT is a single number that represents the runner's current aerobic fitness based on a recent race or time trial. Higher = fitter.

Calculate from any recent hard effort (distance D in meters, time T in minutes):

```
velocity = D / T  (meters per minute)
percentMax = 0.8 + 0.1894393 * e^(-0.012778 * T) + 0.2989558 * e^(-0.1932605 * T)
vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity²
VDOT = vo2 / percentMax
```

```typescript
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  const timeMinutes = timeSeconds / 60;
  const velocity = distanceMeters / timeMinutes;
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2;
  return vo2 / percentMax;
}
```

Typical VDOT ranges:
- Recreational beginner: 30–40
- Recreational fit: 40–50
- Competitive amateur: 50–60
- Elite: 65+

### 4.2 Training paces from VDOT

Each VDOT maps to five training paces. Use this lookup table (seconds per km) — it can be hard-coded as a JSON object. Values below are approximate; round to the nearest second in the UI.

| VDOT | Easy (E) | Marathon (M) | Threshold (T) | Interval (I) | Repetition (R) |
|------|----------|--------------|---------------|--------------|----------------|
| 30   | 7:27     | 6:51         | 6:24          | 5:54         | 5:30 /400m=2:22 |
| 35   | 6:36     | 6:04         | 5:40          | 5:12         | 4:54 /400m=2:06 |
| 40   | 5:56     | 5:29         | 5:06          | 4:42         | 4:24 /400m=1:52 |
| 45   | 5:23     | 5:00         | 4:38          | 4:16         | 4:00 /400m=1:42 |
| 50   | 4:56     | 4:35         | 4:15          | 3:55         | 3:39 /400m=1:33 |
| 55   | 4:33     | 4:14         | 3:56          | 3:36         | 3:22 /400m=1:26 |
| 60   | 4:14     | 3:56         | 3:40          | 3:23         | 3:08 /400m=1:20 |
| 65   | 3:57     | 3:41         | 3:26          | 3:09         | 2:56 /400m=1:15 |

> Have Claude Code generate the full table for VDOT 30–70 in 0.5 increments. The math approximation: for any VDOT, the velocity at each intensity is `velocity_at_vo2max × intensityFactor` where intensity factors are roughly E=0.70, M=0.84, T=0.88, I=0.98, R=1.05. Then invert velocity to pace.

Each pace gets a **range** in the UI (e.g. Easy = ±15 sec/km of the target), not a single number — runners shouldn't be slaves to an exact pace.

### 4.3 Workout types

| Type | Purpose | Typical structure |
|------|---------|-------------------|
| **Easy run** | Aerobic base, recovery | 30–60 min at E pace |
| **Long run** | Endurance | 60–150 min, mostly E, sometimes with M-pace finish |
| **Tempo / Threshold** | Lactate clearance | 15–40 min at T pace, with warmup + cooldown |
| **Intervals** | VO2max | 3–8 reps of 800m–1600m at I pace, equal-time jog recovery |
| **Repetitions** | Speed + economy | 8–12 reps of 200m–600m at R pace, full recovery |
| **Marathon-pace** | Race specificity | 30–90 min at M pace mid-long run |
| **Rest / Cross-train** | Recovery | — |

### 4.4 Plan structure & periodization

Plan length by goal race:
- 5K: 8–12 weeks
- 10K: 10–14 weeks
- Half marathon: 12–16 weeks
- Marathon: 16–20 weeks

Four phases — % of total weeks:

| Phase | % of plan | Focus |
|-------|-----------|-------|
| Base | 25% | Easy mileage, strides, build aerobic capacity |
| Build | 35% | Add T-pace work, longer long runs |
| Peak | 25% | Race-specific (I-pace for 5K/10K, M-pace for HM/M), highest volume |
| Taper | 15% (min 2 weeks) | Reduce volume 30–50%, maintain intensity |

Volume progression rule: increase weekly mileage by no more than 10% week-over-week, with a **recovery week every 4th week** at ~70% of prior week's volume.

### 4.5 Weekly template (4-day plan example)

| Day | Base phase | Build phase | Peak phase | Taper |
|-----|-----------|-------------|------------|-------|
| Mon | Rest | Rest | Rest | Rest |
| Tue | Easy 40min | Tempo (warmup + 20min T + cd) | Intervals 5×1000m I | Easy + strides |
| Wed | Rest or cross | Easy 30min | Easy 30min | Rest |
| Thu | Easy 45min + strides | Easy 40min | Tempo or M-pace | Short tempo |
| Fri | Rest | Rest | Rest | Rest |
| Sat | Easy 30min | Easy 30min | Easy 30min | Rest |
| Sun | Long run 75min | Long run 90min | Long run 120min | Long run 60min |

Adapt to 3-, 5-, or 6-day plans by adding/removing easy and quality days.

### 4.6 Generation algorithm (pseudocode)

```typescript
function generatePlan(input: PlanInput): TrainingPlan {
  // 1. Establish baseline
  const vdot = calculateVDOT(input.recentRace.distance, input.recentRace.time);
  const paces = paceTableForVDOT(vdot);

  // 2. Determine plan length & phase boundaries
  const totalWeeks = weeksUntil(input.raceDate);
  const phases = splitPhases(totalWeeks, input.goalRace);
  // returns [{phase: 'base', weeks: [1,2,3]}, ...]

  // 3. Determine starting weekly mileage
  // From input.currentWeeklyMileage, or default by goal:
  //   5K: 25km, 10K: 35km, HM: 45km, M: 55km
  let weeklyMileage = input.currentWeeklyMileage ?? defaultStartMileage(input.goalRace);
  const peakMileage = peakMileageForGoal(input.goalRace, vdot);

  // 4. Build week by week
  const weeks: Week[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const phase = phaseForWeek(w, phases);
    const isRecoveryWeek = w % 4 === 0;
    const targetMileage = isRecoveryWeek
      ? weeklyMileage * 0.7
      : Math.min(weeklyMileage * 1.1, peakMileage);

    const week = buildWeek({
      weekNumber: w,
      phase,
      daysPerWeek: input.daysPerWeek,
      targetMileage,
      paces,
      goalRace: input.goalRace,
      weeksToRace: totalWeeks - w,
    });
    weeks.push(week);
    weeklyMileage = targetMileage;
  }

  // 5. Apply taper (override last 2-3 weeks)
  applyTaper(weeks, input.goalRace);

  // 6. Add race day as final workout
  weeks[weeks.length - 1].workouts.push(buildRaceDayWorkout(input));

  return { weeks, vdot, paces, ...input };
}
```

`buildWeek` picks workouts by phase from `4.5` templates, scales distances so the week sums to `targetMileage`, and assigns dates starting from the week's Monday.

---

## 5. Data Models

Define these as TypeScript interfaces and matching Drizzle schemas.

```typescript
type GoalRace = 'fivek' | 'tenk' | 'halfMarathon' | 'marathon';
type WorkoutType = 'easy' | 'long' | 'tempo' | 'intervals' | 'repetitions' | 'marathonPace' | 'rest' | 'race';
type Phase = 'base' | 'build' | 'peak' | 'taper';

interface User {
  id: string;
  name: string;
  age?: number;
  weightKg?: number;
  preferredUnits: 'metric' | 'imperial';
  currentVDOT: number;
  createdAt: Date;
}

interface FitnessTest {
  id: string;
  userId: string;
  date: Date;
  distanceMeters: number;
  timeSeconds: number;
  vdotResult: number;
  source: 'race' | 'timeTrial' | 'estimated';
}

interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  goalRace: GoalRace;
  goalTimeSeconds?: number;
  raceDate: Date;
  startDate: Date;
  daysPerWeek: number;
  startingVDOT: number;
  active: boolean;
  createdAt: Date;
}

interface Workout {
  id: string;
  planId: string;
  date: Date;          // ISO date, no time
  weekNumber: number;
  phase: Phase;
  type: WorkoutType;
  title: string;       // e.g. "5×1000m intervals"
  description: string; // human-readable
  segments: WorkoutSegment[]; // JSON column
  plannedDistanceMeters: number;
  plannedDurationSeconds: number;
  completed: boolean;
  completedAt?: Date;
  actualDistanceMeters?: number;
  actualDurationSeconds?: number;
  actualAvgPaceSecPerKm?: number;
  perceivedEffort?: number; // 1-10
  notes?: string;
}

interface WorkoutSegment {
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'main';
  description: string;
  distanceMeters?: number;
  durationSeconds?: number;
  paceTarget?: {
    paceType: 'E' | 'M' | 'T' | 'I' | 'R';
    minSecPerKm: number;
    maxSecPerKm: number;
  };
  repeats?: number;
}
```

---

## 6. Screens & UI

### 6.1 Onboarding (multi-step form)
1. Name + age + units
2. Recent race/time-trial → calculate VDOT, show result
3. Goal race + race date + optional goal time
4. Days per week available + current weekly mileage
5. Confirm and generate plan

### 6.2 Today
- Big card: today's workout title, type, planned distance/duration
- Segments laid out vertically with target paces
- "Mark complete" button
- Mini week strip at the top (Mon–Sun, today highlighted)

### 6.3 Calendar / Plan
- Vertical scroll of weeks; each week is a row of 7 day-cards
- Each card shows workout type icon + distance
- Tap a card → workout detail
- Phase label and week number on the left

### 6.4 Workout detail
- Title + type
- Full segment breakdown with paces
- Why this workout exists (one-sentence rationale, e.g. "Builds VO2max")
- Log form: actual distance, time, RPE, notes
- Mark complete

### 6.5 Progress
- Weekly mileage bar chart (planned vs actual)
- VDOT trend line over time (recalculated from logged hard efforts)
- Completion rate
- Days until race countdown

### 6.6 Settings
- Edit profile
- Re-run fitness test (creates new FitnessTest record, updates VDOT, regenerates remaining plan)
- Switch units
- Export plan as JSON / CSV
- Wipe data

---

## 7. Suggested File Structure

```
running-app/
├── app/
│   ├── (onboarding)/
│   │   └── setup/page.tsx
│   ├── today/page.tsx
│   ├── plan/page.tsx
│   ├── workout/[id]/page.tsx
│   ├── progress/page.tsx
│   ├── settings/page.tsx
│   ├── api/
│   │   ├── plans/route.ts
│   │   ├── workouts/[id]/route.ts
│   │   └── workouts/[id]/complete/route.ts
│   ├── layout.tsx
│   └── page.tsx           # redirects to /today or /setup
├── lib/
│   ├── training/
│   │   ├── vdot.ts        # VDOT calc + pace tables
│   │   ├── paces.ts       # pace lookup, formatting
│   │   ├── generator.ts   # plan generation
│   │   ├── workouts.ts    # workout templates by phase
│   │   └── periodization.ts
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema
│   │   ├── client.ts      # SQLite connection
│   │   └── migrations/
│   └── utils/
│       ├── format.ts      # pace/distance formatting
│       └── date.ts
├── components/
│   ├── ui/                # shadcn primitives
│   ├── WorkoutCard.tsx
│   ├── WeekStrip.tsx
│   ├── PaceDisplay.tsx
│   ├── SegmentList.tsx
│   └── MileageChart.tsx
├── data/
│   └── app.db             # SQLite file (gitignored)
├── public/
│   └── icons/             # PWA icons
├── package.json
├── tailwind.config.ts
├── drizzle.config.ts
└── README.md
```

---

## 8. Implementation Phases

**Phase 1 — Foundation (build first, validate by hand)**
- Project setup, Tailwind, shadcn/ui installed
- `lib/training/vdot.ts` with unit tests against known values (e.g. 5K in 20:00 ≈ VDOT 49)
- Full pace table generated and exported
- Workout segment + workout types defined

**Phase 2 — Plan generator**
- `generator.ts` produces a plain JS object plan
- Throw a few inputs at it from a test script, eyeball the output for sanity
- No UI yet

**Phase 3 — Persistence**
- Drizzle schema + SQLite setup
- Save/load a plan

**Phase 4 — UI**
- Onboarding flow
- Today + workout detail + calendar
- Wire to DB

**Phase 5 — Logging & progress**
- Workout completion form
- Progress dashboard charts

**Phase 6 — Polish**
- PWA install, offline support
- Refine pace display, add unit toggle
- Empty/error states

**Phase 7 — Stretch**
- Strava OAuth (read-only) → auto-log
- GPX file import
- Adaptive plan adjustment when actual paces drift from VDOT predictions
- Audio cues during workouts (Web Speech API)

---

## 9. Validation Checks (so the plan output is actually reasonable)

When testing, verify:
- VDOT for 20:00 5K is ~49; for 4:00:00 marathon is ~38
- Easy pace is always slower than marathon pace
- Weekly mileage never jumps more than 10% except into a recovery week
- Last 2 weeks of any plan have lower volume than peak week
- No two hard workouts back-to-back
- Long run is on the day the user designates (typically Sunday)
- Total plan volume is sensible: a 16-week marathon plan should peak around 60–80 km/wk for a mid-pack runner

---

## 10. References for Claude Code to consult while building

- Jack Daniels, *Daniels' Running Formula* (3rd ed.) — VDOT system & pace tables
- Pete Pfitzinger, *Advanced Marathoning* — periodization patterns
- Hal Higdon training plans (publicly available) — useful sanity check for plan shape

---

## How to use this spec

1. Save this file as `SPEC.md` at the root of an empty repo
2. Open the repo in VS Code and start Claude Code
3. Prompt: *"Read SPEC.md and implement Phase 1. Set up the Next.js project, then build `lib/training/vdot.ts` with the VDOT calculation and pace table generation. Write unit tests."*
4. Once Phase 1 passes, prompt for Phase 2, and so on.
5. After each phase, sanity-check the output against Section 9.
