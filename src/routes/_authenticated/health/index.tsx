import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { ShieldPlus, Syringe, ChevronRight, Stethoscope } from "lucide-react";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { petsQuery, vaccinationsQuery, vetQuery } from "@/lib/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getPreviewList } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { Empty } from "@/components/ui/empty";

export const Route = createFileRoute("/_authenticated/health/")({
    loader: ({ context }) => {
        context.queryClient.ensureQueryData(petsQuery);
        context.queryClient.ensureQueryData(vetQuery);
        context.queryClient.ensureQueryData(vaccinationsQuery);
    },
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Health · Pawpal" }] }),
    component: HealthPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function HealthPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);
    const { data: vet } = useSuspenseQuery(vetQuery);

    const upcomingVetSorted = vet
        .filter((v) => !v.completed && new Date(v.date) >= new Date(Date.now() - 86_400_000))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcomingVetData = getPreviewList(upcomingVetSorted, 3);

    const upcomingVaccinationsSorted = vaccinations
        .filter((v) => v.next_due_at)
        .sort(
            (a, b) =>
                new Date(a.next_due_at!).getTime() -
                new Date(b.next_due_at!).getTime()
        );

    const upcomingVaccinationsData = getPreviewList(upcomingVaccinationsSorted, 3);

    return (
        <div className="space-y-5">
            <header>
                <h1 className="font-display text-3xl">Health</h1>
                <p className="text-sm text-muted-foreground">
                    Medical care, appointments & records.
                </p>
            </header>

            <Section title="Upcoming vet" icon={Stethoscope} href="/health/vet">
                {upcomingVetData.visible.length === 0 ? (
                    <Empty text="Nothing booked." cta="Schedule visit" href="/health/vet" />
                ) : (
                    <ul className="divide-y divide-border/60">
                        {upcomingVetData.visible.map((v) => (
                            <li key={v.id} className="py-3">
                                <div className="font-medium text-sm capitalize">{v.reason}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                    {new Date(v.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                                    {v.vet_name ? ` · ${v.vet_name}` : ""}
                                </div>
                            </li>
                        ))}
                        {upcomingVetData.remaining > 0 && (
                            <Link to="/health/vet" className="block py-2 text-xs text-primary hover:underline">
                                +{upcomingVetData.remaining} more visits →
                            </Link>
                        )}
                    </ul>
                )}
            </Section>

            <Section title="Upcoming vaccinations" icon={Syringe} href="/health/vaccinations">
                {upcomingVaccinationsData.visible.length === 0 ? (
                    <Empty text="No vaccinations scheduled." cta="Add vaccine" href="/health/vaccinations" />
                ) : (
                    <ul className="divide-y divide-border/60">
                        {upcomingVaccinationsData.visible.map((v) => {
                            const pet = pets.find((p) => p.id === v.pet_id);

                            return (
                                <li key={v.id} className="py-3">
                                    <div className="font-medium text-sm capitalize">{v.vaccine_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {pet?.name ?? "—"} · Due{" "}
                                        {new Date(v.next_due_at!).toLocaleDateString()}
                                    </div>

                                    {v.administered_by && (
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {v.administered_by}
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                        {upcomingVaccinationsData.remaining > 0 && (
                            <Link to="/health/vet" className="block py-2 text-xs text-primary hover:underline">
                                +{upcomingVaccinationsData.remaining} more vaccines  →
                            </Link>
                        )}
                    </ul>
                )}
            </Section>
        </div>
    );
}
