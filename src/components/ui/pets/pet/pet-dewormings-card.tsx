import { Link } from "@tanstack/react-router";
import { ShieldPlus } from "lucide-react";

import { DewormingRow } from "@/components/ui/dewormings/deworming-row";
import { Section } from "@/components/layout/section";

import { Deworming } from "@/schemas/deworming";
import { Pet } from "@/schemas/pets";

type Props = {
    pet: Pet;
    dewormings: {
        visible: Deworming[];
        remaining: number;
    };
};

export function PetDewormingsCard({
    pet,
    dewormings,
}: Props) {
    const petId = pet.id;

    return (
        <Section
            title="Dewormings"
            icon={ShieldPlus}
            href="/pets/$petId/dewormings"
            params={{ petId }}
        >
            {dewormings.visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No active dewormings.
                </p>
            ) : (
                <ul className="divide-y divide-border/60">
                    {dewormings.visible.slice(0, 3).map((d) => (
                        <DewormingRow
                            item={d}
                            pets={[pet]}
                            key={d.id}
                            showPetName={false}
                        />
                    ))}
                    {dewormings.remaining > 0 && (
                        <Link
                            to="/pets/$petId/dewormings"
                            params={{ petId }}
                            className="block py-2 text-xs text-primary hover:underline"
                        >
                            +{dewormings.remaining} more dewormings  →
                        </Link>
                    )}
                </ul>
            )}
        </Section>
    );
}