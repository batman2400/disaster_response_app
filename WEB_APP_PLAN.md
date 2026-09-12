# Web App + Web Dashboard Plan — Fender / NDRRMS

Status: **Phases 0–6 landed locally** in the Next.js app (`backend/`). Vercel project `backend` is linked and auto-deploys from `main` to [backend-chi-gilt-80.vercel.app](https://backend-chi-gilt-80.vercel.app) — push to publish Phase 6. This document is the deep analysis + roadmap for turning the existing Colombo Flood & Hazard Response Platform into a complete web app (public/citizen/field-crew facing) plus a fully reskinned web dashboard (officer/relief/admin), using the mockups in `ui templates/` as the design source.

Historical context: the original hackathon build plan is [PLAN.md](PLAN.md) (locked spec, Expo-first). The UI teammate handoff is [HANDOFF.md](HANDOFF.md). This document supersedes those for the *web* surface only — the Expo mobile app itself is frozen as-is (see Decisions below) and keeps using the same API contract in `shared/types.ts`.

---

## 1. Current state audit

### Backend (`backend/`, Next.js 16 + Supabase + Gemini) — already a working API + a bare-bones dashboard

- A locked 5-check AI pipeline (`lib/pipeline.ts` + `lib/checks/*`):
  1. **Image AI** (Gemini vision) — `checks/image.ts`
  2. **Weather** (plain code: `rainfall_mm > 40 || river_level_pct > 75`) — `checks/weather.ts`
  3. **Cluster** (PostGIS `ST_DWithin`, plain code) — `checks/cluster.ts`
  4. **Location AI** (Gemini geography) — `checks/location.ts`
  5. **Risk AI** (Gemini severity) — `checks/risk.ts`
  → one **Aggregator** Gemini call (`lib/aggregator.ts`) reading `ai_settings` thresholds → verdict (`status`, `urgency`, `confidence_score`, `is_road_blocked`, `reasoning`).
  - Every AI call has a deterministic fallback (`callGeminiJsonSafe`, `deterministicAggregate`) so a dead/missing Gemini key never breaks the app. `MOCK_AI=1` forces fixtures.
- Full REST API: `POST /api/report`, `/api/confirm`, `/api/override`, `/api/resolve`, `GET /api/hazards`, `/api/wards`, `/api/shelters`; auth endpoints `/api/dashboard/login|logout` (officer/relief, HMAC cookie session) and `/api/app/login` (mobile crew shared password).
- A **dashboard already exists** at `/dashboard`: `OfficerBoard.tsx` + `OfficerMap.tsx` (Leaflet + OSM tiles, ticket queue, override), `ReliefBoard.tsx` (shelter matching), `login/LoginForm.tsx`. Styled with a **dark navy theme** (`dashboard.css`, `--bg:#07111c`) that has nothing to do with the new templates.
- Supabase schema (`supabase/apply.sql`): `wards`, `hazards` (PostGIS point + `hazards_set_location` trigger), `shelters`, `ai_settings`, realtime publication on all three tables, RLS anon-read policies, storage bucket policy for `hazard-photos`.

### Mobile (`disaster-mobile/`, Expo Router 57 + RN 0.86) — frozen, not touched by this plan

- Role-picker login for Citizen / Field Crew only (Officer/Relief explicitly stay web-only, per `app/index.tsx`'s own copy).
- Citizen: `citizen/report.tsx` (photo + GPS + category + verdict card), `citizen/map.tsx` (bottom sheet, filters, area-alert banner, confirm button, safe-route overlay — already quite complete).
- Field Crew: `crew/index.tsx` (photo-gated ticket close).
- Hand-rolled light design system (`components/ui.tsx`, `lib/theme.ts` — blue `#2563EB`, no Tailwind, `@expo/vector-icons` only).

### Gaps vs. "complete web app + web dashboard"

- No web equivalent of citizen report / public map / field crew exists as a first-class site.
- Dashboard visual design doesn't match the new templates at all (dark vs. light).
- No admin/dev tooling for pipeline tracing or weather-replay control — two templates are net-new features, not reskins.
- Field Crew, Officer, and Relief use three inconsistent auth mechanisms.

---

## 2. UI template audit (`ui templates/`)

All 8 files are static Tailwind (CDN) + FontAwesome + **Plus Jakarta Sans** mockups. Seven are phone-frame mockups (`max-width:400px` "app shell"); `officer_triage_dashboard.html` is the one genuine desktop layout.

| Template | Maps to | Status |
|---|---|---|
| `role_picker_app_shell.html` | Landing / role selection (Citizen, Council Officer, Field Crew, Relief Desk) | Reskin of `disaster-mobile/app/index.tsx`, ported to web with all 4 roles |
| `citizen_report_screen (1).html` (canonical) — `citizen_report_screen.html` is an earlier, simpler draft of the same screen | Citizen hazard report + full-screen animated "AI Triage Pipeline" modal | Reskin + new "watch the pipeline run live" UX |
| `interactive_public_map.html` | Public map: Leaflet, custom pulsing markers, bottom sheet detail, crowdsource confirm, area-alert banner | Reskin of `citizen/map.tsx` behavior |
| `field_crew_resolution_screen.html` | Field crew "close ticket" flow with simulated AI scan on after-fix photo | Reskin of `crew/index.tsx` |
| `officer_triage_dashboard.html` | Desktop officer console: ticket queue + detail pane + 5-check breakdown + override/tuning panel | Full reskin+rebuild of `OfficerBoard.tsx`, richer detail pane |
| `weather_replay_monitor.html` | Simulation control panel: start/reset rainy-day replay, live gauges, event stream | **Net-new admin screen** |
| `ai_pipeline_debug_audit_screen.html` | Pipeline trace viewer: visual trace, raw JSON, "event bus" tab | **Net-new admin screen**, needs new instrumentation |

### Design system extracted from the templates

Note: the two `citizen_report_screen*.html` files are two iterations of the same screen, not two different screens — `(1).html` is the later, more polished version (glassmorphism header, richer animations, gradient CTA) and is the one to build from. The plain `citizen_report_screen.html` is an earlier draft, kept for reference only.

- **Font**: Plus Jakarta Sans (400/500/600/700/800); monospace (Fira Code / ui-monospace) for IDs & JSON.
- **Brand**: the mockups aren't fully consistent — `role_picker_app_shell.html`, `officer_triage_dashboard.html`, and the earlier `citizen_report_screen.html` draft use cobalt `#1d4ed8`, while the more polished/later screens (`citizen_report_screen (1).html`, `interactive_public_map.html`, `field_crew_resolution_screen.html`, `weather_replay_monitor.html`) use royal blue `#2563eb` + indigo `#4f46e5`. **Standardize on `#2563eb` + `#4f46e5`** as the single primary brand token in the real build (majority usage, more polished screens), light tint `#eff6ff`.
- **Status semantics**: emerald `#10b981` / `#ecfdf5` (good/resolved), crimson `#e11d48` / `#ffe4e6` (critical), amber `#f59e0b` / `#fef3c7` / `#fffbeb` (watch/need-info); dark-panel variant (`#0f172a` / `#1e293b`) for the debug screen only.
- **Surfaces**: `slate-50` app background, white cards, `rounded-2xl` / `rounded-3xl`, soft shadows (`shadow-soft`), thin `slate-200` borders — light theme everywhere except the debug tool.
- **Icons/fonts**: FontAwesome 6 free set + Google Fonts CDN in the mockups → **replaced with `lucide-react` + self-hosted `next/font`** in the real build (see Decisions).
- **Map**: Leaflet + CartoDB Positron (light tiles) for the public map — direct carry-over from the existing `OfficerMap.tsx` Leaflet usage.
- **Interaction language**: pill filter chips, sliding bottom sheets, animated step-by-step "pipeline running" checklists, badges everywhere for status.

---

## 3. Architecture decision

**One Next.js app** (evolve `backend/`), serving both the public web app and the staff dashboard, reusing the existing pipeline/API wherever possible. The Expo mobile app stays alive as a separate native client on the same API contract, but is not touched by this plan.

```
backend/
  app/
    (public)/
      page.tsx                → role picker (role_picker_app_shell)
      report/page.tsx         → citizen report + live pipeline modal
      map/page.tsx            → public interactive map
    crew/
      login/page.tsx          → shared-password login (web)
      page.tsx                → resolution queue (field_crew_resolution_screen)
    dashboard/
      officer/…               → reskinned OfficerBoard (officer_triage_dashboard)
      relief/…                → reskinned ReliefBoard
      admin/
        weather/page.tsx      → weather_replay_monitor
        pipeline/[id]/page.tsx→ ai_pipeline_debug_audit_screen
    api/                       → mostly unchanged, + additions (Section 4)
  components/
    ui/                        → shared design-system primitives (Button, Badge, Chip, Card, BottomSheet, Modal, Tabs, StatCard, PipelineStepper)
  lib/
    theme.ts / tailwind.config → design tokens ported from the templates
```

One app instead of two deployments: they share the same data, the same auth patterns, and the same design system; Next.js route groups (`(public)` vs `/dashboard`) already separate concerns cleanly without doubling infra.

---

## 4. Concrete gaps to build (not just reskin)

1. **Tailwind + Plus Jakarta Sans + lucide-react actually installed in `backend/`** — today it's plain CSS. Tailwind v4 + `next/font` (self-hosted) + `lucide-react` swapped in for FontAwesome (no CDN/license dependency, same visual weight).
2. **Unified auth model** across Citizen (none), Field Crew (shared password), Officer, Relief (shared password + role). Extend the existing HMAC cookie session (`dashboard-auth.ts`) with a 4th role `crew`, giving Field Crew a real web login page instead of only a client-stored session.
3. **Pipeline tracing** for the debug/audit screen. `runChecks()` currently runs 5 checks in parallel and returns only final booleans/values. Extend to capture per check: name, pass/fail, confidence/detail, latency ms, source (`gemini`/`mock`/`fallback`). Store as a `trace` JSONB column on `hazards` (simplest option — no new table) and optionally return it in `/api/report`'s response.
4. **Weather replay control as a real feature, not a script.** `scripts/replay-rainy-day.mjs` runs from a terminal today. Add `POST /api/dashboard/admin/replay/start|reset` that ticks the `wards` table server-side over time, so the live gauges/event stream in the template are driven by real DB writes visible everywhere via Supabase Realtime.
5. **Officer "Dispatch Crew" / "Suggest Detour" buttons** — scoped **log-only for v1** (writes an officer note via the existing `officer_note` field), no real crew-assignment feature. Revisit only if real dispatch is requested later.
6. **"Event Bus" tab** in the debug screen references RabbitMQ/pub-sub that doesn't exist in this codebase. Simulate it by deriving synthetic "topic" log lines from the same trace data captured in (3) — no real message broker.
7. **Web versions of citizen/map/crew** built against the existing API contract (`shared/types.ts`). Camera/GPS become `<input type="file" capture="environment">` / `navigator.geolocation` instead of Expo APIs. Realtime hookup reuses the pattern in `lib/use-live.ts` (already framework-agnostic Supabase Realtime + polling fallback).

---

## 5. Phased roadmap

### Phase 0 — Design system foundation
Install Tailwind + Plus Jakarta Sans (`next/font`) + `lucide-react` in `backend/`; port the template's tokens (colors, radii, shadows) into `tailwind.config`; build the shared component kit (Button, Badge/StatusBadge/UrgencyBadge, Card, Chip, Tabs, BottomSheet, Modal, StatCard, PipelineStepper) so every subsequent page pulls from one library.

### Phase 1 — Public web app
`/` role picker, `/report` citizen flow + animated pipeline modal, `/map` public interactive map — wired to existing `/api/report`, `/api/confirm`, `/api/hazards`, `/api/wards`.

### Phase 2 — Field Crew web
Extend `dashboard-auth.ts` with a `crew` role/cookie; `/crew/login` + `/crew` resolution queue wired to `/api/resolve`.

### Phase 3 — Officer + Relief dashboard reskin
Rebuild `OfficerBoard` / `OfficerMap` / `ReliefBoard` in the new light design system per `officer_triage_dashboard.html` (ticket list + map + rich detail pane + override panel). Dispatch/Detour buttons are log-only officer notes (per Decisions).

### Phase 4 — Pipeline tracing
Done. `runChecks`/`aggregate` capture per-check timing + source; `hazards.trace` JSONB stores the run; `/dashboard/admin/pipeline` and `/dashboard/admin/pipeline/[id]` show Trace + Raw JSON (real) and Event Bus (derived from the same trace).

### Phase 5 — Weather replay control
Done. `POST /api/dashboard/admin/replay/start|reset` ticks `wards` telemetry server-side; `/dashboard/admin/weather` shows live gauges and the event stream via Supabase Realtime.

### Phase 6 — Polish & QA
Done. Citizen / report / map / crew pages have `lg` desktop layouts (wide card shell, two-column forms, full-bleed map with a side panel). Auth is enforced in `proxy.ts` plus server layouts (`requireDashboardRole`); signed-in users bounce off login to their desk; wrong-role visits go to that role's home. Vercel project `backend` (hobby) is linked to `batman2400/disaster_response_app` and last production deploy is READY at `backend-chi-gilt-80.vercel.app`. `/api/override` and `/api/resolve` stay cookie-open so the frozen Expo client keeps working.

---

## 6. Decisions locked in with the user (2026-09-12)

| Decision | Choice |
|---|---|
| Mobile app fate | **Web app is now primary.** Expo mobile app stays frozen as-is, not reskinned in parallel. |
| Icon/font strategy | Swap FontAwesome → **`lucide-react`**; self-host **Plus Jakarta Sans** via `next/font`. No CDN dependencies. |
| Officer "Dispatch Crew" / "Suggest Detour" | **Log-only for v1** — writes an officer note, no real crew-assignment feature yet. |
| Implementation start | Started 2026-09-12. Phases 0–6 landed in `backend/`. |

---

## 7. Open items to revisit later (not blocking)

- Whether "Dispatch Crew" should become a real feature (assign hazard → specific field crew, appears in their queue) once v1 ships.
- Whether the Expo mobile app should eventually be reskinned to match the new web design system, or fully deprecated in favor of the responsive web app.
- Whether pipeline trace data should also be exposed to citizens (transparency) or stay officer/admin-only.
