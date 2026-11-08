/**
 * Recurrence mapping helper (shared by To Do tasks and calendar events)
 *
 * Tool arguments accept a simplified recurrence object:
 *   { type, interval?, daysOfWeek?, dayOfMonth?, month?, startDate, endDate?|numberOfOccurrences? }
 *
 * It is mapped into the Microsoft Graph recurrence structure:
 *   { pattern: { type, interval, ... }, range: { type, startDate, ... } }
 * Graph types used: daily, weekly, absoluteMonthly, absoluteYearly.
 * Range type is inferred: endDate -> 'endDate', numberOfOccurrences -> 'numbered', else 'noEnd'.
 */

const GRAPH_PATTERN_TYPES = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'absoluteMonthly',
  yearly: 'absoluteYearly'
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function weekdayOf(dateStr) {
  const { year, month, day } = parseDateParts(dateStr);
  // JS getDay(): 0 = Sunday ... 6 = Saturday; WEEKDAYS starts on monday
  return WEEKDAYS[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7];
}

/**
 * Builds a Graph recurrence object from simplified tool arguments.
 * @param {object} rec - Simplified recurrence argument
 * @returns {object} - { recurrence } on success or { error } with a message
 */
function buildRecurrence(rec) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return { error: 'recurrence must be an object.' };
  }

  const graphType = GRAPH_PATTERN_TYPES[rec.type];
  if (!graphType) {
    return { error: `recurrence.type must be one of: ${Object.keys(GRAPH_PATTERN_TYPES).join(', ')}.` };
  }

  if (!rec.startDate || !DATE_RE.test(rec.startDate)) {
    return { error: 'recurrence.startDate is required in YYYY-MM-DD format.' };
  }

  const interval = rec.interval === undefined ? 1 : Number(rec.interval);
  if (!Number.isInteger(interval) || interval < 1) {
    return { error: 'recurrence.interval must be a positive integer.' };
  }

  const { month: startMonth, day: startDay } = parseDateParts(rec.startDate);
  const pattern = { type: graphType, interval };

  if (graphType === 'weekly') {
    const days = rec.daysOfWeek === undefined ? [weekdayOf(rec.startDate)] : rec.daysOfWeek;
    if (!Array.isArray(days) || days.length === 0 || days.some(d => !WEEKDAYS.includes(d))) {
      return { error: `recurrence.daysOfWeek must include at least one of: ${WEEKDAYS.join(', ')}.` };
    }
    pattern.daysOfWeek = days;
    pattern.firstDayOfWeek = WEEKDAYS.includes(rec.firstDayOfWeek) ? rec.firstDayOfWeek : 'monday';
  }

  if (graphType === 'absoluteMonthly') {
    const dayOfMonth = rec.dayOfMonth === undefined ? startDay : rec.dayOfMonth;
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return { error: 'recurrence.dayOfMonth must be an integer from 1 to 31.' };
    }
    pattern.dayOfMonth = dayOfMonth;
  }

  if (graphType === 'absoluteYearly') {
    const month = rec.month === undefined ? startMonth : rec.month;
    const dayOfMonth = rec.dayOfMonth === undefined ? startDay : rec.dayOfMonth;
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { error: 'recurrence.month must be an integer from 1 to 12.' };
    }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return { error: 'recurrence.dayOfMonth must be an integer from 1 to 31.' };
    }
    pattern.month = month;
    pattern.dayOfMonth = dayOfMonth;
  }

  if (rec.endDate !== undefined && rec.numberOfOccurrences !== undefined) {
    return { error: 'Provide either recurrence.endDate or recurrence.numberOfOccurrences, not both.' };
  }

  const range = { type: 'noEnd', startDate: rec.startDate };
  if (rec.endDate !== undefined) {
    if (!DATE_RE.test(rec.endDate)) {
      return { error: 'recurrence.endDate must be in YYYY-MM-DD format.' };
    }
    range.type = 'endDate';
    range.endDate = rec.endDate;
  } else if (rec.numberOfOccurrences !== undefined) {
    if (!Number.isInteger(rec.numberOfOccurrences) || rec.numberOfOccurrences < 1) {
      return { error: 'recurrence.numberOfOccurrences must be a positive integer.' };
    }
    range.type = 'numbered';
    range.numberOfOccurrences = rec.numberOfOccurrences;
  }

  return { recurrence: { pattern, range } };
}

/**
 * Tool inputSchema property shared by the tools that accept a recurrence argument.
 */
const recurrenceToolProperty = {
  type: 'object',
  description: 'Simplified recurrence definition; mapped to a Graph pattern/range',
  properties: {
    type: {
      type: 'string',
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      description: 'Recurrence type (weekly uses daysOfWeek; monthly/yearly default to the startDate day)'
    },
    interval: {
      type: 'number',
      description: 'Interval between occurrences (default: 1)'
    },
    daysOfWeek: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      description: 'Weekdays for weekly recurrence (default: derived from startDate)'
    },
    dayOfMonth: {
      type: 'number',
      description: 'Day of month for monthly/yearly recurrence (default: derived from startDate)'
    },
    month: {
      type: 'number',
      description: 'Month 1-12 for yearly recurrence (default: derived from startDate)'
    },
    firstDayOfWeek: {
      type: 'string',
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      description: 'First day of week for weekly recurrence (default: monday)'
    },
    startDate: {
      type: 'string',
      description: 'Series start date, YYYY-MM-DD (required)'
    },
    endDate: {
      type: 'string',
      description: 'Series end date, YYYY-MM-DD (series has no end if omitted)'
    },
    numberOfOccurrences: {
      type: 'number',
      description: 'End the series after N occurrences (cannot be combined with endDate)'
    }
  },
  required: ['type', 'startDate']
};

module.exports = { buildRecurrence, recurrenceToolProperty };
