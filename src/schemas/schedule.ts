import { z } from "zod";

// DB SCHEMA (Supabase shape)
export const scheduleItemSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    kind: z.string(),
    custom_kind: z.string().nullable(),
    title: z.string(),
    time_of_day: z.string().nullable(),
    frequency: z.string(),
    custom_frequency: z.string().nullable(),
    dosage: z.string().nullable(),
    notes: z.string().nullable(),
    last_done_at: z.string().nullable(),
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

// FORM SCHEMA (UI shape)
export const scheduleFormSchema = z.object({
    pet_id: z.string().min(1),
    kind: z.string(),
    custom_kind: z.string().default(""),
    title: z.string().trim().min(1),
    time_of_day: z.string().default(""),
    frequency: z.string(),
    custom_frequency: z.string().default(""),
    dosage: z.string().default(""),
    notes: z.string().default(""),
});

export type ScheduleForm = z.infer<typeof scheduleFormSchema>;

// SINGLE SOURCE OF DEFAULTS
export const scheduleFormDefaults: ScheduleForm = {
    pet_id: "",
    kind: "feeding",
    custom_kind: "",
    title: "",
    time_of_day: "",
    frequency: "daily",
    custom_frequency: "",
    dosage: "",
    notes: "",
};

// DB → Form
export function scheduleToForm(item: ScheduleItem): ScheduleForm {
    return {
        pet_id: item.pet_id,
        kind: item.kind,
        custom_kind: item.custom_kind ?? "",
        title: item.title ?? "",
        time_of_day: item.time_of_day ?? "",
        frequency: item.frequency,
        custom_frequency: item.custom_frequency ?? "",
        dosage: item.dosage ?? "",
        notes: item.notes ?? "",
    };
}

// Empty form
export function createEmptyScheduleForm(petId?: string): ScheduleForm {
    return {
        ...scheduleFormDefaults,
        pet_id: petId ?? "",
    };
}