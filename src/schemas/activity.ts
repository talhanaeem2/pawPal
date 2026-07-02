import { z } from "zod";

export const activityLogSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    activity_type: z.string(),
    duration_min: z.number().nullable(),
    weight: z.number().nullable(),
    notes: z.string().nullable(),
    occurred_at: z.string(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

export const activityLogFormSchema = z.object({
    pet_id: z.string().min(1),
    activity_type: z.string().trim().min(1, "Activity type is required"),
    duration_min: z.string().default(""),
    weight: z.string().default(""),
    notes: z.string().default(""),
    occurred_at: z.string().min(1),
});

export type ActivityLogForm = z.infer<typeof activityLogFormSchema>;

export const activityLogFormDefaults: ActivityLogForm = {
    pet_id: "",
    activity_type: "",
    duration_min: "",
    weight: "",
    notes: "",
    occurred_at: "",
};

export function activityLogToForm(
    activity: ActivityLog,
): ActivityLogForm {
    return {
        pet_id: activity.pet_id,
        activity_type: activity.activity_type,
        duration_min: activity.duration_min !== null ? activity.duration_min.toString() : "",
        weight: activity.weight !== null ? activity.weight.toString() : "",
        notes: activity.notes ?? "",
        occurred_at: activity.occurred_at,
    };
}

export function createEmptyActivityLogForm(petId?: string): ActivityLogForm {
    return {
        ...activityLogFormDefaults,
        pet_id: petId ?? "",
        activity_type: "walk",
        occurred_at: new Date().toISOString(),
    };
}