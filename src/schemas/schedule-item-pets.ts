import { z } from "zod";

export const scheduleCompletionSchema = z.object({
    id: z.string(),
    completed_on: z.string(),
});

// DB SCHEMA (Supabase shape)
export const scheduleItemPetSchema = z.object({
    id: z.string(),
    schedule_item_id: z.string(),
    pet_id: z.string(),
    dosage: z.string().nullable(),
    notes: z.string().nullable(),
    schedule_completions: z.array(scheduleCompletionSchema),
});

export type ScheduleItemPet = z.infer<typeof scheduleItemPetSchema>;

export const schedulePetFormSchema = z.object({
    pet_id: z.string(),
    dosage: z.string().default(""),
    notes: z.string().default(""),
});
