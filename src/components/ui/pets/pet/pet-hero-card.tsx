import { getPetAgeLabel, getPetGenderLabel } from "@/lib/pet-utils";

import { PetAvatar } from "@/components/ui/common/pet-avatar";

import { Pet } from "@/schemas/pets";

export function PetHeroCard({ pet }: { pet: Pet }) {
    const ageLabel = getPetAgeLabel(pet.birthdate);
    const genderLabel = getPetGenderLabel(
        pet.gender,
        pet.neutered,
    );

    return (
        <section className="rounded-3xl bg-card p-4 shadow-(--shadow-soft)">
            <div className="flex flex-col items-center gap-4 text-center">
                <PetAvatar
                    pet={pet}
                    className="h-24 w-24 text-5xl"
                />

                <div className="flex-1 flex flex-col gap-2">
                    <h1 className="font-display text-3xl">
                        {pet.name}
                    </h1>

                    <p className="capitalize text-muted-foreground text-sm">
                        {pet.breed ?? pet.species}
                    </p>

                    <div className="flex flex-wrap justify-center gap-2">
                        {ageLabel && (
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                                {ageLabel}
                            </span>
                        )}

                        {genderLabel && (
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                                {genderLabel}
                            </span>
                        )}

                        {pet.weight_kg && (
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                                {pet.weight_kg} kg
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}