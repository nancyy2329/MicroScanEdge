# MicroScan Edge — System Architecture

**Status:** Design for review. No code has been written yet — this is the blueprint to approve first.

**Grounded against current docs (not just training memory):** Expo SDK 54 ships React Native 0.81 + React 19.1 with the New Architecture mandatory and Expo Router v6 as the standard navigation layer. Sarvam AI's Chat Completions API is `POST https://api.sarvam.ai/v1/chat/completions`; the older `sarvam-m` model is now deprecated in favor of `sarvam-30b` / `sarvam-105b`. Both facts changed real decisions below (see §5 Navigation and §3 API Endpoints).

---

## Overview

MicroScan Edge is a 3-tier system, and the most important architectural decision is this: **the contamination score is 100% deterministic, computed entirely from image statistics in the backend. Sarvam AI never touches the number — it only explains a score that already exists.** That's what makes the tool auditable and demo-safe: for any result, you can point at the exact math that produced it. This should also be stated plainly in the app's UI copy, since a heuristic CV score is a proxy for contamination risk, not a certified lab measurement (FTIR/Raman spectroscopy) — worth flagging once, clearly, here and in the app itself.

```
┌──────────────────┐   multipart/form-data    ┌────────────────────────┐
│                  │ ───────────────────────▶ │                        │
│   Mobile App     │   POST /api/v1/analysis  │   Express Backend      │
│  (Expo RN, SDK 54)│ ◀─────────────────────── │   (Node.js)            │
│                  │     JSON result           │                        │
└──────────────────┘                           └─────────┬───────┬──────┘
                                                          │       │
                                                 bolt/neo4j+s://  │ HTTPS
                                                          │       │
                                                          ▼       ▼
                                                ┌──────────────┐ ┌───────────────┐
                                                │ Neo4j AuraDB │ │   Sarvam AI    │
                                                │ (graph store)│ │ /v1/chat/completions │
                                                └──────────────┘ └───────────────┘
```

Backend responsibilities split cleanly into two independent concerns that should never be entangled in code: **feature extraction + scoring** (pure functions, no network calls, fully deterministic, unit-testable) and **explanation generation** (a single outbound call to Sarvam AI that can fail without ever affecting the score). This separation is what makes error handling, testing, and future ML upgrades tractable — see §8 and §10.

---

## 1. Folder Structure

