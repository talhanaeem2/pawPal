import { Link } from "@tanstack/react-router";
import { Syringe } from "lucide-react";

import { Section } from "@/components/layout/section";
import { VaccinationRow } from "@/components/ui/vaccinations/vaccination-row";

import { Pet } from "@/schemas/pets";
import type { Vaccination } from "@/schemas/vacination";

type Props = {
    pet: Pet;
    vaccinations: {
        visible: Vaccination[];
        remaining: number;
    };
};

export function PetVaccinationsCard({
    pet,
    vaccinations,
}: Props) {
    const petId = pet.id;

    return (
        <Section
            title="Vaccinations"
            icon={Syringe}
            href="/pets/$petId/vaccinations"
            params={{ petId }}
        >
            {vaccinations.visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No active vaccinations.
                </p>
            ) : (
                <ul className="divide-y divide-border/60">
                    {vaccinations.visible.slice(0, 3).map((v) => (
                        <VaccinationRow
                            item={v}
                            pets={[pet]}
                            key={v.id}
                            showPetName={false}
                        />
                    ))}
                    {vaccinations.remaining > 0 && (
                        <Link
                            to="/pets/$petId/vaccinations"
                            params={{ petId }}
                            className="block py-2 text-xs text-primary hover:underline"
                        >
                            +{vaccinations.remaining} more vaccines  →
                        </Link>
                    )}
                </ul>
            )}
        </Section>
    );
}