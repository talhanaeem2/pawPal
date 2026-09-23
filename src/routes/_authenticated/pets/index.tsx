import { useEffect, useState } from "react";
import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, PawPrint, Search } from "lucide-react";
import z from "zod";

import { petsQuery } from "@/lib/queries";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";

import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import NotFoundState from "@/components/ui/common/not-found-state";
import { Button } from "@/components/ui/common/button";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Input } from "@/components/ui/common/input";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const { headerRef, descriptionRef, handleContentScroll } = useCollapsiblePageHeader();

  useEffect(() => {
    if (openCreate) {
      setCreateOpen(true);
      navigate({ search: { new: undefined }, replace: true });
    }
  }, [openCreate]);

  const visiblePets = pets.filter((pet) => {
    const query = petSearch.trim().toLocaleLowerCase();

    return (
      !query ||
      [pet.name, pet.species, pet.breed ?? ""].join(" ").toLocaleLowerCase().includes(query)
    );
  });

  return (
    <Page>
      <Page.Header ref={headerRef} className="gap-2 pt-3 pb-2">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl">Pets</h1>
            <div
              ref={descriptionRef}
              className="overflow-hidden will-change-[max-height,opacity,transform] motion-reduce:transform-none"
            >
              <p className="text-sm text-muted-foreground">Your little household.</p>
            </div>
          </div>
          <PetFormDialog
            trigger={
              <Button className="rounded-full">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            }
            open={createOpen}
            onOpenChange={(o) => {
              setCreateOpen(o);
            }}
          />
        </header>
      </Page.Header>

      <Page.Content onScroll={handleContentScroll}>
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
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={petSearch}
                onChange={(event) => setPetSearch(event.target.value)}
                placeholder="Search pets"
                className="pl-9"
                aria-label="Search pets"
              />
            </div>

            {visiblePets.length === 0 ? (
              <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <h2 className="font-display text-base">No matching pets</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try a name, breed, or species.</p>
              </section>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {visiblePets.map((p) => (
                  <PetCard key={p.id} pet={p} />
                ))}
              </ul>
            )}
          </>
        )}
      </Page.Content>
    </Page>
  );
}
