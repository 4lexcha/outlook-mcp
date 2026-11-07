// pm2: two long-lived services for the Outlook MCP subsystem (ADR-061, INF-127):
// - outlook-auth-server (localhost:3333) — OAuth login flow
// - outlook-mcp-http    (localhost:3334) — shared MCP service; agents connect
//   through mcp-proxy.js (thin stdio bridge per agent session)
// Paths follow this file's location. Secrets come from the workspace root .env
// via M365_ENV_FILE — set in the shell/environment, not stored here.
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'outlook-auth-server',
      script: 'outlook-auth-server.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      log_file: path.join(__dirname, 'logs', 'auth-server.log'),
      error_file: path.join(__dirname, 'logs', 'auth-server-error.log'),
      time: true
    },
    {
      name: 'outlook-mcp-http',
      script: 'http-server.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production'
      },
      log_file: path.join(__dirname, 'logs', 'mcp-http.log'),
      error_file: path.join(__dirname, 'logs', 'mcp-http-error.log'),
      time: true
    }
  ]
};
