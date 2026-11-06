/**
 * Microsoft To Do module for Outlook MCP server
 */
const handleListTodoLists = require('./lists');
const handleListTodoTasks = require('./tasks');
const handleCreateTodoTask = require('./create-task');
const handleUpdateTodoTask = require('./update-task');
const handleCompleteTodoTask = require('./complete-task');

const todoTools = [
  {
    name: 'list-todo-lists',
    description: 'Lists Microsoft To Do task lists available to the signed-in account',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of task lists to retrieve (default: 10, max: 50)'
        }
      },
      required: []
    },
    handler: handleListTodoLists,
  },
  {
    name: 'list-todo-tasks',
    description: 'Lists tasks in a Microsoft To Do task list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The Microsoft To Do task list ID to inspect'
        },
        count: {
          type: 'number',
          description: 'Number of tasks to retrieve (default: 10, max: 50)'
        }
      },
      required: ['listId']
    },
    handler: handleListTodoTasks,
  },
  {
    name: 'create-todo-task',
    description: 'Creates a task in a Microsoft To Do task list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The Microsoft To Do task list ID to create the task in'
        },
        title: {
          type: 'string',
          description: 'The task title (required)'
        },
        body: {
          type: 'string',
          description: 'Optional task notes (plain text)'
        },
        importance: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Task importance (default: normal)'
        },
        dueDateTime: {
          type: 'string',
          description: 'Due date/time in ISO 8601 format (optional)'
        },
        timeZone: {
          type: 'string',
          description: 'IANA or Windows timezone for the due date (default: server DEFAULT_TIMEZONE)'
        }
      },
      required: ['listId', 'title']
    },
    handler: handleCreateTodoTask,
  },
  {
    name: 'update-todo-task',
    description: 'Updates fields of an existing Microsoft To Do task (title, notes, importance, due date, status)',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The Microsoft To Do task list ID containing the task'
        },
        taskId: {
          type: 'string',
          description: 'The Microsoft To Do task ID to update'
        },
        title: {
          type: 'string',
          description: 'New task title'
        },
        body: {
          type: 'string',
          description: 'New task notes (plain text)'
        },
        importance: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'New task importance'
        },
        status: {
          type: 'string',
          enum: ['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred'],
          description: 'New task status'
        },
        dueDateTime: {
          type: 'string',
          description: 'New due date/time in ISO 8601 format; pass null to clear'
        },
        timeZone: {
          type: 'string',
          description: 'IANA or Windows timezone for the due date (default: server DEFAULT_TIMEZONE)'
        }
      },
      required: ['listId', 'taskId']
    },
    handler: handleUpdateTodoTask,
  },
  {
    name: 'complete-todo-task',
    description: 'Marks a Microsoft To Do task as completed',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The Microsoft To Do task list ID containing the task'
        },
        taskId: {
          type: 'string',
          description: 'The Microsoft To Do task ID to complete'
        }
      },
      required: ['listId', 'taskId']
    },
    handler: handleCompleteTodoTask,
  }
];

module.exports = {
  todoTools,
  handleListTodoLists,
  handleListTodoTasks,
  handleCreateTodoTask,
  handleUpdateTodoTask,
  handleCompleteTodoTask,
};
