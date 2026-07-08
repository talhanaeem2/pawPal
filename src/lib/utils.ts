import { supabase } from "@/integrations/supabase/client";
import { ScheduleForm, ScheduleItem, ScheduleKind } from "@/schemas/schedule";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const KIND_LABELS: Record<ScheduleKind, string> = {
  feeding: "Feeding",
  medication: "Medication",
  supplements: "Supplements",
  flea_tick: "Flea & Tick",
  grooming: "Grooming",
  bath: "Bath",
  nail_trim: "Nail trimming",
  ear_cleaning: "Ear cleaning",
  teeth_brushing: "Teeth brushing",
  exercise: "Exercise",
  training: "Training",
  weight_check: "Weight Check",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time?: string | null) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");

  return new Date(0, 0, 0, Number(hours), Number(minutes))
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
}

export const repeatUnitOptions = [
  {
    value: "day",
    singular: "day",
    plural: "days",
  },
  {
    value: "week",
    singular: "week",
    plural: "weeks",
  },
  {
    value: "month",
    singular: "month",
    plural: "months",
  },
  {
    value: "year",
    singular: "year",
    plural: "years",
  },
];

export function getPreviewList<T>(items: T[], limit: number) {
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
  };
}

export function formatKind(s: ScheduleItem) {
  return KIND_LABELS[s.kind as ScheduleKind] ?? s.kind;
}

export function formatFrequency(item: {
  repeat_every: number;
  repeat_unit: "day" | "week" | "month" | "year";
}) {
  if (item.repeat_every === 1) {
    switch (item.repeat_unit) {
      case "day":
        return "Daily";
      case "week":
        return "Weekly";
      case "month":
        return "Monthly";
      case "year":
        return "Yearly";
    }
  }

  return `Every ${item.repeat_every} ${item.repeat_unit}s`;
}

export type VaccinationTone =
  | "overdue"
  | "due_soon"
  | "completed"
  | "scheduled"
  | "no_due_date";

export function getVaccinationTone(
  nextDueAt: string | null,
  completedAt?: string | null,
): VaccinationTone {
  if (completedAt) return "completed";

  if (!nextDueAt) return "no_due_date";

  const due = new Date(nextDueAt).getTime();
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;

  if (due < now) return "overdue";
  if (due - now <= days30) return "due_soon";

  return "scheduled";
}

export function getVaccinationToneClass(tone: VaccinationTone) {
  switch (tone) {
    case "overdue":
      return "text-[#C56B6B]";

    case "due_soon":
      return "text-[#C98B5A]";

    case "completed":
      return "text-[#6F947F]";

    case "no_due_date":
      return "text-muted-foreground";

    case "scheduled":
      return "text-muted-foreground";
  }
}

export function getVaccinationToneLabel(tone: VaccinationTone) {
  switch (tone) {
    case "overdue":
      return "Overdue";

    case "due_soon":
      return "Due soon";

    case "completed":
      return "Completed";

    case "scheduled":
      return "Scheduled";

    case "no_due_date":
      return "No due date";
  }
}

export type DewormingDueTone =
  | "overdue"
  | "due_soon"
  | "neutral";

export function getDewormingDueTone(
  nextDueAt: string | null,
): DewormingDueTone {
  if (!nextDueAt) return "neutral";

  const due = new Date(nextDueAt).getTime();
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;

  if (due < now) return "overdue";
  if (due - now <= days30) return "due_soon";

  return "neutral";
}

export function getDewormingDueToneClass(tone: DewormingDueTone) {
  switch (tone) {
    case "overdue":
      return "text-[#C56B6B]";

    case "due_soon":
      return "text-[#C98B5A]";

    default:
      return "text-muted-foreground";
  }
}

export function getDewormingDueToneLabel(tone: DewormingDueTone) {
  switch (tone) {
    case "overdue":
      return "Overdue";

    case "due_soon":
      return "Due soon";

    default:
      return "Scheduled";
  }
}

