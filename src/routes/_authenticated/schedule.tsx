import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery } from "@/lib/pet-queries";
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
import { formatFrequency, formatKind, formatTime } from "@/lib/utils";
import { createEmptyScheduleForm, scheduleFormSchema, ScheduleItem, scheduleToForm } from "@/schemas/schedule";
import { useZodForm } from "@/hooks/use-zod-form";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

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
                    {pet?.name ?? "—"} · {formatKind(s)} · {s.time_of_day ? formatTime(s.time_of_day) : formatFrequency(s)}
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

function ScheduleDialog({ pets, item, trigger }: { pets: { id: string; name: string }[]; item?: ScheduleItem; trigger: React.ReactNode }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useZodForm(
    scheduleFormSchema,
    item ? scheduleToForm(item) : createEmptyScheduleForm(pets[0]?.id)
  );

  function resetForm() {
    form.reset(item ? scheduleToForm(item) : createEmptyScheduleForm(pets[0]?.id));
  }

  const save = useMutation({
    mutationFn: async () => {
      const data = form.getValidated();

      if (!data) {
        toast.error("Fix validation errors first");
        return;
      }
      const payload = {
        pet_id: data.pet_id,
        kind: data.kind,
        custom_kind: data.kind === "other" ? data.custom_kind.trim() || null : null,
        title: data.title.trim(),
        time_of_day: data.time_of_day || null,
        frequency: data.frequency,
        custom_frequency: data.frequency === "as_needed" ? data.custom_frequency.trim() || null : null,
        dosage: data.dosage || null,
        notes: data.notes.trim() || null,
      };

      if (item) {
        await supabase.from("schedule_items").update(payload).eq("id", item.id);
      } else {
        await supabase.from("schedule_items").insert(payload);
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
        <form onSubmit={(e) => { e.preventDefault(); if (!form.values.title || !form.values.pet_id) return; save.mutate(); }} className="space-y-3">
          <Field label="Pet">
            <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.values.kind} onValueChange={(v) => form.setField("kind", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feeding">Feeding</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="deworming">Deworming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Frequency">
              <Select value={form.values.frequency} onValueChange={(v) => form.setField("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {form.values.kind === "other" && (
            <Field label="Custom type" className="col-span-2">
              <Input
                value={form.values.custom_kind}
                onChange={(e) => form.setField("custom_kind", e.target.value)}
                placeholder="e.g. Vet check, Training, Supplements"
                required
              />
            </Field>
          )}
          {form.values.frequency === "as_needed" && (
            <Field label="Custom frequency" className="col-span-2">
              <Input
                value={form.values.custom_frequency}
                onChange={(e) => form.setField("custom_frequency", e.target.value)}
                placeholder="e.g. Every 3 months, 3 times a week, etc."
                required
              />
            </Field>
          )}
          <Field label="Title">
            <Input value={form.values.title} onChange={(e) => form.setField("title", e.target.value)} placeholder="Morning kibble" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time">
              <Input type="time" value={form.values.time_of_day} onChange={(e) => form.setField("time_of_day", e.target.value)} />
            </Field>
            <Field label="Dose / amount">
              <Input value={form.values.dosage} onChange={(e) => form.setField("dosage", e.target.value)} placeholder="1 cup" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} />
          </Field>
          {save.isError && <p className="text-sm text-destructive">{save.error instanceof Error ? save.error.message : "Failed to save"}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
