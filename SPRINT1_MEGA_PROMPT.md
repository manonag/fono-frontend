# SPRINT 1 MEGA-PROMPT — Foundation + Dashboard v2

You are building the Fono frontend from scratch. Read CLAUDE.md first for all project context, brand colors, logo spec, and code conventions.

## STEP 0: NUKE AND SCAFFOLD

Delete everything in `src/` except keep `.env.local` and `CLAUDE.md` at root.

Then set up the clean project:

```
npm install recharts clsx tailwind-merge
```

Create `src/lib/utils.ts` with a `cn()` helper using clsx + tailwind-merge.

Create `src/lib/colors.ts` exporting all brand color constants:
```typescript
export const colors = {
  terra: '#E0602A',
  terraDark: '#C84E20',
  cream: '#FDF0E8',
  ink: '#1E0E00',
  brown: '#8B7355',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}
```

Create `src/lib/config.ts`:
```typescript
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://fono-backend-production.up.railway.app',
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID || '5c59ba59-2bf0-40a4-b15a-2d96c509ef29',
}
```

Create `src/types/index.ts` with all TypeScript interfaces (see CLAUDE.md for CallRecord and DashboardSummary types). Also add:
```typescript
interface ChartDataPoint {
  hour: number;       // 0-23
  label: string;      // "6 AM", "7 AM", etc.
  answered: number;
  missed: number;
  recovered: number;
}

interface CallLogFilters {
  status: 'all' | 'completed' | 'missed' | 'recovered' | 'ignored';
  page: number;
  perPage: number;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
```

Update `tailwind.config.ts` to add brand colors:
```
colors: {
  terra: { DEFAULT: '#E0602A', dark: '#C84E20' },
  cream: '#FDF0E8',
  ink: '#1E0E00',
  brown: '#8B7355',
}
```

