import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, Trash2, Pencil, Calendar } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import z from "zod";

import { petsQuery, scheduleQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useZodForm } from "@/hooks/use-zod-form";
import { formatPetNames } from "@/lib/pet-utils";
import { cn, formatTime, todayDateString } from "@/lib/utils";
import {
  formatFrequency, formatKind, generateScheduleTitle, getNotesPlaceholder, getScheduleDetailField, getStartDateDescription,
  getStartDateLabel, getTimeLabel, getTitlePlaceholder, repeatUnitOptions, requiresScheduleStartDate, requiresScheduleTime,
  applyTimeSlotFilter
} from "@/lib/schedule-utils";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/common/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { Textarea } from "@/components/ui/common/textarea";
import { PetMultiSelect } from "@/components/ui/common/pet-multi-select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/common/accordion";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { DatePicker } from "@/components/ui/common/date-picker";
import { Card, CardContent } from "@/components/ui/common/card";
import { Progress } from "@/components/ui/common/progress";
import { Page } from "@/components/layout/page";
import { Field } from "@/components/ui/common/field";
import { TimesOfDayField } from "@/components/ui/common/times-of-day-field";

import { createEmptyScheduleForm, ScheduleForm, scheduleFormSchema, scheduleToForm, ScheduleWithPets } from "@/schemas/schedule";

