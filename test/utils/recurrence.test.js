const { buildRecurrence, recurrenceToolProperty } = require('../../utils/recurrence');

describe('buildRecurrence', () => {
  test('maps weekly with explicit daysOfWeek to a noEnd range', () => {
    const { recurrence, error } = buildRecurrence({
      type: 'weekly',
      daysOfWeek: ['monday', 'friday'],
      startDate: '2026-11-09'
    });

    expect(error).toBeUndefined();
    expect(recurrence.pattern).toEqual({
      type: 'weekly',
      interval: 1,
      daysOfWeek: ['monday', 'friday'],
      firstDayOfWeek: 'monday'
    });
    expect(recurrence.range).toEqual({ type: 'noEnd', startDate: '2026-11-09' });
  });

  test('derives daysOfWeek from startDate when omitted', () => {
    // 2026-11-09 is a Monday
    const { recurrence, error } = buildRecurrence({ type: 'weekly', startDate: '2026-11-09' });

    expect(error).toBeUndefined();
    expect(recurrence.pattern.daysOfWeek).toEqual(['monday']);
  });

  test('maps monthly deriving dayOfMonth from startDate', () => {
    const { recurrence, error } = buildRecurrence({ type: 'monthly', startDate: '2026-11-10' });

    expect(error).toBeUndefined();
    expect(recurrence.pattern).toEqual({ type: 'absoluteMonthly', interval: 1, dayOfMonth: 10 });
  });

  test('maps yearly with explicit month and dayOfMonth', () => {
    const { recurrence, error } = buildRecurrence({
      type: 'yearly', interval: 2, month: 3, dayOfMonth: 15, startDate: '2026-11-10'
    });

    expect(error).toBeUndefined();
    expect(recurrence.pattern).toEqual({ type: 'absoluteYearly', interval: 2, month: 3, dayOfMonth: 15 });
  });

  test('endDate produces an endDate range', () => {
    const { recurrence, error } = buildRecurrence({
      type: 'daily', startDate: '2026-11-09', endDate: '2026-11-20'
    });

    expect(error).toBeUndefined();
    expect(recurrence.range).toEqual({ type: 'endDate', startDate: '2026-11-09', endDate: '2026-11-20' });
  });

  test('numberOfOccurrences produces a numbered range', () => {
    const { recurrence, error } = buildRecurrence({
      type: 'weekly', startDate: '2026-11-09', numberOfOccurrences: 6
    });

    expect(error).toBeUndefined();
    expect(recurrence.range).toEqual({ type: 'numbered', startDate: '2026-11-09', numberOfOccurrences: 6 });
  });

  test('rejects endDate combined with numberOfOccurrences', () => {
    const { error } = buildRecurrence({
      type: 'daily', startDate: '2026-11-09', endDate: '2026-11-20', numberOfOccurrences: 3
    });

    expect(error).toContain('not both');
  });

  test('rejects an unknown type', () => {
    const { error } = buildRecurrence({ type: 'everyFullMoon', startDate: '2026-11-09' });

    expect(error).toContain('recurrence.type must be one of');
  });

  test('rejects a missing or malformed startDate', () => {
    expect(buildRecurrence({ type: 'daily' }).error).toContain('startDate');
    expect(buildRecurrence({ type: 'daily', startDate: '11/09/2026' }).error).toContain('startDate');
  });

  test('rejects an invalid interval', () => {
    expect(buildRecurrence({ type: 'daily', startDate: '2026-11-09', interval: 0 }).error).toContain('interval');
    expect(buildRecurrence({ type: 'daily', startDate: '2026-11-09', interval: 1.5 }).error).toContain('interval');
  });

  test('rejects weekly without a valid daysOfWeek list', () => {
    expect(buildRecurrence({ type: 'weekly', startDate: '2026-11-09', daysOfWeek: [] }).error).toContain('daysOfWeek');
    expect(buildRecurrence({ type: 'weekly', startDate: '2026-11-09', daysOfWeek: ['funday'] }).error).toContain('daysOfWeek');
  });

  test('rejects a non-object recurrence argument', () => {
    expect(buildRecurrence(null).error).toContain('recurrence must be an object');
    expect(buildRecurrence('daily').error).toContain('recurrence must be an object');
  });

  test('tool property requires type and startDate', () => {
    expect(recurrenceToolProperty.required).toEqual(['type', 'startDate']);
  });
});
