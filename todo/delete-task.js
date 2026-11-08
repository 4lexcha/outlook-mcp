/**
 * Delete a Microsoft To Do task
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Delete task handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeleteTodoTask(args = {}) {
  const listId = args.listId;
  const taskId = args.taskId;

  if (!listId) {
    return {
      content: [{ type: 'text', text: 'A Microsoft To Do listId is required.' }]
    };
  }
  if (!taskId) {
    return {
      content: [{ type: 'text', text: 'A Microsoft To Do taskId is required.' }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();
    await callGraphAPI(
      accessToken,
      'DELETE',
      `me/todo/lists/${listId}/tasks/${taskId}`
    );

    return {
      content: [{
        type: 'text',
        text: `Task with ID ${taskId} has been successfully deleted from list ${listId}.`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }]
      };
    }

    if (error.message === 'UNAUTHORIZED') {
      return {
        content: [{
          type: 'text',
          text: 'Microsoft To Do write access is not authorized for the current token. Re-authenticate after granting Tasks.ReadWrite.'
        }]
      };
    }

    return {
      content: [{ type: 'text', text: `Error deleting Microsoft To Do task: ${error.message}` }]
    };
  }
}

module.exports = handleDeleteTodoTask;
