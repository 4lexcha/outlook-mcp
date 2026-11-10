/**
 * m365-assistant MCP stdio <-> Streamable HTTP bridge.
 *
 * ADR-061: the shared MCP service runs as a long-lived local HTTP process
 * (http-server.js); every agent spawns this thin bridge as its stdio MCP
 * server and all traffic is forwarded to the service. No state lives here:
 * if the bridge or the service dies, the agent respawns a fresh bridge.
 *
 * Configuration:
 * - MCP_HTTP_URL — service endpoint (default http://127.0.0.1:3334/mcp)
 *
 * Exits non-zero when the service is unreachable or drops the session, so
 * the host agent can respawn the bridge (and surface the outage).
 */
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { z } = require('zod');
const config = require('./config');

const DEFAULT_HTTP_URL = 'http://127.0.0.1:3334/mcp';
const REQUEST_TIMEOUT_MS = 120000;

// Results are forwarded verbatim; no schema enforcement on the remote side
const PASSTHROUGH_RESULT = z.object({}).passthrough();

/**
 * Create the proxy pair (not yet connected).
 * @param {object} [options]
 * @param {string} [options.httpUrl] — MCP service URL
 * @returns {Promise<{server: Server, client: Client, httpUrl: string}>}
 */
async function createProxy({ httpUrl } = {}) {
  const url = httpUrl || process.env.MCP_HTTP_URL || DEFAULT_HTTP_URL;

  const client = new Client(
    { name: 'm365-mcp-proxy', version: config.SERVER_VERSION },
    { capabilities: {} }
  );
  const clientTransport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(clientTransport);

  const server = new Server(
    { name: 'm365-mcp-proxy', version: config.SERVER_VERSION },
    // Declare the tools capability: capability-respecting hosts (e.g. ZCode)
    // only poll tools/list when the handshake advertises it (found 2026-11-10).
    { capabilities: { tools: {} } }
  );

  // Forward every request the SDK does not handle internally (initialize,
  // notifications/initialized etc. are handled by the protocol itself).
  server.fallbackRequestHandler = async (request) => {
    const { method, params } = request;
    console.error(`mcp-proxy: -> ${method}`);
    return await client.request({ method, params }, PASSTHROUGH_RESULT, {
      timeout: REQUEST_TIMEOUT_MS
    });
  };

  // Forward agent notifications to the service
  server.fallbackNotificationHandler = async (notification) => {
    const { method, params } = notification;
    if (method === 'notifications/initialized') return; // handled by SDK
    try {
      await client.notification({ method, params });
    } catch (error) {
      console.error(`mcp-proxy: notification ${method} failed: ${error.message}`);
    }
  };

  // If the service drops us, exit so the agent respawns a fresh bridge
  clientTransport.onclose = () => {
    console.error('mcp-proxy: service connection closed, exiting');
    process.exit(1);
  };
  clientTransport.onerror = (error) => {
    console.error(`mcp-proxy: service connection error: ${error.message}`);
  };

  return { server, client, httpUrl: url };
}

module.exports = { createProxy, DEFAULT_HTTP_URL };

if (require.main === module) {
  createProxy()
    .then(async ({ server }) => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('mcp-proxy: stdio bridge connected');
    })
    .catch(error => {
      console.error(`mcp-proxy: failed to connect to MCP service: ${error.message}`);
      console.error(`mcp-proxy: is the service running? (http-server.js, port ${new URL(process.env.MCP_HTTP_URL || DEFAULT_HTTP_URL).port})`);
      process.exit(1);
    });
}
