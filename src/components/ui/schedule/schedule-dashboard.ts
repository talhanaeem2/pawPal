import { formatPetNames } from "@/lib/pet-utils";
import {
  formatFrequency,
  getScheduleDetailField,
  requiresScheduleTime,
} from "@/lib/schedule-utils";
import { formatTime } from "@/lib/utils";
import { getPetDisplayName, Pet } from "@/schemas/pets";
import { ScheduleItemPet } from "@/schemas/schedule-item-pets";
import { ScheduleWithPets } from "@/schemas/schedule";

export type ScheduleProgress = {
  totalSlots: number;
  completedSlots: number;
  progress: number;
};

export type SchedulePetDisplay = ScheduleItemPet & {
  pet: Pet | undefined;
};

export type ScheduleListItem = {
  schedule: ScheduleWithPets;
  times: (string | null)[];
  petCount: number;
  multiplePets: boolean;
  hasTime: boolean;
  pets: SchedulePetDisplay[];
  detailField: ReturnType<typeof getScheduleDetailField>;
  detailRows: SchedulePetDisplay[];
  hasDetails: boolean;
  useAccordion: boolean;
  allDone: boolean;
  allSettled: boolean;
  allSkipped: boolean;
  dueToday: boolean;
  petLabel: string;
  preview: string;
};

export type ScheduleDashboard = {
  progress: ScheduleProgress;
  scheduleItems: ScheduleListItem[];
};

export function getScheduleDashboard(
  items: ScheduleWithPets[],
  pets: Pet[],
  today: string,
): ScheduleDashboard {
  const petsById = new Map(pets.map((pet) => [pet.id, pet]));
  const scheduleItems = items.map((schedule) => {
    const times = schedule.times_of_day.length > 0 ? schedule.times_of_day : [null];
    const petsForSchedule = [...schedule.schedule_item_pets]
      .map((schedulePet) => ({
        ...schedulePet,
        pet: petsById.get(schedulePet.pet_id),
      }))
      .sort((left, right) => (left.pet?.name ?? "").localeCompare(right.pet?.name ?? ""));
    const hasTime = requiresScheduleTime(schedule.kind) && schedule.times_of_day.length > 0;
    const detailRows = petsForSchedule.filter((pet) => pet.dosage || pet.notes);
    const allSettled = times.every((time) =>
      petsForSchedule.every((pet) =>
        pet.schedule_completions.some(
          (completion) => completion.completed_on === today && completion.time_slot === time,
        ),
      ),
    );
    const allDone = times.every((time) =>
      petsForSchedule.every((pet) =>
        pet.schedule_completions.some(
          (completion) =>
            completion.completed_on === today &&
            completion.time_slot === time &&
            completion.status === "completed",
        ),
      ),
    );
    const allSkipped = allSettled &&
      times.every((time) =>
        petsForSchedule.every((pet) =>
          pet.schedule_completions.some(
            (completion) =>
              completion.completed_on === today &&
              completion.time_slot === time &&
              completion.status === "skipped",
          ),
        ),
      );
    const dueToday = isDueToday(schedule, today);
    const repeatText = formatFrequency({
      repeat_every: schedule.repeat_every,
      repeat_unit: schedule.repeat_unit,
    });
    const timeSummary = hasTime
      ? times.length === 1
        ? formatTime(times[0]!)
        : String(times.length) + " times/day"
      : null;

    return {
      schedule,
      times,
      petCount: petsForSchedule.length,
      multiplePets: petsForSchedule.length > 1,
      hasTime,
      pets: petsForSchedule,
      detailField: getScheduleDetailField(schedule.kind),
      detailRows,
      hasDetails: detailRows.length > 0,
      useAccordion:
        petsForSchedule.length > 1 ||
        detailRows.some((pet) => (pet.notes?.length ?? 0) > 120) ||
        schedule.times_of_day.length > 1,
      allDone,
      allSettled,
      allSkipped,
      dueToday,
      petLabel: formatPetNames(
        petsForSchedule
          .map((pet) => (pet.pet ? getPetDisplayName(pet.pet) : undefined))
          .filter((name): name is string => Boolean(name)),
      ),
      preview: timeSummary ? repeatText + " · " + timeSummary : repeatText,
    };
  });

  scheduleItems.sort((left, right) => {
    // Today's unfinished reminders should stay together at the top. Within
    // each group, use the earliest scheduled time so the list follows the day.
    if (left.allSettled !== right.allSettled) {
      return Number(left.allSettled) - Number(right.allSettled);
    }

    const leftTime = getEarliestTime(left.times);
    const rightTime = getEarliestTime(right.times);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.schedule.title.localeCompare(right.schedule.title);
  });

  // Only count schedules that are actually due today toward progress.
  // A monthly weight check or quarterly bath shouldn't show as "pending"
  // on days when they're not due.
  const dueTodayItems = scheduleItems.filter((item) => item.dueToday);

  const totalSlots = dueTodayItems.reduce((total, item) => total + item.times.length, 0);
  const completedSlots = dueTodayItems.reduce(
    (total, item) =>
      total +
      item.times.filter((time) =>
        item.pets.every((pet) =>
          pet.schedule_completions.some(
            (completion) =>
              completion.completed_on === today &&
              completion.time_slot === time &&
              completion.status === "completed",
          ),
        ),
      ).length,
    0,
  );

  return {
    progress: {
      totalSlots,
      completedSlots,
      progress: totalSlots === 0 ? 0 : Math.round((completedSlots / totalSlots) * 100),
    },
    scheduleItems,
  };
}

// Returns true if a schedule is due on the given date string (YYYY-MM-DD).
// Daily schedules are always due. Weekly/monthly/yearly schedules are only due
// on the days that fall within their recurrence cycle from start_date.
function isDueToday(
  schedule: ScheduleWithPets,
  today: string,
): boolean {
  const [sy, sm, sd] = schedule.start_date.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = today.slice(0, 10).split("-").map(Number);

  const start = new Date(sy, sm - 1, sd);
  const target = new Date(ty, tm - 1, td);

  // Schedule hasn't started yet
  if (target < start) return false;

  const { repeat_every, repeat_unit } = schedule;

  if (repeat_unit === "day") {
    // Every N days: check if the day difference is divisible by N
    const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
    return diffDays % repeat_every === 0;
  }

  if (repeat_unit === "week") {
    // Every N weeks: same weekday, and week difference divisible by N
    if (start.getDay() !== target.getDay()) return false;
    const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
    const diffWeeks = Math.round(diffDays / 7);
    return diffWeeks % repeat_every === 0;
  }

  if (repeat_unit === "month") {
    // Every N months: same day-of-month, month difference divisible by N
    if (sd !== td) return false;
    const diffMonths = (ty - sy) * 12 + (tm - sm);
    return diffMonths >= 0 && diffMonths % repeat_every === 0;
  }

  if (repeat_unit === "year") {
    // Every N years: same month+day, year difference divisible by N
    if (sm !== tm || sd !== td) return false;
    const diffYears = ty - sy;
    return diffYears >= 0 && diffYears % repeat_every === 0;
  }

  return false;
}

function getEarliestTime(times: (string | null)[]) {
  const earliestTime = times.filter((time): time is string => time !== null).sort()[0];

  if (!earliestTime) {
    return Number.POSITIVE_INFINITY;
  }

  const [hours, minutes] = earliestTime.split(":").map(Number);
  return hours * 60 + minutes;
}