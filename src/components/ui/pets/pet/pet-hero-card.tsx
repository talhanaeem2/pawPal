import { getPetAgeLabel, getPetGenderLabel } from "@/lib/pet-utils";

import { PetAvatar } from "@/components/ui/common/pet-avatar";

import { Pet } from "@/schemas/pets";

type PetHeroCardProps = {
    pet: Pet;
    cardRef: React.RefObject<HTMLDivElement | null>;
    avatarRef: React.RefObject<HTMLDivElement | null>;
    nameRef: React.RefObject<HTMLHeadingElement | null>;
    detailsRef: React.RefObject<HTMLDivElement | null>;
    metaRef: React.RefObject<HTMLDivElement | null>;
};

export function PetHeroCard({
    pet,
    cardRef,
    avatarRef,
    nameRef,
    detailsRef,
    metaRef,
}: PetHeroCardProps) {
    const ageLabel = getPetAgeLabel(pet.birthdate);
    const genderLabel = getPetGenderLabel(
        pet.gender,
        pet.neutered,
    );

    return (
        <section
            ref={cardRef}
            className="rounded-3xl bg-card p-4 shadow-(--shadow-soft)"
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <PetAvatar
                    pet={pet}
                    className="text-5xl h-24 w-24"
                    avatarRef={avatarRef}
                />

                <div
                    ref={detailsRef}
                    className="flex-1 flex flex-col"
                >
                    <h1
                        ref={nameRef}
                        className="font-display text-3xl"
                    >
                        {pet.name}
                    </h1>

                    <p className="capitalize text-muted-foreground text-sm">
                        {pet.breed ?? pet.species}
                    </p>

                    <div
                        ref={metaRef}
                        className="flex flex-wrap justify-center gap-2 overflow-hidden"
                    >
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