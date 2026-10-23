#!/usr/bin/env node
/**
 * Token diagnostic script
 * Run: node debug-token.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.join(process.env.HOME || process.env.USERPROFILE, '.outlook-mcp-tokens.json');

console.log('=== Token Diagnostic ===\n');
console.log('Token file path:', tokenPath);

if (!fs.existsSync(tokenPath)) {
  console.log('❌ Token file NOT FOUND. Please authenticate first.');
  process.exit(1);
}

const raw = fs.readFileSync(tokenPath, 'utf8');
let tokens;
try {
  tokens = JSON.parse(raw);
} catch (e) {
  console.log('❌ Token file is malformed JSON:', e.message);
  process.exit(1);
}

console.log('✅ Token file found\n');

// Decode JWT payload (base64url)
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

// Check access token
if (tokens.access_token) {
  const payload = decodeJWT(tokens.access_token);
  const now = Date.now();
  const expiresAt = tokens.expires_at || 0;
  const expiresIn = Math.round((expiresAt - now) / 1000);

  console.log('--- Access Token ---');
  console.log('expires_at (local check):', new Date(expiresAt).toISOString());
  console.log('expires in:', expiresIn, 'seconds', expiresIn < 0 ? '❌ EXPIRED' : '✅ valid');

  if (payload) {
    console.log('\n--- JWT Claims ---');
    console.log('aud (audience):', payload.aud);
    console.log('iss (issuer):', payload.iss);
    console.log('sub:', payload.sub ? payload.sub.substring(0, 8) + '...' : 'N/A');
    console.log('upn (account):', payload.upn || payload.unique_name || payload.preferred_username || 'N/A');
    console.log('tid (tenant):', payload.tid);
    console.log('scp (scopes):', payload.scp || 'N/A');
    console.log('roles:', payload.roles || 'N/A');
    console.log('exp (jwt expiry):', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A');

    const jwtExpired = payload.exp && (Date.now() / 1000) > payload.exp;
    console.log('JWT expired:', jwtExpired ? '❌ YES' : '✅ NO');
  } else {
    console.log('❌ Could not decode JWT payload');
  }
} else {
  console.log('❌ No access_token in file');
}

console.log('\n--- Refresh Token ---');
console.log('refresh_token present:', tokens.refresh_token ? '✅ YES' : '❌ NO');

// Test actual Graph API call
console.log('\n--- Testing Graph API call ---');
const token = tokens.access_token;

const options = {
  hostname: 'graph.microsoft.com',
  path: '/v1.0/me',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('✅ Graph API works!');
        console.log('Account:', json.userPrincipalName || json.mail || json.displayName);
      } else {
        console.log('❌ Graph API error:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', e => console.log('Network error:', e.message));
req.end();
