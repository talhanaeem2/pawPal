import { ScheduleItem } from "@/schemas/schedule";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getPreviewList<T>(items: T[], limit: number) {
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
  };
}

export function formatKind(s: ScheduleItem) {
  if (s.kind === "other" && s.custom_kind) return s.custom_kind;
  return s.kind;
}

export function formatFrequency(s: ScheduleItem) {
  if (s.frequency === "as_needed" && s.custom_frequency) return s.custom_frequency;
  return s.frequency;
}

export type VaccinationTone =
  | "overdue"
  | "due_soon"
  | "completed"
  | "neutral";

export function getVaccinationTone(
  nextDueAt: string | null,
  completedAt?: string | null,
): VaccinationTone {
  if (completedAt) return "completed";

  if (!nextDueAt) return "neutral";

  const due = new Date(nextDueAt).getTime();
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;

  if (due < now) return "overdue";
  if (due - now <= days30) return "due_soon";

  return "neutral";
}

export function getVaccinationToneClass(tone: VaccinationTone) {
  switch (tone) {
    case "overdue":
      return "text-[#C56B6B]";

    case "due_soon":
      return "text-[#C98B5A]";

    case "completed":
      return "text-[#6F947F]";

    default:
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

    default:
      return "Scheduled";
  }
}
