const path = require('path');
const os = require('os');

describe('env-loader', () => {
  const REAL_FS = jest.requireActual('fs');

  let tmpDir;
  let serverEnvPath;
  let workspaceEnvPath;

  beforeAll(() => {
    tmpDir = REAL_FS.mkdtempSync(path.join(os.tmpdir(), 'm365-env-'));
    serverEnvPath = path.join(tmpDir, 'server.env');
    workspaceEnvPath = path.join(tmpDir, 'workspace.env');
    REAL_FS.writeFileSync(serverEnvPath, [
      '# comment line',
      'MS_CLIENT_ID=server-id',
      'MS_CLIENT_SECRET=server-secret',
      'SOMEBODY_ELSES_KEY=should-not-load',
      'MS_SCOPES="offline_access User.Read"',
      ''
    ].join('\n'));
    REAL_FS.writeFileSync(workspaceEnvPath, [
      'MS_CLIENT_ID=workspace-id',
      'MS_CLIENT_SECRET=workspace-secret',
      'MS_TENANT_ID=workspace-tenant',
      'SOMEBODY_ELSES_KEY=still-should-not-load',
      ''
    ].join('\n'));
  });

  afterAll(() => {
    REAL_FS.rmSync(tmpDir, { recursive: true, force: true });
  });

  let savedEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    delete process.env.M365_ENV_FILE;
    delete process.env.MS_CLIENT_ID;
    delete process.env.MS_CLIENT_SECRET;
    delete process.env.MS_TENANT_ID;
    delete process.env.MS_SCOPES;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  function loadLoader() {
    return require('../env');
  }

  test('parses .env-style content: comments, quotes, key=value', () => {
    const { parseEnvFile } = loadLoader();
    const parsed = parseEnvFile('# c\nA=1\nB = 2\nC="quoted"\nD=\'sq\'\nnoequals\n');
    expect(parsed).toEqual({ A: '1', B: '2', C: 'quoted', D: 'sq' });
  });

  test('loads server-folder .env, whitelist only, nothing else reaches process.env', () => {
    const { loadServerEnv } = loadLoader();
    const applied = loadServerEnv({ envFilePath: serverEnvPath });

    expect(process.env.MS_CLIENT_ID).toBe('server-id');
    expect(process.env.MS_CLIENT_SECRET).toBe('server-secret');
    expect(process.env.MS_SCOPES).toBe('offline_access User.Read');
    expect(process.env.SOMEBODY_ELSES_KEY).toBeUndefined();
    expect(applied).toContain('MS_CLIENT_ID');
    expect(applied).not.toContain('SOMEBODY_ELSES_KEY');
  });

  test('M365_ENV_FILE wins over the server-folder default; existing process.env never overwritten', () => {
    process.env.M365_ENV_FILE = workspaceEnvPath;
    process.env.MS_CLIENT_ID = 'preset-in-process';

    const { loadServerEnv } = loadLoader();
    const applied = loadServerEnv({ envFilePath: serverEnvPath });

    expect(process.env.MS_CLIENT_ID).toBe('preset-in-process');
    expect(process.env.MS_CLIENT_SECRET).toBe('workspace-secret');
    expect(process.env.MS_TENANT_ID).toBe('workspace-tenant');
    expect(applied).not.toContain('MS_CLIENT_ID');
  });

  test('missing files are skipped without throwing', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { loadServerEnv } = loadLoader();

    expect(() => loadServerEnv({
      envFilePath: path.join(tmpDir, 'nope.env'),
      skipDefaultCheck: true
    })).not.toThrow();

    consoleErrorSpy.mockRestore();
  });
});
