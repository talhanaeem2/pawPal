import { z } from "zod";
import { scheduleItemPetSchema, schedulePetFormSchema } from "./schedule-item-pets";

// DB SCHEMA (Supabase shape)
export const scheduleItemSchema = z.object({
    id: z.string(),
    kind: z.string(),
    custom_kind: z.string().nullable(),
    title: z.string(),
    time_of_day: z.string().nullable(),
    frequency: z.string(),
    custom_frequency: z.string().nullable(),
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

export const scheduleWithPetsSchema = scheduleItemSchema.extend({
    schedule_item_pets: z.array(scheduleItemPetSchema),
});

export type ScheduleWithPets = z.infer<typeof scheduleWithPetsSchema>;

// FORM SCHEMA (UI shape)
export const scheduleFormSchema = z.object({
    pet_ids: z.array(z.string()).min(1, "Select at least one pet"),
    kind: z.string(),
    custom_kind: z.string().default(""),
    title: z.string().trim().min(1),
    time_of_day: z.string().default(""),
    frequency: z.string(),
    custom_frequency: z.string().default(""),
    pet_details: z.array(schedulePetFormSchema),
});

export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

// SINGLE SOURCE OF DEFAULTS
export const scheduleFormDefaults: ScheduleForm = {
    pet_ids: [],
    kind: "feeding",
    custom_kind: "",
    title: "",
    time_of_day: "",
    frequency: "daily",
    custom_frequency: "",
    pet_details: [],
};

// DB → Form
export function scheduleToForm(item: ScheduleWithPets): ScheduleForm {
    return {
        pet_ids: item.schedule_item_pets.map((p) => p.pet_id),
        kind: item.kind,
        custom_kind: item.custom_kind ?? "",
        title: item.title ?? "",
        time_of_day: item.time_of_day ?? "",
        frequency: item.frequency,
        custom_frequency: item.custom_frequency ?? "",
        pet_details: item.schedule_item_pets.map((p) => ({
            pet_id: p.pet_id,
            dosage: p.dosage ?? "",
            notes: p.notes ?? "",
        }))
    };
}

// Empty form
export function createEmptyScheduleForm(petId?: string): ScheduleForm {
    return {
        ...scheduleFormDefaults,
        pet_ids: petId ? [petId] : [],
        pet_details: petId
            ? [
                {
                    pet_id: petId,
                    dosage: "",
                    notes: "",
                },
            ]
            : [],
    };
}