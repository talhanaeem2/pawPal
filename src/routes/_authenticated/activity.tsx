import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, activityQuery, type ActivityLog } from "@/lib/pet-queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Footprints, Dumbbell, Scale } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/_authenticated/activity")({
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
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Activity</h1>
          <p className="text-sm text-muted-foreground">Walks, play & weight.</p>
        </div>
        <ActivityDialog pets={pets} trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Log</Button>} />
      </header>

      {logs.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
          <p className="text-sm text-muted-foreground">No activity yet. Log a walk or play session.</p>
        </div>
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
                    {a.value ? ` · ${a.value}${a.activity_type === "weight" ? " kg" : ""}` : ""}
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{a.notes}</p>}
                </div>
                <ActivityDialog
                  pets={pets}
                  item={a}
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
    </div>
  );
}

function emptyForm(pets: { id: string }[]) {
  return { pet_id: pets[0]?.id ?? "", activity_type: "walk", duration_min: "", value: "", notes: "" };
}

function formFromLog(log: ActivityLog) {
  return {
    pet_id: log.pet_id,
    activity_type: log.activity_type,
    duration_min: log.duration_min != null ? String(log.duration_min) : "",
    value: log.value != null ? String(log.value) : "",
    notes: log.notes ?? "",
  };
}

function ActivityDialog({ pets, item, trigger }: { pets: { id: string; name: string }[]; item?: ActivityLog; trigger: React.ReactNode }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(item ? formFromLog(item) : emptyForm(pets));

  function resetForm() {
    setForm(item ? formFromLog(item) : emptyForm(pets));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        pet_id: form.pet_id,
        activity_type: form.activity_type,
        duration_min: form.duration_min ? Number(form.duration_min) : null,
        value: form.value ? Number(form.value) : null,
        notes: form.notes || null,
        ...(isEdit ? {} : { occurred_at: new Date().toISOString() }),
      };

      if (isEdit) {
        const { error } = await supabase.from("activity_logs").update(payload).eq("id", item!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activity_logs").insert(payload);
        if (error) throw error;
      }
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

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit log" : "Log activity"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.pet_id) return; save.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pet</Label>
              <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">Walk</SelectItem>
                  <SelectItem value="play">Play</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.activity_type !== "weight" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duration (min)</Label>
              <Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
              <Input type="number" step="0.1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}