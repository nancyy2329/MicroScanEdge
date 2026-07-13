# MicroScan Edge — Backend

Backend API for MicroScan Edge — extracts deterministic image features from
water sample photos, scores contamination risk (0–100), and generates
human-readable explanations via Sarvam AI.

The contamination score is 100% deterministic, computed entirely from image
statistics (brightness, edge density, texture, color spread, particle
estimate). Sarvam AI never touches the number — it only narrates a result
that already exists. See `docs/architecture.md` for the full design.

## Project structure

```
backend/
├── src/
│   ├── config/         env loading/validation, Neo4j driver, multer setup
│   ├── controllers/     analysis + history request handlers
│   ├── middleware/      upload, validation, centralized error handling
│   ├── repositories/    all Cypher / Neo4j queries
│   ├── routes/          Express routers
│   ├── services/        image feature extraction, scoring, Sarvam AI
│   ├── utils/            logger, AppError
│   ├── validations/      Zod request schemas
│   ├── app.js            Express app (middleware + routes), exported
│   └── server.js         entry point — boots the app, connects to Neo4j
├── tests/
│   ├── e2e-test.js        real end-to-end test (no mocks)
│   └── fixtures/          sample image used by the e2e test
├── uploads/               uploaded images are saved here, served at /uploads
├── docs/                  architecture doc + Postman collection
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js >= 18
- A Neo4j AuraDB instance (or any reachable Neo4j 5.x database)
- A Sarvam AI API key

## Setup

```bash
npm install
cp .env.example .env
# then fill in NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, SARVAM_API_KEY
```

`src/config/env.js` validates required variables at boot and fails fast
with a clear message if any are missing.

## Running

```bash
npm run dev     # nodemon, auto-restarts on changes
npm start       # plain node
```

On startup the server verifies the Neo4j connection and ensures the
required constraints/indexes exist (`src/config/neo4jDriver.js`) before it
starts accepting requests. The health check lives at `GET /`.

## API

- `POST /api/v1/analysis` — multipart/form-data, field `image` (+ optional
  `language`, `source`). Runs the full pipeline: feature extraction →
  scoring → Sarvam explanation → persist → respond.
- `GET /api/v1/analysis/:id` — fetch one analysis in full detail.
- `GET /api/v1/history` — paginated list (`limit`, `offset`, `minScore`,
  `maxScore` query params).

See `docs/MicroScanEdge.postman_collection.json` for ready-made requests,
and `docs/architecture.md` for the full system design and Neo4j schema.

## Testing

`tests/e2e-test.js` is a real end-to-end test — no mocks. Run it against a
live server with real Neo4j and Sarvam credentials:

```bash
npm run dev        # in one terminal
npm run test:e2e   # in another
```

## Notes

- Uploaded images are stored under `uploads/` and served statically at
  `/uploads/<filename>`. The folder is created automatically if missing.
- The image-feature heuristics and scoring weights are documented in
  `src/services/imageFeature.service.js` and
  `src/services/scoring.service.js` — they're reasonable starting points,
  not calibrated against lab-confirmed microplastic samples.
