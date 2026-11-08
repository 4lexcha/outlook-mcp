/**
 * Update event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { DEFAULT_TIMEZONE } = require('../config');
const { buildRecurrence } = require('../utils/recurrence');

/**
 * Applies reminder argument to the payload:
 * 0 disables the popup (isReminderOn: false), N > 0 schedules it N minutes before start.
 * @param {object} payload - Event payload being built
 * @param {*} reminderMinutes - reminder argument value
 * @returns {string|null} - error message or null
 */
function applyReminder(payload, reminderMinutes) {
  if (reminderMinutes === undefined) {
    return null;
  }
  const minutes = Number(reminderMinutes);
  if (!Number.isInteger(minutes) || minutes < 0) {
    return 'reminderMinutes must be a non-negative integer of minutes before the event start.';
  }
  if (minutes === 0) {
    payload.isReminderOn = false;
  } else {
    payload.isReminderOn = true;
    payload.reminderMinutesBeforeStart = minutes;
  }
  return null;
}

/**
 * Applies start/end arguments to the payload (string or {dateTime, timeZone}).
 * @param {object} payload - Event payload being built
 * @param {*} start - start argument
 * @param {*} end - end argument
 * @returns {string|null} - error message or null
 */
function applyStartEnd(payload, start, end) {
  if (start !== undefined) {
    payload.start = { dateTime: start.dateTime || start, timeZone: start.timeZone || DEFAULT_TIMEZONE };
  }
  if (end !== undefined) {
    payload.end = { dateTime: end.dateTime || end, timeZone: end.timeZone || DEFAULT_TIMEZONE };
  }
  return null;
}

/**
 * Update event handler: PATCHes only the fields that are provided.
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleUpdateEvent(args = {}) {
  const { eventId, subject, body, location, recurrence, reminderMinutes } = args;

  if (!eventId) {
    return {
      content: [{
        type: "text",
        text: "Event ID is required to update an event."
      }]
    };
  }

  const payload = {};

  if (subject !== undefined) {
    payload.subject = subject;
  }
  applyStartEnd(payload, args.start, args.end);
  if (body !== undefined) {
    payload.body = { contentType: "HTML", content: body };
  }
  if (location !== undefined) {
    payload.location = { displayName: location };
  }

  const reminderError = applyReminder(payload, reminderMinutes);
  if (reminderError) {
    return {
      content: [{ type: "text", text: reminderError }]
    };
  }

  if (recurrence !== undefined) {
    const built = buildRecurrence(recurrence);
    if (built.error) {
      return {
        content: [{ type: "text", text: built.error }]
      };
    }
    payload.recurrence = built.recurrence;
  }

  if (Object.keys(payload).length === 0) {
    return {
      content: [{
        type: "text",
        text: "Nothing to update: provide at least one of subject, start, end, body, location, reminderMinutes, recurrence."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const event = await callGraphAPI(accessToken, 'PATCH', `me/events/${eventId}`, payload);

    return {
      content: [{
        type: "text",
        text: `Event updated successfully.\nSubject: ${event.subject || 'n/a'}\nID: ${event.id || eventId}`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error updating event: ${error.message}`
      }]
    };
  }
}

module.exports = handleUpdateEvent;
