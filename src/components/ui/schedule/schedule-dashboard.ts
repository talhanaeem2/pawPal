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
    const times = schedule.times_of_day.length > 0
      ? schedule.times_of_day
      : [null];
    const petsForSchedule = [...schedule.schedule_item_pets]
      .map((schedulePet) => ({
        ...schedulePet,
        pet: petsById.get(schedulePet.pet_id),
      }))
      .sort((left, right) =>
        (left.pet?.name ?? "").localeCompare(right.pet?.name ?? ""),
      );
    const hasTime =
      requiresScheduleTime(schedule.kind) && schedule.times_of_day.length > 0;
    const detailRows = petsForSchedule.filter(
      (pet) => pet.dosage || pet.notes,
    );
    const allDone = times.every((time) =>
      petsForSchedule.every((pet) =>
        pet.schedule_completions.some(
          (completion) =>
            completion.completed_on === today && completion.time_slot === time,
        ),
      ),
    );
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
      petLabel: formatPetNames(
        petsForSchedule
          .map((pet) => (pet.pet ? getPetDisplayName(pet.pet) : undefined))
          .filter((name): name is string => Boolean(name)),
      ),
      preview: timeSummary
        ? repeatText + " · " + timeSummary
        : repeatText,
    };
  });

  const totalSlots = scheduleItems.reduce(
    (total, item) => total + item.times.length,
    0,
  );
  const completedSlots = scheduleItems.reduce(
    (total, item) =>
      total +
      item.times.filter((time) =>
        item.pets.every((pet) =>
          pet.schedule_completions.some(
            (completion) =>
              completion.completed_on === today &&
              completion.time_slot === time,
          ),
        ),
      ).length,
    0,
  );

  return {
    progress: {
      totalSlots,
      completedSlots,
      progress:
        totalSlots === 0 ? 0 : Math.round((completedSlots / totalSlots) * 100),
    },
    scheduleItems,
  };
}
