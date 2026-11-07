export type RepeatUnit = "day" | "week" | "month" | "year";

function parseDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Determines whether a date is a recurrence from startDate. Dates are handled
 * as calendar dates (not instants), which keeps the fixed UTC+5 schedule
 * independent of the Edge Function host clock.
 */
export function isDueOnDate(
  startDate: string,
  repeatEvery: number,
  repeatUnit: RepeatUnit,
  date: string,
): boolean {
  const start = parseDate(startDate);
  const target = parseDate(date);

  if (target < start || !Number.isInteger(repeatEvery) || repeatEvery < 1) {
    return false;
  }

  const daysSinceStart = Math.round(
    (target.getTime() - start.getTime()) / 86_400_000,
  );

  switch (repeatUnit) {
    case "day":
      return daysSinceStart % repeatEvery === 0;

    case "week":
      return daysSinceStart % (repeatEvery * 7) === 0;

    case "month": {
      const monthsSinceStart =
        (target.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (target.getUTCMonth() - start.getUTCMonth());
      const scheduledDay = Math.min(
        start.getUTCDate(),
        daysInMonth(target.getUTCFullYear(), target.getUTCMonth()),
      );

      return (
        target.getUTCDate() === scheduledDay &&
        monthsSinceStart >= 0 &&
        monthsSinceStart % repeatEvery === 0
      );
    }

    case "year": {
      const yearsSinceStart = target.getUTCFullYear() - start.getUTCFullYear();
      const scheduledDay = Math.min(
        start.getUTCDate(),
        daysInMonth(target.getUTCFullYear(), start.getUTCMonth()),
      );

      return (
        target.getUTCMonth() === start.getUTCMonth() &&
        target.getUTCDate() === scheduledDay &&
        yearsSinceStart >= 0 &&
        yearsSinceStart % repeatEvery === 0
      );
    }
  }
}
