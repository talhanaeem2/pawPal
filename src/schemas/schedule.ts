import { z } from "zod";
import { scheduleItemPetSchema, schedulePetFormSchema } from "./schedule-item-pets";

export const scheduleKindSchema = z.enum([
    "feeding",
    "medication",
    "supplements",
    "flea_tick",
    "grooming",
    "bath",
    "nail_trim",
    "ear_cleaning",
    "teeth_brushing",
    "exercise",
    "training",
    "weight_check",
]);

export type ScheduleKind = z.infer<typeof scheduleKindSchema>;

// DB SCHEMA (Supabase shape)
export const scheduleItemSchema = z.object({
    id: z.string(),
    kind: scheduleKindSchema,
    title: z.string(),
    time_of_day: z.string().nullable(),
    start_date: z.string(),
    repeat_unit: z.enum([
        "day",
        "week",
        "month",
        "year",
    ]),
    repeat_every: z.number().int().min(1),
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

export const scheduleWithPetsSchema = scheduleItemSchema.extend({
    schedule_item_pets: z.array(scheduleItemPetSchema),
});

export type ScheduleWithPets = z.infer<typeof scheduleWithPetsSchema>;

// FORM SCHEMA (UI shape)
export const scheduleFormSchema = z.object({
    pet_ids: z.array(z.string()).min(1, "Select at least one pet"),
    kind: scheduleKindSchema,
    title: z.string().trim().min(1, "Title is required"),
    time_of_day: z.string().default(""),
    repeat_unit: z.enum([
        "day",
        "week",
        "month",
        "year",
    ]),
    repeat_every: z.number().int().min(1).default(1),
    start_date: z.string().default(() => new Date().toISOString().split("T")[0]),
    pet_details: z.array(schedulePetFormSchema),
});

export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

// SINGLE SOURCE OF DEFAULTS
export const scheduleFormDefaults: ScheduleForm = {
    pet_ids: [],
    kind: "feeding",
    title: "",
    time_of_day: "",
    repeat_unit: "day",
    repeat_every: 1,
    start_date: new Date().toISOString().split("T")[0],
    pet_details: [],
};

// DB → Form
export function scheduleToForm(item: ScheduleWithPets): ScheduleForm {
    return {
        pet_ids: item.schedule_item_pets.map((p) => p.pet_id),
        kind: item.kind,
        title: item.title ?? "",
        time_of_day: item.time_of_day ?? "",
        repeat_unit: item.repeat_unit,
        repeat_every: item.repeat_every,
        start_date: item.start_date,
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