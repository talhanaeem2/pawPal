import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import z from "zod";

import { petsQuery, scheduleQuery } from "@/lib/queries";
import { todayDateString } from "@/lib/utils";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { LogActivityDialog, UndoActivityDialog } from "@/components/ui/schedule/log-activity-dialog";

import { getScheduleDashboard } from "@/components/ui/schedule/schedule-dashboard";
import { ScheduleHeader } from "@/components/ui/schedule/schedule-header";
import { ScheduleList } from "@/components/ui/schedule/schedule-list";
import { ScheduleProgress } from "@/components/ui/schedule/schedule-progress";
import { useScheduleActions } from "@/hooks/use-schedule-actions";

export const Route = createFileRoute("/_authenticated/schedule")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.ensureQueryData(petsQuery),
      context.queryClient.ensureQueryData(scheduleQuery),
    ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Schedule · Pawpal" }] }),
  component: SchedulePage,
  errorComponent: ({ reset }: ErrorComponentProps) => (
    <InlineErrorState onRetry={reset} />
  ),
  notFoundComponent: () => <NotFoundState />,
});

function SchedulePage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: items } = useSuspenseQuery(scheduleQuery);
  const { new: openCreate } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { headerRef, descriptionRef, handleContentScroll } =
    useCollapsiblePageHeader();
  const today = todayDateString();

  const {
    deleteSchedule,
    handleToggle,
    isToggling,
    logDialogState,
    markLoggedActivityDone,
    setLogDialogState,
    setUndoDialogState,
    undoDialogState,
    undoLoggedActivity,
  } = useScheduleActions({ items, today });

  const { progress, scheduleItems } = useMemo(
    () => getScheduleDashboard(items, pets, today),
    [items, pets, today],
  );

  const confirmItem = items.find((item) => item.id === confirmId);

  return (
    <Page>
      <ScheduleHeader
        pets={pets}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        openCreate={openCreate}
        onCreateClose={() =>
          navigate({ search: { new: undefined }, replace: true })
        }
      />

      <Page.Content onScroll={handleContentScroll}>
        {items.length > 0 && <ScheduleProgress progress={progress} />}

        {items.length === 0 ? (
          <FeatureEmptyState
            icon={Calendar}
            title="Build the perfect routine"
            description="Create feeding, medication, walk and grooming schedules with reminders."
            cta="Add schedule"
            to="/schedule"
            search={{ new: true }}
          />
        ) : (
          <ScheduleList
            items={scheduleItems}
            pets={pets}
            today={today}
            isToggling={isToggling}
            onToggle={handleToggle}
            onDelete={setConfirmId}
          />
        )}
      </Page.Content>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title={`Remove ${confirmItem?.title ?? "this reminder"}?`}
        description="This reminder will be permanently deleted. This can't be undone."
        confirmText="Remove"
        loading={deleteSchedule.isPending}
        confirmVariant="destructive"
        onConfirm={() =>
          confirmId &&
          deleteSchedule.mutate(confirmId, {
            onSettled: () => setConfirmId(null),
          })
        }
      />

      {logDialogState.schedule && (
        <LogActivityDialog
          open={logDialogState.open}
          onOpenChange={(open) =>
            setLogDialogState((prev) => ({ ...prev, open }))
          }
          schedule={logDialogState.schedule}
          timeSlots={logDialogState.timeSlots}
          targetPetId={logDialogState.targetPetId}
          today={today}
          pets={pets}
          onMarkDone={markLoggedActivityDone}
        />
      )}

      {undoDialogState.schedule && (
        <UndoActivityDialog
          open={undoDialogState.open}
          onOpenChange={(open) =>
            setUndoDialogState((prev) => ({ ...prev, open }))
          }
          schedule={undoDialogState.schedule}
          onUndo={undoLoggedActivity}
        />
      )}
    </Page>
  );
}