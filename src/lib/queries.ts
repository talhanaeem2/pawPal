import { supabase } from "@/integrations/supabase/client";
import { ActivityLog, activityLogSchema } from "@/schemas/activity";
import { Pet, petSchema } from "@/schemas/pets";
import { Profile, profileSchema } from "@/schemas/profile";
import { ScheduleWithPets, scheduleWithPetsSchema } from "@/schemas/schedule";
import { Vaccination, vaccinationSchema } from "@/schemas/vacination";
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
  queryFn: async (): Promise<ScheduleWithPets[]> => {

    const { data, error } = await supabase
      .from("schedule_items")
      .select(`
        *,
        schedule_item_pets (
          id,
          pet_id,
          schedule_item_id,
          dosage,
          notes,
          schedule_completions (
            id,
            completed_on
          )
        )
      `)
      .order("time_of_day", { ascending: true });

    if (error) throw error;

    const parsed = z.array(scheduleWithPetsSchema).safeParse(data ?? []);

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

export const vaccinationsQuery = queryOptions({
  queryKey: ["vaccinations"],
  queryFn: async (): Promise<Vaccination[]> => {
    const { data, error } = await supabase.from("vaccinations").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const parsed = z.array(vaccinationSchema).safeParse(data ?? []);

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

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const parsed = profileSchema.safeParse(data);

      if (!parsed.success) {
        console.error(parsed.error);
        throw new Error("Invalid profile data");
      }

      return parsed.data;
    },
  });

export const speciesEmoji = (s: string) => {
  const map: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", fish: "🐠", reptile: "🦎", hamster: "🐹" };
  return map[s.toLowerCase()] ?? "🐾";
};
