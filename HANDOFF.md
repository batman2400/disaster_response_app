# UI handoff — Colombo Flood Response

You own the Expo app. Do **not** create a new Expo project. One already exists:

```
disaster-mobile/     Expo SDK 57 + expo-router
```

Repo: https://github.com/batman2400/disaster_response_app

---

## 0. What is already built for you

| File | What it is |
|---|---|
| `app/index.tsx` | Role picker (Citizen / Officer / Crew / Relief) |
| `app/citizen/report.tsx` | Report form: category, ward, GPS, photo, submit |
| `app/citizen/map.tsx` | Pin list + area-alert banner (MapView on device) |
| `app/officer/index.tsx` | Ticket queue + Confirm / Need info |
| `app/crew/index.tsx` | Close ticket with after-fix photo |
| `app/relief/index.tsx` | Help requests matched to shelters by ward |
| `lib/types.ts` | Frozen enums and API types — import these |
| `lib/api.ts` | `postReport`, `postOverride`, `postResolve`, `fetchHazards`… |
| `lib/mock-data.ts` | Fallback rows if the API URL is empty |

Your job is to make these screens look like a real ops app and wire reads to live Supabase. Do not invent new endpoints or new status strings.

---

## 1. First run

```bash
git pull
cd disaster-mobile
npm install
cp .env.example .env
```

Ask Mohan for two values and put them in `.env`:

```
EXPO_PUBLIC_API_URL=http://<his-lan-ip>:3000
EXPO_PUBLIC_SUPABASE_URL=https://zglnfhgwviuakqpkssex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<he will send this>
```

A phone cannot hit `localhost`. If you only have a computer, `http://localhost:3000` is fine for Expo web / emulator.

```bash
npx expo start
```

Scan the QR with Expo Go, or press `w` for web. Web is OK for layout. Camera, GPS, and Google Maps need a phone.

Android Expo Go maps will be **blank** (expired key in Expo Go). Build the list + badges first. Native map tiles come later with an EAS build.

---

## 2. What you build (in this order)

### Spine — do these first

1. **Citizen Report** (`app/citizen/report.tsx`)
   - Photo (camera) + GPS + category + description
   - `POST /api/report` with `photo_base64` as `data:image/jpeg;base64,...`
   - Render the verdict: `status`, `urgency`, `confidence_score`, `checks`, `reasoning`

2. **Public map** (`app/citizen/map.tsx`)
   - Subscribe to Supabase `hazards` (realtime `postgres_changes`)
   - Colour pins with `PIN_COLORS`
   - Show an area-alert banner when a ward `status === 'CRITICAL'` or a hazard `status === 'AREA_ALERT'`

3. **Officer desk** (`app/officer/index.tsx`)
   - Queue of open tickets with status badges
   - Confirm → `POST /api/override` `{ incident_id, new_status: "PUBLISHED", officer_note }`
   - Need info → `new_status: "NEED_INFO"`

4. **Field crew** (`app/crew/index.tsx`)
   - Tickets that are not `RESOLVED`
   - Close requires a new photo → `POST /api/resolve` `{ incident_id, closure_photo_base64 }`
   - After close, the map pin must flip (realtime)

### Then, if time

5. **Relief desk** (`app/relief/index.tsx`)
   - `HELP_REQUEST` rows + shelters in the same ward
   - Sort by free beds (`total_beds - occupied_beds`)
   - Filter / sort only — no routing algorithm

---

## 3. How data works

**Writes** go through the Next.js API (Mohan runs this):

```
POST {EXPO_PUBLIC_API_URL}/api/report
POST {EXPO_PUBLIC_API_URL}/api/override
POST {EXPO_PUBLIC_API_URL}/api/resolve
```

**Reads** go straight to Supabase with the anon key (you add `@supabase/supabase-js`):

```
hazards   → map pins, officer queue, crew tickets
wards     → rainfall / river / CRITICAL banner
shelters  → relief matching
```

Until you add supabase-js, `lib/api.ts` can keep using `GET /api/hazards` etc. Swap reads to Supabase when you can. Do not use the service role key. Ever.

Live seed already in the DB:

- `ward_01` Nagalagam — CRITICAL, 68 mm rain, 88% river
- two clustered floods near 6.9535, 79.8732
- one fallen tree (`COUNCIL_TICKET`) in ward_02
- one help request (`NEED_INFO`) in ward_03
- five shelters with bed counts

---

## 4. Frozen contract — do not invent values

**Category:** `FLOOD` · `BLOCKED_ROAD` · `FALLEN_TREE` · `HELP_REQUEST`

**Status:** `PENDING` · `PUBLISHED` · `NEED_INFO` · `AREA_ALERT` · `COUNCIL_TICKET` · `RESOLVED`

**Urgency:** `LOW` · `MEDIUM` · `CRITICAL`

**Wards:** `ward_01` · `ward_02` · `ward_03`

Pin colours and Colombo centre are in `lib/types.ts` (`PIN_COLORS`, `COLOMBO_CENTER`).

Example report body and locked response: `shared/examples.ts`.

---

## 5. You do not touch

- `backend/` — Next.js API, Gemini, pipeline
- `supabase/` — schema
- Service role key, Gemini key
- Detour routing / nearest-shelter algorithm (stretch, only after the spine works)

If a write fails, it is a backend problem — send Mohan the request JSON and the error body.

---

## 6. Suggested first hour

1. Pull, `npm install`, `.env`, `npx expo start`
2. Open every role from the picker so you know the skeleton
3. Restyle the role picker + report screen
4. Add `supabase-js` and load `hazards` / `wards` on the map
5. Then polish officer / crew / relief
