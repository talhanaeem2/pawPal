import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, PawPrint } from "lucide-react";
import z from "zod";

import { petsQuery } from "@/lib/queries";

import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import NotFoundState from "@/components/ui/common/not-found-state";
import { Button } from "@/components/ui/common/button";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { PetFormDialog } from "../../../components/ui/pets/pet-form-dialog";
import { PetCard } from "../../../components/ui/pets/pet-card";

export const Route = createFileRoute("/_authenticated/pets/")({
    validateSearch: z.object({
        new: z.boolean().optional(),
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(petsQuery),
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Pets · Pawpal" }] }),
    component: PetsPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function PetsPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { new: openCreate } = Route.useSearch();
    const navigate = Route.useNavigate();

    return (
        <Page>
            <Page.Header>
                <header className="flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-3xl">Pets</h1>
                        <p className="text-sm text-muted-foreground">Your little household.</p>
                    </div>
                    <PetFormDialog
                        initialOpen={openCreate}
                        trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" />Add</Button>}
                        onClose={() =>
                            navigate({
                                search: {
                                    new: undefined,
                                },
                                replace: true,
                            })
                        }
                    />
                </header>
            </Page.Header>

            <Page.Content>
                {pets.length === 0 ? (
                    <FeatureEmptyState
                        icon={PawPrint}
                        title="Meet your first companion"
                        description="Add your first pet to begin tracking health, activities, schedules and reminders."
                        cta="Add pet"
                        to="/pets"
                        search={{ new: true }}
                    />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {pets.map((p) => <PetCard key={p.id} pet={p} />)}
                    </ul>
                )}
            </Page.Content>
        </Page>
    );
}
