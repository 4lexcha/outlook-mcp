/**
 * List calendars functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * List calendars handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleListCalendars(args = {}) {
  const count = Math.min(args.count || 25, 100);

  try {
    const accessToken = await ensureAuthenticated();

    const response = await callGraphAPI(accessToken, 'GET', 'me/calendars', null, {
      $top: count,
      // NB: the calendar entity uses `name` (displayName belongs to calendarGroup)
      $select: 'id,name,color,isDefaultCalendar'
    });

    if (!response.value || response.value.length === 0) {
      return {
        content: [{ type: 'text', text: 'No calendars found.' }]
      };
    }

    const calendarList = response.value.map((calendar, index) => {
      const name = calendar.name || '(unnamed calendar)';
      const marker = calendar.isDefaultCalendar ? ' [default]' : '';
      return `${index + 1}. ${name}${marker}\nID: ${calendar.id}\n`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${response.value.length} calendars:\n\n${calendarList}`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: 'text',
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Error listing calendars: ${error.message}`
      }]
    };
  }
}

module.exports = handleListCalendars;
