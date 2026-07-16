import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
