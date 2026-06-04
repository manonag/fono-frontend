# Onboarding + Settings v3.3 — Implementation Scope Memo

**Author:** Claude Code · **Date:** 2026-06-03 · **Status:** SCOPE-FIRST, awaiting Mano sign-off
**Design source:** CD handoff bundle `nGN6BHzXYhvOKcZ6zigOYA` → unpacked to `_design_refs/v33_archive/`
**No frontend code written. No PRs opened.** This memo proposes the slicing; build follows approval.

---

## 0. What v3.3 actually is (the effort-changing question)

Per the May-14 standing rule, the expectation was "CD ships React/Tailwind components matching Fono's stack." **v3.3 does NOT deliver that.** What CD shipped:

- **A design-canvas prototype**, not production components. The primary file (`Onboarding + Settings v3.3.html`) loads React 18 + Babel-standalone from unpkg and renders **artboards** (`<DesignCanvas><DCArtboard>`) — a zoomable design board, not mountable app screens.
- Components are **inline-styled JSX** (`style={{...}}` objects, hardcoded hex), **not Tailwind**, with `window.*` globals instead of ES modules. They use a `VS_TOKENS` object, not our `tokens`/`tailwind.config`.
- **An excellent 29 KB engineering handoff** (`_design_refs/v3.3-engineering-handoff.md`) carrying every number, prop contract, token, and edge case. This is the real deliverable to build against.

**Implication:** every screen is a **port** (read the spec → rebuild in our Next/Tailwind/TS stack), not an integration. The handoff even says so ("recreate them pixel-perfectly… don't copy the prototype's internal structure") and gives explicit rename instructions (`VS_TOKENS`→`tokens`, `DisabledSection`→`LockedPreview`, `CallsTabV31`→`CallsSettings`).

**Tab structure lands on 3 tabs** (confirmed): **Restaurant · Calls · Account**. The current app has **6** (Restaurant, Call Setup, Notifications, Forwarding, Greeting, Plan).

---

## 1. What v3.3 covers (screen/state manifest)

The v3.3 lock pass focused on **Settings → Calls** and two formalization boards. It did **not** redraw the full signup wizard.

| Surface | States drawn in v3.3 | Component(s) |
|---|---|---|
| Settings → Calls **State A** (no path picked) | cold start, full locked-preview set | `CallsTabFirstVisit` → hero (PathCards + ComparisonChart) + 4 `DisabledSection` |
| Settings → Calls **State B** (path picked, forwarding unverified) | Live + Voicemail variants | `CallsTabPathUnverified` → FINISH SETUP hero (ForwardingCodeCard) + locked sections |
| Settings → Calls **State C** (fully configured) | Live (01–05) + Voicemail (01–04) | `CallsTabV31` → Connect, How Fono Answers, Call routing*, Categories, Notifications |
| Dashboard banner | no-path variant | `SetupBanner` + `DashboardMockup` (mockup is reference art only) |
| Categories 5-chip state | Palette A auto-assign | `Added5thCategoryCard` |
| Decision boards | Palette A (7 colors), numbering rule, decision log | `PaletteABoard`, `NumberingRuleBoard`, `DecisionLogBoard` (not shipped to runtime) |
| **Signup wizard (Steps 1–6)** | **OLD v3 only** — see warning below | `signup.jsx` |

> ⚠️ **The signup wizard in the bundle is stale.** `signup.jsx` still shows "Fono **Always**", "PATH A / PATH B" badges, the killed **Cuisine** field, hardcoded `**61*` conditional forwarding, and "4 rings" copy — every one of these was **explicitly killed by the v3.1 brief** (SD-v3-10, anti-misread locks, hard limits). CD's v3.3 pass never redrew the wizard to match the new Fono Live/Voicemail + comparison-chart + Step 5A/5B spec. So the **new signup must be built from the v3.1 brief prose**, not from a v3.3 artboard. This is the single biggest design-completeness risk (see Open Question 4).

