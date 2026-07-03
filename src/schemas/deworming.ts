import { z } from "zod";

export const dewormingSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    product_name: z.string(),
    administered_at: z.string(),
    next_due_at: z.string(),
    administered_by: z.string().nullable(),
    notes: z.string().nullable(),
});

export type Deworming = z.infer<typeof dewormingSchema>;

export const dewormingFormSchema = z.object({
    pet_id: z.string().min(1),
    product_name: z.string().trim().min(1, "Product name is required"),
    administered_at: z.string().min(1, "Administration date is required"),
    next_due_at: z.string().min(1, "Next due date is required"),
    administered_by: z.string().default(""),
    notes: z.string().default(""),
});

export type DewormingForm = z.infer<typeof dewormingFormSchema>;

export const dewormingFormDefaults: DewormingForm = {
    pet_id: "",
    product_name: "",
    administered_at: "",
    next_due_at: "",
    administered_by: "",
    notes: "",
};

export function dewormingToForm(deworming: Deworming,): DewormingForm {
    return {
        pet_id: deworming.pet_id,
        product_name: deworming.product_name,
        administered_at: deworming.administered_at,
        next_due_at: deworming.next_due_at,
        administered_by: deworming.administered_by ?? "",
        notes: deworming.notes ?? "",
    };
}

export function createEmptyDewormingForm(petId?: string,): DewormingForm {
    return {
        ...dewormingFormDefaults,
        pet_id: petId ?? "",
    };
}