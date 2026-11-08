const handleCreateTodoTask = require('../../todo/create-task');
const handleUpdateTodoTask = require('../../todo/update-task');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('Microsoft To Do recurrence handling', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  describe('create-todo-task', () => {
    test('sends a mapped Graph recurrence', async () => {
      callGraphAPI.mockResolvedValue({ id: 't1', title: 'Sweep', status: 'notStarted' });

      const result = await handleCreateTodoTask({
        listId: 'L1',
        title: 'Sweep',
        recurrence: { type: 'monthly', startDate: '2026-11-10' }
      });

      expect(callGraphAPI.mock.calls[0][3].recurrence).toEqual({
        pattern: { type: 'absoluteMonthly', interval: 1, dayOfMonth: 10 },
        range: { type: 'noEnd', startDate: '2026-11-10' }
      });
      expect(result.content[0].text).toContain('Task created successfully');
    });

    test('rejects an invalid recurrence without calling Graph', async () => {
      const result = await handleCreateTodoTask({
        listId: 'L1',
        title: 'Sweep',
        recurrence: { type: 'weekly', startDate: '2026-11-09', daysOfWeek: ['someday'] }
      });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('daysOfWeek');
    });
  });

  describe('update-todo-task', () => {
    test('sends a mapped Graph recurrence', async () => {
      callGraphAPI.mockResolvedValue({ id: 't1', title: 'Sweep', status: 'notStarted' });

      await handleUpdateTodoTask({
        listId: 'L1',
        taskId: 't1',
        recurrence: { type: 'weekly', startDate: '2026-11-09', daysOfWeek: ['friday'] }
      });

      expect(callGraphAPI.mock.calls[0][3].recurrence).toEqual({
        pattern: {
          type: 'weekly', interval: 1, daysOfWeek: ['friday'], firstDayOfWeek: 'monday'
        },
        range: { type: 'noEnd', startDate: '2026-11-09' }
      });
    });

    test('recurrence null clears the recurrence in Graph', async () => {
      callGraphAPI.mockResolvedValue({ id: 't1', title: 'Sweep', status: 'notStarted' });

      await handleUpdateTodoTask({ listId: 'L1', taskId: 't1', recurrence: null });

      expect(callGraphAPI.mock.calls[0][3]).toEqual({ recurrence: null });
    });

    test('rejects an invalid recurrence without calling Graph', async () => {
      const result = await handleUpdateTodoTask({
        listId: 'L1',
        taskId: 't1',
        recurrence: { type: 'daily', startDate: '09.11.2026' }
      });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('startDate');
    });
  });
});
