const request = require('supertest');
const { createHttpApp } = require('../http-server');

// JSON-response mode: simpler to assert; the SSE production path is covered
// end-to-end by test/mcp-proxy.test.js against a real service process.
describe('http-server (Streamable HTTP service)', () => {
  const INITIALIZE = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.0' }
    }
  };
  const HEADERS = { Accept: 'application/json, text/event-stream' };

  let app;

  beforeEach(() => {
    ({ app } = createHttpApp({ jsonResponse: true }));
  });

  test('health endpoint reports server name and version', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('m365-assistant');
    expect(res.body.sessions).toBe(0);
  });

  test('initialize opens a session and returns server info', async () => {
    const res = await request(app).post('/mcp').set(HEADERS).send(INITIALIZE);

    expect(res.status).toBe(200);
    expect(res.headers['mcp-session-id']).toBeDefined();
    const body = JSON.parse(res.text);
    expect(body.result.serverInfo.name).toBe('m365-assistant');
    expect(body.result.serverInfo.version).toBe('2.2.3');
  });

  test('tools/list within the session returns the full tool registry', async () => {
    const init = await request(app).post('/mcp').set(HEADERS).send(INITIALIZE);
    const sessionId = init.headers['mcp-session-id'];

    const res = await request(app)
      .post('/mcp')
      .set(HEADERS)
      .set('mcp-session-id', sessionId)
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    const names = body.result.tools.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining([
      'list-events', 'list-calendars', 'create-event',
      'list-todo-lists', 'create-todo-task', 'update-todo-task', 'complete-todo-task',
      'check-auth-status'
    ]));
  });

  test('request without session and without initialize is rejected', async () => {
    const res = await request(app)
      .post('/mcp')
      .set(HEADERS)
      .send({ jsonrpc: '2.0', id: 3, method: 'tools/list' });

    expect(res.status).toBe(400);
  });

  test('unknown session id is rejected with 404', async () => {
    const res = await request(app)
      .post('/mcp')
      .set(HEADERS)
      .set('mcp-session-id', 'no-such-session')
      .send({ jsonrpc: '2.0', id: 4, method: 'tools/list' });

    expect(res.status).toBe(404);
  });

  test('DELETE closes the session; subsequent requests get 404', async () => {
    const init = await request(app).post('/mcp').set(HEADERS).send(INITIALIZE);
    const sessionId = init.headers['mcp-session-id'];

    const del = await request(app).delete('/mcp').set('mcp-session-id', sessionId);
    expect(del.status).toBe(200);

    const after = await request(app)
      .post('/mcp')
      .set(HEADERS)
      .set('mcp-session-id', sessionId)
      .send({ jsonrpc: '2.0', id: 5, method: 'tools/list' });
    expect(after.status).toBe(404);
  });
});
