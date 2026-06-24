import { z } from "zod";

export const vaccinationSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    vaccine_name: z.string(),
    administered_at: z.string(),
    next_due_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    administered_by: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
});

export type Vaccination = z.infer<typeof vaccinationSchema>;

export const vaccinationFormSchema = z.object({
    pet_id: z.string().min(1),
    vaccine_name: z.string().min(1, "Vaccine name is required"),
    administered_at: z.string().min(1, "Administration date is required"),
    next_due_at: z.string().default(""),
    completed_at: z.string().default(""),
    administered_by: z.string().default(""),
    notes: z.string().default(""),
});

export type VaccinationForm = z.infer<typeof vaccinationFormSchema>;

export const vaccinationFormDefaults: VaccinationForm = {
    pet_id: "",
    vaccine_name: "",
    administered_at: "",
    next_due_at: "",
    completed_at: "",
    administered_by: "",
    notes: "",
};

export function vaccinationToForm(vaccination: Vaccination,): VaccinationForm {
    return {
        pet_id: vaccination.pet_id,
        vaccine_name: vaccination.vaccine_name,
        administered_at: vaccination.administered_at,
        next_due_at: vaccination.next_due_at ?? "",
        completed_at: vaccination.completed_at ?? "",
        administered_by: vaccination.administered_by ?? "",
        notes: vaccination.notes ?? "",
    };
}

export function createEmptyVaccinationForm(petId?: string,): VaccinationForm {
    return {
        ...vaccinationFormDefaults,
        pet_id: petId ?? "",
    };
}