Update `src/app/layout.tsx`:
- Import Plus Jakarta Sans from next/font/google (weights 300,400,500,600,700,800)
- Set as the default font
- Add global background: cream (#FDF0E8)
- Add metadata: title "Fono — Never Miss a Call", description, favicon

## STEP 1: LOGO COMPONENT (`src/components/logo.tsx`)

This is the most critical component. Read the Logo Specification in CLAUDE.md very carefully.

Build a React component that:
1. Uses a hidden `<canvas>` element (via useRef) to measure exact text width
2. Uses `useEffect` + `useState` to compute measurements after font loads (use `document.fonts.ready`)
3. Renders an `<svg>` with:
   - `<text>` element for "fon" (Plus Jakarta Sans, weight 800)
   - Animated circle for the "o" — positioned using measured values
   - CSS keyframe animations for the pulse and ring breathing
4. Before measurements are ready, render a static fallback (just the text "fono" in a span)

Props: `size`, `textColor`, `circleColor`, `pulseColor`, `animated` (all with defaults for primary terra variant).

Export as named export: `export function FonoLogo(props) { ... }`

Test that it renders correctly at sizes 18, 24, 32, and 48.

## STEP 2: SHARED COMPONENTS

### `src/components/button.tsx`
Three variants:
- `primary`: terra bg, white text, hover: terraDark
- `secondary`: white bg, terra border, terra text, hover: cream bg
- `ghost`: transparent bg, terra text, hover: cream bg
Props: `variant`, `size` (sm/md/lg), `children`, `onClick`, `disabled`, `className`, `loading` (shows spinner)

### `src/components/badge.tsx`
Status pill badge.
Props: `status` ('answered' | 'missed' | 'recovered' | 'ignored' | 'completed')
Colors: answered/completed=green, missed=red, recovered=blue, ignored=gray

### `src/components/tabs.tsx`
Underline-style tab bar.
Props: `tabs: {id: string, label: string, count?: number}[]`, `activeTab`, `onChange`
Active tab: terra underline + terra text. Inactive: gray text. Count shows as badge.

### `src/components/audio-player.tsx`
Inline audio player with terra play/pause button and thin progress bar.
Props: `url: string`
Use native HTML5 audio element, custom UI overlay.

### `src/components/date-filter.tsx`
Horizontal row of pill buttons for date filtering.
Props: `value: DateFilter`, `onChange: (filter: DateFilter) => void`
Options: Today (default), Yesterday, This Week, This Month, Custom
Custom: opens a simple date range picker (two date inputs).

### `src/components/footer.tsx`
Simple footer: "© 2026 Fono Inc. · Privacy · Terms · Contact · support@fono.services"
Terra links on cream background. Centered text.

### `src/components/header.tsx`
Shared header bar component.
Props: `variant: 'dashboard' | 'kiosk' | 'signup'`, `restaurantName?: string`
- Dashboard: terra dark (#C84E20) bg. Left: FonoLogo (white) | separator | restaurant name. Right: date | Live green dot | settings gear icon.
- Kiosk: ink (#1E0E00) bg. Left: FonoLogo (cream+terra) | separator | restaurant name. Right: Live dot | real-time clock.
- Signup: cream bg, centered FonoLogo (terra), minimal.

## STEP 3: API CLIENT (`src/lib/api.ts`)

Typed API client with error handling:

```typescript
export async function fetchDashboardSummary(tenantId: string, startDate?: string, endDate?: string): Promise<DashboardSummary>
export async function fetchCallLog(tenantId: string, filters: CallLogFilters): Promise<{calls: CallRecord[], total: number, page: number}>
export async function fetchChartData(tenantId: string, period: DateFilter): Promise<ChartDataPoint[]>
```

For `fetchChartData`: the backend doesn't have this endpoint yet. **Mock it** by fetching the call log for the period and grouping calls by hour client-side. This gives us real data in the chart while we wait for the backend endpoint.

Implementation of the mock:
1. Fetch all calls for the date range using the call log endpoint (fetch multiple pages if needed)
2. Group by hour of `created_at`
3. Count by status per hour
4. Return as ChartDataPoint array

## STEP 4: SSE HOOK (`src/hooks/use-call-events.ts`)

Same as before but cleaner:
- Connects to `{apiUrl}/api/v1/events/calls`
- Exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)
- Returns: `{ connected: boolean, lastEvent: CallEvent | null }`
- Calls `onEvent` callback when new event arrives
- Cleans up on unmount

## STEP 5: DASHBOARD PAGE (`src/app/dashboard/page.tsx`)

Full dashboard surface. Sections from top to bottom:

### Header
Use the `<Header variant="dashboard" restaurantName="Spice Garden" />` component.

### Date Filter Row
`<DateFilter value={dateFilter} onChange={setDateFilter} />`
Default: 'today'

### Summary Cards
4 cards in a flex row (grid on desktop, stack on mobile):
1. **Total Calls** — large number, terra accent, "vs yesterday" percentage
2. **Missed Calls** — large number, RED if > 0, green "0" if none
3. **Recovered** — large number, green accent, "X% recovery rate"
4. **Avg Response** — large number in minutes, terra accent

Each card: white bg, rounded-2xl, subtle shadow, padding-6.
On mobile: 2x2 grid. On desktop: 4 in a row.

Loading state: pulsing skeleton placeholders.

### Bar Chart
`<BarChart data={chartData} />`

Build `src/components/bar-chart.tsx` using Recharts:
- `<BarChart>` with `<Bar>` for answered (green), missed (red), recovered (blue)
- Stacked bars
- X-axis: hour labels ("6 AM", "7 AM", etc.) for daily view
- Y-axis: call count
- Tooltip on hover showing exact counts
- Responsive: full width, 300px height
- Rounded bar corners (radius={4})
- Use brand colors: success for answered, danger for missed, terra for recovered

### Call Log
Below the chart:
- Filter pills: All | Missed | Answered | Recovered (using `<Tabs>` component)
- Table rows, each showing:
  - Phone icon (terra) + formatted phone number + relative time ("2h ago" / "Yesterday 3:15 PM")
  - Status badge (using `<Badge>` component)
  - Duration (formatted: "2m 34s")
  - Audio player (if recording_url exists, using `<AudioPlayer>`)
- Pagination: "Showing 1-20 of 29" with prev/next buttons
- Loading state: skeleton rows

### Footer
`<Footer />`

### Real-time
- SSE connection via `useCallEvents` hook
- When new event arrives: show toast notification at top ("New call from +1 (209) 666-0447")
- Auto-refresh summary cards and call log

## STEP 6: GLOBAL STYLES

In `src/app/globals.css`:
- Tailwind directives
- Custom scrollbar styling (thin, terra-tinted)
- Smooth scroll behavior
- Selection color: terra with cream text
- Focus ring: terra outline

## QUALITY GATES

Before committing, verify:
- [ ] `npm run build` passes with zero errors
- [ ] All 3 routes load: /dashboard, /kiosk (can be placeholder), /signup (can be placeholder)
- [ ] Logo animation works at all sizes
- [ ] Dashboard fetches real data from Railway API
- [ ] Bar chart renders with call data grouped by hour
- [ ] Date filter switches between today/yesterday/week/month
- [ ] Call log pagination works
- [ ] SSE connection shows "Live" green dot when connected
- [ ] Mobile responsive: cards stack, table scrolls horizontally
- [ ] No TypeScript errors
- [ ] No `any` types
- [ ] No hardcoded tenant IDs in components

## GIT

After everything works:
```
git add -A
git commit -m "feat: nuke and rebuild — foundation + dashboard v2

- Design system: logo component, brand colors, typography
- Shared components: button, badge, tabs, audio player, date filter, header, footer
- Dashboard: summary cards, bar chart (recharts), call log with pagination
- SSE real-time connection with auto-refresh
- Typed API client with mock chart data aggregation
- Mobile-first responsive layout

Co-authored-by: Mano <mano@fono.services>"

git push origin main
```

## IMPORTANT
- Do NOT stop to ask questions. Make reasonable decisions and keep building.
- Do NOT create placeholder/stub components. Every component must be fully functional.
- Do NOT skip the logo canvas measurement. This is critical for correct alignment.
- The kiosk and signup pages can be simple "Coming Soon" placeholders for now — Sprint 2 and 3 will build them.
- Use real data from the live Railway API. This is not a demo — it's production.
