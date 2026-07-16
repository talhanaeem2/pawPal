import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Pencil, ShieldPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { dewormingsQuery, petDewormingsQuery, petQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

import InlineLoader from "@/components/ui/common/inline-loader";
import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/common/breadcrumb";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { Button } from "@/components/ui/common/button";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { HealthGroup } from "@/components/ui/common/health-group";
import { Page } from "@/components/layout/page";
import { DewormingFormDialog } from "@/components/ui/dewormings/deworming-form-dialog";
import { DewormingRow } from "@/components/ui/dewormings/deworming-row";

import { Deworming } from "@/schemas/deworming";

export const Route = createFileRoute("/_authenticated/pets/$petId/dewormings")({
    validateSearch: z.object({
        new: z.boolean().optional(),
    }),
    loader: async ({ context, params }) => await Promise.all([
        context.queryClient.ensureQueryData(petQuery(params.petId)),
        context.queryClient.ensureQueryData(petDewormingsQuery(params.petId)),
    ]),
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Pet Deworming · Pawpal" }] }),
    component: DewormingPetPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function DewormingPetPage() {
    const { petId } = Route.useParams();

    const { data: pet } = useSuspenseQuery(petQuery(petId));
    const { data: dewormings } = useSuspenseQuery(petDewormingsQuery(petId));
    const qc = useQueryClient();
    const navigate = Route.useNavigate();
    const { new: openCreate } = Route.useSearch();
    const [confirmDelete, setConfirmDelete] = useState<{ dewormingId: string; petId: string; } | null>(null);
    const now = Date.now();

    function getDewormingStatus(d: Deworming) {
        return new Date(d.next_due_at).getTime() < now
            ? "overdue"
            : "upcoming";
    }

    const upcoming = dewormings
        .filter((v) => getDewormingStatus(v) === "upcoming")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const overdue = dewormings
        .filter((v) => getDewormingStatus(v) === "overdue")
        .sort((a, b) => new Date(b.next_due_at!).getTime() - new Date(a.next_due_at!).getTime());

    const del = useMutation({
        mutationFn: async ({ dewormingId }: {
            dewormingId: string;
            petId: string;
        }) => {
            const { error } = await supabase.from("dewormings").delete().eq("id", dewormingId);
            if (error) throw error;
        },
        onSuccess: async (_, variables) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: dewormingsQuery.queryKey }),
                qc.invalidateQueries({ queryKey: petDewormingsQuery(variables.petId).queryKey }),
            ]);
            toast.success("Removed");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setConfirmDelete(null),
    });

    const selectedDeworming = dewormings.find(
        (v) => v.id === confirmDelete?.dewormingId
    );

    const renderDewormingEdit = (item: Deworming) => (
        <DewormingFormDialog
            pets={[pet]}
            item={item}
            hidePetSelector
            trigger={
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            }
        />
    );

    const renderDewormingRow = (item: Deworming) => (
        <DewormingRow
            key={item.id}
            item={item}
            pets={[pet]}
            showPetName={false}
            onDelete={(item) =>
                setConfirmDelete({
                    dewormingId: item.id,
                    petId: item.pet_id,
                })
            }
            renderEdit={renderDewormingEdit}
        />
    );

    const sections = [
        {
            title: "Upcoming",
            emptyMessage: "No upcoming dewormings.",
            items: upcoming,
        },
        {
            title: "Overdue",
            emptyMessage: "No overdue dewormings.",
            items: overdue,
        },
    ];

    return (
        <Page>
            <Page.Header>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/pets">Pets</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link
                                    to="/pets/$petId"
                                    params={{ petId: pet.id }}
                                >
                                    {pet.name}
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>Dewormings</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <header className="flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-3xl">Dewormings</h1>
                        <p className="text-sm text-muted-foreground">Deworming records & due dates.</p>
                    </div>
                    <DewormingFormDialog
                        pets={[pet]}
                        initialOpen={openCreate}
                        hidePetSelector
                        trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" />Add</Button>}
                        onClose={() => navigate({
                            search: { new: undefined },
                            replace: true,
                        })}
                    />
                </header>
            </Page.Header>

            <Page.Content>
                {dewormings.length === 0 ? (
                    <FeatureEmptyState
                        icon={ShieldPlus}
                        title="Stay on top of deworming"
                        description="Track treatments and receive reminders when the next dose is due."
                        cta="Add deworming"
                        to="/health/dewormings"
                        search={{ new: true }}
                    />
                ) : sections.filter(section => section.items.length > 0).map(section => (
                    <HealthGroup
                        key={section.title}
                        title={section.title}
                        emptyMessage={section.emptyMessage}
                        hasItems={section.items.length > 0}
                    >
                        {section.items.map(renderDewormingRow)}
                    </HealthGroup>
                ))}
            </Page.Content>

            <ConfirmDialog
                open={!!confirmDelete}
                onOpenChange={(o) => !o && setConfirmDelete(null)}
                title={`Remove ${selectedDeworming?.product_name ?? "this deworming"}?`}
                description="This deworming record will be permanently deleted. This can't be undone."
                confirmText="Remove"
                loading={del.isPending}
                confirmVariant="destructive"
                onConfirm={() => confirmDelete &&
                    del.mutate({
                        dewormingId: confirmDelete.dewormingId,
                        petId: confirmDelete.petId,
                    })}
            />
        </Page>
    );
}
