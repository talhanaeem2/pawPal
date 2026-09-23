import { useState, type RefObject } from "react";
import { Footprints, Pill, Plus, Utensils } from "lucide-react";

import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/common/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/common/drawer";
import { ScheduleDialog } from "./schedule-dialog";

import { Pet } from "@/schemas/pets";
import { ScheduleKind } from "@/schemas/schedule";

type ScheduleHeaderProps = {
  pets: Pet[];
  headerRef: RefObject<HTMLDivElement | null>;
  descriptionRef: RefObject<HTMLDivElement | null>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
};

const quickAddOptions: {
  kind: ScheduleKind;
  label: string;
  description: string;
  icon: typeof Utensils;
}[] = [
  {
    kind: "feeding",
    label: "Feeding",
    description: "Meals and portions",
    icon: Utensils,
  },
  {
    kind: "walk",
    label: "Walk",
    description: "Daily exercise",
    icon: Footprints,
  },
  {
    kind: "medication",
    label: "Medication",
    description: "Doses and treatments",
    icon: Pill,
  },
];

export function ScheduleHeader({
  pets,
  headerRef,
  descriptionRef,
  createOpen,
  onCreateOpenChange,
}: ScheduleHeaderProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [initialKind, setInitialKind] = useState<ScheduleKind>();
  const canCreate = pets.length > 0;

  function openPreset(kind: ScheduleKind) {
    setInitialKind(kind);
    setQuickAddOpen(false);
    onCreateOpenChange(true);
  }

  return (
    <Page.Header ref={headerRef} className="gap-2 pt-3 pb-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Schedule</h1>
          <div
            ref={descriptionRef}
            className="overflow-hidden will-change-[max-height,opacity,transform] motion-reduce:transform-none"
          >
            <p className="text-sm text-muted-foreground">Meals, meds & routines.</p>
          </div>
        </div>

        <Button
          className="rounded-full"
          onClick={() => setQuickAddOpen(true)}
          disabled={!canCreate}
        >
          <Plus className="mr-1 h-4 w-4" />
          {canCreate ? "Add" : "Add a pet first"}
        </Button>
      </header>

      {canCreate && (
        <Drawer open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DrawerContent className="rounded-t-3xl">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle className="font-display">Add a reminder</DrawerTitle>
              <DrawerDescription>Start with a common routine.</DrawerDescription>
            </DrawerHeader>

            <div className="grid gap-2 px-4 pb-6">
              {quickAddOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Button
                    key={option.kind}
                    variant="secondary"
                    className="h-auto justify-start rounded-2xl px-4 py-3 text-left"
                    onClick={() => openPreset(option.kind)}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block">{option.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </Button>
                );
              })}

              <Button
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  setInitialKind(undefined);
                  setQuickAddOpen(false);
                  onCreateOpenChange(true);
                }}
              >
                Choose another reminder type
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {canCreate && (
        <ScheduleDialog
          pets={pets}
          open={createOpen}
          onOpenChange={(open) => {
            onCreateOpenChange(open);
            if (!open) setInitialKind(undefined);
          }}
          initialKind={initialKind}
        />
      )}
    </Page.Header>
  );
}
