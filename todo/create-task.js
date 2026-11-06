/**
 * Create a Microsoft To Do task
 */
const config = require('../config');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Create task handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateTodoTask(args = {}) {
  const listId = args.listId;
  const title = args.title;

  if (!listId) {
    return {
      content: [{ type: 'text', text: 'A Microsoft To Do listId is required.' }]
    };
  }
  if (!title) {
    return {
      content: [{ type: 'text', text: 'A task title is required.' }]
    };
  }

  const taskPayload = { title };

  if (args.importance !== undefined) {
    if (!['low', 'normal', 'high'].includes(args.importance)) {
      return {
        content: [{ type: 'text', text: 'Importance must be one of: low, normal, high.' }]
      };
    }
    taskPayload.importance = args.importance;
  }
  if (args.body) {
    taskPayload.body = { content: args.body, contentType: 'text' };
  }
  if (args.dueDateTime) {
    taskPayload.dueDateTime = {
      dateTime: args.dueDateTime,
      timeZone: args.timeZone || config.DEFAULT_TIMEZONE
    };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const task = await callGraphAPI(
      accessToken,
      'POST',
      `me/todo/lists/${listId}/tasks`,
      taskPayload
    );

    return {
      content: [{
        type: 'text',
        text: `Task created successfully.\nTitle: ${task.title}\nStatus: ${task.status}\nID: ${task.id}`
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
      content: [{ type: 'text', text: `Error creating Microsoft To Do task: ${error.message}` }]
    };
  }
}

module.exports = handleCreateTodoTask;
