import { z } from "zod";

// DB SCHEMA (Supabase shape)
export const scheduleItemPetSchema = z.object({
    id: z.string(),
    schedule_item_id: z.string(),
    pet_id: z.string(),
    last_done_at: z.string().nullable(),
});

export type ScheduleItemPet = z.infer<typeof scheduleItemPetSchema>;