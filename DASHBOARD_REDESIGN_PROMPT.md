# DASHBOARD REDESIGN — Design Agent Sprint

Read `DESIGN_AGENT_PROMPT.md` in the project root FIRST. Follow every principle in it. You are not writing code — you are designing an experience that a restaurant owner uses while standing in a hot kitchen.

Then read `CLAUDE.md` for technical specs.

---

## BEFORE YOU WRITE ANY CODE

For each screen (mobile and desktop), write a text wireframe in a comment block. Think through:
- Who uses this? (Restaurant owner on their phone)
- What do they need in < 3 seconds? (How many calls did I miss?)
- What's P0 information? What's P1? What's P2?

---

## TASK 1: REPLACE LOGO COMPONENT

Delete the current logo component entirely. Create `src/components/logo.tsx` with this EXACT code. Do not modify it:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface FonoLogoProps {
  size?: number;
  textColor?: string;
  circleColor?: string;
  pulseColor?: string;
  animated?: boolean;
  className?: string;
}

export function FonoLogo({
  size = 48,
  textColor = '#E0602A',
  circleColor = '#E0602A',
  pulseColor = '#E0602A',
  animated = true,
  className = '',
}: FonoLogoProps) {
  const [dims, setDims] = useState<{
    fonWidth: number;
    oWidth: number;
    fonoWidth: number;
  } | null>(null);
  const idRef = useRef(`logo-${Math.random().toString(36).slice(2, 8)}`);
  const id = idRef.current;

  useEffect(() => {
    document.fonts.ready.then(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = `800 ${size}px 'Plus Jakarta Sans'`;
      const fonWidth = ctx.measureText('fon').width;
      const oWidth = ctx.measureText('o').width;
      const fonoWidth = ctx.measureText('fono').width;
      setDims({ fonWidth, oWidth, fonoWidth });
    });
  }, [size]);

  if (!dims) {
    return (
      <span
        className={className}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: size,
          color: textColor,
          letterSpacing: '-0.02em',
        }}
      >
        fono
      </span>
    );
  }

  const naturalGap = dims.fonoWidth - dims.fonWidth - dims.oWidth;
  const circleR = dims.oWidth * 0.48;
  const circleCx = dims.fonWidth + Math.max(naturalGap, size * 0.02) + circleR;
  const circleCy = size * 0.52;
  const totalW = circleCx + circleR + 2;
  const totalH = size * 1.05;
  const baseline = size * 0.82;
  const strokeW = Math.max(size * 0.055, 2);
  const dotR = Math.max(size * 0.055, 2);

  return (
    <>
      {animated && (
        <style>{`
          #${id} .fono-ring { animation: ${id}_ring 2.2s ease-in-out infinite; }
          #${id} .fono-p1 { animation: ${id}_p1 2.2s ease-out infinite; }
          #${id} .fono-p2 { animation: ${id}_p2 2.2s ease-out infinite 0.7s; }
          #${id} .fono-p3 { animation: ${id}_p3 2.2s ease-out infinite 1.4s; }
          @keyframes ${id}_ring { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.3; } }
          @keyframes ${id}_p1 { 0% { r: ${dotR}; opacity: 0.55; } 100% { r: ${circleR}; opacity: 0; } }
          @keyframes ${id}_p2 { 0% { r: ${dotR}; opacity: 0.4; } 100% { r: ${circleR}; opacity: 0; } }
          @keyframes ${id}_p3 { 0% { r: ${dotR}; opacity: 0.25; } 100% { r: ${circleR}; opacity: 0; } }
        `}</style>
      )}
      <svg
        id={id}
        className={className}
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
      >
        <text
          x="0"
          y={baseline}
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize={size}
          fill={textColor}
        >
          fon
        </text>
        <circle
          className="fono-ring"
          cx={circleCx}
          cy={circleCy}
          r={circleR}
          fill="none"
          stroke={circleColor}
          strokeWidth={strokeW}
        />
        <circle className="fono-p1" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
        <circle className="fono-p2" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
        <circle className="fono-p3" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
      </svg>
    </>
  );
}
```

DO NOT MODIFY THIS CODE. Use it exactly as given. The logo was approved after 5 iterations. Any change will break the alignment.

---

## TASK 2: FIX DASHBOARD BUGS

1. **NaN values**: Wrap ALL calculations with `isNaN()` checks:
   - Recovery rate: `isNaN(rate) ? 0 : rate`
   - Avg response: `isNaN(avg) || avg === 0 ? '—' : formatMinutes(avg)`
   - Any division: check denominator !== 0 before dividing

2. **Default filter**: Initial state must be `'today'`, not `'custom'`. Load today's data on mount.

3. **Empty chart**: When filtered period has zero calls, show centered text "No calls yet today" in the chart area (muted brown, 14px).

---

## TASK 3: DESKTOP DASHBOARD IMPROVEMENTS

Desktop (≥ 1024px) should look like a Stripe/Linear dashboard:

**Header**: terra-dark bg (#C84E20)
- Left: FonoLogo size=24 white | thin separator | "Spice Garden" (white, 14px, weight 500)
- Right: date (muted white) | green Live dot + "Live" text | settings gear icon

**Date filter row**: horizontal pills, compact. Today highlighted by default. Subtle cream bg on hover.

**4 Summary cards in a row**: 
- Clean white cards, rounded-2xl, shadow-sm
- Big number (32px, weight 800)
- Label above (12px, uppercase, letter-spacing 0.05em, brown)
- Subtext below number (12px, brown)
- Missed calls card: left border 3px red if count > 0

**Bar chart**: MAX 200px height. Not 400. It's a quick visual, not the main content.

**Call log**: Clean list, not a heavy table. Each row:
- Left: phone icon (terra, 16px) + number (14px, weight 600) + time ago (12px, brown)
- Right: status badge + duration + play button (if recording)
- Subtle hover state (cream bg)
- Thin bottom border between rows

---

## TASK 4: MOBILE DASHBOARD REDESIGN (< 768px)

This is the most important task. The mobile dashboard must feel like a NATIVE APP, not a squeezed website.

### Mobile Header (compact, 48px tall)
```
┌─────────────────────────────────┐
│ Spice Garden        ● Live      │
│ Powered by fono                 │
└─────────────────────────────────┘
```
- Restaurant name: 16px, weight 700, ink color, left-aligned
- "Powered by fono": 10px, weight 500, brown, below restaurant name
- NO animated logo in mobile header (text only — saves space and CPU)
- Live dot: 8px green circle, right side
- Background: white, border-bottom: 1px solid rgba(0,0,0,0.06)

### Hero Stat (the ONE thing they came to see)
```
┌─────────────────────────────────┐
│                                 │
│         3 missed calls    🔴    │  ← 40px, weight 800, red
│                                 │
│   30 total · 27 answered        │  ← 13px, brown
│                                 │
└─────────────────────────────────┘
```
- If missed_calls > 0: Big red number + "missed calls" — this is the P0 information
- If missed_calls === 0: "All caught up! ✓" in green, 28px — celebrate the win
- Summary line below: "{total} total · {answered} answered · {recovered} recovered"
- White card, rounded-2xl, shadow-sm, padding 24px, margin 16px

### Sparkline (compact trend visualization)
```
┌─────────────────────────────────┐
│ Today's calls                   │
│ ▁▂▃▅▇▅▃▂▁▂▄▅▃▂▁              │  ← 48px tall
│ 6AM            12PM        10PM │
└─────────────────────────────────┘
```
- Simple area chart or line, 48px tall, full width
- Terra color fill with 0.1 opacity, terra stroke
- Only show 3 time labels: start, middle, end
- Tappable: when tapped, expand into a bottom sheet showing the full horizontal bar chart
- If no calls today: show flat line with "No calls yet" centered

### Recent Calls (compact list)
```
┌─────────────────────────────────┐
│ Recent Calls              See all│
├─────────────────────────────────┤
│🔴 +1 (209) 666-0447            │  ← red left border = missed
│   Missed · 12 min ago          │
├─────────────────────────────────┤
│   +1 (469) 348-4979       ▶    │  ← play icon if recording
│   Completed · 2m 34s · 1h ago  │
├─────────────────────────────────┤
│   +1 (209) 834-6896       ▶    │
│   Completed · 45s · 3h ago     │
└─────────────────────────────────┘
```
- Show max 5 most recent calls
- Each row: 56px min height (comfortable tap target)
- Phone number: 15px, weight 600
- Status + duration + time: 12px, brown
- Missed calls: 3px left border in red (#EF4444)
- Play icon: only show if recording_url exists, 32px tap target
- Tap play → row expands smoothly (250ms) to show inline audio player with progress bar
- "See all" link top-right → opens full call log bottom sheet

### Full Call Log Bottom Sheet (slides up from bottom)
- Trigger: tap "See all" or tap the Calls icon in bottom nav
- Height: calc(100vh - 56px) — full screen minus bottom nav
- Top: 4px wide × 32px drag handle (centered, rounded, gray)
- Date filter pills (horizontally scrollable)
- Status filter: All | Missed | Answered | Recovered
- Full call list with pagination
- Swipe down to dismiss

### Bottom Navigation Bar
```
┌─────────────────────────────────┐
│  📊        📞        ⚙️   🔔3  │  ← 56px tall
│ Home     Calls    Settings Alerts│
└─────────────────────────────────┘
```
- Sticky bottom, white bg, top border: 1px solid rgba(0,0,0,0.06)
- 4 items evenly spaced
- Each: icon (20px) + label (10px, weight 500)
- Active state: terra color icon + label
- Inactive: brown/muted
- Bell icon: red badge with missed count (if > 0)
- ONLY visible on mobile (< 768px), hidden on tablet/desktop

### Pull to Refresh
- Implement pull-to-refresh gesture on the main content area
- When pulled: show terra-colored spinner
- Refreshes summary data, recent calls, and sparkline

---

## TASK 5: RESPONSIVE BREAKPOINTS

```
Mobile:  < 768px   → Hero stat, sparkline, 5 recent calls, bottom nav
Tablet:  768-1023  → 2-col cards, shorter chart, full call log, no bottom nav
Desktop: ≥ 1024    → 4-col cards, bar chart, full call log, no bottom nav
```

Use Tailwind responsive prefixes: default = mobile, `md:` = tablet, `lg:` = desktop.

---

## QUALITY GATES

- [ ] Logo: "fon" weight 800 + pulsing circle tight next to "n" (canvas-measured)
- [ ] No NaN or undefined displayed anywhere
- [ ] Mobile at 375px: hero stat → sparkline → 5 recent calls → bottom nav
- [ ] Desktop at 1440px: 4 cards → bar chart → call log
- [ ] All loading states show skeleton shimmer (not blank or spinner)
- [ ] All empty states have friendly messages (not "No data")
- [ ] Tap play on mobile → row expands with audio player
- [ ] "See all" opens bottom sheet with full call log
- [ ] Bottom nav shows on mobile, hidden on desktop
- [ ] Pull to refresh works on mobile
- [ ] Every tappable element ≥ 44px × 44px
- [ ] `npm run build` zero errors
- [ ] Would look good in a Product Hunt screenshot

```
git add -A && git commit -m "feat: dashboard redesign — mobile-first, design system, logo fix

- Mobile: hero stat, sparkline, compact call list, bottom nav, pull to refresh
- Desktop: 4-col cards, 200px bar chart, clean call log
- Logo: exact canvas-measured implementation, weight 800
- Fixed NaN values, default Today filter
- Loading skeletons, empty states, error handling
- Bottom sheet for full call log on mobile

Co-authored-by: Mano <mano@fono.services>" && git push origin main
```
