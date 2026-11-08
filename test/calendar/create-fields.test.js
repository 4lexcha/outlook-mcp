const handleCreateEvent = require('../../calendar/create');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleCreateEvent location/reminder/recurrence fields', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  const payloadOf = () => callGraphAPI.mock.calls[0][3];

  const baseArgs = {
    subject: 'Test Event',
    start: '2026-11-10T10:00:00',
    end: '2026-11-10T11:00:00'
  };

  test('omits location/reminder/recurrence when not provided', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1' });

    await handleCreateEvent(baseArgs);

    const payload = payloadOf();
    expect(payload.location).toBeUndefined();
    expect(payload.isReminderOn).toBeUndefined();
    expect(payload.reminderMinutesBeforeStart).toBeUndefined();
    expect(payload.recurrence).toBeUndefined();
  });

  test('maps location to a Graph location object', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1' });

    await handleCreateEvent({ ...baseArgs, location: 'Room 4' });

    expect(payloadOf().location).toEqual({ displayName: 'Room 4' });
  });

  test('reminderMinutes 0 disables the reminder popup', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1' });

    await handleCreateEvent({ ...baseArgs, reminderMinutes: 0 });

    const payload = payloadOf();
    expect(payload.isReminderOn).toBe(false);
    expect(payload.reminderMinutesBeforeStart).toBeUndefined();
  });

  test('reminderMinutes 45 schedules the popup 45 minutes before start', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1' });

    await handleCreateEvent({ ...baseArgs, reminderMinutes: 45 });

    const payload = payloadOf();
    expect(payload.isReminderOn).toBe(true);
    expect(payload.reminderMinutesBeforeStart).toBe(45);
  });

  test('rejects a non-integer reminderMinutes without calling Graph', async () => {
    const result = await handleCreateEvent({ ...baseArgs, reminderMinutes: 'soon' });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('reminderMinutes');
  });

  test('maps recurrence to a Graph pattern/range', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1' });

    await handleCreateEvent({
      ...baseArgs,
      recurrence: { type: 'weekly', daysOfWeek: ['thursday'], startDate: '2026-11-12' }
    });

    expect(payloadOf().recurrence).toEqual({
      pattern: { type: 'weekly', interval: 1, daysOfWeek: ['thursday'], firstDayOfWeek: 'monday' },
      range: { type: 'noEnd', startDate: '2026-11-12' }
    });
  });

  test('rejects an invalid recurrence without calling Graph', async () => {
    const result = await handleCreateEvent({
      ...baseArgs,
      recurrence: { type: 'monthly', startDate: '2026-11-10', numberOfOccurrences: 0 }
    });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('numberOfOccurrences');
  });
});
