# CLAUDE.md — Fono Frontend

## Project
Fono — AI voice assistant for restaurant phone calls. This is the customer-facing frontend (Next.js).

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (utility-first, no component library)
- **Font**: Plus Jakarta Sans (Google Fonts, weights 300-800)
- **Charts**: Recharts
- **State**: React hooks (useState, useEffect, useReducer). No Redux.
- **API**: Fetch with typed responses. Backend at env var NEXT_PUBLIC_API_URL
- **Real-time**: Server-Sent Events (SSE) with exponential backoff reconnection
- **Auth**: NextAuth.js (Google OAuth) → Fono JWT (migrated from Supabase Auth)

## Backend
- **Live URL**: https://fono-backend-production.up.railway.app
- **First tenant (Spice Garden)**: UUID `5c59ba59-2bf0-40a4-b15a-2d96c509ef29`
- **Endpoints available**:
  - GET /api/v1/dashboard/{tenant_id}/summary — call stats
  - GET /api/v1/dashboard/{tenant_id}/calls?page=1&per_page=20&status=X — paginated call log
  - GET /api/v1/events/calls — SSE stream
  - POST /api/v1/calls/bridge — Twilio callback bridge

## Brand Colors

### Chrome (primary brand surface)
```
Terra:      #E0602A  (primary brand, CTAs, logo)
Terra Dark: #C84E20  (navbar backgrounds, hover states)
Cream:      #FDF0E8  (page backgrounds)
Ink:        #1E0E00  (primary text, dark backgrounds)
Brown:      #8B7355  (secondary text; v3.3 semantic name: muted)
Success:    #22C55E  (recovered, live indicator)
Warning:    #F59E0B  (timer warnings; v3.3 semantic name: amber)
Danger:     #EF4444  (missed calls, errors)
```

### Palette A (category swatches, M6 lock, formalized T-229)
Seven low-chroma swatches used for category chips (voicemail intent categories, kiosk binder tabs, future category lists). Tailwind tokens live under the `pa.*` namespace; JS lookup via `paletteA` in `src/lib/colors.ts`. Chip render colors derive from a swatch via `chipTint(swatch)` in `src/lib/palette.ts`.
```
pa.terra:      #D4652C  (Order, default seed; distinct from brand Terra)
pa.sage:       #7B9C68  (Catering, default seed)
pa.dusty-blue: #4A6D86  (Banquet hall, default seed)
pa.bone:       #B0A090  (Others, required seed)
pa.clay:       #9C7B68  (5th rotation slot)
pa.olive:      #866D4A  (6th rotation slot)
pa.plum:       #7B6868  (7th rotation slot)
```
Chip tint formula (CD §3.2): bg = swatch + 1A (10% alpha), border = swatch + 40 (25% alpha), dot = solid swatch. Backend assigns the next unused index on category add; deleted slots recycle to the end so existing categories never re-color.

## Logo Specification — CRITICAL
The Fono logo is "fon" text + an animated pulsing circle that replaces the last "o".

**How to build the logo component:**
1. Use a hidden canvas element and `measureText()` to get exact pixel width of "fon" in Plus Jakarta Sans weight 800 at the given size
2. Measure the width of "o" in the same font/size
3. Measure the width of "fono" to calculate natural letter gap: gap = width("fono") - width("fon") - width("o")
4. Position the circle: cx = width("fon") + gap + radius
5. Circle radius = 48% of measured "o" width
6. Circle stroke width = 5.5% of font size
7. Circle center Y = 52% of font size (lowercase vertical center)
8. SVG total width = cx + radius + 2px padding
9. SVG total height = font size * 1.05
10. Text baseline Y = font size * 0.82

**Animation (CSS keyframes):**
- Outer ring: always visible, breathing opacity animation (0.3 to 0.55, 2.2s ease-in-out infinite)
- 3 pulse circles expanding from center:
  - Pulse 1: r goes from dotR to circleR, opacity 0.55 to 0, 2.2s ease-out infinite
  - Pulse 2: same but opacity 0.4 to 0, delayed 0.7s
  - Pulse 3: same but opacity 0.25 to 0, delayed 1.4s
- Dot radius (start size) = 5.5% of font size

**Props the logo component should accept:**
- `size`: font size in px (default 48)
- `textColor`: color of "fon" text
- `circleColor`: color of the ring stroke
- `pulseColor`: color of the pulse fills
- `animated`: boolean (default true, false for print/static)

