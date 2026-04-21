
A running log of all changes made to the CareLink project.

---

## 1. Project Setup & Environment Fixes


### Permission Fix
- Both `backend/node_modules/.bin` and `CareLink/node_modules/.bin` lacked execute permissions after `npm install`.
- Fixed with `chmod -R u+x node_modules/.bin` in both directories.

---

## 2. "Recommended for You" Section — `FindCaregiver.tsx`

A new collapsible **Recommended for You** panel was added above the search/filter card on the Find Caregiver page. It surfaces the most relevant caregivers for the logged-in family user based on a scoring algorithm.

### New State Variables
| Variable | Purpose |
|---|---|
| `familyLocation` | Location string of the logged-in family user |
| `familyCoords` | GPS coordinates `{ lat, lng }` of the family user |
| `recommendedCaregivers` | Top-6 scored caregivers |
| `recommendedExpanded` | Controls whether the section is collapsed or expanded |

### Algorithm: Scoring Each Caregiver

Each caregiver receives a **combined score** (0–1):

```
totalScore = (servicesScore × 0.65) + (locationScore × 0.35)
```

**Services Score (65% weight)**
Measures the overlap between the family's `neededServices` and the caregiver's `providedServices`:
```
servicesScore = matchingServices.length / familyNeededServices.length
```

**Location Score (35% weight)**
- **Primary method**: Haversine distance formula using stored `latitude`/`longitude`.
  - Score = 1.0 at 0 km, linearly decays to 0.0 at 50 km.
  - Caregivers beyond 50 km score 0 for location but are not excluded unless their combined score is also 0.
- **Fallback**: Word-overlap on location strings when either party lacks stored GPS coordinates.

**Haversine helper** (`haversineKm`) was added directly inside `FindCaregiver.tsx` to compute great-circle distances from stored `latitude`/`longitude` values.

### UI
- Collapsible header with a `Sparkles` icon; toggles with `ChevronUp` / `ChevronDown`.
- Compact caregiver cards showing: name, match score badge, location, and matched services tags.
- Displays up to 6 recommendations sorted by descending score.
- Hidden automatically when fewer than 1 result is available.

### Why Frontend-Only
The backend `matchingEngine.js` had an incomplete `calculateLocationScore` function (referenced but never defined) and expected separate `city`/`state` fields that family users don't consistently provide. Rather than risk broken results from the backend, the recommendation logic was implemented entirely on the frontend using data already fetched by the existing `GET /api/users/caregivers` call — no extra network requests.

---

## 3. TypeScript Bug Fix — `FindCaregiver.tsx`

A TypeScript error on the certifications render loop was corrected.

**Before:**
```tsx
<span>{typeof cert === 'string' ? cert : cert.name || cert}</span>
```
**After:**
```tsx
<span>{cert}</span>
```
`certifications` is typed as `string[]`, so the object-branch was unreachable and caused a `ts(2339)` error.

---

## 4. "Find by Location" Tab — Proximity Search Overhaul

Three files were updated to make proximity search dramatically faster and eliminate unnecessary external API calls.

### Problem (before)
`locationService.findNearbyCaregiversByProximity` was calling the **Nominatim geocoding API for every caregiver** on every search. Nominatim enforces a 1 request/second rate limit, making a search across 20 caregivers take 20+ seconds minimum. The search origin was also geocoded on every request even when the user had just clicked a map point whose coordinates were already known.

Additionally, the radius slider was capped at **10 km**, too narrow for most real-world use.

### Fix 1 — `backend/utils/locationService.js`
- `findNearbyCaregiversByProximity` now accepts an optional `preResolvedCoords` parameter `{ latitude, longitude }`.
- For each caregiver, stored `latitude`/`longitude` fields are used directly — **zero Nominatim calls** for caregivers with stored coordinates.
- Nominatim geocoding is retained as a **fallback only** for legacy caregivers who joined before coordinates were captured.

### Fix 2 — `backend/controllers/userController.js`
- The `GET /api/users/caregivers/nearby/:location` endpoint now accepts optional `lat` and `lng` query parameters.
- When supplied, they are passed as `preResolvedCoords` to the location service, skipping the geocode of the search origin as well.

### Fix 3 — `CareLink/src/lib/api.ts`
- `findNearbyCaregiversByProximity` now accepts an optional `coords: { lat, lng }` argument.
- When provided, `lat` and `lng` are appended to the query string.

### Fix 4 — `CareLink/src/components/ProximityBasedSearch.tsx`
- When the user clicks the map to set their location, the resulting `coordinates` state is forwarded directly to the API call — bypassing all geocoding on both ends.
- Default `maxRadius` raised from **10 km → 50 km**.

### Net Effect
| Scenario | Before | After |
|---|---|---|
| User types a location (no map click) | 1 Nominatim call (origin) + N calls (caregivers) | 1 Nominatim call (origin) + 0 calls (caregivers with stored coords) |
| User clicks map | 1 Nominatim call (origin) + N calls (caregivers) | 0 Nominatim calls total |
| Search latency (20 caregivers) | ~20+ seconds | Near-instant |

---

## 5. Rate Limit & Polling Fixes

### Problem
The backend's global rate limiter was set to **200 requests per 15 minutes**. This was being hit during normal development use because:
- React Strict Mode double-mounts components, firing API calls twice on every page load.
- Multiple calls are made on mount (caregivers, profile, notifications, etc.).
- The notifications hook was polling the backend **every 30 seconds** for every logged-in user.

This caused `429 Too Many Requests` errors on `GET /api/users/caregivers` and `GET /api/notifications`, breaking the Find Caregiver page and the notification bell entirely.

### Fix 1 — `backend/server.js`
- Rate limit is now environment-aware:
  - **Development** (`NODE_ENV=development`): **2,000 requests / 15 min** — generous enough to absorb hot-reloads, strict mode double-renders, and polling without false positives.
  - **Production**: **300 requests / 15 min** — slightly raised from 200 to give real users more headroom.
- Added `standardHeaders: true` so clients receive proper `RateLimit-*` headers and can back off intelligently.

### Fix 2 — `CareLink/src/hooks/use-notifications.ts`
- Polling interval extended from **30 seconds → 60 seconds**.
- Rationale: Socket.IO already delivers real-time notification events via WebSocket; the poll is a fallback safety net only. Halving the poll frequency cuts the steady-state request rate in half for every active session.
