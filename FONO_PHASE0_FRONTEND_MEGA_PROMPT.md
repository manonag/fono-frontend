# FONO PHASE 0 — COMPLETE FRONTEND BUILD PROMPT
# Feed to Claude Code as a single prompt. Read CLAUDE.md and DESIGN_AGENT_PROMPT.md first.

---

## CONTEXT

You are building ALL frontend screens for Fono Phase 0 — a call analytics dashboard for South Indian restaurants.

**Existing codebase:** https://github.com/manonag/fono-frontend (main branch)
**Current state:** Dashboard v3 is live (commit b25ad44). Sidebar, 3-card layout, mobile nav exist.
**Backend:** https://fono-backend-production.up.railway.app
**Tenant:** Spice Garden — UUID `5c59ba59-2bf0-40a4-b15a-2d96c509ef29`

**Read these files FIRST:**
1. `CLAUDE.md` — tech specs, logo algorithm, API types, code style
2. `DESIGN_AGENT_PROMPT.md` — design philosophy, typography, spacing, color system

---

## WHAT TO BUILD

7 screens total. Build them in this order:

1. **Dashboard** (fix existing + add insight boxes)
2. **Analytics** (new page)
3. **All Calls** (new page)
4. **Settings** (new page, 3 tabs)
5. **Signup** (new flow, 6 steps)
6. **Login** (new page)
7. **Billing** (inside Settings Plan tab)

---

## FILE STRUCTURE

After build, structure should be:

```
src/
  app/
    layout.tsx
    page.tsx                    → redirect to /dashboard
    dashboard/page.tsx          → REWRITE (fixes + insight boxes)
    analytics/page.tsx          → NEW
    calls/page.tsx              → NEW (All Calls)
    settings/page.tsx           → NEW (3 tabs)
    signup/page.tsx             → NEW (6-step flow)
    login/page.tsx              → NEW
  components/
    logo.tsx                    → KEEP (verify circle works)
    pulsing-circle.tsx          → KEEP
    sidebar.tsx                 → UPDATE (active state from route)
    mobile-nav.tsx              → UPDATE (active state from route)
    header.tsx                  → KEEP
    audio-player.tsx            → KEEP
    badge.tsx                   → KEEP
    date-filter.tsx             → KEEP
    // NEW components:
    call-detail-panel.tsx       → NEW (slide-in panel for All Calls)
    heatmap.tsx                 → NEW (7×24 grid for Analytics)
    donut-chart.tsx             → NEW (call distribution donut)
    insight-box.tsx             → NEW (small stat card)
    plan-card.tsx               → NEW (pricing card, reads from API)
    feature-list.tsx            → NEW (included/coming soon features)
    recording-toggle.tsx        → NEW (with warning modal)
    otp-input.tsx               → NEW (6-digit verification)
  hooks/
    use-call-events.ts          → KEEP
    use-api.ts                  → KEEP
    use-media-query.ts          → KEEP
  lib/
    api.ts                      → UPDATE (add new endpoints)
    config.ts                   → KEEP
    utils.ts                    → UPDATE (add new formatters)
```

---

## GLOBAL DESIGN SYSTEM (apply to ALL screens)

### Colors
```
Terra:       #E0602A    (primary CTAs, brand)
Terra Dark:  #C84E20    (header bg, hover states)
Cream:       #FDF0E8    (dashboard page bg)
Ink:         #1E0E00    (primary text, dark signup bg)
Brown:       #8B7355    (secondary text)
Muted:       #B0A090    (tertiary text, labels)
Border:      rgba(0,0,0,0.04)  (cards, dividers)
Success:     #22C55E    (recovered, live, good states)
Danger:      #EF4444    (missed, errors, alerts)
Warning:     #F59E0B    (in-progress)
```

### Typography (Plus Jakarta Sans)
```
Hero stat:    44px weight 800  tracking -0.04em
Page title:   22-26px weight 800  tracking -0.03em
Section head: 16px weight 700
Body:         14px weight 500  color ink
Caption:      12px weight 400  color #8B7355
Label:        10px weight 600  uppercase  letter-spacing 0.1em  color #B0A090
```