**Usage by surface:**
- Dashboard navbar: size=24, textColor=white, circleColor=rgba(255,255,255,0.7), pulseColor=rgba(255,255,255,0.5)
- Kiosk navbar: size=24, textColor=#FDF0E8, circleColor=#E0602A, pulseColor=#E0602A
- Signup: size=32, textColor=#E0602A, circleColor=#E0602A, pulseColor=#E0602A
- Marketing/hero: size=48, textColor=#E0602A, circleColor=#E0602A, pulseColor=#E0602A

## Code Style
- Functional components only, no classes
- Named exports for components, default export for pages
- File naming: kebab-case for files, PascalCase for components
- Extract reusable components to `src/components/`
- Extract hooks to `src/hooks/`
- Extract API functions to `src/lib/api.ts`
- Extract config to `src/lib/config.ts`
- Types in `src/types/` or co-located with component
- Use `cn()` utility for conditional classnames (clsx + twMerge)

## Folder Structure
```
src/
  app/
    layout.tsx          — root layout (font, global styles)
    page.tsx            — redirect to /dashboard
    dashboard/
      page.tsx          — dashboard surface
    kiosk/
      page.tsx          — kiosk surface
    signup/
      page.tsx          — signup flow
    login/
      page.tsx          — login page
  components/
    logo.tsx            — Fono animated logo (canvas-measured)
    header.tsx          — shared header component
    footer.tsx          — shared footer
    date-filter.tsx     — date range filter pills
    call-card.tsx       — call display card (used in kiosk)
    audio-player.tsx    — inline audio player
    countdown-timer.tsx — countdown component for kiosk
    bar-chart.tsx       — recharts bar chart wrapper
    badge.tsx           — status badge pill
    button.tsx          — styled button variants
    tabs.tsx            — tab bar component
  hooks/
    use-call-events.ts  — SSE hook with reconnection
    use-api.ts          — fetch wrapper with loading/error states
  lib/
    api.ts              — typed API client
    config.ts           — env vars and constants
    utils.ts            — cn() helper, formatPhone, formatDuration, etc
    colors.ts           — brand color constants
  types/
    index.ts            — shared TypeScript types
```

## API Response Types
```typescript
interface CallRecord {
  id: string;
  tenant_id: string;
  caller_number: string;
  status: 'completed' | 'missed' | 'recovered' | 'ignored' | 'no-answer';
  duration: number | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardSummary {
  total_calls: number;
  missed_calls: number;
  answered_calls: number;
  recovered_calls: number;
  avg_response_time: number;
  total_duration_seconds: number;
  total_recordings: number;
  period: string;
}
```

## Git Rules
- Commit after each logical chunk completes
- Commit message format: `feat: description` / `fix: description` / `refactor: description`
- Co-authored-by: Mano <mano@fono.services>

## DO NOT
- Do NOT use any component library (no shadcn, no MUI, no Chakra)
- Do NOT use Redux or Zustand
- Do NOT use CSS modules — Tailwind only
- Do NOT add unnecessary dependencies
- Do NOT use `any` type — always type properly
- Do NOT leave console.log in production code
- Do NOT hardcode tenant IDs in components (use env var or route param)

# CHIRAN Integration

This repo is managed by CHIRAN, the COO orchestrator.

## At Session Start
1. Call generate_handoff with the appropriate project name to load context
2. Call list_tasks to see what is queued
3. If there is a task to work on, call claim_task with your session_id and the task_id

## During Work
- Call heartbeat_task periodically to keep your lock alive
- Call list_decisions if you need to check existing architectural decisions
- Call list_principles to check coding standards and rules
- Call record_decision if you make any technical decision during implementation

## At Session End (MANDATORY - DO NOT SKIP)
1. Find the task ID from the brief you were given (look for "TASK ID: T-XX" or "task_id=XX")
2. Call update_task(task_id=XX, status="done", result="summary of what you did")
3. Call save_session(title="T-XX: description", summary="what was done", project="fono")
4. If no task ID was given, still call save_session with a summary
DO NOT end a session without reporting to CHIRAN. This is not optional.

## Project Mapping
- fono-backend uses project slug: fono
- fono-chiran uses project slug: chiran
- fono-frontend uses project slug: fono
- askben-ai uses project slug: askben

## Rules
- Never use em dashes
- Surgical patches only, never rewrite entire files
- Test locally before pushing (especially API integrations: test with curl first)
- Commit after each logical chunk
