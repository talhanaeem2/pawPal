import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Sunrise, Sun, Sunset, Moon, Clock3 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

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

export function formatDate(date: string | null) {
  if (!date) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string | null) {
  if (!date) return "Unknown";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function getUpcomingItems<T>(
  items: T[],
  getDate: (item: T) => string | null
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    const date = getDate(item);
    return date && new Date(date) >= today;
  }).sort(
    (a, b) =>
      new Date(getDate(a)!).getTime() -
      new Date(getDate(b)!).getTime()
  );
}

export function formatDateTime(date: string | null) {
  if (!date) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function getTimeSection(time: string | null) {
  if (!time) return "Any time";

  const hour = Number(time.split(":")[0]);

  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

export const sectionOrder = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Any time",
];

export function sectionStyle(section: string) {
  switch (section) {
    case "Morning":
      return {
        icon: "text-amber-500",
        border: "border-amber-400",
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        Icon: Sunrise,
      };

    case "Afternoon":
      return {
        icon: "text-yellow-500",
        border: "border-yellow-400",
        pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
        Icon: Sun,
      };

    case "Evening":
      return {
        icon: "text-orange-500",
        border: "border-orange-400",
        pill: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
        Icon: Sunset,
      };

    case "Night":
      return {
        icon: "text-indigo-500",
        border: "border-indigo-400",
        pill: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
        Icon: Moon,
      };

    default:
      return {
        icon: "text-muted-foreground",
        border: "border-border",
        pill: "bg-muted text-muted-foreground",
        Icon: Clock3,
      };
  }
}
