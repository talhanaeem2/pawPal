import { CalendarDays, Dog, Scale, ScanLine, Mars, Venus, Cat, Info } from "lucide-react";

import { formatDate } from "@/lib/utils";

import { Section } from "@/components/layout/section";

import { Pet } from "@/schemas/pets";

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-5 w-5 text-primary" />
            <div>
                <p className="text-xs text-muted-foreground">
                    {label}
                </p>
                <p className="text-sm">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function PetInfoCard({ pet }: { pet: Pet }) {
    return (
        <Section
            title="Information"
            icon={Info}
        >
            <div className="grid gap-4">
                <InfoRow
                    icon={Cat}
                    label="Species"
                    value={pet.species}
                />

                <InfoRow
                    icon={Dog}
                    label="Breed"
                    value={pet.breed ?? "Unknown"}
                />

                <InfoRow
                    icon={pet.gender === "female" ? Venus : Mars}
                    label="Gender"
                    value={pet.gender}
                />

                <InfoRow
                    icon={Scale}
                    label="Weight"
                    value={
                        pet.weight_kg
                            ? `${pet.weight_kg} kg`
                            : "Unknown"
                    }
                />

                <InfoRow
                    icon={CalendarDays}
                    label="Birthdate"
                    value={formatDate(pet.birthdate)}
                />

                <InfoRow
                    icon={ScanLine}
                    label="Microchip"
                    value={pet.microchip ?? "Not registered"}
                />
            </div>
        </Section>
    );
}