```
MicroScanEdge/
├── mobile/
│   ├── app/                              # Expo Router v6 — file-based routes
│   │   ├── _layout.tsx                   # Root layout: providers (theme, query client, fonts)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx               # Bottom tab bar (Home, History)
│   │   │   ├── index.tsx                 # HomeScreen
│   │   │   └── history.tsx               # HistoryScreen (list)
│   │   ├── capture.tsx                   # CaptureScreen — modal presentation
│   │   ├── result/
│   │   │   └── [id].tsx                  # ResultScreen — dynamic route, fetch-by-id
│   │   └── +not-found.tsx
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts                 # Axios instance: baseURL, timeout, interceptors
│   │   │   └── analysis.ts               # createAnalysis(), getAnalysis(id), getHistory()
│   │   ├── components/
│   │   │   ├── common/                   # Screen, Header, PrimaryButton, EmptyState,
│   │   │   │                             # ErrorBanner, LoadingOverlay, ConfirmDialog
│   │   │   ├── gauge/                    # CircularGauge, RiskBadge
│   │   │   ├── camera/                   # CameraCapture, ImagePickerSheet, ImagePreview
│   │   │   └── analysis/                 # FeatureBreakdownList, FeatureRow,
│   │   │                                 # ExplanationCard, AnalysisListItem
│   │   ├── hooks/                        # useAnalysisMutation, useHistoryQuery,
│   │   │                                 # useAnalysisQuery, useCaptureFlow
│   │   ├── context/                      # ThemeProvider, QueryClientProvider setup
│   │   ├── theme/                        # colors.ts, typography.ts, spacing.ts
│   │   ├── types/                        # analysis.ts, api.ts
│   │   └── utils/                        # formatters.ts, imageUtils.ts
│   ├── assets/                           # fonts, icons, splash
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js                    # loads + validates process.env (dotenv)
│   │   │   ├── neo4jDriver.js            # neo4j-driver singleton
│   │   │   └── multer.js                 # storage engine, file filter, size limits
│   │   ├── routes/
│   │   │   ├── analysis.routes.js
│   │   │   ├── history.routes.js
│   │   │   └── health.routes.js
│   │   ├── controllers/
│   │   │   ├── analysis.controller.js    # thin: parse req → call service → shape response
│   │   │   └── history.controller.js
│   │   ├── services/
│   │   │   ├── imageFeature.service.js   # brightness/edge/texture/histogram/particles (sharp)
│   │   │   ├── scoring.service.js        # feature vector → contaminationScore + riskLevel
│   │   │   └── sarvam.service.js         # Axios wrapper around Sarvam /v1/chat/completions
│   │   ├── repositories/
│   │   │   └── analysis.repository.js    # all Cypher reads/writes, isolated from business logic
│   │   ├── middleware/
│   │   │   ├── upload.middleware.js      # multer instance + mimetype/size guard
│   │   │   ├── validate.middleware.js    # request validation (zod)
│   │   │   ├── rateLimiter.middleware.js
│   │   │   └── error.middleware.js       # centralized error handler (last in chain)
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── AppError.js               # custom error class: statusCode + errorCode
│   │   └── app.js                        # express app assembly
│   ├── uploads/                          # gitignored temp storage
│   ├── server.js                         # entrypoint
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── docs/
│   ├── architecture.md                   # this document
│   ├── api-reference.md                  # (future) full endpoint spec, split out from here
│   └── setup.md                          # (future) local dev environment steps
│
└── README.md
```

**Why this shape:**
- `app/` vs `src/` is a deliberate split: `app/` is *only* routes (Expo Router owns this directory and infers the navigation tree from file names — no route should contain business logic). Everything reusable lives in `src/` and is imported into route files.
- Backend follows **routes → controllers → services → repositories**. Controllers stay dumb on purpose; the moment you're tempted to write a Cypher query or an `if (edgeDensity > x)` inside a controller, it belongs one layer down. This is what keeps `imageFeature.service.js` unit-testable without spinning up Express or Neo4j at all.

---

## 2. Database Schema (Neo4j AuraDB)

### Design philosophy

The data here is fairly linear today (one image → one analysis), which raises the fair question "why a graph DB at all?" The honest answer for the hackathon: because the *next* features you'll obviously want — multiple images per physical sample, geo-tagging, comparing analyses across a location over time, multi-user field teams — are all relationship queries that are painful in a relational schema and natural in Cypher. So the schema below is deliberately **modest for v1** (4 node types, does the job, nothing speculative) with an explicit extension path in §10, rather than over-built now.

### MVP node types (build these now)

| Node | Purpose | Key properties |
|---|---|---|
| `:Analysis` | Central record — one per submitted image | `id` (uuid), `createdAt`, `contaminationScore` (0–100), `riskLevel` (`LOW`\|`MODERATE`\|`HIGH`\|`CRITICAL`), `status` (`COMPLETE`\|`PARTIAL`), `scoringVersion`, `processingTimeMs` |
| `:Image` | The captured/uploaded photo | `id`, `url`, `width`, `height`, `format`, `sizeBytes`, `source` (`CAMERA`\|`GALLERY`), `capturedAt` |
| `:FeatureSet` | Raw deterministic CV output | `id`, `brightness`, `edgeDensity`, `textureScore`, `particleEstimate`, `colorHistR`/`colorHistG`/`colorHistB` (native Neo4j arrays-of-int — no need to JSON-stringify), `extractedAt` |
| `:Explanation` | Sarvam AI's natural-language output | `id`, `text`, `language`, `modelUsed`, `generatedAt`, `fallback` (bool — true if this is a generic fallback because the API call failed) |

### Relationships

