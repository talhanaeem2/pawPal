import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
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
import { cn, formatFrequency, formatKind, formatPetNames, formatTime, todayDateString } from "@/lib/utils";
import { createEmptyScheduleForm, ScheduleForm, scheduleFormSchema, scheduleToForm, ScheduleWithPets } from "@/schemas/schedule";
import { useZodForm } from "@/hooks/use-zod-form";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { PetMultiSelect } from "@/components/ui/pet-multi-select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import React from "react";
import z from "zod";

export const Route = createFileRoute("/_authenticated/schedule")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
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
  const { new: openCreate } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const today = todayDateString();

  const toggle = useMutation({
    mutationFn: async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
    }: {
      scheduleItemId: string;
      scheduleItemPetId?: string;
      markDone: boolean;
    }) => {
      const today = todayDateString();
      const schedule = items.find((i) => i.id === scheduleItemId);

      if (!schedule) {
        throw new Error("Schedule not found");
      }

      const multiplePets = schedule.schedule_item_pets.length > 1;

      if (markDone) {
        if (scheduleItemPetId) {
          const { error } = await supabase
            .from("schedule_completions")
            .insert({
              schedule_item_pet_id: scheduleItemPetId!,
            });

          if (error) {
            throw error;
          }
        } else {
          const schedule = items.find((i) => i.id === scheduleItemId);

          if (!schedule) throw new Error("Schedule not found");

          const rows = schedule.schedule_item_pets
            .filter(
              (p) =>
                !p.schedule_completions.some(
                  (c) => c.completed_on === today
                )
            )
            .map((p) => ({
              schedule_item_pet_id: p.id,
            }));

          if (rows.length > 0) {
            const { error } = await supabase
              .from("schedule_completions")
              .insert(rows);

            if (error) throw error;
          }
        }
      } else {
        let query = supabase
          .from("schedule_completions")
          .delete()
          .eq("completed_on", today);

        if (scheduleItemPetId) {
          query = query.eq("schedule_item_pet_id", scheduleItemPetId);
        } else {
          query = query.in(
            "schedule_item_pet_id",
            schedule.schedule_item_pets.map((p) => p.id)
          );
        }

        const { error } = await query;

        if (error) throw error;
      }

      return {
        markDone,
        allPets: !scheduleItemPetId,
        multiplePets,
      };
    },

    onSuccess: ({ markDone, multiplePets, allPets }) => {
      qc.invalidateQueries({ queryKey: ["schedule_items"] });

      let message: string;

      if (markDone) {
        if (allPets && multiplePets) {
          message = "Marked all pets done";
        } else {
          message = "Marked done";
        }
      } else {
        if (allPets && multiplePets) {
          message = "Marked all pets undone";
        } else {
          message = "Marked undone";
        }
      }

      toast.success(message);
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
          initialOpen={openCreate}
          trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>}
        />
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
          <p className="text-sm text-muted-foreground">Nothing scheduled. Add a meal or medication.</p>
        </div>
      ) : (
        <Accordion
          type="single"
          collapsible
          className="rounded-3xl bg-card shadow-(--shadow-soft)"
        >
          {items.map((s) => {
            const petStatuses = s.schedule_item_pets.map((schedulePet) => ({
              ...schedulePet,
              pet: pets.find((p) => p.id === schedulePet.pet_id),
              done: schedulePet.schedule_completions.some(
                (c) => c.completed_on === today
              ),
            }))
              .sort((a, b) =>
                (a.pet?.name ?? "").localeCompare(b.pet?.name ?? "")
              );

            const petCount = petStatuses.length;
            const doneToday = petStatuses.length > 0 && petStatuses.every((p) => p.done);
            const petLabel = formatPetNames(
              petStatuses
                .map((p) => p.pet?.name)
                .filter((name): name is string => !!name)
            );
            const detailRows = petStatuses.filter(
              (p) => p.dosage || p.notes
            );

            const hasDetails = detailRows.length > 0;

            const hasLongNotes = detailRows.some(
              (p) => (p.notes?.length ?? 120) > 120
            );

            const useAccordion = petCount > 1 || hasLongNotes;

            return (
              <React.Fragment key={s.id}>
                {useAccordion === true ? (
                  <AccordionItem
                    key={s.id}
                    value={s.id}
                  >
                    <div className="flex items-center gap-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle.mutate({
                            scheduleItemId: s.id,
                            markDone: !doneToday,
                          });
                        }}
                        disabled={toggle.isPending}
                        className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${doneToday
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border hover:bg-accent/40"
                          }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <AccordionTrigger className="flex-1 hover:no-underline">
                          <div className="text-left">
                            <div className="font-medium text-sm capitalize">
                              {s.title}
                            </div>

                            <div className="text-xs text-muted-foreground capitalize">
                              {petLabel && `${petLabel} · `}
                              {formatKind(s)} ·{" "}
                              {s.time_of_day
                                ? formatTime(s.time_of_day)
                                : formatFrequency(s)}
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>

                      <div className="flex">
                        <ScheduleDialog
                          pets={pets}
                          item={s}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmId(s.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <AccordionContent className="px-4 pb-2">
                      {/* {doneToday && (
                        <div className="mb-3 flex items-center text-xs text-muted-foreground">
                          <Check className="mr-1 h-3 w-3" />
                          Completed
                        </div>
                      )} */}

                      {petCount > 1 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                          {petStatuses.map((pet) => (
                            <Button
                              key={pet.pet_id}
                              size="sm"
                              variant={pet.done ? "default" : "outline"}
                              onClick={() =>
                                toggle.mutate({
                                  scheduleItemId: s.id,
                                  scheduleItemPetId: pet.id,
                                  markDone: !pet.done,
                                })
                              }
                            >
                              {pet.pet?.name}
                            </Button>
                          ))}
                        </div>
                      )}

                      {petStatuses.some((p) => p.dosage || p.notes) && (
                        <div className={cn(petCount > 1 && "space-y-2 mt-4")}>
                          {petStatuses.map((pet) => {
                            if (!pet.dosage && !pet.notes) return null;

                            return (
                              <div
                                key={pet.pet_id}
                                className="not-last:border-b first:border-t p-2 space-y-1"
                              >
                                {petCount > 1 && (
                                  <div className="text-sm font-medium capitalize">
                                    {pet.pet?.name}
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  {pet.dosage && (
                                    <div className="flex gap-1 text-sm">
                                      <span className="font-medium text-muted-foreground">
                                        Dose:
                                      </span>
                                      <span>{pet.dosage}</span>
                                    </div>
                                  )}

                                  {pet.notes && (
                                    <div className="flex gap-1 text-sm">
                                      <span className="font-medium text-muted-foreground">
                                        Notes:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {pet.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ) : (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 p-4 border-b last:border-b-0"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle.mutate({
                          scheduleItemId: s.id,
                          markDone: !doneToday,
                        });
                      }}
                      disabled={toggle.isPending}
                      className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${doneToday
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:bg-accent/40"
                        }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm capitalize">
                        {s.title}
                      </div>

                      <div className="text-xs text-muted-foreground capitalize">
                        {petLabel && `${petLabel} · `}
                        {formatKind(s)} ·{" "}
                        {s.time_of_day
                          ? formatTime(s.time_of_day)
                          : formatFrequency(s)}
                      </div>
                      {petCount === 1 && hasDetails && detailRows[0].dosage && (
                        <div className="text-xs text-muted-foreground capitalize">
                          Dose: {detailRows[0].dosage}
                        </div>
                      )}
                      {petCount === 1 && hasDetails && detailRows[0].notes && (
                        <div className="text-xs text-muted-foreground capitalize">
                          Notes: {detailRows[0].notes}
                        </div>
                      )}

                      {/* {doneToday && (
                        <div className="mt-1 flex items-center text-xs text-muted-foreground">
                          <Check className="mr-1 h-3 w-3" />
                          Completed
                        </div>
                      )} */}
                    </div>

                    <div className="flex">
                      <ScheduleDialog
                        pets={pets}
                        item={s}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(s.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li >
                )}
              </React.Fragment>
            );
          })}
        </Accordion>
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
    </div >
  );
}

function ScheduleDialog({ pets, item, trigger, initialOpen }: { pets: { id: string; name: string }[]; item?: ScheduleWithPets; trigger: React.ReactNode; initialOpen?: boolean }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const [expandedFields, setExpandedFields] = useState<
    Record<
      string,
      {
        dosage: boolean;
        notes: boolean;
      }
    >
  >({});

  const dosageRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const notesRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const form = useZodForm(
    scheduleFormSchema,
    item
      ? scheduleToForm(item)
      : createEmptyScheduleForm(pets[0]?.id)
  );

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
    }
  }, [initialOpen]);

  function resetForm() {
    form.reset(
      item
        ? scheduleToForm(item)
        : createEmptyScheduleForm(pets[0]?.id)
    );
    setExpandedFields({});
  };

  function updatePetDetail(
    index: number,
    changes: Partial<(typeof form.values.pet_details)[number]>
  ) {
    const next = [...form.values.pet_details];

    next[index] = {
      ...next[index],
      ...changes,
    };

    form.setField("pet_details", next);
  }

  function setExpanded(
    petId: string,
    field: "dosage" | "notes",
    value: boolean
  ) {
    setExpandedFields((prev) => ({
      ...prev,
      [petId]: {
        dosage: prev[petId]?.dosage ?? false,
        notes: prev[petId]?.notes ?? false,
        [field]: value,
      },
    }));
  }

  const save = useMutation({
    mutationFn: async (data: ScheduleForm) => {

      const payload = {
        kind: data.kind,
        custom_kind: data.kind === "other" ? data.custom_kind.trim() || null : null,
        title: data.title.trim(),
        time_of_day: data.time_of_day || null,
        frequency: data.frequency,
        custom_frequency: data.frequency === "as_needed" ? data.custom_frequency.trim() || null : null,
      };

      const petLinks = (scheduleId: string) =>
        data.pet_details.map((detail) => ({
          schedule_item_id: scheduleId,
          pet_id: detail.pet_id,
          dosage: detail.dosage.trim() || null,
          notes: detail.notes.trim() || null,
        }));

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

        const { error: insertError } = await supabase
          .from("schedule_item_pets")
          .insert(petLinks(item.id));

        if (insertError) throw insertError;
      } else {
        const { data: schedule, error } = await supabase
          .from("schedule_items")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        const { error: petError } = await supabase
          .from("schedule_item_pets")
          .insert(petLinks(schedule.id));

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

  const multiplePets = form.values.pet_details.length > 1;

  function getDoseField(kind: string) {
    switch (kind) {
      case "feeding":
        return {
          label: "Amount",
          placeholder: "e.g. 1 cup, 100 g",
        };

      case "medication":
        return {
          label: "Dose",
          placeholder: "e.g. 1 tablet, 5 ml",
        };

      case "grooming":
        return {
          label: "Details",
          placeholder: "e.g. 10 min, Oatmeal shampoo",
        };

      default:
        return {
          label: "Details",
          placeholder: "Optional",
        };
    }
  }

  const doseField = getDoseField(form.values.kind);

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
      }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl max-h-[95dvh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit reminder" : "New reminder"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = form.getValidated();

            if (!data) return;
            save.mutate(data);
          }}
          className="flex flex-1 flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
            <Field
              label="Pets"
              error={form.errors.pet_ids}
            >
              <PetMultiSelect
                pets={pets}
                value={form.values.pet_ids}
                onChange={(ids) => {
                  form.setField("pet_ids", ids);
                  const existing = form.values.pet_details;

                  form.setField(
                    "pet_details",
                    ids.map((id) => {
                      const detail = existing.find((d) => d.pet_id === id);

                      return (
                        detail ?? {
                          pet_id: id,
                          dosage: "",
                          notes: "",
                        }
                      );
                    })
                  );
                }}
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={form.values.title} onChange={(e) => form.setField("title", e.target.value)} placeholder="Morning kibble" required />
              </Field>
              <Field label="Time">
                <Input type="time" value={form.values.time_of_day} onChange={(e) => form.setField("time_of_day", e.target.value)} />
              </Field>
            </div>
            <div className="space-y-2 mb-3">
              {form.values.pet_details.map((detail, index) => {
                const pet = pets.find((p) => p.id === detail.pet_id);
                const showDosage =
                  detail.dosage !== "" || expandedFields[detail.pet_id]?.dosage;

                const showNotes =
                  detail.notes !== "" || expandedFields[detail.pet_id]?.notes;

                return (
                  <div
                    key={detail.pet_id}
                    className={cn(multiplePets && "rounded-2xl border bg-muted/20 p-4")}
                  >
                    {multiplePets && (
                      <div className="font-medium capitalize text-base">
                        {pet?.name}
                      </div>
                    )}

                    {!multiplePets ? (
                      <>
                        <Field label={doseField.label}>
                          <Input
                            value={detail.dosage}
                            placeholder={doseField.placeholder}
                            onChange={(e) =>
                              updatePetDetail(index, {
                                dosage: e.target.value,
                              })
                            }
                          />
                        </Field>

                        <Field label="Notes">
                          <Textarea
                            rows={2}
                            value={detail.notes}
                            onChange={(e) =>
                              updatePetDetail(index, {
                                notes: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 items-start">
                        {!showDosage ? (
                          <button
                            type="button"
                            onClick={() => {
                              setExpanded(detail.pet_id, "dosage", true);

                              requestAnimationFrame(() => {
                                dosageRefs.current[detail.pet_id]?.focus();
                              });
                            }}
                            className="flex w-full items-center rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                          >
                            + Add {doseField.label.toLowerCase()}
                          </button>
                        ) : (
                          <div className="w-full space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!detail.dosage) {
                                  setExpanded(detail.pet_id, "dosage", false);
                                }
                              }}
                              className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                            >
                              − {doseField.label}
                            </button>

                            <Input
                              value={detail.dosage}
                              placeholder={doseField.placeholder}
                              ref={(el) => {
                                dosageRefs.current[detail.pet_id] = el;
                              }}
                              onChange={(e) =>
                                updatePetDetail(index, {
                                  dosage: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}

                        {!showNotes ? (
                          <button
                            type="button"
                            onClick={() => {
                              setExpanded(detail.pet_id, "notes", true);

                              requestAnimationFrame(() => {
                                notesRefs.current[detail.pet_id]?.focus();
                              });
                            }}
                            className="flex w-full items-center rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                          >
                            + Add notes
                          </button>
                        ) : (
                          <div className="w-full space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!detail.notes) {
                                  setExpanded(detail.pet_id, "notes", false);
                                }
                              }}
                              className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
                            >
                              − Notes
                            </button>

                            <Textarea
                              rows={2}
                              value={detail.notes}
                              ref={(el) => {
                                notesRefs.current[detail.pet_id] = el;
                              }}
                              onChange={(e) =>
                                updatePetDetail(index, {
                                  notes: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t">
            {save.isError && <p className="text-sm text-destructive">{save.error instanceof Error ? save.error.message : "Failed to save"}</p>}
            <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