State coverage CD documented (empty / loading / saved / error / migration): the handoff covers **locked/empty** (LockedPreview), **listening/verified/failed** (ForwardingCodeCard state machine §2.3), **migration banner** (SetupBanner), and the Restaurant **sync** states (never/recently/syncing/failed in `signup.jsx` SyncStatusBanner). Mobile is "graceful-degradation, recommendations not artboards."

---

## 2. Inventory — current frontend (what exists today)

Verified against the live tree. **Several v3.3 primitives already shipped** (T-271, T-252, T-253):

| Area | File | Today | Mocked / Real |
|---|---|---|---|
| Settings shell | `src/app/settings/page.tsx` (~1885 ln) | **6 tabs**: Restaurant, Call Setup, Notifications, Forwarding, Greeting, Plan | mixed |
| Calls 3-state dispatcher | same, `CallsSettings` §485+ | State A `CallsStateANoPath`, State B `ForwardingTab`, State C `CallSetupTab` | real PATCH/GET |
| Path picker | `CallsStateANoPath` §510 | PathCards + 4 locked previews, `PATCH {call_setup_path}` | real |
| **SetupBanner** | `src/components/setup-banner.tsx` | ✅ shipped (T-252), 3 variants, mounted in `layout.tsx` | real (`use-tenant-setup-state`) |
| **LockedPreview** | `src/components/locked-preview.tsx` | ✅ shipped (T-253) | n/a |
| **PathCard** | `src/components/path-card.tsx` | ✅ shipped (T-253), Recommended badge | n/a |
| Section numbering | `src/lib/section-numbering.ts` | ✅ shipped (T-253), per-path order | tested |
| Sidebar attention dot | `src/components/sidebar.tsx` | ✅ shipped (T-252) | real |
| Forwarding (State B) | `ForwardingTab` §1183 | old design; carrier codes hardcoded `getForwardingCode` §443; polls `forwarding-status` 5s | real poll |
| Restaurant tab | `RestaurantTab` §112 | SLA + order URL editable; hours hidden; recording/owner/danger = local mock | partial |
| Notifications tab | `NotificationsTab` §1085 | WhatsApp + email + long-call — **all mock, no persistence** | mock |
| Greeting tab | `GreetingTab` §1517 | TTS preview/save — **real backend** | real |
| Plan tab | `PlanTab` §1360 | plans/usage/invoices | all mock |
| Signup | `src/app/signup/page.tsx` | redirect to fono.services | n/a |
| Signup OAuth callback | `src/app/signup-complete/page.tsx` | `POST /api/v1/tenants` | real |
| Intent categories type | `src/components/kiosk/voicemail/types.ts` | `IntentKey = 'order'|'catering'|'banquet_hall'|'others'` — **4-key closed union** | n/a |
| **Not yet built** | — | `ComparisonChart`, `ForwardingCodeCard`, `FromThisPhoneCallout`, `DialThisCard`, `CarrierDetectedLine`, `HowFonoAnswersCard`, `CategoriesChipCard`, `CallRoutingCard`, `NotificationsMiniCard`, Account tab, new signup wizard | — |

---

## 3. Inventory — current backend (fono-backend on disk, `main`)

Verified against `app/models/tenant.py`, `app/routers/tenants.py`, `app/routers/forwarding.py`, `app/services/tenant_views.py`.

**Endpoints that exist today:**

| Endpoint | Returns / accepts | Maps to design need |
|---|---|---|
| `POST /api/v1/tenants` | create | signup-complete |
| `GET /api/v1/tenants/{id}/settings` | name, phone, callback_number, owner_whatsapp/email, sla_minutes, online_order_url, **call_setup_path**, voicemail_enabled, **voicemail_categories** (JSONB, may be null), carrier_name, line_type, greeting_*, **call_forwarding_verified**, is_demo | drives banner, State A/B/C gating |
| `PATCH /api/v1/tenants/{id}` | sla_minutes, online_order_url, **call_setup_path** (live requires callback_number ≠ restaurant phone), callback_number | path pick, Live staff-phone |
| `GET /api/v1/tenants/{id}/carrier-lookup` | carrier_name, line_type (Twilio Lookup) | carrier auto-detect |
| `GET /api/v1/tenants/{id}/forwarding-status` | verified, verified_at, **fono_number** (single shared `+12094376888`) | State B polling |
| `POST .../greeting/preview` · `POST .../greeting/save` | TTS | (greeting tab — not in 3-tab IA) |

