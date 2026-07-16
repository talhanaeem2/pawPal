import { Link } from "@tanstack/react-router";

import { getPetAgeLabel, getPetGenderLabel } from "@/lib/pet-utils";

import { PetAvatar } from "@/components/ui/common/pet-avatar";

import { Pet } from "@/schemas/pets";

export function PetCard({ pet }: { pet: Pet }) {
    const ageLabel = getPetAgeLabel(pet.birthdate);
    const genderLabel = getPetGenderLabel(pet.gender, pet.neutered);

    return (
        <li>
            <Link
                to="/pets/$petId"
                params={{ petId: pet.id }}
                className="block rounded-3xl bg-card p-5 shadow-(--shadow-soft)"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <PetAvatar pet={pet} />
                        <div>
                            <div className="font-display text-xl leading-tight">{pet.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                                {pet.breed ?? pet.species}
                                {ageLabel ? ` · ${ageLabel}` : ""}
                                {pet.weight_kg ? ` · ${pet.weight_kg}kg` : ""}
                                {genderLabel ? ` · ${genderLabel}` : ""}
                            </div>
                        </div>
                    </div>
                </div>
                {pet.notes && <p className="text-sm text-muted-foreground mt-3">{pet.notes}</p>}
            </Link>
        </li>
    );
}