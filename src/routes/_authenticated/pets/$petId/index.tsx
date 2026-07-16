import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { petDewormingsQuery, petQuery, petVaccinationsQuery } from "@/lib/queries";
import { getPreviewList } from "@/lib/utils";
import { getActiveVaccinations } from "@/lib/vaccinations-utils";
import { getActiveDewormings } from "@/lib/dewormings-utils";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Page } from "@/components/layout/page";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/common/breadcrumb";
import { PetHeroCard } from "@/components/ui/pets/pet/pet-hero-card";
import { PetVaccinationsCard } from "@/components/ui/pets/pet/pet-vaccinations-card";
import { PetInfoCard } from "@/components/ui/pets/pet/pet-info-card";
import { PetDewormingsCard } from "@/components/ui/pets/pet/pet-dewormings-card";
import { PetActions } from "@/components/ui/pets/pet/pet-actions";

export const Route = createFileRoute("/_authenticated/pets/$petId/")({
    loader: async ({ context, params }) => await Promise.all([
        context.queryClient.ensureQueryData(petQuery(params.petId)),
        context.queryClient.ensureQueryData(petVaccinationsQuery(params.petId)),
        context.queryClient.ensureQueryData(petDewormingsQuery(params.petId)),
    ]),
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Pet · Pawpal" }] }),
    component: PetPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function PetPage() {
    const { petId } = Route.useParams();

    const { data: pet } = useSuspenseQuery(petQuery(petId));
    const { data: vaccinations } = useSuspenseQuery(petVaccinationsQuery(petId));
    const { data: dewormings } = useSuspenseQuery(petDewormingsQuery(petId));

    const navigate = Route.useNavigate();

    const vaccinationData = getPreviewList(getActiveVaccinations(vaccinations), 3);
    const dewormingData = getPreviewList(getActiveDewormings(dewormings), 3);

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
                            <BreadcrumbPage>{pet.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <header>
                    <PetHeroCard pet={pet} />
                </header>
            </Page.Header>

            <Page.Content>
                <div className="space-y-4">
                    <PetInfoCard pet={pet} />
                    <PetVaccinationsCard
                        pet={pet}
                        vaccinations={vaccinationData}
                    />
                    <PetDewormingsCard
                        pet={pet}
                        dewormings={dewormingData}
                    />
                    <PetActions
                        pet={pet}
                        onDeleted={() =>
                            navigate({
                                to: "/pets",
                                replace: true,
                            })
                        }
                    />
                </div>
            </Page.Content>
        </Page>
    );
}