**Tenant columns that exist:** `callback_number` (this is the Live "staff phone"), `call_forwarding_verified`, `forwarding_verified_at`, `sla_minutes`, `online_order_url`, `call_setup_path` ('live'|'voicemail'|null), `carrier_name`, `line_type`, `greeting_*`, `voicemail_enabled`, `voicemail_categories` (JSONB, comment says default is **six-key** taxonomy), `is_demo`.

**What the design needs that the backend does NOT have today:**

| Missing | Needed by | Backend ticket |
|---|---|---|
| Google Places columns: `address`, `business_hours`, `google_place_id`, `google_profile_url`, `last_synced_at` + **re-sync endpoint** + autocomplete proxy + hours-aware greeting/SMS | Restaurant tab (read-only Google profile), signup Steps 2–3, "FROM THIS PHONE … synced from Google" callout | **T-248** (READY, not started) |
| `call_fallback_rules` table + CRUD + cascade preview data | Calls §3 Call routing (Live only) | **T-249** (READY, not started) |
| Categories read contract (`GET /tenants/{id}` returning categories w/ `swatch`/`tint`) **+** write CRUD (slugify on add, recycle-to-end rotation); widen `IntentKey` from closed 4-key union | Calls §4 Categories (editable chips) | read = **T-304 slice (c)**; widen union = **T-239**; write CRUD = not yet filed |
| **Per-tenant `fono_number`** provisioning | accurate "Your Fono number" in Connect; design prop `tenant.fono_number` | none filed — today one shared Twilio number for all tenants |
| Notifications persistence (WhatsApp alert on/off + number) | Calls §5 Notifications | none filed (column `owner_whatsapp` exists, no toggle/PATCH) |
| Account: delete-account endpoint + monthly usage counts | Account tab actions + Founding-member usage line | none filed |
| "I dialed the code" → begin-listening signal | State B / wizard Step 5 (today: client polls `forwarding-status`; webhook flips `verified`) | maps to existing poll; no new endpoint strictly required |

---

## 4. Cross-reference — design surface × current state × backend

| v3.3 surface | Exists today | Migrate / build / delete | Backend status |
|---|---|---|---|
| **SetupBanner** | ✅ (T-252) | minor copy reconcile vs handoff §1.1 | ✅ on main |
| **State A hero** (PathCards + **ComparisonChart**) | partial — picker shipped, **no ComparisonChart**, hero chrome differs | build ComparisonChart; reskin hero to v3.3 | ✅ |
| **State A locked previews** | ✅ (LockedPreview, T-253) | reconcile section set/order (M5 adds How-Fono-Answers; M4 suppresses numbers) | ✅ |
| **State B** FINISH-SETUP (**ForwardingCodeCard**, FromThisPhone, DialThis, CarrierDetected, "I dialed the code", "Change my call path", About-this-card note) | old `ForwardingTab` | **rebuild**; delete old carrier-code block | ✅ (poll + lookup); **shared fono_number for v1, copy adjusted** |
| **State C · Connect** | old `CallSetupTab` | rebuild as `CallsConnectCard` | ✅ (shared fono_number for v1) |
| **State C · How Fono Answers** | none | build `HowFonoAnswersCard` (read-only chart + path copy) | ✅ |
| **State C · Call routing** (Live) | none | build `CallRoutingCard` (cascade preview + rule list + add/edit) | ❌ **T-249** |
| **State C · Categories** | none (kiosk has 4-key hardcoded) | build `CategoriesChipCard` | ❌ categories CRUD + **T-239** |
| **State C · Notifications** | mock `NotificationsTab` | rebuild as `NotificationsMiniCard`; **delete** email/long-call mocks | ❌ persistence |
| **State C · Greeting** (DECIDED: fold under Calls) | `GreetingTab` (real TTS) | move existing TTS editor in as a Calls section | ✅ (already real) |
| **Restaurant tab** (read-only Google + Re-sync + order URL) | `RestaurantTab` (SLA + order URL) | **rebuild**; delete SLA/recording/owner/danger; keep order URL | ❌ **T-248** |
| **Account tab** (Founding member + Sign out + Delete) | none (Plan mock) | build new; **delete** Plan tab | ❌ delete + usage |
| **Signup wizard** (Steps 1–6, v3.1 spec) | redirect + OAuth callback only | **DEFERRED** (decided) — separate later initiative | (n/a now) |
| Tab IA 6→3 | 6 tabs | collapse: Notifications→Calls §5, Forwarding→Calls State B, Plan→Account; Greeting TBD | n/a |

