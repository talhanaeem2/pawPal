import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery, type ScheduleItem } from "@/lib/pet-queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/_authenticated/schedule")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(scheduleQuery);
  },
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Schedule · Pawpal" }] }),
  component: SchedulePage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function SchedulePage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: items } = useSuspenseQuery(scheduleQuery);
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: async ({ id, markDone }: { id: string; markDone: boolean }) => {
      const { error } = await supabase
        .from("schedule_items")
        .update({ last_done_at: markDone ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return markDone;
    },
    onSuccess: (markDone) => {
      qc.invalidateQueries({ queryKey: ["schedule_items"] });
      toast.success(markDone ? "Marked done" : "Marked undone");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule_items"] }); toast.success("Removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = items.find((i) => i.id === confirmId);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Schedule</h1>
          <p className="text-sm text-muted-foreground">Meals, meds & routines.</p>
        </div>
        <ScheduleDialog
          pets={pets}
          trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>}
        />
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
          <p className="text-sm text-muted-foreground">Nothing scheduled. Add a meal or medication.</p>
        </div>
      ) : (
        <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
          {items.map((s) => {
            const pet = pets.find((p) => p.id === s.pet_id);
            const doneToday = s.last_done_at && new Date(s.last_done_at).toDateString() === new Date().toDateString();
            return (
              <li key={s.id} className="p-4 flex items-center gap-3">
                <button
                  onClick={() => toggle.mutate({ id: s.id, markDone: !doneToday })}
                  disabled={toggle.isPending}
                  className={`h-9 w-9 rounded-full border flex items-center justify-center transition disabled:opacity-60 ${doneToday ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-accent/40"
                    }`}>
                  <Check className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground capitalize truncate">
                    {pet?.name ?? "—"} · {s.kind} · {s.time_of_day?.slice(0, 5) ?? s.frequency}
                    {s.dosage ? ` · ${s.dosage}` : ""}
                  </div>
                </div>
                <ScheduleDialog
                  pets={pets}
                  item={s}
                  trigger={
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit reminder">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmId(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete reminder"
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
        title={`Remove ${confirmItem?.title ?? "this reminder"}?`}
        description="This reminder will be permanently deleted. This can't be undone."
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() => confirmId && del.mutate(confirmId)}
      />
    </div>
  );
}

function emptyForm(pets: { id: string }[]) {
  return { pet_id: pets[0]?.id ?? "", kind: "feeding", title: "", time_of_day: "", frequency: "daily", dosage: "" };
}

function formFromItem(item: ScheduleItem) {
  return {
    pet_id: item.pet_id,
    kind: item.kind,
    title: item.title,
    time_of_day: item.time_of_day ?? "",
    frequency: item.frequency,
    dosage: item.dosage ?? "",
  };
}

function ScheduleDialog({ pets, item, trigger }: { pets: { id: string; name: string }[]; item?: ScheduleItem; trigger: React.ReactNode }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(item ? formFromItem(item) : emptyForm(pets));

  function resetForm() {
    setForm(item ? formFromItem(item) : emptyForm(pets));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        pet_id: form.pet_id,
        kind: form.kind,
        title: form.title.trim(),
        time_of_day: form.time_of_day || null,
        frequency: form.frequency,
        dosage: form.dosage || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("schedule_items").update(payload).eq("id", item!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("schedule_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule_items"] });
      toast.success(isEdit ? "Updated" : "Added");
      setOpen(false);
      if (!isEdit) resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (pets.length === 0 && !isEdit) {
    return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit reminder" : "New reminder"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.title || !form.pet_id) return; save.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pet</Label>
            <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feeding">Feeding</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Morning kibble" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input type="time" value={form.time_of_day} onChange={(e) => setForm({ ...form, time_of_day: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dose / amount</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="1 cup" />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// silence unused-type warning
export type _Si = ScheduleItem;