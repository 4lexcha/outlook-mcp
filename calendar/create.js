/**
 * Create event functionality
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
 * Create event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateEvent(args) {
  const { subject, start, end, attendees, body, location, recurrence } = args;

  if (!subject || !start || !end) {
    return {
      content: [{
        type: "text",
        text: "Subject, start, and end times are required to create an event."
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events`;

    // Request body
    const bodyContent = {
      subject,
      start: { dateTime: start.dateTime || start, timeZone: start.timeZone || DEFAULT_TIMEZONE },
      end: { dateTime: end.dateTime || end, timeZone: end.timeZone || DEFAULT_TIMEZONE },
      attendees: attendees?.map(email => ({ emailAddress: { address: email }, type: "required" })),
      body: { contentType: "HTML", content: body || "" }
    };

    if (location !== undefined) {
      bodyContent.location = { displayName: location };
    }

    const reminderError = applyReminder(bodyContent, args.reminderMinutes);
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
      bodyContent.recurrence = built.recurrence;
    }

    // Make API call
    const response = await callGraphAPI(accessToken, 'POST', endpoint, bodyContent);

    return {
      content: [{
        type: "text",
        text: `Event '${subject}' has been successfully created.`
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
        text: `Error creating event: ${error.message}`
      }]
    };
  }
}

module.exports = handleCreateEvent;