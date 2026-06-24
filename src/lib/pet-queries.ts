import { supabase } from "@/integrations/supabase/client";
import { ActivityLog, activityLogSchema } from "@/schemas/activity";
import { Pet, petSchema } from "@/schemas/pets";
import { ScheduleItem, scheduleItemSchema } from "@/schemas/schedule";
import { VetAppointment, vetAppointmentSchema } from "@/schemas/vet";
import { queryOptions } from "@tanstack/react-query";
import z from "zod";

export const petsQuery = queryOptions({
  queryKey: ["pets"],
  queryFn: async (): Promise<Pet[]> => {
    const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const parsed = z.array(petSchema).safeParse(data ?? []);

    if (!parsed.success) {
      console.error(parsed.error);
      return [];
    }

    return parsed.data;
  },
});

export const scheduleQuery = queryOptions({
  queryKey: ["schedule_items"],
  queryFn: async (): Promise<ScheduleItem[]> => {
    const { data, error } = await supabase.from("schedule_items").select("*").order("time_of_day", { ascending: true });
    if (error) throw error;
    const parsed = z.array(scheduleItemSchema).safeParse(data ?? []);

    if (!parsed.success) {
      console.error(parsed.error);
      return [];
    }

    return parsed.data;
  },
});

export const vetQuery = queryOptions({
  queryKey: ["vet_appointments"],
  queryFn: async (): Promise<VetAppointment[]> => {
    const { data, error } = await supabase.from("vet_appointments").select("*").order("date", { ascending: true });
    if (error) throw error;
    const parsed = z.array(vetAppointmentSchema).safeParse(data ?? []);

    if (!parsed.success) {
      console.error(parsed.error);
      return [];
    }

    return parsed.data;
  },
});

export const activityQuery = queryOptions({
  queryKey: ["activity_logs"],
  queryFn: async (): Promise<ActivityLog[]> => {
    const { data, error } = await supabase.from("activity_logs").select("*").order("occurred_at", { ascending: false }).limit(50);
    if (error) throw error;
    const parsed = z.array(activityLogSchema).safeParse(data ?? []);

    if (!parsed.success) {
      console.error(parsed.error);
      return [];
    }

    return parsed.data;
  },
});

export const speciesEmoji = (s: string) => {
  const map: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", fish: "🐠", reptile: "🦎", hamster: "🐹" };
  return map[s.toLowerCase()] ?? "🐾";
};
