/**
 * Update a Microsoft To Do task
 */
const config = require('../config');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Update task handler. Any of title/body/importance/dueDateTime/status may be provided;
 * only the provided fields are sent to Graph.
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleUpdateTodoTask(args = {}) {
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

  const taskPayload = {};

  if (args.title !== undefined) taskPayload.title = args.title;
  if (args.body !== undefined) taskPayload.body = { content: args.body, contentType: 'text' };
  if (args.importance !== undefined) {
    if (!['low', 'normal', 'high'].includes(args.importance)) {
      return {
        content: [{ type: 'text', text: 'Importance must be one of: low, normal, high.' }]
      };
    }
    taskPayload.importance = args.importance;
  }
  if (args.status !== undefined) {
    if (!['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred'].includes(args.status)) {
      return {
        content: [{ type: 'text', text: 'Status must be one of: notStarted, inProgress, completed, waitingOnOthers, deferred.' }]
      };
    }
    taskPayload.status = args.status;
  }
  if (args.dueDateTime !== undefined) {
    taskPayload.dueDateTime = args.dueDateTime === null
      ? null // explicit null clears the due date in Graph
      : { dateTime: args.dueDateTime, timeZone: args.timeZone || config.DEFAULT_TIMEZONE };
  }

  if (Object.keys(taskPayload).length === 0) {
    return {
      content: [{ type: 'text', text: 'Nothing to update: provide at least one of title, body, importance, dueDateTime, status.' }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const task = await callGraphAPI(
      accessToken,
      'PATCH',
      `me/todo/lists/${listId}/tasks/${taskId}`,
      taskPayload
    );

    return {
      content: [{
        type: 'text',
        text: `Task updated successfully.\nTitle: ${task.title}\nStatus: ${task.status}\nID: ${task.id}`
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
      content: [{ type: 'text', text: `Error updating Microsoft To Do task: ${error.message}` }]
    };
  }
}

module.exports = handleUpdateTodoTask;