### Components
```
Card:         bg white, rounded-20px, border 1px rgba(0,0,0,0.04), padding 24-28px
Button primary: bg #E0602A, text white, rounded-14px, font-weight 700, hover #C84E20
Button secondary: bg white, border 1px rgba(0,0,0,0.08), text #5C3D22
Input:        bg white, border 1.5px rgba(0,0,0,0.08), rounded-12px, padding 14px 16px, focus border #E0602A
Badge:        rounded-8px, font-size 11px, weight 600, padding 4px 12px
```

### SVG Icons
All icons: 24×24 viewBox, stroke only, no fill, stroke-width 1.8. Use same icon set as existing sidebar.

---

## SCREEN 1: DASHBOARD (Fix + Enhance)

### Fixes to apply:
1. **Remove greeting** — No "Good afternoon" / "Here's today's overview". Jump straight to date pills + cards.
2. **Sidebar active state** — Read from current route. Dashboard, Analytics, All Calls, Settings all linked.
3. **Logo** — Verify pulsing circle is properly aligned with "fon" text. If broken, paste the complete logo.tsx from CLAUDE.md spec.

### Add: Insight Boxes
Below the 3 main cards, add a row of 4-6 small insight boxes:

```
Desktop: 4 per row (equal width)
Mobile: 2 per row

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🕐 Peak  │ │ 📊 67%   │ │ ⏱ 2m 14s │ │ 🔄 4     │
│ 12-1 PM  │ │ Recovery │ │ Avg Call │ │ Repeat   │
│ 8 calls  │ │ Rate     │ │ Duration │ │ Callers  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ 📋 1     │ │ 📈 ↑12%  │
│ Callback │ │ 7-Day    │
│ Queued   │ │ Trend    │
└──────────┘ └──────────┘
```

Each insight box:
- White card, rounded-16px, padding 16px
- SVG icon (stroke, no fill) + label at top: 12px #8B7355
- Big value: 24px weight 800
- Sub-label: 12px #B0A090
- No hover effects (these are info-only, not clickable)

Data source: Compute from existing `/dashboard/{tenant_id}/summary` + `/calls` endpoints.

---

## SCREEN 2: ANALYTICS

**Route:** `/analytics`

### Layout
Desktop: Sidebar + content area (same shell as dashboard)
Mobile: Bottom nav + full-width content

### Content sections (scroll):

**1. Call Volume Heatmap (top)**
- 7 rows (Mon-Sun) × 24 columns (12am-11pm)
- Each cell: 28×28px, rounded-6px
- Color scale: white → light terra (0.1) → dark terra (1.0) based on call count
- Hover: tooltip showing "Tuesday 6 PM — 8 calls"
- Label: "When your customers call" (16px weight 700)

**2. Call Distribution Donut (left half)**
- Donut chart: Completed (terra), Missed (red), Recovered (green)
- Center text: total calls count
- Legend below with colored dots + counts
- Size: 200×200px

**3. Daily Trend Line (right half)**
- Last 30 days
- Terra line for total calls
- Red dashed line for missed
- X-axis: dates, Y-axis: count
- Use SVG path (no recharts — too heavy). Simple line drawing.

**4. Peak Hours Bar Chart (full width)**
- 24 bars, one per hour
- Bar color: terra (proportional opacity based on volume)
- Top 3 hours highlighted with bolder color
- X-axis: 12am, 1am... 11pm

**5. Stats Grid (bottom)**
- 6 stat cards in 3×2 grid:
  - Busiest Day, Quietest Day, Avg Calls/Day, Total Duration, Longest Call, Shortest Call
- Same design as insight boxes from dashboard

### Data source
- GET `/api/v1/dashboard/{tenant_id}/summary` (with date range)
- GET `/api/v1/dashboard/{tenant_id}/calls` (all calls, compute analytics client-side)
- Add date range picker (Today / This Week / This Month / Custom)

---

## SCREEN 3: ALL CALLS

**Route:** `/calls`

### Layout
Desktop: Sidebar + main content + slide-in detail panel
Mobile: Full-width list → tap opens detail page

### Main content:

**Search bar (top):**
- Full-width input, rounded-14px, search icon left, "Search by phone number..." placeholder
- Real-time filter as you type

**Filter row:**
- Pill filters: All | Completed | Missed | Recovered
- Active pill: terra bg, white text
- Sort: "Newest first" dropdown

