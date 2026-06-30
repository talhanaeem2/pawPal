import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatFrequency, formatKind, formatPetNames, formatTime } from "@/lib/utils";
import { createEmptyScheduleForm, scheduleFormSchema, ScheduleItem, scheduleToForm, ScheduleWithPets } from "@/schemas/schedule";
import { useZodForm } from "@/hooks/use-zod-form";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PetMultiSelect } from "@/components/ui/pet-multi-select";

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
    mutationFn: async ({
      scheduleItemId,
      petId,
      markDone,
    }: {
      scheduleItemId: string;
      petId?: string;
      markDone: boolean;
    }) => {
      let query = supabase
        .from("schedule_item_pets")
        .update({
          last_done_at: markDone ? new Date().toISOString() : null,
        })
        .eq("schedule_item_id", scheduleItemId);

      if (petId) {
        query = query.eq("pet_id", petId);
      }

      const { error } = await query;

      if (error) throw error;

      return { markDone, all: !petId };
    },

    onSuccess: ({ markDone, all }) => {
      qc.invalidateQueries({ queryKey: ["schedule_items"] });

      toast.success(
        markDone
          ? all
            ? "Marked all pets done"
            : "Marked done"
          : all
            ? "Marked all pets undone"
            : "Marked undone"
      );
    },

    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed"),
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
            const petStatuses = s.schedule_item_pets.map((sp) => ({
              ...sp,
              pet: pets.find((p) => p.id === sp.pet_id),
              done:
                !!sp.last_done_at &&
                new Date(sp.last_done_at).toDateString() ===
                new Date().toDateString(),
            }))
              .sort((a, b) =>
                (a.pet?.name ?? "").localeCompare(b.pet?.name ?? "")
              );

            // const petNames = formatPetNames(
            //   petStatuses
            //     .map((p) => p.pet?.name)
            //     .filter((name): name is string => !!name)
            // );
            const petCount = petStatuses.length;

            const doneToday = petStatuses.every((p) => p.done);

            return (
              <li key={s.id} className="p-4 flex items-center gap-3">
                <button
                  onClick={() => toggle.mutate({ scheduleItemId: s.id, markDone: !doneToday })}
                  disabled={toggle.isPending}
                  className={`h-9 w-9 rounded-full border flex items-center justify-center transition disabled:opacity-60 ${doneToday ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-accent/40"
                    }`}>
                  <Check className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm capitalize">{s.title}</div>

                  <div className="text-xs text-muted-foreground capitalize">
                    {petCount === 1 && petStatuses[0].pet?.name
                      ? `${petStatuses[0].pet?.name} · `
                      : ""}{formatKind(s)} ·
                    {s.time_of_day ? ` ${formatTime(s.time_of_day)}` : ` ${formatFrequency(s)}`}
                    {s.dosage ? ` · ${s.dosage}` : ""}
                  </div>
                  {doneToday ? (
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <Check className="mr-1 h-2 w-2" />
                      Completed
                    </div>
                  ) : petCount > 1 ? (
                    <div className="relative mt-2">
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {petStatuses.map((pet) => (
                          <Button
                            key={pet.pet_id}
                            size="sm"
                            className="shrink-0 capitalize"
                            variant={pet.done ? "default" : "outline"}
                            onClick={() =>
                              toggle.mutate({
                                scheduleItemId: s.id,
                                petId: pet.pet_id,
                                markDone: !pet.done,
                              })
                            }
                          >
                            {pet.pet?.name}
                          </Button>
                        ))}
                      </div>
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-5 bg-linear-to-l from-card to-transparent" />
                    </div>
                  ) : null}
                  {s.notes && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Notes: {s.notes}
                    </div>
                  )}
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

function ScheduleDialog({ pets, item, trigger }: { pets: { id: string; name: string }[]; item?: ScheduleWithPets; trigger: React.ReactNode }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useZodForm(
    scheduleFormSchema,
    item
      ? scheduleToForm(item)
      : createEmptyScheduleForm(pets[0]?.id)
  );

  function resetForm() {
    form.reset(
      item
        ? scheduleToForm(item)
        : createEmptyScheduleForm(pets[0]?.id)
    );
  }

  const save = useMutation({
    mutationFn: async () => {
      const data = form.getValidated();

      if (!data) {
        toast.error("Fix validation errors first");
        return;
      }
      const payload = {
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
        const { error } = await supabase
          .from("schedule_items")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;

        const { error: deleteError } = await supabase
          .from("schedule_item_pets")
          .delete()
          .eq("schedule_item_id", item.id);

        if (deleteError) throw deleteError;

        const petLinks = data.pet_ids.map((petId) => ({
          schedule_item_id: item.id,
          pet_id: petId,
        }));

        const { error: insertError } = await supabase
          .from("schedule_item_pets")
          .insert(petLinks);

        if (insertError) throw insertError;
      } else {
        const { data: schedule, error } = await supabase
          .from("schedule_items")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        const petLinks = data.pet_ids.map((petId) => ({
          schedule_item_id: schedule.id,
          pet_id: petId,
        }));

        const { error: petError } = await supabase
          .from("schedule_item_pets")
          .insert(petLinks);

        if (petError) throw petError;
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
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <Field label="Pets">
            <PetMultiSelect
              pets={pets}
              value={form.values.pet_ids}
              onChange={(ids) => form.setField("pet_ids", ids)}
            />
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
