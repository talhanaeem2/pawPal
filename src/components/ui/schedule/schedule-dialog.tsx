import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/common/button";
import { DatePicker } from "@/components/ui/common/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/common/dialog";
import { Field } from "@/components/ui/common/field";
import { Input } from "@/components/ui/common/input";
import { PetMultiSelect } from "@/components/ui/common/pet-multi-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/common/select";
import { Textarea } from "@/components/ui/common/textarea";
import { TimesOfDayField } from "@/components/ui/common/times-of-day-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { scheduleQuery } from "@/lib/queries";
import {
  formatFrequency,
  generateScheduleTitle,
  getGroupedScheduleKinds,
  getNotesPlaceholder,
  getScheduleDetailField,
  getStartDateDescription,
  getStartDateLabel,
  getTimeLabel,
  getTitlePlaceholder,
  KIND_LABELS,
  repeatUnitOptions,
  requiresScheduleStartDate,
  requiresScheduleTime,
} from "@/lib/schedule-utils";
import { cn, todayDateString } from "@/lib/utils";
import {
  createEmptyScheduleForm,
  ScheduleForm,
  scheduleFormSchema,
  scheduleToForm,
  ScheduleKind,
  ScheduleWithPets,
} from "@/schemas/schedule";
import { Pet } from "@/schemas/pets";

type ScheduleDialogProps = {
  pets: Pet[];
  item?: ScheduleWithPets;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialKind?: ScheduleKind;
};

type ExpandedFields = Record<string, { dosage: boolean; notes: boolean }>;

