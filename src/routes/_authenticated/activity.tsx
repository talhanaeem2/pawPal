import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, activityQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Footprints, Dumbbell, Scale } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActivityLog, activityLogFormSchema, activityLogToForm, createEmptyActivityLogForm } from "@/schemas/activity";
import { useZodForm } from "@/hooks/use-zod-form";
import { Field } from "@/components/ui/field";
import z from "zod";
import { FeatureEmptyState } from "@/components/ui/feature-empty-state";
import { Page } from "@/components/layout/page";

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(activityQuery);
  },
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Activity · Pawpal" }] }),
  component: ActivityPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

const icons: Record<string, typeof Footprints> = { walk: Footprints, play: Dumbbell, weight: Scale };

function ActivityPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: logs } = useSuspenseQuery(activityQuery);
  const qc = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activity_logs"] }); toast.success("Removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = logs.find((l) => l.id === confirmId);

  return (
    <Page>
      <Page.Header>
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">Activity</h1>
            <p className="text-sm text-muted-foreground">Walks, play & weight.</p>
          </div>
          <ActivityDialog
            pets={pets}
            initialOpen={openCreate}
            trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Log</Button>}
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
            {logs.map((a) => {
              const pet = pets.find((p) => p.id === a.pet_id);
              const Icon = icons[a.activity_type] ?? Footprints;
              return (
                <li key={a.id} className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm capitalize">{a.activity_type}{pet ? ` · ${pet.name}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      {a.duration_min ? ` · ${a.duration_min} min` : ""}
                      {a.weight ? ` · ${a.weight}${a.activity_type === "weight" ? " kg" : ""}` : ""}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{a.notes}</p>}
                  </div>
                  <ActivityDialog
                    pets={pets}
                    item={a}
                    initialOpen={openCreate}
                    trigger={
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit log">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmId(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
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

function ActivityDialog({ pets, item, trigger, initialOpen }: { pets: { id: string; name: string }[]; item?: ActivityLog; trigger: React.ReactNode; initialOpen?: boolean }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const form = useZodForm(
    activityLogFormSchema,
    item ? activityLogToForm(item) : createEmptyActivityLogForm(pets[0]?.id)
  );

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
    }
  }, [initialOpen]);

  function resetForm() {
    form.reset(item ? activityLogToForm(item) : createEmptyActivityLogForm(pets[0]?.id));
  }

  const save = useMutation({
    mutationFn: async () => {
      const data = form.getValidated();

      if (!data) return;

      const payload = {
        pet_id: data.pet_id,
        activity_type: data.activity_type,
        duration_min: data.activity_type !== "weight" &&
          data.duration_min ? Number(data.duration_min) : null,
        weight: data.activity_type === "weight" &&
          data.weight ? Number(data.weight) : null,
        notes: data.notes || null,
        ...(isEdit ? {} : { occurred_at: new Date().toISOString() }),
      };

      const query = item
        ? supabase.from("activity_logs").update(payload).eq("id", item.id)
        : supabase.from("activity_logs").insert(payload);

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      toast.success(isEdit ? "Updated" : "Logged");
      setOpen(false);
      if (!isEdit) resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

  function clearCreateSearch() {
    if (!isEdit) {
      navigate({
        search: {
          new: undefined,
        },
        replace: true,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          resetForm();
          clearCreateSearch();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit log" : "Log activity"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pet">
              <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Type" error={form.errors.activity_type}>
              <Select value={form.values.activity_type} onValueChange={(v) => {
                form.setField("activity_type", v);

                if (v === "weight") {
                  form.setField("duration_min", "");
                } else {
                  form.setField("weight", "");
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">Walk</SelectItem>
                  <SelectItem value="play">Play</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {form.values.activity_type !== "weight" ? (
            <Field label="Duration (min)">
              <Input type="number" value={form.values.duration_min} onChange={(e) => form.setField("duration_min", e.target.value)} />
            </Field>
          ) : (
            <Field label="Weight (kg)">
              <Input type="number" step="0.1" value={form.values.weight} onChange={(e) => form.setField("weight", e.target.value)} required />
            </Field>
          )}
          <Field label="Notes">
            <Textarea rows={2} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} />
          </Field>
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}