```
(:Image)-[:ANALYZED_AS]->(:Analysis)
(:Analysis)-[:DERIVED_FROM]->(:FeatureSet)
(:Analysis)-[:EXPLAINED_BY]->(:Explanation)
```

One full analysis is exactly this shape in the graph:

```
(Image)-[:ANALYZED_AS]->(Analysis)-[:DERIVED_FROM]->(FeatureSet)
                              │
                              └─[:EXPLAINED_BY]->(Explanation)
```

### Constraints & indexes

```cypher
CREATE CONSTRAINT analysis_id     IF NOT EXISTS FOR (a:Analysis)   REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT image_id        IF NOT EXISTS FOR (i:Image)      REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT featureset_id   IF NOT EXISTS FOR (f:FeatureSet) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT explanation_id  IF NOT EXISTS FOR (e:Explanation) REQUIRE e.id IS UNIQUE;

CREATE INDEX analysis_created_at IF NOT EXISTS FOR (a:Analysis) ON (a.createdAt);
CREATE INDEX analysis_score      IF NOT EXISTS FOR (a:Analysis) ON (a.contaminationScore);
```

### Illustrative write pattern (schema-level, not final code)

```cypher
CREATE (img:Image {id: $imageId, url: $imageUrl, width: $width, height: $height,
                    format: $format, sizeBytes: $sizeBytes, source: $source, capturedAt: datetime()})
CREATE (fs:FeatureSet {id: $featureSetId, brightness: $brightness, edgeDensity: $edgeDensity,
                        textureScore: $textureScore, particleEstimate: $particleEstimate,
                        colorHistR: $histR, colorHistG: $histG, colorHistB: $histB, extractedAt: datetime()})
CREATE (a:Analysis {id: $analysisId, createdAt: datetime(), contaminationScore: $score,
                     riskLevel: $riskLevel, status: $status, scoringVersion: "v1.0.0",
                     processingTimeMs: $processingTimeMs})
CREATE (ex:Explanation {id: $explanationId, text: $explanationText, language: $language,
                         modelUsed: $modelUsed, generatedAt: datetime(), fallback: $isFallback})
CREATE (img)-[:ANALYZED_AS]->(a)
CREATE (a)-[:DERIVED_FROM]->(fs)
CREATE (a)-[:EXPLAINED_BY]->(ex)
RETURN a.id AS analysisId
```

### Illustrative history read (cursor-paginated, newest first)

```cypher
MATCH (img:Image)-[:ANALYZED_AS]->(a:Analysis)
OPTIONAL MATCH (a)-[:EXPLAINED_BY]->(ex:Explanation)
RETURN a, img, ex
ORDER BY a.createdAt DESC
SKIP $offset
LIMIT $limit
```

All parameters above are passed via Neo4j's `$param` binding (never string-concatenated) — see §9 Security.

---

## 3. API Endpoints

Base path: `/api/v1`. All responses share one envelope shape.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/analysis` | Upload image → extract features → score → explain → persist → return full result |
| `GET` | `/analysis/:id` | Fetch one analysis in full detail |
| `GET` | `/history` | Paginated list of past analyses (for the History screen) |
| `DELETE` | `/analysis/:id` | Remove an analysis (demo cleanup) |
| `GET` | `/health` | Liveness + Neo4j/Sarvam reachability check |

### `POST /api/v1/analysis`

Request: `multipart/form-data`
- `image` (required — jpeg/png/webp, max 10 MB)
- `sampleLabel` (optional string, e.g. "Pond behind Building 3")

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "b3f1c2a0-...-uuid",
    "createdAt": "2026-07-10T09:15:00Z",
    "image": { "url": "https://.../uploads/b3f1c2a0.jpg", "width": 1024, "height": 768 },
    "features": {
      "brightness": 0.62,
      "edgeDensity": 0.34,
      "textureScore": 0.51,
      "colorHistogram": { "r": [/*16 bins*/], "g": [/*16 bins*/], "b": [/*16 bins*/] },
      "particleEstimate": 47
    },
    "contaminationScore": 68,
    "riskLevel": "HIGH",
    "explanation": {
      "text": "This sample shows elevated edge density and a high estimated particle count relative to a clean-water baseline...",
      "language": "en",
      "modelUsed": "sarvam-30b",
      "fallback": false
    },
    "processingTimeMs": 1840
  }
}
```

