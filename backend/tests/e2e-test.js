// tests/e2e-test.js
//
// A REAL end-to-end test — no mocks anywhere. Run this against your own
// running server once .env has real Neo4j and Sarvam credentials:
//
//   npm run dev            (in one terminal)
//   npm run test:e2e       (in another)
//
// This is NOT what ran during this project's build — no real credentials
// were available in that sandbox (see the notes in sarvam.service.js and
// analysis.repository.js explaining what was tested there instead, and
// how). This script is what YOU run to confirm your actual deployment
// — real database, real AI explanations — genuinely works.

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
const SAMPLE_IMAGE = path.join(__dirname, 'fixtures', 'sample-water-image.jpg');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`  \u2713 ${description}`);
    passed++;
  } else {
    console.log(`  \u2717 ${description}`);
    failed++;
  }
}

function printSummary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function run() {
  console.log(`Running E2E tests against ${BASE_URL}\n`);

  console.log('1. Health check');
  const health = await axios.get(`${BASE_URL}/`);
  check('status 200', health.status === 200);
  check('reports ok', health.data.status === 'ok');

  console.log('\n2. Create analysis (real image, full real pipeline)');
  if (!fs.existsSync(SAMPLE_IMAGE)) {
    check(`sample image exists at ${SAMPLE_IMAGE}`, false);
    console.log('  Cannot continue without it — skipping remaining tests.');
    return printSummary();
  }

  const form = new FormData();
  form.append('image', fs.createReadStream(SAMPLE_IMAGE));

  const createRes = await axios.post(`${BASE_URL}/api/v1/analysis`, form, { headers: form.getHeaders() });
  check('status 201', createRes.status === 201);
  check('has an id', typeof createRes.data.data.id === 'string');
  check(
    'contaminationScore is 0-100',
    createRes.data.data.contaminationScore >= 0 && createRes.data.data.contaminationScore <= 100
  );
  check(
    'has a non-empty explanation',
    typeof createRes.data.data.explanation.text === 'string' && createRes.data.data.explanation.text.length > 0
  );
  if (createRes.data.data.explanation.fallback) {
    console.log('    NOTE: explanation.fallback is true — the Sarvam AI call did not succeed.');
    console.log('    The pipeline degraded gracefully (as designed), but check SARVAM_API_KEY if unexpected.');
  }

  const analysisId = createRes.data.data.id;

  console.log('\n3. Get analysis by id');
  const getRes = await axios.get(`${BASE_URL}/api/v1/analysis/${analysisId}`);
  check('status 200', getRes.status === 200);
  check('returns the same analysis', getRes.data.data.id === analysisId);

  console.log('\n4. List history');
  const historyRes = await axios.get(`${BASE_URL}/api/v1/history`);
  check('status 200', historyRes.status === 200);
  check(
    'includes the analysis just created',
    historyRes.data.data.items.some((item) => item.id === analysisId)
  );

  console.log('\n5. Error handling: missing image');
  try {
    const emptyForm = new FormData();
    await axios.post(`${BASE_URL}/api/v1/analysis`, emptyForm, { headers: emptyForm.getHeaders() });
    check('rejects with 400', false);
  } catch (err) {
    check('rejects with 400', err.response && err.response.status === 400);
  }

  console.log('\n6. Error handling: analysis not found');
  try {
    await axios.get(`${BASE_URL}/api/v1/analysis/does-not-exist`);
    check('rejects with 404', false);
  } catch (err) {
    check('rejects with 404', err.response && err.response.status === 404);
  }

  printSummary();
}

run().catch((err) => {
  console.error('\nE2E test run crashed:', err.message);
  console.error('Is the server actually running? Try `npm run dev` in another terminal first.');
  process.exit(1);
});
