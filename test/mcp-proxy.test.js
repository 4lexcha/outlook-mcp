/**
 * End-to-end test: real HTTP service process + real stdio bridge process.
 * Speaks raw JSON-RPC over the bridge's stdin/stdout, exactly like a host
 * agent would (ADR-061 chain: agent -> mcp-proxy.js -> http-server.js).
 */
const { spawn } = require('child_process');
const { createServer } = require('http');
const path = require('path');

describe('mcp-proxy stdio <-> HTTP bridge (end-to-end)', () => {
  let service;
  let port;
  let proxy;
  let stdoutBuffer = '';
  let pendingLines = [];
  let lineWaiters = [];

  const nextLine = () => new Promise((resolve) => {
    if (pendingLines.length) return resolve(pendingLines.shift());
    lineWaiters.push(resolve);
  });

  const send = (message) => new Promise((resolve, reject) => {
    proxy.stdin.write(JSON.stringify(message) + '\n', (err) => (err ? reject(err) : resolve()));
  });

  const rpc = (id, method, params) => ({ jsonrpc: '2.0', id, method, params });

  beforeAll(async () => {
    // Real service on an ephemeral port (SSE mode, as in production)
    const { createHttpApp } = require('../http-server');
    const { app } = createHttpApp();
    service = createServer(app);
    await new Promise((resolve) => service.listen(0, '127.0.0.1', resolve));
    port = service.address().port;

    // Real bridge child against it
    proxy = spawn('node', [path.join(__dirname, '..', 'mcp-proxy.js')], {
      env: { ...process.env, MCP_HTTP_URL: `http://127.0.0.1:${port}/mcp` },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    proxy.stdout.setEncoding('utf8');
    proxy.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk;
      let idx;
      while ((idx = stdoutBuffer.indexOf('\n')) !== -1) {
        const line = stdoutBuffer.slice(0, idx).trim();
        stdoutBuffer = stdoutBuffer.slice(idx + 1);
        if (line) {
          if (lineWaiters.length) lineWaiters.shift()(line);
          else pendingLines.push(line);
        }
      }
    });
    proxy.stderr.on('data', (chunk) => { /* service/proxy diagnostics */ });
  }, 20000);

  afterAll(async () => {
    if (proxy && proxy.exitCode === null) proxy.kill();
    if (service) await new Promise((resolve) => service.close(resolve));
  });

  test('agent handshake through the bridge completes', async () => {
    await send(rpc(1, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'jest-agent', version: '0.0.0' }
    }));

    const initLine = JSON.parse(await nextLine());
    expect(initLine.id).toBe(1);
    // The bridge's local SDK Server answers initialize itself (name: m365-mcp-proxy);
    // the service identity is asserted via tools/list and about round-trips below.
    expect(initLine.result.serverInfo.name).toBeDefined();
    expect(initLine.result.protocolVersion).toBeDefined();

    await send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  });

  test('tools/list through the bridge returns the shared registry', async () => {
    await send(rpc(2, 'tools/list', {}));
    const line = JSON.parse(await nextLine());
    expect(line.id).toBe(2);
    const names = line.result.tools.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining(['list-events', 'create-todo-task']));
  }, 20000);

  test('service-side tool response round-trips through the bridge', async () => {
    await send(rpc(3, 'tools/call', { name: 'about', arguments: {} }));
    const line = JSON.parse(await nextLine());
    expect(line.id).toBe(3);
    expect(line.result.content[0].text).toContain('M365 Assistant MCP Server v2.2.4');
  }, 20000);
});
