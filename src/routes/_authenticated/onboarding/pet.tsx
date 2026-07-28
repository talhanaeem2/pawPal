import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PawPrint } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { petsQuery } from "@/lib/queries";
import { getSpeciesIcon, PET_SPECIES } from "@/lib/pet-utils";

import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Page } from "@/components/layout/page";

export const Route = createFileRoute("/_authenticated/onboarding/pet")({
    component: PetOnboardingPage,
});

function PetOnboardingPage() {
    const qc = useQueryClient();
    const navigate = Route.useNavigate();

    const [name, setName] = useState("");
    const [animal, setAnimal] = useState(PET_SPECIES[0]);
    const [otherAnimal, setOtherAnimal] = useState("");

    const createPet = useMutation({
        mutationFn: async () => {
            const payload = {
                name: name.trim(),
                species: animal === "other"
                    ? otherAnimal.trim().replace(/\s+/g, " ").toLowerCase()
                    : animal,
            };

            const { data, error } = await supabase
                .from("pets")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            return data;
        },

        onSuccess: async (pet) => {
            await qc.invalidateQueries({
                queryKey: petsQuery.queryKey,
            });

            navigate({
                to: "/onboarding/reminder",
                search: {
                    petId: pet.id,
                },
            });
        },

        onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Failed to create pet"),
    });

    return (
        <Page>
            <Page.Content>
                <div className="w-full space-y-8">
                    <div className="text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
                            <PawPrint className="h-10 w-10 text-primary" />
                        </div>

                        <h1 className="mt-6 font-display text-3xl">
                            Tell us about your pet
                        </h1>

                        <p className="mt-2 text-muted-foreground">
                            You can always add more details later.
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Name</Label>

                            <Input
                                placeholder="e.g. Rex"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            {animal === "other" && (
                                <>
                                    <Label>What animal is it?</Label>

                                    <Input
                                        placeholder="e.g. Turtle"
                                        value={otherAnimal}
                                        onChange={(e) => setOtherAnimal(e.target.value)}
                                    />
                                </>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Animal</Label>

                            <div className="grid grid-cols-2 gap-3">
                                {PET_SPECIES.map((item) => {
                                    const Icon = getSpeciesIcon(item);

                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setAnimal(item)}
                                            className={cn(
                                                "rounded-2xl border p-4 transition-all duration-200",
                                                "flex flex-col items-center justify-center gap-3",
                                                animal === item
                                                    ? "border-primary bg-primary/10 shadow-(--shadow-soft)"
                                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                            )}
                                        >
                                            <Icon className="h-9 w-9 text-primary" />

                                            <span className="text-sm font-medium">
                                                {item}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full rounded-full h-11"
                        disabled={!name.trim() || (animal === "other" && !otherAnimal.trim()) || createPet.isPending}
                        onClick={() => createPet.mutate()}
                    >
                        {createPet.isPending ? "Creating..." : "Continue"}
                    </Button>
                </div>
            </Page.Content>
        </Page>
    );
}