---

## 5. Proposed PR slicing

Sliced so frontend-only work (no backend dependency) lands first and de-risks the visual system, then backend-gated work follows as its dependency merges. Day estimates assume one focused build session each.

| PR | Title | Scope (files) | Depends on | Risk | Verify |
|---|---|---|---|---|---|
| **FE-1** | v3.3 shared component library (pure presentational) | NEW: `comparison-chart.tsx`, `forwarding-code-card.tsx` (+ `forwardingCodeFor` in lib), `from-this-phone-callout.tsx`, `dial-this-card.tsx`, `carrier-detected-line.tsx`, `how-fono-answers-card.tsx`, `categories-chip-card.tsx` (display-only), `notifications-mini-card.tsx`. ~600 LOC. | none (tokens from T-271) | low — visual only | render in isolation; snapshot |
| **FE-2** | Settings IA collapse 6→3 + State A hero finish + State B rebuild | `settings/page.tsx` (delete Notifications/Forwarding/Plan tabs as standalone, wire ComparisonChart into State A, swap State B to ForwardingCodeCard). ~400 LOC net, lots deleted. | FE-1 | med — touches live Calls flow; Thecha is Live+verified (State C unaffected) | manual: all 3 Calls states; banner; existing endpoints |
| **FE-3** | State C: Connect + How Fono Answers + Categories (display) + Notifications + **Greeting (folded in)** | `settings/page.tsx` State C rebuild; move existing `GreetingTab` TTS editor in as a Calls section | FE-1; categories read = T-304(c); **categories/notifications write backend** | med | State C Live & Voicemail; numbering; greeting preview/save still works |
| **FE-4** | Call routing section (Live only) | `call-routing-card.tsx` + State C wiring + add/edit rule modal | **T-249 backend** | high — net-new CRUD + validation (anti-loop) | rule add/edit/delete/reorder; cascade preview |
| **FE-5** | Restaurant tab redesign | `restaurant-tab` rebuild (read-only Google fields, Re-sync states, order URL) | **T-248 backend** (parallel track) | med | sync states never/recently/syncing/failed |
| **FE-6** | Account tab | new Account tab (Founding member + usage + Sign out + Delete-with-confirm) | delete endpoint + usage counts | low-med | delete confirm gating |
| **FE-7** | ~~Signup wizard rebuild~~ | **DEFERRED** (decided) — separate later initiative; revisit once CD draws v3.3 wizard artboards and T-248 lands | — | — | — |

**Natural cut line for a first milestone:** FE-1 + FE-2 + FE-3 ship the entire **Calls** redesign (incl. folded-in Greeting) on existing endpoints, no backend blockers for display, and leave Thecha's State C intact. FE-3's *editable* Categories + Notifications write, FE-4 (routing), FE-5 (Restaurant), FE-6 (Account) each wait on a specific backend. **FE-7 (signup) is out of the near-term track.**

---

## 6. Backend changes v3.3 needs that are NOT on main (raise before build)

