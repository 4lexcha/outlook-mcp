const handleDeleteTodoTask = require('../../todo/delete-task');
const handleCreateTodoList = require('../../todo/create-list');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('Microsoft To Do delete/list handlers', () => {
  const mockAccessToken = 'dummy_access_token';

  beforeEach(() => {
    callGraphAPI.mockReset();
    ensureAuthenticated.mockReset();
    ensureAuthenticated.mockResolvedValue(mockAccessToken);
  });

  describe('handleDeleteTodoTask', () => {
    test('calls Graph DELETE and reports success', async () => {
      callGraphAPI.mockResolvedValue({});

      const result = await handleDeleteTodoTask({ listId: 'L1', taskId: 'T1' });

      expect(callGraphAPI).toHaveBeenCalledWith(mockAccessToken, 'DELETE', 'me/todo/lists/L1/tasks/T1');
      expect(result.content[0].text).toContain('successfully deleted');
      expect(result.content[0].text).toContain('T1');
    });

    test('requires listId', async () => {
      const result = await handleDeleteTodoTask({ taskId: 'T1' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('listId is required');
    });

    test('requires taskId', async () => {
      const result = await handleDeleteTodoTask({ listId: 'L1' });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('taskId is required');
    });

    test('maps UNAUTHORIZED to the re-authentication message', async () => {
      callGraphAPI.mockRejectedValue(new Error('UNAUTHORIZED'));

      const result = await handleDeleteTodoTask({ listId: 'L1', taskId: 'T1' });

      expect(result.content[0].text).toContain('Re-authenticate');
    });
  });

  describe('handleCreateTodoList', () => {
    test('creates a list and reports name and ID', async () => {
      callGraphAPI.mockResolvedValue({ id: 'newlist1', displayName: 'Errands' });

      const result = await handleCreateTodoList({ displayName: 'Errands' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken, 'POST', 'me/todo/lists', { displayName: 'Errands' }
      );
      expect(result.content[0].text).toContain('Errands');
      expect(result.content[0].text).toContain('ID: newlist1');
    });

    test('requires displayName', async () => {
      const result = await handleCreateTodoList({});

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('displayName');
    });

    test('rejects a non-string displayName', async () => {
      const result = await handleCreateTodoList({ displayName: 42 });

      expect(callGraphAPI).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('displayName');
    });

    test('maps UNAUTHORIZED to the re-authentication message', async () => {
      callGraphAPI.mockRejectedValue(new Error('UNAUTHORIZED'));

      const result = await handleCreateTodoList({ displayName: 'Errands' });

      expect(result.content[0].text).toContain('Re-authenticate');
    });
  });
});
