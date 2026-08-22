import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";
import { supabase } from "@/integrations/supabase/client";
import { getActivityCards } from "@/lib/activity-utils";
import { activityQuery, petsQuery } from "@/lib/queries";

import { ActivityCarePanel } from "@/components/ui/activity/activity-care-panel";
import { ActivityTab, getActivityDashboard } from "@/components/ui/activity/activity-dashboard";
import { ActivityEmptyState } from "@/components/ui/activity/activity-empty-state";
import { ActivityExercisePanel } from "@/components/ui/activity/activity-exercise-panel";
import { ActivityHealthPanel } from "@/components/ui/activity/activity-health-panel";
import { ActivityHistoryPanel } from "@/components/ui/activity/activity-history-panel";
import { ActivityPageHeader } from "@/components/ui/activity/activity-page-header";
import { ActivityPetSelector } from "@/components/ui/activity/activity-pet-selector";
import { ActivityTabs } from "@/components/ui/activity/activity-tabs";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { Page } from "@/components/layout/page";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import NotFoundState from "@/components/ui/common/not-found-state";

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.ensureQueryData(petsQuery),
      context.queryClient.ensureQueryData(activityQuery),
    ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Activity · Pawpal" }] }),
  component: ActivityPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function ActivityPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: logs } = useSuspenseQuery(activityQuery);
  const queryClient = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { headerRef, descriptionRef, handleContentScroll } = useCollapsiblePageHeader();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState(() =>
    pets.length === 1 ? pets[0].id : "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActivityTab>("exercise");
  const [historyType, setHistoryType] = useState("all");
  const [historyDate, setHistoryDate] = useState("all");

  useEffect(() => {
    if (openCreate) {
      setCreateOpen(true);
      navigate({ search: { new: undefined }, replace: true });
    }
  }, [navigate, openCreate]);

  useEffect(() => {
    setHistoryType("all");
  }, [selectedPetId]);

  const dashboard = useMemo(
    () =>
      getActivityDashboard({
        logs,
        pets,
        selectedPetId,
        historyType,
        historyDate,
      }),
    [historyDate, historyType, logs, pets, selectedPetId],
  );

  useEffect(() => {
    if (!dashboard.hasExercise && activeTab === "exercise") {
      setActiveTab("care");
    }
  }, [activeTab, dashboard.hasExercise]);

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: activityQuery.queryKey,
      });
      toast.success("Removed");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed");
    },
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = logs.find((log) => log.id === confirmId);

  if (pets.length === 0) {
    return (
      <ActivityEmptyState
        pets={pets}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        onContentScroll={handleContentScroll}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <ActivityEmptyState
        pets={pets}
        activityCards={getActivityCards(dashboard.selectedSpecies)}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        onContentScroll={handleContentScroll}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    );
  }

  return (
    <Page>
      <ActivityPageHeader
        pets={pets}
        headerRef={headerRef}
        descriptionRef={descriptionRef}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        description="Track your pet's everyday activity, care & health."
      />

      <Page.Content onScroll={handleContentScroll} extraScrollRoom={112}>
        <ActivityPetSelector
          pets={pets}
          selectedPetId={selectedPetId}
          onSelectPet={setSelectedPetId}
        />

        <ActivityTabs
          activeTab={activeTab}
          hasExercise={dashboard.hasExercise}
          onSelectTab={setActiveTab}
        />

        {activeTab === "exercise" && (
          <ActivityExercisePanel pets={pets} exercise={dashboard.exercise} />
        )}

        {activeTab === "care" && (
          <ActivityCarePanel
            pets={pets}
            care={dashboard.care}
            careTypes={dashboard.mergedConfig.care}
            petNames={dashboard.petNames}
            selectedPetId={selectedPetId}
          />
        )}

        {activeTab === "health" && (
          <ActivityHealthPanel
            pets={pets}
            health={dashboard.health}
            petNames={dashboard.petNames}
            selectedPetId={selectedPetId}
          />
        )}

        {activeTab === "history" && (
          <ActivityHistoryPanel
            pets={pets}
            selectedPetId={selectedPetId}
            historyType={historyType}
            historyDate={historyDate}
            historyLogs={dashboard.historyLogs}
            filteredLogs={dashboard.filteredLogs}
            groupedLogs={dashboard.groupedHistoryLogs}
            onHistoryTypeChange={setHistoryType}
            onHistoryDateChange={setHistoryDate}
            onDelete={setConfirmId}
          />
        )}
      </Page.Content>

      <ConfirmDialog
        open={Boolean(confirmId)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmId(null);
          }
        }}
        title="Remove this log?"
        description={
          "This will permanently delete the " +
          (confirmItem?.activity_type ?? "") +
          " log. This can't be undone."
        }
        confirmText="Remove"
        loading={deleteLog.isPending}
        confirmVariant="destructive"
        onConfirm={() => {
          if (confirmId) {
            deleteLog.mutate(confirmId);
          }
        }}
      />
    </Page>
  );
}
