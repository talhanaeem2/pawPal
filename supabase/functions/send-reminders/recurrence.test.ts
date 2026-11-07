import { isDueOnDate } from "./recurrence.ts";

function assertEquals(actual: boolean, expected: boolean) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
}

Deno.test("supports daily and multi-day schedules", () => {
  assertEquals(isDueOnDate("2026-11-01", 1, "day", "2026-11-07"), true);
  assertEquals(isDueOnDate("2026-11-01", 2, "day", "2026-11-07"), true);
  assertEquals(isDueOnDate("2026-11-01", 2, "day", "2026-11-06"), false);
});

Deno.test("supports weekly and multi-week schedules", () => {
  assertEquals(isDueOnDate("2026-11-01", 1, "week", "2026-11-08"), true);
  assertEquals(isDueOnDate("2026-11-01", 2, "week", "2026-11-15"), true);
  assertEquals(isDueOnDate("2026-11-01", 2, "week", "2026-11-08"), false);
});

Deno.test("uses the final day of short months for monthly schedules", () => {
  assertEquals(isDueOnDate("2026-01-31", 1, "month", "2026-02-28"), true);
  assertEquals(isDueOnDate("2026-01-31", 2, "month", "2026-03-31"), true);
  assertEquals(isDueOnDate("2026-01-31", 2, "month", "2026-02-28"), false);
});

Deno.test("handles leap-day yearly schedules", () => {
  assertEquals(isDueOnDate("2024-02-29", 1, "year", "2025-02-28"), true);
  assertEquals(isDueOnDate("2024-02-29", 2, "year", "2026-02-28"), true);
  assertEquals(isDueOnDate("2024-02-29", 2, "year", "2025-02-28"), false);
});
