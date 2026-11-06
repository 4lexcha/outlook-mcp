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
const SERVER_ENV_KEYS = [
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
 * Order: M365_ENV_FILE (if set) -> .env in the server folder.
 * Existing process.env values are never overwritten.
 * @returns {string[]} keys that were applied (for diagnostics)
 */
function loadServerEnv({ envFilePath } = {}) {
  const candidates = [];
  if (process.env.M365_ENV_FILE) {
    candidates.push(process.env.M365_ENV_FILE);
  }
  if (!envFilePath) {
    envFilePath = path.join(__dirname, '.env');
  }
  candidates.push(envFilePath);

  const applied = [];
  for (const candidate of candidates) {
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
    for (const key of SERVER_ENV_KEYS) {
      if (key in parsed && process.env[key] === undefined) {
        process.env[key] = parsed[key];
        applied.push(key);
      }
    }
  }
  return applied;
}

module.exports = { SERVER_ENV_KEYS, parseEnvFile, loadServerEnv };
