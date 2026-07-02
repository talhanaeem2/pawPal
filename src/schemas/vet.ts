import { z } from "zod";

export const vetAppointmentSchema = z.object({
    id: z.string(),
    pet_id: z.string(),
    date: z.string(),
    reason: z.string(),
    vet_name: z.string().nullable(),
    notes: z.string().nullable(),
    completed: z.boolean(),
});

export type VetAppointment = z.infer<typeof vetAppointmentSchema>;

export const vetAppointmentFormSchema = z.object({
    pet_id: z.string().min(1),
    date: z.string().min(1, "Date is required"),
    reason: z.string().trim().min(1, "Reason is required"),
    vet_name: z.string().default(""),
    notes: z.string().default(""),
    completed: z.boolean().default(false),
});

export type VetAppointmentForm = z.infer<typeof vetAppointmentFormSchema>;

export const vetAppointmentFormDefaults: VetAppointmentForm = {
    pet_id: "",
    date: "",
    reason: "",
    vet_name: "",
    notes: "",
    completed: false,
};

export function vetAppointmentToForm(
    appointment: VetAppointment,
): VetAppointmentForm {
    return {
        pet_id: appointment.pet_id,
        date: appointment.date,
        reason: appointment.reason,
        vet_name: appointment.vet_name ?? "",
        notes: appointment.notes ?? "",
        completed: appointment.completed,
    };
}

export function createEmptyVetAppointmentForm(
    petId?: string,
): VetAppointmentForm {
    return {
        ...vetAppointmentFormDefaults,
        pet_id: petId ?? "",
    };
}