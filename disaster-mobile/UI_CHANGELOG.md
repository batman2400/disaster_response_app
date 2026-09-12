# UI Redesign Changelog — Light Mode + Layout Fixes

**Date:** 12 September 2026  
**Scope:** `disaster-mobile/` (Expo app only — no backend or schema changes)

---

## Overview

Full visual overhaul of the Fender Field App from a dark navy theme to a clean, professional light mode. Also fixed 8 layout and navigation issues that caused cropped content, cluttered screens, and inconsistent navigation.

**Zero logic changes** — all API calls, realtime subscriptions, auth flow, and frozen contract enums remain identical.

---

## Files Changed (12)

### Theme & Types

| File | Change |
|---|---|
| `lib/theme.ts` | Complete color palette swap — dark backgrounds → white/off-white, dark text, blue primary accent |
| `lib/types.ts` | `PIN_COLORS` adjusted for contrast on light map tiles (darker PENDING, deeper NEED_INFO) |

### Component Library

| File | Change |
|---|---|
| `components/ui.tsx` | SafeAreaView wrapper on Screen, white cards with subtle shadows, lighter badge tints, blue default button, Ionicons on CheckRow, new SectionHeader component, stat minWidth |
| `components/sign-out.tsx` | Restyled from plain text → outlined pill button with log-out icon |
| `components/HazardMap.web.tsx` | CartoDB dark_all → light_all (Positron) tiles, white marker stroke |
| `components/HazardMap.tsx` | CartoDB dark_all → light_all tiles for native |

### Layouts

| File | Change |
|---|---|
| `app/_layout.tsx` | StatusBar `"light"` → `"dark"`, light header backgrounds |
| `app/citizen/_layout.tsx` | Added tab bar icons (Ionicons), moved Log out to headerRight, blue active tint, styled tab bar |

### Screens

| File | Change |
|---|---|
| `app/index.tsx` | Safe area insets for top padding, blue accents, subtle card shadow, light inputs |
| `app/citizen/report.tsx` | Grouped form into 3 sections (What & Where, Details, Evidence), ward names over raw IDs, better chip sizing, rowGap on badge rows, bottom padding for verdict |
| `app/citizen/map.tsx` | Rounded bottom sheet with drag handle (45% height), safe area padding for tab bar, floating alert banner, shadowed ward/confirm chips, overlay safe area |
| `app/crew/index.tsx` | flexWrap on stat row, merged two meta lines into one, white cards, green close button with white text |

---

## New Dependency

| Package | Version | Why |
|---|---|---|
| `@expo/vector-icons` | latest | Ionicons for tab bar icons, sign-out button, and check row indicators |

---

## Layout & Navigation Fixes

1. **Map bottom sheet cropped content** → Increased to 45%, added rounded corners + drag handle, added paddingBottom via safe area insets so content isn't hidden behind the tab bar

2. **Report screen was one cluttered scroll** → Split into 3 clearly labeled sections with `SectionHeader` ("What & Where", "Details", "Evidence") and 24px spacing between groups

3. **No tab bar icons** → Added Ionicons: `document-text-outline` for Report, `map-outline` for Map

4. **Inconsistent header navigation** → Log out was `headerLeft` on citizen, `headerRight` on crew. Now consistently `headerRight` everywhere

5. **Stat cards cramped on narrow phones** → Added `flexWrap: "wrap"` and `minWidth: 100` on each stat

6. **Badge rows overlapped text when wrapping** → Added explicit `rowGap: 6` on all badge row containers

7. **No SafeAreaView** → Wrapped `Screen` component with `SafeAreaView` from `react-native-safe-area-context`; login and map screens use `useSafeAreaInsets` for top/bottom padding

8. **Sign-out too subtle** → Restyled from plain "Log out" text into a bordered pill with an `Ionicons` log-out icon

---

## Color Palette

| Token | Before (dark) | After (light) |
|---|---|---|
| `bg` | `#07111C` | `#F8F9FB` |
| `bg2` | `#0B1624` | `#F1F3F6` |
| `card` | `#122033` | `#FFFFFF` |
| `cardSoft` | `#173049` | `#EEF2F7` |
| `line` | `#24344A` | `#E2E6EC` |
| `text` | `#F4F7FB` | `#1A2332` |
| `muted` | `#9AA8B8` | `#6B7A8D` |
| `amber` | `#F5A524` | `#D97706` |
| `red` | `#E23B3B` | `#DC2626` |
| `green` | `#2F9E6A` | `#16A34A` |
| `blue` | `#3B82F6` | `#2563EB` |
| `purple` | `#7C3AED` | `#7C3AED` |
| `ink` | `#07111C` | `#FFFFFF` |

---

## What Was NOT Changed

- **Backend** (`backend/`) — untouched
- **Supabase schema** (`supabase/`) — untouched
- **API contracts** — all endpoints, request/response shapes identical
- **Frozen enums** — Category, Status, Urgency, Ward IDs unchanged
- **Business logic** — report submission, GPS, camera, realtime subscriptions, auth all identical
- **Navigation routes** — same file-based routing structure

---

## Verification

- ✅ `npx expo export --platform web` — clean build, 0 errors
- Run `npx expo start` then press `w` to preview in browser