**Call list:**
Each row (full width, white card, rounded-14px, mb-8px):
```
┌─────────────────────────────────────────────────────────┐
│ [status icon] +1 (209) 666-0447     [Completed] 5:32 PM│
│              1m 23s · Inbound           [▶ play]        │
└─────────────────────────────────────────────────────────┘
```
- Status icon: 40px circle with color (green=completed, red=missed, yellow=in-progress)
- Phone number: 14px weight 600
- Badge: same as dashboard badges
- Time: 12px #B0A090 right-aligned
- Duration + direction: 12px #8B7355
- Play button: 32px terra circle (only if recording exists)
- Missed calls: red left border (4px)

**Click/tap → Detail panel slides in from right (desktop) or full page (mobile):**
- Phone number (large)
- Status badge
- Call timeline: Ring → Answer → Duration → End (vertical timeline with dots)
- Audio player (if recording exists): waveform + play/pause + scrubber + speed control
- Call metadata: date, time, direction, duration, ring time
- Caller history: "This number has called 3 times this week"
- Action buttons: "Call Back" (terra) / "Mark as Resolved" (outline)

### Pagination
- Load 20 at a time
- Infinite scroll or "Load more" button

---

## SCREEN 4: SETTINGS

**Route:** `/settings`

### 3 Tabs: Restaurant | Notifications | Plan

### Tab 1: Restaurant
**Restaurant Info (read-only card):**
- Name, Address, Phone, Cuisine type
- All fields greyed out with green badge: "✓ Synced from Google Places"
- "Info synced from your Google Business listing" helper text

**Operating Hours (read-only card):**
- 7-day grid: Day | Open | Close
- Green badge: "✓ Synced from Google Places"
- Sunday shows "Closed" in #EF4444
- No edit button — Google Places is source of truth

**Call Recording (toggleable card):**
- Toggle switch: ON (green) by default
- Label: "Record all incoming calls"
- Helper: "Recordings are encrypted and stored securely"
- **When user tries to turn OFF → show red warning panel:**
  ```
  ⚠️ Turning off recording will disable:
  • Call playback in dashboard
  • Automatic transcription
  • AI-powered call insights
  • Call search & filtering
  • Weekly performance reports

  Recordings are encrypted (AES-256) and auto-deleted after 90 days.

  [Keep Recording On]  (primary terra button)
  Turn off anyway       (small gray text link, not a button)
  ```

**Owner Account:**
- Name (editable), Email (editable), Change Password link
- Save button

**Danger Zone (bottom):**
- Red outlined section
- Pause Fono: "Temporarily stop answering calls"
- Delete Recordings: "Permanently delete all recordings"
- Delete Restaurant: "Remove this restaurant from Fono"
- Each with confirmation modal

### Tab 2: Notifications
4 simple toggle rows:
- WhatsApp missed call alerts: [ON] + phone number input
- Daily email summary: [ON]
- Weekly performance report: [ON]
- Alert for calls over 5 minutes: [OFF]

### Tab 3: Plan
**This is the Billing page (Screen 7).** See SCREEN 7 below.

---

## SCREEN 5: SIGNUP

