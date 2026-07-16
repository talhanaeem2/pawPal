import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Footprints } from "lucide-react";
import z from "zod";

import { petsQuery, activityQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { ActivityFormDialog } from "@/components/ui/activity/activity-form-dialog";
import { ActivityRow } from "@/components/ui/activity/activity-row";

import { ActivityLog } from "@/schemas/activity";

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) => await Promise.all([
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
  const qc = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: activityQuery.queryKey }); toast.success("Removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = logs.find((l) => l.id === confirmId);

  const renderActivityEdit = (item: ActivityLog) => (
    <ActivityFormDialog
      pets={pets}
      item={item}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );

  const renderActivityRow = (item: ActivityLog) => (
    <ActivityRow
      key={item.id}
      item={item}
      pets={pets}
      onDelete={setConfirmId}
      renderEdit={renderActivityEdit}
    />
  );

  return (
    <Page>
      <Page.Header>
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">Activity</h1>
            <p className="text-sm text-muted-foreground">Walks, play & weight.</p>
          </div>
          <ActivityFormDialog
            pets={pets}
            initialOpen={openCreate}
            trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Log</Button>}
            onClose={() => navigate({
              search: { new: undefined },
              replace: true,
            })}
          />
        </header>
      </Page.Header>

      <Page.Content>
        {logs.length === 0 ? (
          <FeatureEmptyState
            icon={Footprints}
            title="Track every adventure"
            description="Log walks, exercise and weight to monitor your pet's health over time."
            cta="Log activity"
            to="/activity"
            search={{ new: true }}
          />
        ) : (
          <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
            {logs.map(renderActivityRow)}
          </ul>
        )}
      </Page.Content>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Remove this log?"
        description={`This will permanently delete the ${confirmItem?.activity_type ?? ""} log. This can't be undone.`}
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() => confirmId && del.mutate(confirmId)}
      />
    </Page>
  );
}