export const Route = createFileRoute("/_authenticated/schedule")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) => await Promise.all([
    context.queryClient.ensureQueryData(petsQuery),
    context.queryClient.ensureQueryData(scheduleQuery),
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
  const qc = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const today = todayDateString();

  const toggle = useMutation({
    mutationFn: async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
      timeSlots
    }: {
      scheduleItemId: string;
      scheduleItemPetId?: string;
      markDone: boolean;
      timeSlots: (string | null)[];
    }) => {
      const schedule = items.find((i) => i.id === scheduleItemId);

      if (!schedule) throw new Error("Schedule not found");

      const multiplePets = schedule.schedule_item_pets.length > 1;

      if (markDone) {
        if (scheduleItemPetId) {
          const pet = schedule.schedule_item_pets.find(
            p => p.id === scheduleItemPetId
          );

          if (!pet) throw new Error("Pet not found");

          const rows = timeSlots
            .filter(
              (timeSlot) =>
                !pet.schedule_completions.some(
                  (c) =>
                    c.completed_on === today &&
                    c.time_slot === timeSlot
                )
            ).map((timeSlot) => ({
              schedule_item_pet_id: scheduleItemPetId,
              completed_on: today,
              time_slot: timeSlot,
            }));

          if (rows.length) {
            const { error } = await supabase
              .from("schedule_completions")
              .insert(rows);

            if (error) throw error;
          }
        } else {
          const rows = schedule.schedule_item_pets.flatMap((pet) =>
            timeSlots
              .filter(
                (timeSlot) =>
                  !pet.schedule_completions.some(
                    (c) =>
                      c.completed_on === today &&
                      c.time_slot === timeSlot
                  )
              )
              .map((timeSlot) => ({
                schedule_item_pet_id: pet.id,
                completed_on: today,
                time_slot: timeSlot,
              }))
          );

          if (rows.length) {
            const { error } = await supabase
              .from("schedule_completions")
              .insert(rows);

            if (error) throw error;
          }
        }
      } else {
        if (scheduleItemPetId) {
          let query = supabase
            .from("schedule_completions")
            .delete()
            .eq("schedule_item_pet_id", scheduleItemPetId)
            .eq("completed_on", today);

          query = applyTimeSlotFilter(query, timeSlots);

          const { error } = await query;
          if (error) throw error;
        } else {
          let query = supabase
            .from("schedule_completions")
            .delete()
            .in(
              "schedule_item_pet_id",
              schedule.schedule_item_pets.map((p) => p.id)
            )
            .eq("completed_on", today);

          query = applyTimeSlotFilter(query, timeSlots);

          const { error } = await query;

          if (error) throw error;
        }
      }

      return { markDone, allPets: !scheduleItemPetId, multiplePets };
    },

    onSuccess: ({ markDone, multiplePets, allPets }) => {
      qc.invalidateQueries({ queryKey: scheduleQuery.queryKey });

      let message: string;

      if (markDone) {
        message = allPets && multiplePets ? "Marked all reminders done" : "Reminder completed";
      } else {
        message = allPets && multiplePets ? "Marked all reminders undone" : "Marked undone";
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: scheduleQuery.queryKey }); toast.success("Removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = items.find((i) => i.id === confirmId);

  const { totalSlots, completedSlots, progress } = useMemo(() => {
    const totalSlots = items.reduce(
      (sum, item) => sum + Math.max(item.times_of_day.length, 1),
      0
    );

    const completedSlots = items.reduce((sum, item) => {
      const times =
        item.times_of_day.length > 0 ? item.times_of_day : [null as null];

      const completedForItem = times.filter((time) =>
        item.schedule_item_pets.every((pet) =>
          pet.schedule_completions.some(
            (c) => c.completed_on === today && c.time_slot === time
          )
        )
      ).length;

      return sum + completedForItem;
    }, 0);

    return {
      totalSlots,
      completedSlots,
      progress:
        totalSlots === 0
          ? 0
          : Math.round((completedSlots / totalSlots) * 100),
    };
  }, [items, today]);

  return (
    <Page>
      <Page.Header>
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
        {items.length > 0 && (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Today's progress</p>
                  <p className="text-xs text-muted-foreground">
                    {completedSlots} of {totalSlots} {totalSlots === 1 ? "reminder" : "reminders"} completed
                  </p>
                </div>

                <span className="font-medium">
                  {progress}%
                </span>
              </div>

              <Progress value={progress} />
            </CardContent>
          </Card>
        )}
      </Page.Header>
      <Page.Content>
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
          <Accordion
            type="single"
            collapsible
            className="rounded-3xl bg-card shadow-(--shadow-soft) pb-4"
          >
            {items.map((s) => {
              const times = s.times_of_day.length > 0 ? s.times_of_day : [null as null];
              const petCount = s.schedule_item_pets.length;
              const multiplePets = petCount > 1;
              const hasTime = requiresScheduleTime(s.kind) && s.times_of_day.length > 0;

              const petsSorted = [...s.schedule_item_pets]
                .map((sip) => ({ ...sip, pet: pets.find((p) => p.id === sip.pet_id) }))
                .sort((a, b) => (a.pet?.name ?? "").localeCompare(b.pet?.name ?? ""));

              const detailField = getScheduleDetailField(s.kind);
              const detailRows = petsSorted.filter((p) => p.dosage || p.notes);
              const hasDetails = detailRows.length > 0;
              const hasLongNotes = detailRows.some((p) => (p.notes?.length ?? 0) > 120);
              const hasMultipleTimes = s.times_of_day.length > 1;
              const useAccordion = multiplePets || hasLongNotes || hasMultipleTimes;

              // Overall done: every pet, every time slot completed
              const allDone = times.every((time) =>
                petsSorted.every((pet) =>
                  pet.schedule_completions.some(
                    (c) => c.completed_on === today && c.time_slot === time
                  )
                )
              );

              const petLabel = formatPetNames(
                petsSorted.map((p) => p.pet?.name).filter((n): n is string => !!n)
              );

              const repeatText = formatFrequency({
                repeat_every: s.repeat_every,
                repeat_unit: s.repeat_unit,
              });

              const timeSummary = hasTime
                ? times.length === 1
                  ? formatTime(times[0]!)
                  : `${times.length} times/day`
                : null;

              const preview = timeSummary ? `${repeatText} · ${timeSummary}` : repeatText;

              if (!useAccordion) {
                return (
                  <React.Fragment key={s.id}>
                    <div className="border-b last:border-b-0 flex flex-col gap-1">
                      {/* Header row */}
                      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle.mutate({
                              scheduleItemId: s.id,
                              markDone: !allDone,
                              timeSlots: times,
                            });
                          }}
                          disabled={toggle.isPending}
                          className={cn(
                            "h-9 w-9 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0",
                            allDone
                              ? "bg-primary border-primary text-primary-foreground opacity-70"
                              : "border-border hover:bg-accent/40"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium text-sm capitalize",
                            allDone && "line-through opacity-70"
                          )}
                          >
                            {s.title}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {petLabel && `${petLabel} · `}
                            {formatKind(s)} · {preview}
                          </div>
                          {petCount === 1 && hasDetails && detailRows[0].dosage && (
                            <div className="text-xs">
                              <span className="font-medium">{detailField.label}:</span>{" "}
                              <span className="text-muted-foreground">{detailRows[0].dosage}</span>
                            </div>
                          )}
                          {petCount === 1 && hasDetails && detailRows[0].notes && (
                            <div className="text-xs text-muted-foreground mt-0.5 italic">
                              {detailRows[0].notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ScheduleDialog
                            pets={pets}
                            item={s}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmId(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              // Multi-pet or long notes: use accordion
              return (
                <React.Fragment key={s.id}>
                  <AccordionItem value={s.id}>
                    <div className={cn(
                      "flex items-center gap-3 px-4 transition-all duration-200",
                      allDone && "opacity-70"
                    )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle each time slot for all pets
                          toggle.mutate({
                            scheduleItemId: s.id,
                            markDone: !allDone,
                            timeSlots: times,
                          });
                        }}
                        disabled={toggle.isPending}
                        className={cn(
                          "h-9 w-9 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0",
                          allDone
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:bg-accent/40"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <AccordionTrigger className="flex-1 hover:no-underline">
                          <div className="text-left">
                            <div className={cn(
                              "font-medium text-sm capitalize",
                              allDone && "line-through"
                            )}>
                              {s.title}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {petLabel && `${petLabel} · `}
                              {formatKind(s)} · {preview}
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>

                      <div className="flex shrink-0">
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

                    <AccordionContent className="px-4 pb-4 space-y-4">
                      {/* Per-time-slot, per-pet grid */}
                      <div
                        className="grid gap-2 px-4 grid-cols-1"
                      >
                        {petsSorted.map((pet) => (
                          <div
                            className="flex flex-col gap-1"
                            key={pet.id}
                          >
                            {multiplePets && (
                              <div className="text-sm font-medium capitalize">
                                {pet.pet?.name}
                              </div>
                            )}
                            {times.map((time) => {
                              const slotPetDone = pet.schedule_completions.some(
                                (c) => c.completed_on === today && c.time_slot === time
                              );
                              const slotPetDoneTime = pet.schedule_completions.some(
                                (c) => c.completed_on === today
                              );

                              const isDone = hasTime ? slotPetDone : slotPetDoneTime;

                              return (
                                <button
                                  key={`${pet.id}-${time}`}
                                  onClick={() =>
                                    toggle.mutate({
                                      scheduleItemId: s.id,
                                      scheduleItemPetId: pet.id,
                                      markDone: !isDone,
                                      timeSlots: hasTime ? [time] : [null],
                                    })
                                  }
                                  disabled={toggle.isPending}
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                    isDone
                                      ? "bg-primary border-primary text-primary-foreground opacity-70"
                                      : "border-border bg-card hover:bg-accent/40"
                                  )}
                                >
                                  <Check className={cn(
                                    "h-3 w-3",
                                    !isDone && "opacity-70"
                                  )} />
                                  {hasTime ? formatTime(time) : "Done"}
                                </button>
                              );
                            })}
                            {/* Dosage / notes */}
                            {(pet.dosage || pet.notes) && (
                              <div className="space-y-2 pt-2">
                                <div className="space-y-0.5">
                                  {pet.dosage && (
                                    <div className="px-2 text-xs">
                                      <span className="font-medium">{detailField.label}:</span>{" "}
                                      <span className="text-muted-foreground">{pet.dosage}</span>
                                    </div>
                                  )}
                                  {pet.notes && (
                                    <div className="px-2 text-xs text-muted-foreground italic">
                                      <span>{pet.notes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </React.Fragment>
              );
            })}
          </Accordion>
        )}
      </Page.Content>

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
    </Page>
  );
}

function ScheduleDialog({ pets, item, trigger, initialOpen }: { pets: { id: string; name: string }[]; item?: ScheduleWithPets; trigger: React.ReactNode; initialOpen?: boolean }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, { dosage: boolean; notes: boolean; }>>({});
  const [isTitleCustomized, setIsTitleCustomized] = useState(false);
  const [kindHasChanged, setKindHasChanged] = useState(false);
  const [savedTimes, setSavedTimes] = useState<string[]>(item?.times_of_day ?? ["07:00", "19:00"]);

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

  useEffect(() => {
    if (open) {
      setKindHasChanged(false);
      setIsTitleCustomized(false);
    }
  }, [open]);

  useEffect(() => {
    if (isTitleCustomized) return;

    if (isEdit && !kindHasChanged) return;

    form.setField("title", generateScheduleTitle(form.values.kind, form.values.times_of_day));

  }, [form.values.kind, form.values.times_of_day, isTitleCustomized, kindHasChanged]);

  useEffect(() => {
    if (!requiresScheduleTime(form.values.kind)) {
      if (form.values.times_of_day.length > 0) {
        setSavedTimes(form.values.times_of_day);
      }
      form.setField("times_of_day", []);
    } else if (form.values.times_of_day.length === 0) {
      form.setField("times_of_day", savedTimes);
    }

  }, [form.values.kind]);

  function resetForm() {
    form.reset(
      item
        ? scheduleToForm(item)
        : createEmptyScheduleForm(pets[0]?.id)
    );
    setExpandedFields({});
    setIsTitleCustomized(false);
    setKindHasChanged(false);
    setSavedTimes(item?.times_of_day ?? ["07:00", "19:00"]);
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
        title: data.title.trim(),
        times_of_day: requiresScheduleTime(data.kind) ? data.times_of_day : [],
        repeat_every: data.repeat_every,
        repeat_unit: data.repeat_unit,
        start_date: requiresScheduleStartDate(data.kind) ? data.start_date : todayDateString(),
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
      qc.invalidateQueries({ queryKey: scheduleQuery.queryKey });
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

  const doseField = getScheduleDetailField(form.values.kind);

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

  const needsTime = requiresScheduleTime(form.values.kind);
  const needsStartDate = requiresScheduleStartDate(form.values.kind);

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
              label="Pet"
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
              <Field label="Reminder name" error={form.errors.title}>
                <Input
                  value={form.values.title}
                  onChange={(e) => {
                    form.setField("title", e.target.value)
                    setIsTitleCustomized(true);
                  }}
                  placeholder={getTitlePlaceholder(form.values.kind)}
                  required
                />
              </Field>
              <Field label="Reminder type">
                <Select
                  value={form.values.kind}
                  onValueChange={(v) => {
                    form.setField("kind", v as ScheduleForm["kind"])
                    if (isEdit) setKindHasChanged(true);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feeding">Feeding</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="grooming">Grooming</SelectItem>
                    <SelectItem value="supplements">Supplements</SelectItem>
                    <SelectItem value="flea_tick">Flea & Tick</SelectItem>
                    <SelectItem value="exercise">Exercise</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="bath">Bath</SelectItem>
                    <SelectItem value="nail_trim">Nail trimming</SelectItem>
                    <SelectItem value="ear_cleaning">Ear cleaning</SelectItem>
                    <SelectItem value="teeth_brushing">Teeth brushing</SelectItem>
                    <SelectItem value="weight_check">Weight Check</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {needsTime && (
              <Field label={getTimeLabel(form.values.kind)}>
                {/* <Input type="time" value={form.values.time_of_day} onChange={(e) => form.setField("time_of_day", e.target.value)} /> */}
                <TimesOfDayField
                  value={form.values.times_of_day}
                  onChange={(times) => form.setField("times_of_day", times)}
                />
              </Field>
            )}
            <Field label="Repeat every">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Every
                </span>

                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={form.values.repeat_every}
                  onChange={(e) =>
                    form.setField(
                      "repeat_every",
                      Number(e.target.value) || 1
                    )
                  }
                />

                <Select
                  value={form.values.repeat_unit}
                  onValueChange={(v) =>
                    form.setField(
                      "repeat_unit",
                      v as ScheduleForm["repeat_unit"]
                    )
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {repeatUnitOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {form.values.repeat_every === 1
                          ? option.singular
                          : option.plural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground text-center">
                {formatFrequency({
                  repeat_every: form.values.repeat_every,
                  repeat_unit: form.values.repeat_unit,
                })}
              </span>
            </Field>
            {needsStartDate && (
              <Field
                label={getStartDateLabel(form.values.kind)}
                description={getStartDateDescription(form.values.kind)}
              >
                <DatePicker
                  value={form.values.start_date}
                  onChange={(date) => form.setField("start_date", date)}
                  placeholder="Select date"
                />
              </Field>
            )}
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
                            placeholder={getNotesPlaceholder(form.values.kind)}
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
                              placeholder={getNotesPlaceholder(form.values.kind)}
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
              {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