export function ScheduleDialog({
  pets,
  item,
  trigger,
  open: controlledOpen,
  onOpenChange,
  initialKind,
}: ScheduleDialogProps) {
  const isEdit = Boolean(item);
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [expandedFields, setExpandedFields] = useState<ExpandedFields>({});
  const [isTitleCustomized, setIsTitleCustomized] = useState(false);
  const [kindHasChanged, setKindHasChanged] = useState(false);
  const [savedTimes, setSavedTimes] = useState<string[]>(item?.times_of_day ?? ["07:00", "19:00"]);
  const dosageRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const notesRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const form = useZodForm(
    scheduleFormSchema,
    item ? scheduleToForm(item) : createEmptyScheduleForm(),
  );

  useEffect(() => {
    if (open) {
      setKindHasChanged(false);
      setIsTitleCustomized(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && !isEdit && initialKind) {
      form.reset({
        ...createEmptyScheduleForm(),
        kind: initialKind,
      });
    }
  }, [initialKind, isEdit, open]);

  useEffect(() => {
    if (isTitleCustomized || (isEdit && !kindHasChanged)) {
      return;
    }

    form.setField("title", generateScheduleTitle(form.values.kind, form.values.times_of_day));
  }, [form.values.kind, form.values.times_of_day, isEdit, isTitleCustomized, kindHasChanged]);

  useEffect(() => {
    if (!requiresScheduleTime(form.values.kind)) {
      if (form.values.times_of_day.length > 0) {
        setSavedTimes(form.values.times_of_day);
      }
      form.setField("times_of_day", []);
    } else if (form.values.times_of_day.length === 0) {
      form.setField("times_of_day", savedTimes);
    }
  }, [form.values.kind, savedTimes]);

  function resetForm() {
    form.reset(item ? scheduleToForm(item) : createEmptyScheduleForm());
    setExpandedFields({});
    setIsTitleCustomized(false);
    setKindHasChanged(false);
    setSavedTimes(item?.times_of_day ?? ["07:00", "19:00"]);
  }

  function handleOpenChange(isOpen: boolean) {
    setInternalOpen(isOpen);
    onOpenChange?.(isOpen);

    if (!isOpen) {
      resetForm();
    }
  }

  function updatePetDetail(
    index: number,
    changes: Partial<(typeof form.values.pet_details)[number]>,
  ) {
    const petDetails = [...form.values.pet_details];
    petDetails[index] = {
      ...petDetails[index],
      ...changes,
    };
    form.setField("pet_details", petDetails);
  }

  function setExpanded(petId: string, field: "dosage" | "notes", value: boolean) {
    setExpandedFields((current) => ({
      ...current,
      [petId]: {
        dosage: current[petId]?.dosage ?? false,
        notes: current[petId]?.notes ?? false,
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
        const { error } = await supabase.from("schedule_items").update(payload).eq("id", item.id);

        if (error) {
          throw error;
        }

        const newPetIds = data.pet_details.map((detail) => detail.pet_id);
        const oldPetIds = item.schedule_item_pets.map((pet) => pet.pet_id);
        const petsToRemove = oldPetIds.filter((petId) => !newPetIds.includes(petId));

        if (petsToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from("schedule_item_pets")
            .delete()
            .eq("schedule_item_id", item.id)
            .in("pet_id", petsToRemove);

          if (deleteError) {
            throw deleteError;
          }
        }

        const petsToAdd = data.pet_details.filter((detail) => !oldPetIds.includes(detail.pet_id));
        const petsToUpdate = data.pet_details.filter((detail) => oldPetIds.includes(detail.pet_id));

        if (petsToAdd.length > 0) {
          const { error: insertError } = await supabase.from("schedule_item_pets").insert(
            petsToAdd.map((detail) => ({
              schedule_item_id: item.id,
              pet_id: detail.pet_id,
              dosage: detail.dosage.trim() || null,
              notes: detail.notes.trim() || null,
            })),
          );

          if (insertError) {
            throw insertError;
          }
        }

        for (const detail of petsToUpdate) {
          const { error: updateError } = await supabase
            .from("schedule_item_pets")
            .update({
              dosage: detail.dosage.trim() || null,
              notes: detail.notes.trim() || null,
            })
            .eq("schedule_item_id", item.id)
            .eq("pet_id", detail.pet_id);

          if (updateError) {
            throw updateError;
          }
        }
      } else {
        const { data: schedule, error } = await supabase
          .from("schedule_items")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        const { error: petError } = await supabase
          .from("schedule_item_pets")
          .insert(petLinks(schedule.id));

        if (petError) {
          throw petError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });
      toast.success(isEdit ? "Updated" : "Added");
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed");
    },
  });

  if (pets.length === 0 && !isEdit) {
    return (
      <Button disabled variant="outline" className="rounded-full">
        Add a pet first
      </Button>
    );
  }

  const multiplePets = form.values.pet_details.length > 1;
  const detailField = getScheduleDetailField(form.values.kind);
  const needsTime = requiresScheduleTime(form.values.kind);
  const needsStartDate = requiresScheduleStartDate(form.values.kind);
  const groupedKinds = getGroupedScheduleKinds(pets, form.values.pet_ids);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        handleOpenChange(isOpen);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[95dvh] flex-col overflow-hidden rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit reminder" : "New reminder"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = form.getValidated();

            if (data) {
              save.mutate(data);
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
            <Field label="Pet" error={form.errors.pet_ids}>
              <PetMultiSelect
                pets={pets}
                value={form.values.pet_ids}
                onChange={(petIds) => {
                  form.setField("pet_ids", petIds);
                  const existingDetails = form.values.pet_details;

                  form.setField(
                    "pet_details",
                    petIds.map(
                      (petId) =>
                        existingDetails.find((detail) => detail.pet_id === petId) ?? {
                          pet_id: petId,
                          dosage: "",
                          notes: "",
                        },
                    ),
                  );

                  const grouped = getGroupedScheduleKinds(pets, petIds);
                  const allowedKinds = [
                    ...grouped.exercise,
                    ...grouped.care,
                    ...grouped.medical,
                    ...grouped.measurements,
                  ];

                  if (allowedKinds.length > 0 && !allowedKinds.includes(form.values.kind)) {
                    form.setField("kind", allowedKinds[0]);

                    if (isEdit) {
                      setKindHasChanged(true);
                    }
                  }
                }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Reminder name" error={form.errors.title}>
                <Input
                  value={form.values.title}
                  onChange={(event) => {
                    form.setField("title", event.target.value);
                    setIsTitleCustomized(true);
                  }}
                  placeholder={getTitlePlaceholder(form.values.kind)}
                  required
                />
              </Field>

              <Field label="Reminder type">
                <Select
                  value={form.values.kind}
                  onValueChange={(value) => {
                    form.setField("kind", value as ScheduleForm["kind"]);

                    if (isEdit) {
                      setKindHasChanged(true);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedKinds.exercise.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Exercise</SelectLabel>
                        {groupedKinds.exercise.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {groupedKinds.care.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Care</SelectLabel>
                        {groupedKinds.care.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {groupedKinds.medical.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Medical</SelectLabel>
                        {groupedKinds.medical.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {groupedKinds.measurements.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Measurements</SelectLabel>
                        {groupedKinds.measurements.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {needsTime && (
              <Field label={getTimeLabel(form.values.kind)}>
                <TimesOfDayField
                  value={form.values.times_of_day}
                  onChange={(times) => form.setField("times_of_day", times)}
                />
              </Field>
            )}

            <Field label="Repeat every">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm text-muted-foreground">Every</span>
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={form.values.repeat_every}
                  onChange={(event) =>
                    form.setField("repeat_every", Number(event.target.value) || 1)
                  }
                />
                <Select
                  value={form.values.repeat_unit}
                  onValueChange={(value) =>
                    form.setField("repeat_unit", value as ScheduleForm["repeat_unit"])
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatUnitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {form.values.repeat_every === 1 ? option.singular : option.plural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-center text-xs text-muted-foreground">
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

            <div className="mb-3 space-y-2">
              {form.values.pet_details.map((detail, index) => {
                const pet = pets.find((itemPet) => itemPet.id === detail.pet_id);
                const showDosage = detail.dosage !== "" || expandedFields[detail.pet_id]?.dosage;
                const showNotes = detail.notes !== "" || expandedFields[detail.pet_id]?.notes;

                return (
                  <div
                    key={detail.pet_id}
                    className={cn(multiplePets && "rounded-2xl border bg-muted/20 p-4")}
                  >
                    {multiplePets && (
                      <div className="text-base font-medium capitalize">{pet?.name}</div>
                    )}

                    {!multiplePets ? (
                      <>
                        <Field label={detailField.label}>
                          <Input
                            value={detail.dosage}
                            placeholder={detailField.placeholder}
                            onChange={(event) =>
                              updatePetDetail(index, {
                                dosage: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Notes">
                          <Textarea
                            rows={2}
                            value={detail.notes}
                            placeholder={getNotesPlaceholder(form.values.kind)}
                            onChange={(event) =>
                              updatePetDetail(index, {
                                notes: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex w-full flex-col gap-2">
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
                              + Add {detailField.label.toLowerCase()}
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
                                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                              >
                                − {detailField.label}
                              </button>
                              <Input
                                value={detail.dosage}
                                placeholder={detailField.placeholder}
                                ref={(element) => {
                                  dosageRefs.current[detail.pet_id] = element;
                                }}
                                onChange={(event) =>
                                  updatePetDetail(index, {
                                    dosage: event.target.value,
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
                                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                              >
                                − Notes
                              </button>
                              <Textarea
                                rows={2}
                                value={detail.notes}
                                placeholder={getNotesPlaceholder(form.values.kind)}
                                ref={(element) => {
                                  notesRefs.current[detail.pet_id] = element;
                                }}
                                onChange={(event) =>
                                  updatePetDetail(index, {
                                    notes: event.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t">
            <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
