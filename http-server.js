/**
 * M365 Assistant MCP Server - long-lived HTTP (Streamable) service.
 *
 * ADR-061 (workspace-web pattern): one service process holds all state
 * (tokens are shared via the token file / auth server), agents connect by
 * address through mcp-proxy.js (thin stdio bridge per agent session).
 *
 * Endpoints:
 * - POST /mcp    — JSON-RPC messages (initialize opens a session)
 * - GET  /mcp    — server-to-client SSE stream (per session)
 * - DELETE /mcp  — session close
 * - GET /health  — liveness for pm2/monitoring
 *
 * Binds to 127.0.0.1 only: the service is local to the machine.
 */
const express = require('express');
const { randomUUID } = require('crypto');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const config = require('./config');
const { createMcpServer } = require('./mcp-server');

const DEFAULT_HTTP_PORT = 3334;

/**
 * Create the express app with MCP session handling.
 * @param {object} [options]
 * @param {boolean} [options.jsonResponse] — plain JSON responses instead of SSE
 *        streams (used by tests; production defaults to SSE per the MCP spec)
 */
function createHttpApp({ jsonResponse = false } = {}) {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // sessionId -> { server, transport }
  const sessions = new Map();

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    try {
      // Existing session: hand the message to its transport
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // New session: only an initialize request may open one
      if (!sessionId && isInitializeRequest(req.body)) {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            sessions.set(newSessionId, { server, transport });
            console.error(`http-server: session opened ${newSessionId}`);
          },
          enableJsonResponse: jsonResponse,
          // Local-only service bound to 127.0.0.1; agent clients are local
          enableDnsRebindingProtection: false
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            console.error(`http-server: session closed ${transport.sessionId}`);
          }
        };
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Unknown/stale session: 404 tells the client to re-initialize (MCP spec)
      res.status(sessionId ? 404 : 400).json({
        jsonrpc: '2.0',
        error: { code: sessionId ? -32001 : -32000, message: sessionId ? 'Session not found' : 'Bad Request: no valid session' },
        id: null
      });
    } catch (error) {
      console.error('http-server: POST /mcp error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  });

  const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
      res.status(404).json({
        jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
        id: null
      });
      return;
    }
    try {
      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('http-server: session request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      name: config.SERVER_NAME,
      version: config.SERVER_VERSION,
      sessions: sessions.size
    });
  });

  return { app, sessions };
}

module.exports = { createHttpApp, DEFAULT_HTTP_PORT };

if (require.main === module) {
  const port = Number(process.env.MCP_HTTP_PORT) || DEFAULT_HTTP_PORT;
  const { app } = createHttpApp();
  app.listen(port, '127.0.0.1', () => {
    console.error(`m365-assistant MCP HTTP service listening on http://127.0.0.1:${port}/mcp`);
  });
}
