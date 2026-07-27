import { z } from "zod";

import { birthdateToAge, PET_SPECIES } from "@/lib/pet-utils";

export const petSchema = z.object({
    id: z.string(),
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable(),
    birthdate: z.string().nullable(),
    weight_kg: z.number().nullable(),
    photo_url: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    gender: z.string().nullable(),
    neutered: z.boolean(),
    microchip: z.string().nullable(),
});

export type Pet = z.infer<typeof petSchema>;

export const petFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    species: z.string().trim().min(1, "Species is required"),
    other_species: z.string().default(""),
    breed: z.string().default(""),
    birthdate: z.string().default(""),
    age_years: z.string().default(""),
    age_months: z.string().default(""),
    weight_kg: z.string().default(""),
    photo_url: z.string().default(""),
    notes: z.string().default(""),
    gender: z.string().default(""),
    neutered: z.boolean().default(false),
    microchip: z.string().default(""),
}).superRefine((data, ctx) => {
    if (
        data.species === "other" &&
        data.other_species.trim().length === 0
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["other_species"],
            message: "Please enter the animal.",
        });
    }
});;

export type PetForm = z.infer<typeof petFormSchema>;

export const petFormDefaults: PetForm = {
    name: "",
    species: "",
    other_species: "",
    breed: "",
    birthdate: "",
    age_months: "",
    age_years: "",
    weight_kg: "",
    photo_url: "",
    notes: "",
    gender: "",
    neutered: false,
    microchip: "",
};

export function petToForm(pet: Pet): PetForm {
    const age = birthdateToAge(pet.birthdate);
    const isCustom = !PET_SPECIES.includes(pet.species.toLowerCase());

    return {
        name: pet.name,
        species: isCustom ? "other" : pet.species.toLowerCase(),
        other_species: isCustom ? pet.species : "",
        breed: pet.breed ?? "",
        birthdate: pet.birthdate ?? "",
        age_months: age.months.toString(),
        age_years: age.years.toString(),
        weight_kg: pet.weight_kg !== null ? pet.weight_kg.toString() : "",
        photo_url: pet.photo_url ?? "",
        notes: pet.notes ?? "",
        gender: pet.gender ?? "",
        neutered: pet.neutered,
        microchip: pet.microchip ?? "",
    };
}

export function createEmptyPetForm(): PetForm {
    return {
        ...petFormDefaults,
        gender: "male",
    };
}