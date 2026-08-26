const fs = require('fs');
const path = require('path');

// dotenv-safe requires an actual .env FILE to exist on disk — if it's
// missing entirely (as on Railway/Render/Vercel, which inject env vars
// directly with no .env file at all), the underlying `dotenv` parser throws
// before dotenv-safe ever gets to do its "are all required keys present"
// check, crashing the app on boot even when every variable is correctly
// set. This wrapper keeps dotenv-safe's safety net for local dev (a real
// .env file, checked against .env.example) while falling back to just
// validating process.env directly when there's no .env file to read.
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  const examplePath = path.join(__dirname, '..', '..', '.env.example');

  if (fs.existsSync(envPath)) {
    require('dotenv-safe').config({ path: envPath, example: examplePath });
    return;
  }

  const required = fs
    .readFileSync(examplePath, 'utf8')
    .split('\n')
    .map((line) => line.split('=')[0].trim())
    .filter((key) => key && !key.startsWith('#'));

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = loadEnv;
