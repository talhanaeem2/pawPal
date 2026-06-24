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