Error response (consistent shape for every endpoint):
```json
{
  "success": false,
  "error": { "code": "INVALID_IMAGE", "message": "Uploaded file is not a supported image format.", "details": null }
}
```

### `GET /api/v1/history?limit=20&cursor=...&minScore=&maxScore=`

Response `200`:
```json
{
  "success": true,
  "data": {
    "items": [
      { "id": "...", "createdAt": "...", "contaminationScore": 68, "riskLevel": "HIGH", "thumbnailUrl": "..." }
    ],
    "nextCursor": "eyJjcmVhdGVkQXQiOi..."
  }
}
```

`GET /api/v1/analysis/:id` returns the same `data` shape as the `POST` above. `DELETE` returns `204`. `GET /health` returns `{ "status": "ok", "neo4j": "connected", "sarvamAI": "reachable" }`.

**On Sarvam AI specifically:** the backend calls `POST https://api.sarvam.ai/v1/chat/completions` with `model: "sarvam-30b"` (current recommended chat model — `sarvam-m` is deprecated and being removed from the API), auth via the `api-subscription-key` header (or `Authorization: Bearer <key>` if you prefer OpenAI-compatible tooling), and `reasoning_effort: null` to disable "thinking mode" — this task is straightforward text generation from a structured prompt, so paying for reasoning tokens only adds latency and cost with no benefit here.

---

## 4. Component Hierarchy

```
<ThemeProvider>                         # dark-blue palette, typography, spacing tokens
  <QueryClientProvider>                 # React Query cache (server state — see §7)
    <Screen>                            # safe-area + background + consistent padding
      <Header title back? rightAction? />

      # Home
      <PrimaryButton onPress={goToCapture}>Scan Sample</PrimaryButton>

      # Capture
      <CameraCapture />                 # wraps expo-camera CameraView + permission hook
      <ImagePickerSheet />              # wraps expo-image-picker gallery flow
      <ImagePreview retake confirm />

      # Result
      <CircularGauge score size thickness animated colorByRisk />
      <RiskBadge level="HIGH" />
      <FeatureBreakdownList>
        <FeatureRow label value />
      </FeatureBreakdownList>
      <ExplanationCard text modelUsed expandable />

      # History
      <AnalysisListItem thumbnail score date riskBadge onPress />
      <EmptyState />                    # no analyses yet

      # Cross-cutting
      <LoadingOverlay />
      <ErrorBanner retry? />
      <ConfirmDialog />                 # e.g. delete confirmation
```

**Visual design direction** (dark blue, per your brief): deep navy background (`#0A1128`), slightly-lighter card surface (`#131C3A`), bright blue primary accent (`#3D7AF5`) with a cyan highlight (`#22D3EE`) for active/animated states. Risk-level colors carry the semantic weight so the gauge reads at a glance: LOW `#34D399`, MODERATE `#FBBF24`, HIGH `#FB923C`, CRITICAL `#F87171` — teal-green rather than pure green so it still sits comfortably in a navy palette. These become the `theme/colors.ts` tokens; final component styling is implementation-phase work.

`CircularGauge` is worth calling out as the one component to build carefully: props `{ score, size, strokeWidth, animationDuration }`, SVG-based (`react-native-svg`, already an Expo-compatible dependency), arc length driven by an animated value so the fill sweeps in on mount rather than snapping — it's the single element every judge will look at first.

---

## 5. Navigation

