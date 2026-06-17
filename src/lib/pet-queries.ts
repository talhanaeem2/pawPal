import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type Pet = {
  id: string; name: string; species: string; breed: string | null;
  birthdate: string | null; weight_kg: number | null; photo_url: string | null;
  notes: string | null; created_at: string;
};
export type ScheduleItem = {
  id: string; pet_id: string; kind: string; title: string;
  time_of_day: string | null; frequency: string; dosage: string | null;
  notes: string | null; last_done_at: string | null;
};
export type VetAppt = {
  id: string; pet_id: string; date: string; reason: string;
  vet_name: string | null; notes: string | null; completed: boolean;
};
export type ActivityLog = {
  id: string; pet_id: string; activity_type: string; duration_min: number | null;
  value: number | null; notes: string | null; occurred_at: string;
};

export const petsQuery = queryOptions({
  queryKey: ["pets"],
  queryFn: async (): Promise<Pet[]> => {
    const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Pet[];
  },
});

export const scheduleQuery = queryOptions({
  queryKey: ["schedule_items"],
  queryFn: async (): Promise<ScheduleItem[]> => {
    const { data, error } = await supabase.from("schedule_items").select("*").order("time_of_day", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ScheduleItem[];
  },
});

export const vetQuery = queryOptions({
  queryKey: ["vet_appointments"],
  queryFn: async (): Promise<VetAppt[]> => {
    const { data, error } = await supabase.from("vet_appointments").select("*").order("date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as VetAppt[];
  },
});

export const activityQuery = queryOptions({
  queryKey: ["activity_logs"],
  queryFn: async (): Promise<ActivityLog[]> => {
    const { data, error } = await supabase.from("activity_logs").select("*").order("occurred_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []) as ActivityLog[];
  },
});

export const speciesEmoji = (s: string) => {
  const map: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", fish: "🐠", reptile: "🦎", hamster: "🐹" };
  return map[s.toLowerCase()] ?? "🐾";
};
