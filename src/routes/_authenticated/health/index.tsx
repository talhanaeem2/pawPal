import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldPlus, Syringe, Stethoscope } from "lucide-react";

import { dewormingsQuery, petsQuery, vaccinationsQuery, vetQuery } from "@/lib/queries";
import { getActiveDewormings } from "@/lib/dewormings-utils";
import { getActiveVaccinations } from "@/lib/vaccinations-utils";
import { getPreviewList, getUpcomingItems } from "@/lib/utils";

import InlineLoader from "@/components/ui/common/inline-loader";
import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Section } from "@/components/layout/section";
import { Empty } from "@/components/ui/common/empty";
import { Page } from "@/components/layout/page";
import { DewormingRow } from "@/components/ui/dewormings/deworming-row";
import { VaccinationRow } from "@/components/ui/vaccinations/vaccination-row";
import { VetRow } from "@/components/ui/vet/vet-row";

export const Route = createFileRoute("/_authenticated/health/")({
    loader: async ({ context }) => await Promise.all([
        context.queryClient.ensureQueryData(petsQuery),
        context.queryClient.ensureQueryData(vetQuery),
        context.queryClient.ensureQueryData(vaccinationsQuery),
        context.queryClient.ensureQueryData(dewormingsQuery),
    ]),
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Health · Pawpal" }] }),
    component: HealthPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function HealthPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);
    const { data: dewormings } = useSuspenseQuery(dewormingsQuery);
    const { data: vet } = useSuspenseQuery(vetQuery);

    const upcomingVetSorted = getUpcomingItems(vet, (v) => v.date!);
    const upcomingVetData = getPreviewList(upcomingVetSorted, 3);

    const vaccinationData = getPreviewList(getActiveVaccinations(vaccinations), 3);
    const dewormingData = getPreviewList(getActiveDewormings(dewormings), 3);

    return (
        <Page>
            <Page.Header>
                <header>
                    <h1 className="font-display text-3xl">Health</h1>
                    <p className="text-sm text-muted-foreground">
                        Medical care, appointments & records.
                    </p>
                </header>
            </Page.Header>

            <Page.Content>
                <Section title="Upcoming vet" icon={Stethoscope} href="/health/vet">
                    {upcomingVetData.visible.length === 0 ? (
                        <Empty text="Nothing booked." cta="Schedule visit" href="/health/vet" search={{ new: true }} />
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {upcomingVetData.visible.map((v) => (
                                <VetRow
                                    item={v}
                                    pets={pets}
                                    key={v.id}
                                />
                            ))}
                            {upcomingVetData.remaining > 0 && (
                                <Link to="/health/vet" className="block py-2 text-xs text-primary hover:underline">
                                    +{upcomingVetData.remaining} more visits →
                                </Link>
                            )}
                        </ul>
                    )}
                </Section>

                <Section title="Vaccinations" icon={Syringe} href="/health/vaccinations">
                    {vaccinationData.visible.length === 0 ? (
                        <Empty text="No vaccinations scheduled." cta="Add vaccine" href="/health/vaccinations" search={{ new: true }} />
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {vaccinationData.visible.map((v) => (
                                <VaccinationRow
                                    item={v}
                                    pets={pets}
                                    key={v.id}
                                />
                            )
                            )}
                            {vaccinationData.remaining > 0 && (
                                <Link to="/health/vaccinations" className="block py-2 text-xs text-primary hover:underline">
                                    +{vaccinationData.remaining} more vaccines  →
                                </Link>
                            )}
                        </ul>
                    )}
                </Section>

                <Section title="Dewormings" icon={ShieldPlus} href="/health/dewormings">
                    {dewormingData.visible.length === 0 ? (
                        <Empty text="No dewormings scheduled." cta="Add deworming" href="/health/dewormings" search={{ new: true }} />
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {dewormingData.visible.map((d) => (
                                <DewormingRow
                                    item={d}
                                    pets={pets}
                                    key={d.id}
                                />
                            )
                            )}
                            {dewormingData.remaining > 0 && (
                                <Link to="/health/dewormings" className="block py-2 text-xs text-primary hover:underline">
                                    +{dewormingData.remaining} more dewormings  →
                                </Link>
                            )}
                        </ul>
                    )}
                </Section>
            </Page.Content>
        </Page>
    );
}
