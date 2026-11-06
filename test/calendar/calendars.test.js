const handleListCalendars = require('../../calendar/calendars');
const handleListEvents = require('../../calendar/list');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('Calendar listing', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  describe('handleListCalendars', () => {
    test('lists calendars with ids and default marker', async () => {
      callGraphAPI.mockResolvedValue({
        value: [
          { id: 'cal-A', displayName: 'Calendar', isDefaultCalendar: true },
          { id: 'cal-B', displayName: 'Рабочий', isDefaultCalendar: false }
        ]
      });

      const result = await handleListCalendars({});

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'GET', 'me/calendars', null,
        { $top: 25, $select: 'id,displayName,color,isDefaultCalendar' }
      );
      expect(result.content[0].text).toContain('Found 2 calendars');
      expect(result.content[0].text).toContain('Calendar [default]');
      expect(result.content[0].text).toContain('ID: cal-B');
    });

    test('returns a helpful empty-state message', async () => {
      callGraphAPI.mockResolvedValue({ value: [] });

      const result = await handleListCalendars({});

      expect(result.content[0].text).toBe('No calendars found.');
    });
  });

  describe('handleListEvents with calendarId', () => {
    test('queries the given calendar calendarView when calendarId is provided', async () => {
      callGraphAPI.mockResolvedValue({ value: [] });

      await handleListEvents({
        calendarId: 'cal-B',
        startDateTime: '2026-11-10T00:00:00Z',
        endDateTime: '2026-11-11T00:00:00Z'
      });

      const endpoint = callGraphAPI.mock.calls[0][2];
      expect(endpoint).toBe('me/calendars/cal-B/calendarView');
    });

    test('queries the default calendarView without calendarId', async () => {
      callGraphAPI.mockResolvedValue({ value: [] });

      await handleListEvents({
        startDateTime: '2026-11-10T00:00:00Z',
        endDateTime: '2026-11-11T00:00:00Z'
      });

      expect(callGraphAPI.mock.calls[0][2]).toBe('me/calendarView');
    });

    test('URL-encodes the calendar id', async () => {
      callGraphAPI.mockResolvedValue({ value: [] });

      await handleListEvents({
        calendarId: 'AAMk/odd+id=',
        startDateTime: '2026-11-10T00:00:00Z',
        endDateTime: '2026-11-11T00:00:00Z'
      });

      const endpoint = callGraphAPI.mock.calls[0][2];
      expect(endpoint).toBe(`me/calendars/${encodeURIComponent('AAMk/odd+id=')}/calendarView`);
    });
  });
});
