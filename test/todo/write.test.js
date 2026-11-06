const handleCreateTodoTask = require('../../todo/create-task');
const handleUpdateTodoTask = require('../../todo/update-task');
const handleCompleteTodoTask = require('../../todo/complete-task');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const config = require('../../config');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('Microsoft To Do write handlers', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  describe('handleCreateTodoTask', () => {
    test('creates a task with title only', async () => {
      callGraphAPI.mockResolvedValue({ id: 't1', title: 'Buy milk', status: 'notStarted' });

      const result = await handleCreateTodoTask({ listId: 'L1', title: 'Buy milk' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'POST', 'me/todo/lists/L1/tasks', { title: 'Buy milk' }
      );
      expect(result.content[0].text).toContain('Task created successfully');
      expect(result.content[0].text).toContain('ID: t1');
    });

    test('sends body, importance and dueDateTime with DEFAULT_TIMEZONE', async () => {
      callGraphAPI.mockResolvedValue({ id: 't2', title: 'Plan', status: 'notStarted' });

      await handleCreateTodoTask({
        listId: 'L1',
        title: 'Plan',
        body: 'Notes here',
        importance: 'high',
        dueDateTime: '2026-11-10T09:00:00'
      });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'POST', 'me/todo/lists/L1/tasks', {
          title: 'Plan',
          body: { content: 'Notes here', contentType: 'text' },
          importance: 'high',
          dueDateTime: { dateTime: '2026-11-10T09:00:00', timeZone: config.DEFAULT_TIMEZONE }
        }
      );
    });

    test('rejects invalid importance without calling Graph', async () => {
      const result = await handleCreateTodoTask({ listId: 'L1', title: 'X', importance: 'urgent' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Importance must be one of');
    });

    test('requires listId and title', async () => {
      const noList = await handleCreateTodoTask({ title: 'X' });
      const noTitle = await handleCreateTodoTask({ listId: 'L1' });

      expect(noList.content[0].text).toContain('listId is required');
      expect(noTitle.content[0].text).toContain('title is required');
      expect(callGraphAPI).not.toHaveBeenCalled();
    });

    test('explains re-auth on UNAUTHORIZED', async () => {
      callGraphAPI.mockRejectedValue(new Error('UNAUTHORIZED'));

      const result = await handleCreateTodoTask({ listId: 'L1', title: 'X' });

      expect(result.content[0].text).toContain('Re-authenticate after granting Tasks.ReadWrite');
    });
  });

  describe('handleUpdateTodoTask', () => {
    test('sends only provided fields', async () => {
      callGraphAPI.mockResolvedValue({ id: 't3', title: 'New', status: 'inProgress' });

      await handleUpdateTodoTask({ listId: 'L1', taskId: 't3', title: 'New', status: 'inProgress' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'PATCH', 'me/todo/lists/L1/tasks/t3', { title: 'New', status: 'inProgress' }
      );
    });

    test('clears due date with explicit null', async () => {
      callGraphAPI.mockResolvedValue({ id: 't3', title: 'X', status: 'notStarted' });

      await handleUpdateTodoTask({ listId: 'L1', taskId: 't3', dueDateTime: null });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'PATCH', 'me/todo/lists/L1/tasks/t3', { dueDateTime: null }
      );
    });

    test('rejects empty update without calling Graph', async () => {
      const result = await handleUpdateTodoTask({ listId: 'L1', taskId: 't3' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Nothing to update');
    });

    test('rejects invalid status', async () => {
      const result = await handleUpdateTodoTask({ listId: 'L1', taskId: 't3', status: 'done' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Status must be one of');
    });
  });

  describe('handleCompleteTodoTask', () => {
    test('marks the task completed with completedDateTime', async () => {
      callGraphAPI.mockResolvedValue({ id: 't4', title: 'Done thing', status: 'completed' });

      const result = await handleCompleteTodoTask({ listId: 'L1', taskId: 't4' });

      const [token, method, endpoint, payload] = callGraphAPI.mock.calls[0];
      expect(token).toBe(mockAccessToken);
      expect(method).toBe('PATCH');
      expect(endpoint).toBe('me/todo/lists/L1/tasks/t4');
      expect(payload.status).toBe('completed');
      expect(payload.completedDateTime.timeZone).toBe('UTC');
      expect(result.content[0].text).toContain('Task completed');
    });

    test('requires listId and taskId', async () => {
      const result = await handleCompleteTodoTask({ listId: 'L1' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('taskId is required');
    });
  });
});
