import { z } from "zod";

export const activity_type = z.enum([
    "walk",
    "play",
    "run",
    "weight",
    "grooming"
]);

export const activityLogSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    activity_type: activity_type,
    duration_min: z.number().nullable(),
    weight: z.number().nullable(),
    notes: z.string().nullable(),
    occurred_at: z.string(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

export const activityLogFormSchema = z.object({
    pet_id: z.string().min(1, "Pet is required"),
    activity_type: activity_type,
    duration_min: z.string().default(""),
    weight: z.string().default(""),
    notes: z.string().default(""),
    occurred_at: z.string().min(1),
});

export type ActivityLogForm = z.infer<typeof activityLogFormSchema>;

export const activityLogFormDefaults: ActivityLogForm = {
    pet_id: "",
    activity_type: "walk",
    duration_min: "",
    weight: "",
    notes: "",
    occurred_at: "",
};

export function activityLogToForm(activity: ActivityLog): ActivityLogForm {
    return {
        pet_id: activity.pet_id,
        activity_type: activity.activity_type,
        duration_min: activity.duration_min !== null ? activity.duration_min.toString() : "",
        weight: activity.weight !== null ? activity.weight.toString() : "",
        notes: activity.notes ?? "",
        occurred_at: activity.occurred_at,
    };
}

export function createEmptyActivityLogForm(): ActivityLogForm {
    return {
        ...activityLogFormDefaults,
        occurred_at: new Date().toISOString(),
    };
}