/**
 * Create a Microsoft To Do task list
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Create task list handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateTodoList(args = {}) {
  const displayName = args.displayName;

  if (!displayName || typeof displayName !== 'string') {
    return {
      content: [{ type: 'text', text: 'A displayName for the task list is required.' }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const list = await callGraphAPI(
      accessToken,
      'POST',
      'me/todo/lists',
      { displayName }
    );

    return {
      content: [{
        type: 'text',
        text: `Task list created successfully.\nName: ${list.displayName}\nID: ${list.id}`
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
      content: [{ type: 'text', text: `Error creating Microsoft To Do task list: ${error.message}` }]
    };
  }
}

module.exports = handleCreateTodoList;