**Route:** `/signup`
**Theme:** DARK background (#1E0E00), white text, terra accents

### Typeform-style flow — one question per screen, vertical transition

**Progress bar:** 6 dots at top. Completed = terra filled. Current = terra half. Future = gray outline.

### Step 1: Find Your Restaurant
```
STEP 1 OF 6
What's your restaurant called?

[🔍 Search for your restaurant...          ]
  ↓ dropdown results (Google Places autocomplete):
  ┌─────────────────────────────────────┐
  │ Spice Garden                        │
  │ 2900 Glendale Ave, Tracy, CA 95377  │
  ├─────────────────────────────────────┤
  │ Spice Kitchen                       │
  │ 1400 Main St, Manteca, CA           │
  └─────────────────────────────────────┘

→ After selection, show confirmation card:
  ┌─────────────────────────────────────┐
  │ Spice Garden                        │
  │ 2900 Glendale Ave, Tracy, CA 95377  │
  │ Indian · ⭐ 4.3 · Open now          │
  │                                     │
  │ Hours:                              │
  │ Mon-Sat: 11:00 AM - 10:00 PM       │
  │ Sun: Closed                         │
  │                                     │
  │ ✓ Hours and details synced          │
  └─────────────────────────────────────┘

  [Not your restaurant? Search again]

  [Continue →]
```

Note: Google Places API key needed. For now, use mock data if API unavailable.

Can't find it? → Manual entry form: Name, Address, Phone, Cuisine dropdown.

### Step 2: Your Details
```
STEP 2 OF 6
Tell us about yourself

Name:      [                    ]
WhatsApp:  [+1 |               ]
           We'll send missed call alerts here
Email:     [                    ]
           For weekly reports and account recovery

Your role:
  [Owner]  [Manager]  [Staff]    ← chip selector, one active
```

### Step 3: Verify Number
```
STEP 3 OF 6
Verify your WhatsApp number

Enter the 6-digit code sent to +1 (209) 555-0123

  [ _ ] [ _ ] [ _ ] [ _ ] [ _ ] [ _ ]

  Didn't get it? Resend code
  Send via SMS instead
```

OTP boxes: 48×56px each, terra border on focus, auto-advance to next box.

### Step 4: Set Password
```
STEP 4 OF 6
Create your password

Password:         [                    ]
Confirm password: [                    ]

  [Create my account →]
```

Password requirements shown as the user types (checkmarks appearing):
- ✓ At least 8 characters
- ✓ One uppercase letter
- ✓ One number

### Step 5: Connect Your Phone
```
STEP 5 OF 6
Connect your phone line

We've set up a local number for Spice Garden:

  ┌─────────────────────────────────────┐
  │        +1 (209) 579-3201            │
  │  Local Tracy, CA · Just for you  [📋]│
  └─────────────────────────────────────┘

  Forward your restaurant calls to this number:

  [AT&T] [T-Mobile] [Verizon] [Landline] [VoIP]

  AT&T instructions:
  1. Pick up your restaurant phone
  2. Dial: *21*12095793201#
  3. Listen for the confirmation tone

  To undo: Dial ##21#

  ──────────────────
  Test the connection:
  [📞 Call my restaurant now]

  ⏳ Calling... / ✓ Connected! / ✗ Failed

  [Forwarding works — let's go! →]

  I'll set this up later →
```

### Step 6: Choose Plan
```
STEP 6 OF 6
Choose your plan

  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Starter  │  │  Growth  │  │   Pro    │
  │          │  │Recommended│  │          │
  │   $29    │  │   $49    │  │   $99    │
  │   /mo    │  │   /mo    │  │   /mo    │
  │100 calls │  │300 calls │  │Unlimited │
  │$19 for u │  │$39 for u │  │$79 for u │
  └──────────┘  └──────────┘  └──────────┘

  Included in all plans:
  ✓ Call recording & playback
  ✓ Missed call WhatsApp alerts
  ✓ Dashboard & analytics
  ✓ Call log with search
  ✓ Daily & weekly email reports
  ✓ Dedicated local phone number

  🔒 Coming Soon:
  🔒 AI voice ordering
  🔒 Automatic order to POS
  🔒 Menu understanding & upsell
  🔒 Multi-language support
  🔒 Customer order history
  Founding members get first access

  Card number: [Stripe Elements iframe]
  Expiry: [   ]  CVC: [   ]

  🔒 256-bit · PCI compliant · Secured by Stripe

  [🛡 Start Growth Plan — $39/mo]
  We never see your card details. Cancel anytime.

  I'll add payment later →
```

**CRITICAL: Plans/prices come from API, NOT hardcoded.**
```
GET /api/v1/plans → returns plan list with prices, features, upcoming_features
```
If API not ready yet, use this mock:
```json
[
  {"slug":"starter","name":"Starter","price_monthly":29,"founding_price_monthly":19,"call_limit":100,"is_popular":false},
  {"slug":"growth","name":"Growth","price_monthly":49,"founding_price_monthly":39,"call_limit":300,"is_popular":true},
  {"slug":"pro","name":"Pro","price_monthly":99,"founding_price_monthly":79,"call_limit":null,"is_popular":false}
]
```

### Celebration Page (after Step 6)
```
  ✓ (pulsing checkmark, green)

  Welcome to Fono!
  Spice Garden is now connected.
  You're founding member #7.

  [████████░░] 7 of 10 spots taken

  As a founding member, you get:
  • Locked-in founding pricing
  • First access to AI features
  • Direct line to the team
  • Shape the product roadmap
  • Priority support

  [Go to Dashboard →]

  Share Fono with another restaurant owner →
```

---

## SCREEN 6: LOGIN

**Route:** `/login`
**Theme:** DARK background (#1E0E00)

```
  (pulsing fono circle)

  Welcome back

  Email or phone: [                    ]
  Password:       [                    ]

  [Log In]

  ─── or ───

  [Continue with WhatsApp]  (green WhatsApp icon)
  [Continue with Google]    (Google logo)

  Forgot your password?

  Don't have an account? Sign up for early access →
```

Centered, max-width 400px. Simple, clean. Logo at top is the pulsing circle only (no "fon" text), size 48px.

---

## SCREEN 7: BILLING (inside Settings → Plan tab)

**Light theme** (inside dashboard shell)

### For founding members (current state — no active subscription):
```
  ┌─ orange notice ─────────────────────────┐
  │ You're a founding member! Early access.  │
  │ When we launch pricing, you'll get       │
  │ exclusive founding member rates.          │
  └─────────────────────────────────────────-┘

  Current Plan:
  ┌─────────────────────────────────────────┐
  │ [FOUNDING MEMBER]           ● Active    │
  │ Early Access                            │
  │ No charge during early access           │
  └─────────────────────────────────────────┘

  Usage:
  Calls this month: 127     [████░░░░] (of ∞)
  Recordings:       324 MB  [█░░░░░░░]
  Member since:     February 2026

  Payment Method:
  [Stripe Elements card form]
  🔒 256-bit · PCI compliant · Secured by Stripe
  [Save Payment Method]
  You won't be charged until plans are announced.
```

### For active subscribers (future state):
```
  ┌─ orange notice ─────────────────────────┐
  │ Founding member discount applied!        │
  │ $39/mo instead of $49/mo — locked for   │
  │ life.                                    │
  └──────────────────────────────────────────┘

  Current Plan:
  [same 3 plan cards as signup, "Current" tag on active plan]

  Payment Method:
  ┌─────────────────────────────────────────┐
  │ VISA  •••• 4242    Expires 08/28        │
  │ Default                      [Update]   │
  └─────────────────────────────────────────┘

  Invoices:
  Mar 1, 2026 | Growth Plan | $39.00 | Paid | [⬇]
  Feb 1, 2026 | Growth Plan | $39.00 | Paid | [⬇]

  ──────────────────────
  Cancel Subscription
  Service continues until end of billing period
                                    [Cancel Plan]
```

---

## API ENDPOINTS TO ADD TO `lib/api.ts`

```typescript
// Plans (public)
GET /api/v1/plans
GET /api/v1/plans/{slug}

// Subscription (authenticated)
GET /api/v1/tenants/{id}/subscription
POST /api/v1/tenants/{id}/subscription
PUT /api/v1/tenants/{id}/subscription
DELETE /api/v1/tenants/{id}/subscription

// Invoices
GET /api/v1/tenants/{id}/invoices

// Payment methods
GET /api/v1/tenants/{id}/payment-methods
POST /api/v1/tenants/{id}/payment-methods
DELETE /api/v1/tenants/{id}/payment-methods/{pm_id}

// Usage
GET /api/v1/tenants/{id}/usage

// Settings
GET /api/v1/tenants/{id}/settings
PUT /api/v1/tenants/{id}/settings
```

**For endpoints that don't exist yet on backend, create mock data files in `src/lib/mock-data.ts` and use them with a feature flag:**

```typescript
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
```

---

## ROUTING

```
/                → redirect to /dashboard
/dashboard       → Dashboard (authenticated)
/analytics       → Analytics (authenticated)
/calls           → All Calls (authenticated)
/settings        → Settings (authenticated)
/signup          → Signup flow (public)
/login           → Login (public)
```

Authenticated routes: For now, no auth middleware. Just build the pages. Auth (Supabase) comes in a separate sprint.

---

## BUILD ORDER

1. Update sidebar to read active route from `usePathname()` — link all 4 nav items
2. Dashboard fixes (remove greeting, add insight boxes)
3. Analytics page
4. All Calls page
5. Settings page (3 tabs)
6. Login page
7. Signup flow (6 steps)
8. Final: verify all routes work, run `npm run build` with zero errors

---

## REMINDERS

- **NO component libraries** — no shadcn, no MUI, no Chakra
- **NO recharts for Analytics** — too heavy. Use custom SVG for charts
- **Plans/prices from API** — never hardcode plan names or prices
- **Stripe Elements** — payment form is a Stripe iframe. Use `@stripe/stripe-js` and `@stripe/react-stripe-js` packages. Publishable key from env var `NEXT_PUBLIC_STRIPE_KEY`.
- **Google Places** — use `@react-google-maps/api` or raw `google.maps.places.AutocompleteService`. Key from env var `NEXT_PUBLIC_GOOGLE_PLACES_KEY`. If key unavailable, fall back to manual entry.
- **Mobile-first** — every screen must work at 375px first, then expand for desktop
- **Dark pages:** signup, login (bg #1E0E00, white text)
- **Light pages:** dashboard, analytics, calls, settings (bg #FDF0E8)
- **Commit after each screen** — don't batch everything into one giant commit
- **Test `npm run build`** after EVERY screen — zero errors, zero warnings

---

## MOCK DATA SHAPES

If backend endpoints aren't ready, use these shapes:

```typescript
// Plans
const MOCK_PLANS = [
  {
    slug: "starter", name: "Starter", description: "For small restaurants",
    price_monthly: 29, founding_price_monthly: 19, call_limit: 100,
    is_popular: false, features: ["call_recording","whatsapp_alerts","analytics","call_log","email_reports","local_number"],
    upcoming_features: ["ai_voice_ordering","pos_integration","multi_language","menu_understanding","order_history"]
  },
  {
    slug: "growth", name: "Growth", description: "For busy restaurants",
    price_monthly: 49, founding_price_monthly: 39, call_limit: 300,
    is_popular: true, features: ["call_recording","whatsapp_alerts","analytics","call_log","email_reports","local_number"],
    upcoming_features: ["ai_voice_ordering","pos_integration","multi_language","menu_understanding","order_history"]
  },
  {
    slug: "pro", name: "Pro", description: "For high-volume restaurants",
    price_monthly: 99, founding_price_monthly: 79, call_limit: null,
    is_popular: false, features: ["call_recording","whatsapp_alerts","analytics","call_log","email_reports","local_number"],
    upcoming_features: ["ai_voice_ordering","pos_integration","multi_language","menu_understanding","order_history"]
  }
];

// Feature display names
const FEATURE_NAMES: Record<string, string> = {
  call_recording: "Call recording & playback",
  whatsapp_alerts: "Missed call WhatsApp alerts",
  analytics: "Dashboard & analytics",
  call_log: "Call log with search",
  email_reports: "Daily & weekly email reports",
  local_number: "Dedicated local phone number",
  ai_voice_ordering: "AI voice ordering",
  pos_integration: "Automatic order to POS",
  multi_language: "Multi-language support",
  menu_understanding: "Menu understanding & upsell",
  order_history: "Customer order history"
};

// Subscription
const MOCK_SUBSCRIPTION = {
  plan: "growth", status: "active", amount: 39.00,
  is_founding_rate: true, billing_interval: "monthly",
  current_period_end: "2026-04-01T00:00:00Z"
};

// Usage
const MOCK_USAGE = {
  calls_this_period: 127, call_limit: 300, percentage_used: 42.3,
  storage_used_mb: 324, storage_limit_mb: 5120
};
```

---

## DONE CRITERIA

- [ ] All 7 screens render at 375px mobile and 1280px desktop
- [ ] Sidebar highlights current page correctly
- [ ] Mobile nav highlights current page correctly
- [ ] All links between pages work
- [ ] Plans render from API/mock data (not hardcoded)
- [ ] Settings recording toggle shows warning when turning off
- [ ] Signup flow advances through all 6 steps
- [ ] Login page renders cleanly
- [ ] `npm run build` — zero errors
- [ ] Git committed with descriptive messages per screen
