const handleUpdateEvent = require('../../calendar/update');
const { DEFAULT_TIMEZONE } = require('../../config');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleUpdateEvent', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  const payloadOf = () => callGraphAPI.mock.calls[0][3];

  test('requires eventId', async () => {
    const result = await handleUpdateEvent({ subject: 'X' });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('Event ID is required');
  });

  test('patches only the provided fields', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'New subject' });

    const result = await handleUpdateEvent({ eventId: 'e1', subject: 'New subject' });

    expect(callGraphAPI).toHaveBeenCalledWith(mockAccessToken, 'PATCH', 'me/events/e1', { subject: 'New subject' });
    expect(result.content[0].text).toContain('updated successfully');
  });

  test('patches start and end with the default timezone', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({
      eventId: 'e1',
      start: '2026-11-10T10:00:00',
      end: '2026-11-10T11:00:00'
    });

    const payload = payloadOf();
    expect(payload.start).toEqual({ dateTime: '2026-11-10T10:00:00', timeZone: DEFAULT_TIMEZONE });
    expect(payload.end).toEqual({ dateTime: '2026-11-10T11:00:00', timeZone: DEFAULT_TIMEZONE });
  });

  test('accepts start/end as objects with an explicit timezone', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({
      eventId: 'e1',
      start: { dateTime: '2026-11-10T10:00:00', timeZone: 'Pacific Standard Time' }
    });

    expect(payloadOf().start).toEqual({ dateTime: '2026-11-10T10:00:00', timeZone: 'Pacific Standard Time' });
  });

  test('reminderMinutes 0 disables the reminder popup', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({ eventId: 'e1', reminderMinutes: 0 });

    expect(payloadOf()).toEqual({ isReminderOn: false });
  });

  test('reminderMinutes 30 schedules the popup 30 minutes before start', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({ eventId: 'e1', reminderMinutes: 30 });

    expect(payloadOf()).toEqual({ isReminderOn: true, reminderMinutesBeforeStart: 30 });
  });

  test('rejects a negative reminderMinutes without calling Graph', async () => {
    const result = await handleUpdateEvent({ eventId: 'e1', reminderMinutes: -5 });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('reminderMinutes');
  });

  test('maps location to a Graph location object', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({ eventId: 'e1', location: 'Office' });

    expect(payloadOf().location).toEqual({ displayName: 'Office' });
  });

  test('maps recurrence to a Graph pattern/range', async () => {
    callGraphAPI.mockResolvedValue({ id: 'e1', subject: 'S' });

    await handleUpdateEvent({
      eventId: 'e1',
      recurrence: { type: 'weekly', startDate: '2026-11-09', endDate: '2026-12-09' }
    });

    expect(payloadOf().recurrence).toEqual({
      pattern: { type: 'weekly', interval: 1, daysOfWeek: ['monday'], firstDayOfWeek: 'monday' },
      range: { type: 'endDate', startDate: '2026-11-09', endDate: '2026-12-09' }
    });
  });

  test('rejects an invalid recurrence without calling Graph', async () => {
    const result = await handleUpdateEvent({ eventId: 'e1', recurrence: { type: 'daily' } });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('startDate');
  });

  test('reports nothing to update when no known field is provided', async () => {
    const result = await handleUpdateEvent({ eventId: 'e1' });

    expect(callGraphAPI).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('Nothing to update');
  });
});
