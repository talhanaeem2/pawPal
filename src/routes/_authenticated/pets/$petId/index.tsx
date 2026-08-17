import { useEffect, useRef, type UIEvent } from "react";
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
    const cardRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLHeadingElement>(null);
    const detailsRef = useRef<HTMLDivElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);
    const emojiRef = useRef<HTMLSpanElement>(null);
    const progressRef = useRef(0);
    const frameRef = useRef<number | null>(null);

    const vaccinationData = getPreviewList(getActiveVaccinations(vaccinations), 3);
    const dewormingData = getPreviewList(getActiveDewormings(dewormings), 3);

    useEffect(() => {
        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    function handleContentScroll(event: UIEvent<HTMLDivElement>) {
        progressRef.current = Math.min(
            event.currentTarget.scrollTop / 112,
            1
        );

        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
            const progress = progressRef.current;

            const card = cardRef.current;
            const avatar = avatarRef.current;
            const name = nameRef.current;
            const details = detailsRef.current;
            const meta = metaRef.current;

            if (card) {
                card.style.paddingTop = `${16 - 8 * progress}px`;
                card.style.paddingBottom = `${16 - 8 * progress}px`;
            }

            if (avatar) {
                const size = 96 - 44 * progress;

                avatar.style.width = `${size}px`;
                avatar.style.height = `${size}px`;
                avatar.style.fontSize = `${3 - 1.25 * progress}rem`;
            }

            if (name) {
                const fontSize = 30 - 6 * progress;
                name.style.fontSize = `${fontSize}px`;
            }

            if (details) {
                details.style.transform = `translateY(${-8 * progress}px)`;
                details.style.gap = `${8 * (1 - progress)}px`;
            }

            if (meta) {
                meta.style.maxHeight = `${80 * (1 - progress)}px`;
                meta.style.opacity = `${1 - progress}`;
                meta.style.transform = `translateY(${-8 * progress}px)`;
                meta.style.pointerEvents = progress > 0.98 ? "none" : "auto";
            }

            if (emojiRef?.current) {
                const emojiSize = 48 - 22 * progress;
                emojiRef.current.style.fontSize = `${emojiSize}px`;
            }

            frameRef.current = null;
        });
    }

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
                    <PetHeroCard
                        cardRef={cardRef}
                        avatarRef={avatarRef}
                        nameRef={nameRef}
                        detailsRef={detailsRef}
                        metaRef={metaRef}
                        emojiRef={emojiRef}
                        pet={pet}
                    />
                </header>
            </Page.Header>

            <Page.Content onScroll={handleContentScroll}>
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