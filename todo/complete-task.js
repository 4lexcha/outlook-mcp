/**
 * Complete (close) a Microsoft To Do task
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Complete task handler: sets status to 'completed' with completedDateTime.
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCompleteTodoTask(args = {}) {
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
    const task = await callGraphAPI(
      accessToken,
      'PATCH',
      `me/todo/lists/${listId}/tasks/${taskId}`,
      {
        status: 'completed',
        completedDateTime: {
          dateTime: new Date().toISOString(),
          timeZone: 'UTC'
        }
      }
    );

    return {
      content: [{
        type: 'text',
        text: `Task completed.\nTitle: ${task.title}\nStatus: ${task.status}\nID: ${task.id}`
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
      content: [{ type: 'text', text: `Error completing Microsoft To Do task: ${error.message}` }]
    };
  }
}

module.exports = handleCompleteTodoTask;