Expo SDK 54 ships **Expo Router v6** as the standard, file-based navigation layer (it's now a core pillar of Expo, not an optional add-on) — so the plan below uses that rather than hand-rolling a `NavigationContainer` + `Stack.Navigator` tree, which was the older (pre file-based-routing) convention.

```
app/_layout.tsx                    Root Stack (providers mounted here)
 ├─ (tabs)/                        Bottom tab group
 │   ├─ index.tsx        → Home
 │   └─ history.tsx       → History
 ├─ capture.tsx                    presentation: "modal", pushed from Home
 ├─ result/[id].tsx                dynamic route — id is either a fresh analysis
 │                                 or one tapped from History
 └─ +not-found.tsx
```

Key decisions:
- **Route params carry IDs, not full objects.** `result/[id]` reads the id via `useLocalSearchParams()` and fetches the analysis (React Query cache serves it instantly if it was just created; otherwise it hits `GET /analysis/:id`). Passing whole objects through navigation params is a common RN anti-pattern — it breaks deep linking and serialization.
- **Capture is a modal**, not a tab — it's a transient action, not a place you "live," which matches how the two bottom tabs (Home, History) are the only persistent destinations.
- Enable **typed routes** in `app.json` (`experiments.typedRoutes`) so `router.push('/result/[id]')` is type-checked against actual files in `app/` — cheap to turn on now, saves real debugging time later.

---

## 6. Data Flow

```
1. Home → tap "Scan Sample" → Capture (modal)
2. expo-camera / expo-image-picker → permission check → capture or pick
3. Preview shown → confirm → upload begins (Axios, multipart, progress callback)
4. Backend: multer receives file → imageFeature.service extracts
   brightness / edgeDensity / textureScore / colorHistogram / particleEstimate
5. scoring.service: feature vector → weighted formula → contaminationScore + riskLevel
6. sarvam.service: structured feature summary → Sarvam AI chat/completions → explanation text
   (steps 5 and 6 are independent — if 6 fails, 5's result is still returned; see §8)
7. analysis.repository: persist Image + FeatureSet + Analysis + Explanation to Neo4j
8. Backend returns full JSON → mobile caches it (React Query) → navigates to Result
9. Result renders CircularGauge + FeatureBreakdownList + ExplanationCard
10. History screen: GET /history on focus/pull-to-refresh → tap an item →
    reuses the same Result components, fetching by id if not already cached
```

**One SDK 54–specific detail worth designing around now:** with `allowsEditing: false` (the new default), `expo-image-picker` returns the *original* file — which on iOS may be HEIC or AVIF, not JPEG. Since feature extraction expects a standard raster format, either (a) set `allowsEditing: true` in the picker call, or (b) normalize format server-side before feature extraction (`sharp` reads HEIC/AVIF and re-encodes to JPEG in one call). Option (b) is more robust since it doesn't depend on picker config staying correct forever — recommend building the normalization step into `imageFeature.service.js` as its first line, not as an afterthought.

For feature extraction itself: `sharp` is the right tool for this stack — `.stats()` gives per-channel mean/stdev directly (brightness, histogram spread), and `.raw().toBuffer()` gives pixel access for a custom gradient-magnitude pass (edge density) and Laplacian-variance pass (texture/blur proxy). `particleEstimate` is a heuristic count of contiguous high-contrast clusters above a size threshold — genuinely useful as a demo signal, but it is *not* a substitute for real blob/contour detection (OpenCV) or a trained classifier; flagging that honestly in the UI copy is the right call, and it's exactly what §10 proposes upgrading first.

Illustrative scoring formula (conceptual, not final implementation):
```
normEdge      = clamp(edgeDensity / EDGE_CALIBRATION_MAX, 0, 1)
normTexture   = clamp(textureScore / TEXTURE_CALIBRATION_MAX, 0, 1)
normParticles = clamp(particleEstimate / PARTICLE_CALIBRATION_MAX, 0, 1)
histSkew      = deviationFromCleanBaseline(colorHistogram)   // 0–1

contaminationScore = round(100 * (
    0.35 * normParticles +
    0.30 * normEdge +
    0.20 * normTexture +
    0.15 * histSkew
))
```
The `*_CALIBRATION_MAX` constants should come from a small set of reference photos (visibly clean vs. visibly turbid water) shot before the hackathon demo — even 5–10 calibration images will make the score band meaningfully more honest than guessed constants.

---

## 7. State Management

Three layers, deliberately not more:

| State | Owner | Why |
|---|---|---|
| Server data — analysis results, history list | **React Query** (`@tanstack/react-query`) | Handles caching, retries, background refetch, and loading/error states with far less boilerplate than Redux; `POST /analysis` is a mutation that invalidates the `['history']` query key on success |
| Global UI state — theme tokens, capture-flow step (`idle → capturing → previewing → uploading → done/error`) | **React Context + `useReducer`** | Small, infrequent, doesn't need a library |
| Local, screen-only state — button spinners, image preview URI, camera facing mode | **`useState`** in the component | No reason to lift it |

Redux (or any similar library) is deliberately out of scope — it solves problems this app doesn't have. `AsyncStorage` earns one job: caching the last N history items so the History screen isn't blank on a cold start before the network responds.

---

## 8. Error Handling

| Layer | Failure | Handling | User sees |
|---|---|---|---|
| Backend — upload | Wrong mimetype / file too large | multer file-filter + limits, caught by `error.middleware.js` | `400` with a specific message, not a generic crash |
| Backend — image processing | Corrupt/unsupported image | `imageFeature.service` throws `AppError(422, 'UNPROCESSABLE_IMAGE')` | "This image couldn't be analyzed — try another photo" |
| Backend — Sarvam AI | Timeout / rate limit / API error | Limited retry with backoff; on final failure, **return the score anyway** with a generic fallback explanation and `explanation.fallback: true` | Score displays normally; explanation card shows "AI explanation unavailable right now" instead of blocking the whole result |
| Backend — Neo4j | Connection failure | `503` from a health-check-aware middleware; consider a short local retry queue so one flaky write doesn't lose a result | "Saved locally, will sync" (if queue is built) or a clear retry prompt |
| Backend — global | Any uncaught rejection | Single `error.middleware.js` at the end of the chain (paired with `express-async-errors` or manual wrapping) — every route returns the same JSON error envelope | Consistent error banner, never a raw stack trace |
| Mobile — network | No connection / timeout | Axios interceptor maps to a friendly message | Retry button, captured image stays in local state (never re-prompt for the photo) |
| Mobile — permissions | Camera/gallery denied | Check `permission.canAskAgain`; if false, deep-link to Settings via `Linking.openSettings()` | In-app explanation + "Open Settings" button, not a silent dead end |
| Mobile — render crash | Any unexpected component error | Top-level Error Boundary | Fallback screen instead of a white screen |

The load-bearing decision here is the Sarvam AI row: **a failed explanation must never fail the whole request**, because the score is already fully computed by that point and shouldn't be held hostage by a third-party network call.

---

## 9. Security

- **Secrets never reach the client.** `SARVAM_API_KEY`, `NEO4J_URI`/`NEO4J_USERNAME`/`NEO4J_PASSWORD` live only in the backend's `.env` (loaded via `dotenv`, validated at boot in `config/env.js`), never bundled into the Expo app. `.env` is gitignored; `.env.example` ships with placeholder keys.
- **Upload validation:** mimetype allowlist (`image/jpeg`, `image/png`, `image/webp`, plus HEIC/AVIF if handling that server-side per §6), `multer` size limit (10 MB), and a magic-byte check (not just trusting the extension/mimetype header the client sends).
- **Injection prevention:** every Cypher query uses `$parameter` binding, never string concatenation — this is a hard rule for `analysis.repository.js`, not a suggestion.
- **Cost control via rate limiting:** each `POST /analysis` costs a real Sarvam AI call, so `express-rate-limit` on that route isn't optional polish, it's budget protection for a hackathon API key.
- **Lightweight access control now, real auth later:** no full user accounts in v1, but a shared `X-App-Key` header checked server-side stops the endpoint from being hit by arbitrary internet clients and running up API costs — cheap to add, meaningfully reduces risk.
- **Transport:** HTTPS in front of the backend even for the demo (an `ngrok`/tunnel URL is fine, plain `http://` is not) since image bytes and future location data are in transit.
- **CORS** configured to the expected origins — lower stakes for a mobile-only client today, but trivial to set correctly now and it's the first thing that bites you when a web dashboard gets added later.

---

## 10. Future Scalability

**Storage:** move uploaded images to object storage (S3 / Cloudinary / Supabase Storage) and store only the URL on `:Image`, instead of local disk — removes the backend's statefulness, a prerequisite for horizontal scaling.

**Async processing:** for slower Sarvam AI calls or heavier CV, switch `POST /analysis` to return `202 Accepted` + an id immediately, process on a queue (BullMQ + Redis), and let the mobile app poll `GET /analysis/:id` or subscribe via SSE/WebSocket for completion. Not needed at hackathon scale, but the service/repository split in §1 makes this a routing change, not a rewrite.

**Real ML upgrade path:** because feature extraction (`imageFeature.service`) and scoring (`scoring.service`) are already separate, swapping the heuristic formula for a trained classifier (or adding OpenCV-based particle/contour detection in place of the blob-count heuristic) touches one service, not the whole pipeline. This is the most scientifically important upgrade if this ever leaves hackathon-demo status.

**Extended graph model:** add `:Sample` (a physical sample, decoupled from a single photo — supports multiple images per sample over time), `:Location` (lat/lon, enables "find all samples within X km scoring above Y"), and `:User`/`:Device` (multi-user field teams, per-user history). All three are additive relationships on top of the existing schema — no migration of existing nodes required:
```
(:User)-[:SUBMITTED]->(:Sample)-[:HAS_IMAGE]->(:Image)
(:Sample)-[:COLLECTED_AT]->(:Location)
```

**Multi-user auth:** JWT or OAuth, replacing the shared `X-App-Key` from §9; per-user query scoping in the repository layer.

**Offline-first mobile:** queue captured analyses locally when offline (simple `AsyncStorage` queue is enough to start; `WatermelonDB` if this grows), sync on reconnect — genuinely valuable for field water-testing use cases with unreliable connectivity.

**Web dashboard:** since the backend is a plain REST API with no mobile-specific coupling, a web frontend (aggregate views, maps, trend lines) can consume the identical `/api/v1` surface with zero backend changes.

**i18n:** both the UI and the Sarvam AI explanations can go multilingual — Sarvam is specifically strong across Indic languages, which is a natural, low-effort differentiator for judges if there's time (pass a `language` param through to the chat completion request and to the mobile UI strings).

**Reproducibility & ops:** `scoringVersion` and `modelUsed` are already on the `:Analysis` node (§2) so that as the scoring formula or Sarvam model changes over time, every historical result stays traceable to exactly what produced it — add unit tests over `imageFeature.service` and `scoring.service` against a fixture set of known images once there's time.

---

## Key Assumptions & Decisions (flag anything you'd change)

- **Neo4j schema is intentionally minimal for v1** (4 node types) — the richer graph (Sample/Location/User) is designed but deferred to §10, not built now.
- **No user auth in v1** — a single shared app-level key guards the endpoint from abuse/cost, not from individual users.
- **Sarvam model: `sarvam-30b`**, not `sarvam-m` (confirmed deprecated) — swap to `sarvam-105b` if you want higher-quality explanations and don't mind the added latency/cost.
- **Expo Router (file-based)**, not manual React Navigation setup — this is now the SDK-standard approach, not a stylistic preference.
- **Image normalization (HEIC/AVIF → JPEG) happens server-side**, not by relying on picker config — more robust against future Expo default changes.
- **The contamination score is explicitly a CV heuristic**, not a certified measurement — this should show up as a one-line disclaimer in the actual app UI, not just in this doc.

## Next Steps

This is everything requested — folder structure, schema, endpoints, component tree, navigation, data flow, state management, error handling, security, and the scalability path. I'll wait for your go-ahead (or requested changes) before writing any code.
