import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Pencil, Syringe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { petsQuery, petVaccinationsQuery, vaccinationsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/common/breadcrumb";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { VaccinationsFormDialog } from "@/components/ui/vaccinations/vaccination-form-dialog";
import { HealthGroup } from "@/components/ui/common/health-group";
import { VaccinationRow } from "@/components/ui/vaccinations/vaccination-row";

import { Vaccination } from "@/schemas/vacination";

export const Route = createFileRoute("/_authenticated/health/vaccinations")({
    validateSearch: z.object({
        new: z.boolean().optional(),
    }),
    loader: async ({ context }) => await Promise.all([
        context.queryClient.ensureQueryData(petsQuery),
        context.queryClient.ensureQueryData(vaccinationsQuery),
    ]),
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Vaccinations · Pawpal" }] }),
    component: VaccinationsPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function VaccinationsPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);
    const qc = useQueryClient();
    const navigate = Route.useNavigate();
    const { new: openCreate } = Route.useSearch();
    const [confirmDelete, setConfirmDelete] = useState<{ vaccinationId: string; petId: string } | null>(null);
    const now = Date.now();

    function getVaccinationStatus(v: Vaccination) {
        if (v.completed_at) return "completed";

        if (!v.next_due_at) return "no_due_date";

        if (v.next_due_at && new Date(v.next_due_at).getTime() < now) {
            return "overdue";
        }

        return "upcoming";
    }

    const upcoming = vaccinations
        .filter((v) => getVaccinationStatus(v) === "upcoming")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const overdue = vaccinations
        .filter((v) => getVaccinationStatus(v) === "overdue")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const noDueDate = vaccinations
        .filter((v) => getVaccinationStatus(v) === "no_due_date")
        .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());

    const history = vaccinations
        .filter((v) => getVaccinationStatus(v) === "completed")
        .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());

    const del = useMutation({
        mutationFn: async ({ vaccinationId }: {
            vaccinationId: string;
            petId: string;
        }) => {
            const { error } = await supabase.from("vaccinations").delete().eq("id", vaccinationId);
            if (error) throw error;
        },
        onSuccess: async (_, variables) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: vaccinationsQuery.queryKey }),
                qc.invalidateQueries({ queryKey: petVaccinationsQuery(variables.petId).queryKey }),
            ]);
            toast.success("Removed");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setConfirmDelete(null),
    });

    const confirmItem = vaccinations.find(
        (v) => v.id === confirmDelete?.vaccinationId
    );

    const renderVaccinationEdit = (item: Vaccination) => (
        <VaccinationsFormDialog
            pets={pets}
            item={item}
            trigger={
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            }
        />
    );

    const renderVaccinationRow = (item: Vaccination) => (
        <VaccinationRow
            key={item.id}
            item={item}
            pets={pets}
            onDelete={(item) =>
                setConfirmDelete({
                    vaccinationId: item.id,
                    petId: item.pet_id,
                })
            }
            renderEdit={renderVaccinationEdit}
        />
    );

    const sections = [
        {
            title: "Upcoming",
            emptyMessage: "No upcoming vaccines.",
            items: upcoming,
            showWhenEmpty: true,
        },
        {
            title: "Overdue",
            emptyMessage: "No overdue vaccines.",
            items: overdue,
            showWhenEmpty: false,
        },
        {
            title: "No due date",
            emptyMessage: "No vaccines without a due date.",
            items: noDueDate,
            showWhenEmpty: false,
        },
        {
            title: "Completed",
            emptyMessage: "No completed vaccines yet.",
            items: history,
            showWhenEmpty: true,
        },
    ];

    return (
        <Page>
            <Page.Header>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/health">Health</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>Vaccinations</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <header className="flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-3xl">Vaccinations</h1>
                        <p className="text-sm text-muted-foreground">Vaccine records & due dates.</p>
                    </div>
                    <VaccinationsFormDialog
                        pets={pets}
                        initialOpen={openCreate}
                        trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" />Add</Button>}
                        onClose={() => navigate({
                            search: { new: undefined },
                            replace: true,
                        })}
                    />
                </header>
            </Page.Header>

            <Page.Content>
                {vaccinations.length === 0 ? (
                    <FeatureEmptyState
                        icon={Syringe}
                        title="Never miss an important vaccine"
                        description="Record vaccinations and we'll remind you when the next dose is due."
                        cta="Add vaccination"
                        to="/health/vaccinations"
                        search={{ new: true }}
                    />
                ) : sections.filter(section => section.items.length > 0 || section.showWhenEmpty)
                    .map(section => (
                        <HealthGroup
                            key={section.title}
                            title={section.title}
                            emptyMessage={section.emptyMessage}
                            hasItems={section.items.length > 0}
                        >
                            {section.items.map(renderVaccinationRow)}
                        </HealthGroup>
                    ))}
            </Page.Content>

            <ConfirmDialog
                open={!!confirmDelete}
                onOpenChange={(o) => !o && setConfirmDelete(null)}
                title={`Remove ${confirmItem?.vaccine_name ?? "this vaccine"}?`}
                description="This vaccine record will be permanently deleted. This can't be undone."
                confirmText="Remove"
                loading={del.isPending}
                confirmVariant="destructive"
                onConfirm={() => confirmDelete &&
                    del.mutate({
                        vaccinationId: confirmDelete.vaccinationId,
                        petId: confirmDelete.petId,
                    })}
            />
        </Page>
    );
}