1. **T-248 Google Places** (parallel track, start now) — blocks Restaurant tab (FE-5). Adds 5 columns + re-sync + autocomplete proxy + hours engine. *(No longer blocks signup — FE-7 deferred.)*
2. **T-249 call_fallback_rules** — blocks Call routing (FE-4). New table + CRUD + cascade + anti-loop validation.
3. **Categories: read = T-304 slice (c)** (GET /tenants/{id} categories w/ swatch/tint), **+ T-239** (widen IntentKey union), **+ a not-yet-filed write CRUD**. Blocks editable Categories (FE-3 write path). **DECIDED:** backend classifier taxonomy stays **6-key default**; the v3.3 chip card edits the per-tenant `voicemail_categories` *override* (owner-facing labels), a distinct layer. ⚠️ **Reconciliation needed before FE-3 write:** the design seeds 4 chips / caps at 5, but the backend default is 6 — confirm whether the chip set is free-form or must map onto the 6 classifier keys (display-only build is unaffected).
4. ~~Per-tenant `fono_number`~~ **DECIDED:** ship v1 on the **shared** number `+12094376888`; adjust Connect/ForwardingCodeCard copy. No backend block, no new ticket. Revisit per-tenant provisioning post-v1.
5. **Notifications persistence** — blocks FE-3 Notifications write (WhatsApp toggle + number PATCH; `owner_whatsapp` column exists, no endpoint).
6. **Account delete + usage counts** — blocks FE-6.

---

## 7. Open questions needing Mano's decision

1. ~~**"PR-1 backend" identity.**~~ **RESOLVED 2026-06-03.** "PR-1" is Mano's shorthand (not a Chiran ticket) for the **kiosk voicemails backend foundation** — now filed as **T-304** — five slices: (a) `classifier_reason` persistence, (b) voicemail status/resolved/hidden + `PATCH /voicemails/{id}/status`, (c) `GET /tenants/{id}` (config incl. routing_mode + categories) + `GET /tenants/{id}/voicemails` + PATCH status/intent, (d) `kiosk_token` columns + rotation endpoint, (e) `GET /kiosk/by-token/{token}`. **PR-1 is almost entirely orthogonal to v3.3 Onboarding+Settings** — its *only* intersection is slice (c)'s `GET /tenants/{id}` categories payload, which is the read contract for FE-3's Categories chip card (pairs with T-239 union widening). **T-248 (Google Places) is NOT in PR-1** — it is a separate parallel backend track that gates FE-5 + FE-7 and should start now in parallel.
2. ~~Greeting tab fate.~~ **DECIDED: fold under Calls** as a section (keeps the working TTS editor; stays in 3-tab IA). → folded into FE-3.
4. ~~Signup wizard sequencing.~~ **DECIDED: defer entirely** — separate later initiative; FE-7 drops out of the near-term track. Revisit once CD draws v3.3 wizard artboards and T-248 lands.
5. ~~Categories 4 vs 6.~~ **DECIDED: keep 6-key backend default** — chip card edits the per-tenant override layer. See §6.3 for the one reconciliation detail to resolve before FE-3 *write*.
6. ~~fono_number shared vs per-tenant.~~ **DECIDED: ship shared, adjust copy.**

**Still open — the one remaining decision:**

3. **Rollout for Thecha (the live tenant).** Feature-flag the new Settings behind an env toggle and migrate in place, or hard-cut? Thecha is Live + verified, so she lands in **State C** — the least-changed path — but the 6→3 tab IA collapse and the Calls rebuild still touch her surface. *Recommendation:* ship without a flag for the FE-1→FE-3 Calls milestone (State C is visually closest to today and her data/routing are untouched), but smoke-test her exact tenant in staging before merge. Confirm you're comfortable with no flag, or say the word and I'll gate it behind an env toggle.

---

*Decisions locked: PR-1=T-304 (kiosk backend, orthogonal); Greeting→Calls; signup deferred; shared fono_number; 6-key backend default. One open item: Thecha rollout flag. Nothing built yet — awaiting sign-off on the slicing + the rollout call.*
