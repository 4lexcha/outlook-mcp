/**
 * Environment file loader for the M365 Assistant MCP Server.
 *
 * Contract (INF-127 / ADR-061-adjacent decision, 2026-10-23):
 * - Default: `.env` in the server folder (next to config.js), resolved from
 *   __dirname so the server works regardless of the process CWD.
 * - Optional: `M365_ENV_FILE` points at another file (e.g. a workspace root .env).
 * - Precedence: variables already in process.env win ("who set it first, is right").
 * - Whitelist: only the server's own keys are taken from the file; anything else
 *   in a shared .env never reaches the process.
 */
const fs = require('fs');
const path = require('path');

// Keys this server owns. Everything else in a .env file is ignored.
// M365_ENV_FILE is special: a pointer to another env file (see loadServerEnv).
const SERVER_ENV_KEYS = [
  'M365_ENV_FILE',
  'MS_CLIENT_ID',
  'MS_CLIENT_SECRET',
  'MS_TENANT_ID',
  'MS_REDIRECT_URI',
  'MS_SCOPES',
  'MS_AUTHORITY_HOST',
  'MS_TOKEN_ENDPOINT',
  'OUTLOOK_CLIENT_ID',
  'OUTLOOK_CLIENT_SECRET',
  'OUTLOOK_TENANT_ID',
  'USE_TEST_MODE'
];

/** Parse `.env`-style content into an object (no quoting magic beyond trimming). */
function parseEnvFile(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Load env vars into process.env.
 *
 * Resolution order (first file wins per key; process.env always wins):
 * 1. M365_ENV_FILE from the process environment (e.g. pm2/agent config),
 * 2. .env in the server folder,
 * 3. if the server-folder .env itself set M365_ENV_FILE (pointer pattern —
 *    a deployment folder keeps one non-secret pointer line), that target
 *    file is applied after (lower priority than both above).
 *
 * Existing process.env values are never overwritten.
 * @returns {string[]} keys that were applied (for diagnostics)
 */
function loadServerEnv({ envFilePath } = {}) {
  const applied = [];
  const serverEnvPath = envFilePath || path.join(__dirname, '.env');
  const candidates = [];
  if (process.env.M365_ENV_FILE) {
    candidates.push(process.env.M365_ENV_FILE);
  }
  candidates.push(serverEnvPath);

  let pointerFollowed = false;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    let content;
    try {
      content = fs.readFileSync(candidate, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`env-loader: ${candidate} not found, skipping`);
        continue;
      }
      console.error(`env-loader: failed to read ${candidate}: ${error.message}`);
      continue;
    }
    const parsed = parseEnvFile(content);
    const appliedHere = [];
    for (const key of SERVER_ENV_KEYS) {
      if (key in parsed && process.env[key] === undefined) {
        process.env[key] = parsed[key];
        applied.push(key);
        appliedHere.push(key);
      }
    }
    // Pointer discovered in the default server-folder .env: follow it once,
    // after the files already queued (lower priority).
    if (candidate === serverEnvPath && !pointerFollowed &&
        appliedHere.includes('M365_ENV_FILE') && process.env.M365_ENV_FILE) {
      pointerFollowed = true;
      candidates.push(process.env.M365_ENV_FILE);
    }
  }
  return applied;
}

module.exports = { SERVER_ENV_KEYS, parseEnvFile, loadServerEnv };
