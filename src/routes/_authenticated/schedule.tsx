import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Search } from "lucide-react";
import z from "zod";

import { petsQuery, scheduleQuery, vetQuery } from "@/lib/queries";
import { todayDateString } from "@/lib/utils";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Input } from "@/components/ui/common/input";
import { Page } from "@/components/layout/page";
import {
  LogActivityDialog,
  UndoActivityDialog,
} from "@/components/ui/schedule/log-activity-dialog";

import { getScheduleDashboard } from "@/components/ui/schedule/schedule-dashboard";
import { ScheduleHeader } from "@/components/ui/schedule/schedule-header";
import { ScheduleList } from "@/components/ui/schedule/schedule-list";
import { ScheduleProgress } from "@/components/ui/schedule/schedule-progress";
import { CompletionNoteDialog } from "@/components/ui/schedule/completion-note-dialog";
import { useScheduleActions } from "@/hooks/use-schedule-actions";

export const Route = createFileRoute("/_authenticated/schedule")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.ensureQueryData(petsQuery),
      context.queryClient.ensureQueryData(scheduleQuery),
      context.queryClient.ensureQueryData(vetQuery),
    ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Schedule · Pawpal" }] }),
  component: SchedulePage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function SchedulePage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: items } = useSuspenseQuery(scheduleQuery);
  const { data: vetAppointments } = useSuspenseQuery(vetQuery);
  const { new: openCreate } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const { headerRef, descriptionRef, handleContentScroll } = useCollapsiblePageHeader();
  const today = todayDateString();

  useEffect(() => {
    if (openCreate) {
      setCreateOpen(true);
      navigate({ search: { new: undefined }, replace: true });
    }
  }, [navigate, openCreate]);

  const {
    completionNoteState,
    deleteSchedule,
    handleSkip,
    handleToggle,
    isSavingCompletionNote,
    isToggling,
    logDialogState,
    markLoggedActivityDone,
    saveCompletionNote,
    setCompletionNoteState,
    setLogDialogState,
    setUndoDialogState,
    undoDialogState,
    undoLoggedActivity,
  } = useScheduleActions({ items, today });

  const { progress, scheduleItems } = useMemo(
    () => getScheduleDashboard(items, pets, today),
    [items, pets, today],
  );

  const visibleScheduleItems = useMemo(() => {
    const query = scheduleSearch.trim().toLocaleLowerCase();

    if (!query) {
      return scheduleItems;
    }

    return scheduleItems.filter((item) =>
      [item.schedule.title, item.petLabel, item.schedule.kind]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [scheduleItems, scheduleSearch]);

  const confirmItem = items.find((item) => item.id === confirmId);
  const nextVetAppointment = vetAppointments
    .filter(
      (appointment) =>
        !appointment.completed && getCalendarDate(appointment.date) >= getCalendarDate(today),
    )
    .sort((left, right) => getCalendarDate(left.date).getTime() - getCalendarDate(right.date).getTime())[0];
  const nextVetPet = pets.find((pet) => pet.id === nextVetAppointment?.pet_id);

  return (
    <Page>
      <ScheduleHeader
        pets={pets}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />

      <Page.Content onScroll={handleContentScroll}>
        {nextVetAppointment && (
          <Link
            to="/health/vet"
            className="flex items-center justify-between gap-3 rounded-3xl border border-primary/15 bg-primary/5 px-4 py-3 transition hover:bg-primary/10"
          >
            <div>
              <p className="text-sm font-medium">Vet appointment {formatRelativeDays(nextVetAppointment.date)}</p>
              <p className="text-xs text-muted-foreground">
                {nextVetPet?.name ?? "Your pet"} · {nextVetAppointment.reason}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary">View</span>
          </Link>
        )}

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
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={scheduleSearch}
                onChange={(event) => setScheduleSearch(event.target.value)}
                placeholder="Search reminders"
                className="pl-9"
                aria-label="Search reminders"
              />
            </div>

            {visibleScheduleItems.length === 0 ? (
              <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <h2 className="font-display text-base">No matching reminders</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a pet name, reminder name, or type.
                </p>
              </section>
            ) : (
              <ScheduleList
                items={visibleScheduleItems}
                pets={pets}
                today={today}
                isToggling={isToggling}
                onToggle={handleToggle}
                onSkip={handleSkip}
                onDelete={setConfirmId}
              />
            )}
          </>
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
          onOpenChange={(open) => setLogDialogState((prev) => ({ ...prev, open }))}
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
          onOpenChange={(open) => setUndoDialogState((prev) => ({ ...prev, open }))}
          schedule={undoDialogState.schedule}
          onUndo={undoLoggedActivity}
        />
      )}

      {completionNoteState && (
        <CompletionNoteDialog
          open
          title={completionNoteState.title}
          loading={isSavingCompletionNote}
          onOpenChange={(open) => {
            if (!open) {
              setCompletionNoteState(null);
            }
          }}
          onSave={saveCompletionNote}
        />
      )}
    </Page>
  );
}

function formatRelativeDays(date: string) {
  const today = getCalendarDate(todayDateString());
  const appointmentDay = getCalendarDate(date);
  const days = Math.round((appointmentDay.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function getCalendarDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
