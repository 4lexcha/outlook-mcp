/**
 * Calendar module for Outlook MCP server
 */
const handleListEvents = require('./list');
const handleListCalendars = require('./calendars');
const handleDeclineEvent = require('./decline');
const handleCreateEvent = require('./create');
const handleUpdateEvent = require('./update');
const handleCancelEvent = require('./cancel');
const handleDeleteEvent = require('./delete');
const { recurrenceToolProperty } = require('../utils/recurrence');

// Calendar tool definitions
const calendarTools = [
  {
    name: "list-calendars",
    description: "Lists all calendars available to the signed-in account (use a calendar ID with list-events)",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of calendars to retrieve (default: 25, max: 100)"
        }
      },
      required: []
    },
    handler: handleListCalendars
  },
  {
    name: "list-events",
    description: "Lists events in a calendar within a date range (default calendar unless calendarId is given)",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "Optional calendar ID from list-calendars (default: the default calendar)"
        },
        count: {
          type: "number",
          description: "Number of events to retrieve (default: 10, max: 50)"
        },
        startDateTime: {
          type: "string",
          description: "ISO 8601 start date/time for the query range (default: now)"
        },
        endDateTime: {
          type: "string",
          description: "ISO 8601 end date/time for the query range (default: startDateTime + 30 days)"
        }
      },
      required: []
    },
    handler: handleListEvents
  },
  {
    name: "decline-event",
    description: "Declines a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to decline"
        },
        comment: {
          type: "string",
          description: "Optional comment for declining the event"
        }
      },
      required: ["eventId"]
    },
    handler: handleDeclineEvent
  },
  {
    name: "create-event",
    description: "Creates a new calendar event",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "The subject of the event"
        },
        start: {
          type: "string",
          description: "The start time of the event in ISO 8601 format"
        },
        end: {
          type: "string",
          description: "The end time of the event in ISO 8601 format"
        },
        attendees: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of attendee email addresses"
        },
        body: {
          type: "string",
          description: "Optional body content for the event"
        },
        location: {
          type: "string",
          description: "Optional display name of the event location"
        },
        reminderMinutes: {
          type: "number",
          description: "Minutes before the event start to show the reminder popup; 0 disables the popup (default: Graph default, 15 minutes)"
        },
        recurrence: recurrenceToolProperty
      },
      required: ["subject", "start", "end"]
    },
    handler: handleCreateEvent
  },
  {
    name: "update-event",
    description: "Updates fields of an existing calendar event (PATCHes only the provided fields)",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to update"
        },
        subject: {
          type: "string",
          description: "New subject of the event"
        },
        start: {
          type: "string",
          description: "New start time of the event in ISO 8601 format"
        },
        end: {
          type: "string",
          description: "New end time of the event in ISO 8601 format"
        },
        body: {
          type: "string",
          description: "New body content for the event"
        },
        location: {
          type: "string",
          description: "New display name of the event location"
        },
        reminderMinutes: {
          type: "number",
          description: "Minutes before the event start to show the reminder popup; 0 disables the popup"
        },
        recurrence: recurrenceToolProperty
      },
      required: ["eventId"]
    },
    handler: handleUpdateEvent
  },
  {
    name: "cancel-event",
    description: "Cancels a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to cancel"
        },
        comment: {
          type: "string",
          description: "Optional comment for cancelling the event"
        }
      },
      required: ["eventId"]
    },
    handler: handleCancelEvent
  },
  {
    name: "delete-event",
    description: "Deletes a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to delete"
        }
      },
      required: ["eventId"]
    },
    handler: handleDeleteEvent
  }
];

module.exports = {
  calendarTools,
  handleListEvents,
  handleListCalendars,
  handleDeclineEvent,
  handleCreateEvent,
  handleUpdateEvent,
  handleCancelEvent,
  handleDeleteEvent
};