export function formatPetNames(names: string[]) {
  const validNames = names.filter(Boolean);

  if (validNames.length <= 3) {
    return validNames.join(", ");
  }

  return `${validNames.slice(0, 3).join(", ")} +${validNames.length - 3}`;
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

export function extractStoragePath(
  url: string | null | undefined,
  bucket: string
): string | null {
  if (!url) return null;

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/object/public/${bucket}/`,
  ];

  for (const marker of markers) {
    const idx = url.indexOf(marker);

    if (idx !== -1) {
      return decodeURIComponent(url.slice(idx + marker.length)).split("?")[0];
    }
  }

  return null;
}

export function getTitlePlaceholder(kind: ScheduleForm["kind"]) {
  switch (kind) {
    case "feeding":
      return "Breakfast";

    case "medication":
      return "Heartworm medicine";

    case "supplements":
      return "Fish oil";

    case "exercise":
      return "Morning walk";

    case "training":
      return "Recall practice";

    case "bath":
      return "Monthly bath";

    case "grooming":
      return "Brush coat";

    case "flea_tick":
      return "Monthly flea treatment";

    case "ear_cleaning":
      return "Clean ears";

    case "teeth_brushing":
      return "Brush teeth";

    case "nail_trim":
      return "Trim nails";

    case "weight_check":
      return "Weekly weigh-in";

    default:
      return "Reminder";
  }
}

export function getNotesPlaceholder(kind: ScheduleForm["kind"]) {
  switch (kind) {
    case "feeding":
      return "Mix with wet food";

    case "medication":
      return "Give after breakfast";

    case "exercise":
      return "Easy pace";

    case "training":
      return "Use treats";

    case "bath":
      return "Avoid eyes";

    default:
      return "Optional notes";
  }
}

export function getTimeLabel(kind: ScheduleForm["kind"]) {
  switch (kind) {
    case "feeding":
      return "Feeding time";

    case "medication":
      return "Medication time";

    case "exercise":
      return "Exercise time";

    case "training":
      return "Training time";

    case "supplements":
      return "Supplement time";

    default:
      return "Time";
  }
}

export function getStartDateLabel(kind: ScheduleForm["kind"]) {
  switch (kind) {
    case "medication":
      return "First dose";

    case "supplements":
      return "First dose";

    case "flea_tick":
      return "Treatment date";

    case "weight_check":
      return "First check";

    default:
      return "Start date";
  }
}

export function getStartDateDescription(kind: ScheduleForm["kind"]) {
  switch (kind) {
    case "medication":
      return "The schedule starts from this date.";

    case "supplements":
      return "The schedule starts from this date.";

    case "flea_tick":
      return "The next treatment will be calculated from this date.";

    case "weight_check":
      return "The first weight check will be scheduled from this date.";

    default:
      return undefined;
  }
}

export function generateScheduleTitle(
  kind: ScheduleForm["kind"],
  timeOfDay?: string
) {
  const hour = timeOfDay
    ? Number(timeOfDay.split(":")[0])
    : undefined;

  const period =
    hour === undefined
      ? ""
      : hour < 11
        ? "Morning "
        : hour < 17
          ? "Afternoon "
          : "Evening ";

  switch (kind) {
    case "feeding":
      return `${period}Meal`;

    case "medication":
      return `${period}Medication`;

    case "supplements":
      return `${period}Supplements`;

    case "exercise":
      return "Exercise";

    case "training":
      return "Training";

    case "bath":
      return "Bath";

    case "grooming":
      return "Grooming";

    case "ear_cleaning":
      return "Ear Cleaning";

    case "teeth_brushing":
      return "Teeth Brushing";

    case "nail_trim":
      return "Nail Trim";

    case "weight_check":
      return "Weight Check";

    case "flea_tick":
      return "Flea & Tick";

    default:
      return "";
  }
}

export function getScheduleDetailField(kind: string) {
  switch (kind) {
    case "feeding":
      return {
        label: "Amount",
        placeholder: "e.g. 1 cup, 150 g, ½ can",
      };

    case "medication":
      return {
        label: "Dose",
        placeholder: "e.g. 1 tablet, 5 ml, 2 drops",
      };

    case "supplements":
      return {
        label: "Supplement",
        placeholder: "e.g. 1 chew, 2 pumps, 5 ml",
      };

    case "exercise":
      return {
        label: "Duration",
        placeholder: "e.g. 30 min walk, 20 min run",
      };

    case "training":
      return {
        label: "Session",
        placeholder: "e.g. 15 min, Recall practice",
      };

    case "bath":
      return {
        label: "Products",
        placeholder: "e.g. Oatmeal shampoo, Conditioner",
      };

    case "grooming":
      return {
        label: "Details",
        placeholder: "e.g. Brush coat, Deshedding, 15 min",
      };

    case "ear_cleaning":
      return {
        label: "Cleaner",
        placeholder: "e.g. Ear solution, 5 drops",
      };

    case "teeth_brushing":
      return {
        label: "Toothpaste",
        placeholder: "e.g. Poultry toothpaste",
      };

    case "nail_trim":
      return {
        label: "Details",
        placeholder: "e.g. Trim + file",
      };

    case "flea_tick":
      return {
        label: "Treatment",
        placeholder: "e.g. NexGard, Frontline, Bravecto",
      };

    case "weight_check":
      return {
        label: "Target",
        placeholder: "e.g. 32 kg, Monthly check",
      };

    default:
      return {
        label: "Details",
        placeholder: "Optional details",
      };
  }
}

const TIME_REQUIRED_KINDS = new Set([
  "feeding",
  "medication",
  "supplements",
  "training",
  "exercise",
]);

const START_DATE_REQUIRED_KINDS = new Set([
  "medication",
  "supplements",
  "flea_tick",
  "weight_check",
]);

export function requiresScheduleTime(kind: string) {
  return TIME_REQUIRED_KINDS.has(kind);
}

export function requiresScheduleStartDate(kind: string) {
  return START_DATE_REQUIRED_KINDS.has(kind);
}
