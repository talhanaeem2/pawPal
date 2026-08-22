import type { ElementType, RefObject, UIEventHandler } from "react";
import { Footprints } from "lucide-react";

import { Page } from "@/components/layout/page";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Pet } from "@/schemas/pets";

import { ActivityPageHeader } from "./activity-page-header";

type ActivityCard = {
  title: string;
  icon: ElementType;
};

type ActivityEmptyStateProps = {
  pets: Pet[];
  activityCards?: ActivityCard[];
  headerRef: RefObject<HTMLDivElement | null>;
  descriptionRef: RefObject<HTMLDivElement | null>;
  onContentScroll: UIEventHandler<HTMLDivElement>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

export function ActivityEmptyState({
  pets,
  activityCards,
  headerRef,
  descriptionRef,
  onContentScroll,
  createOpen,
  onCreateOpenChange,
}: ActivityEmptyStateProps) {
  return (
    <Page>
      <ActivityPageHeader
        pets={pets}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        description="Track your pet's exercise, care & health."
      />

      <Page.Content onScroll={onContentScroll} extraScrollRoom={112}>
        <FeatureEmptyState
          icon={Footprints}
          title="Track every adventure"
          description="Log exercise, care and health activities to build a complete history of your pet's everyday life."
          cta="Log activity"
          to="/activity"
          search={{ new: true }}
        />

        {activityCards && (
          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <h2 className="font-display text-lg">What you can track</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {activityCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.title} className="rounded-2xl bg-secondary/60 p-3 text-center">
                    <Icon className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-2 text-xs font-medium">{card.title}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </Page.Content>
    </Page>
  );
}
