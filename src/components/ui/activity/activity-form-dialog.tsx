import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { activityQuery } from "@/lib/queries";
import {
    ACTIVITY_LABELS,
    CARE_TYPES,
    DATE_ONLY_TYPES,
    EXERCISE_TYPES,
    MEASUREMENT_TYPES,
    OBSERVATION_TYPES,
    TIMED_TYPES,
    getSpeciesAllowedTypes,
    getMergedSpeciesConfig,
} from "@/lib/activity-utils";

import { Button } from "../common/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "../common/select";
import { Input } from "../common/input";
import { Textarea } from "../common/textarea";
import { DatePicker } from "../common/date-picker";
import { DateTimePicker } from "../common/date-time-picker";
import { FormDialog } from "../common/form-dialog";
import { Field } from "../common/field";

import {
    ActivityLog,
    ActivityLogForm,
    ActivityType,
    activityLogFormSchema,
    activityLogToForm,
    createEmptyActivityLogForm,
} from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

interface IActivityFormDialog {
    pets: Pet[];
    item?: ActivityLog;
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

// Get grouped types for a set of pets
// If petId is specified, use that pet's species config
// Otherwise merge all pets' species configs
function getGroupedTypes(pets: Pet[], petId: string) {
    if (!petId) {
        const allSpecies = [...new Set(pets.map((p) => p.species))];
        const merged = getMergedSpeciesConfig(allSpecies);
        return merged;
    }
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return getMergedSpeciesConfig([]);
    const species = pet.species ?? "other";
    const allowed = getSpeciesAllowedTypes(species);

    return {
        exercise: allowed.filter((t) => EXERCISE_TYPES.has(t)),
        care: allowed.filter((t) => CARE_TYPES.has(t)),
        measurements: allowed.filter((t) => MEASUREMENT_TYPES.has(t)),
        observations: allowed.filter((t) => OBSERVATION_TYPES.has(t)),
    };
}

export function ActivityFormDialog({
    pets,
    item,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: IActivityFormDialog) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const isEdit = !!item;
    const qc = useQueryClient();

    const form = useZodForm(
        activityLogFormSchema,
        item ? activityLogToForm(item) : createEmptyActivityLogForm(),
    );

    function handleOpenChange(o: boolean) {
        setInternalOpen(o);
        onOpenChange?.(o);
        if (!o) resetForm();
    }

    function resetForm() {
        form.reset(item ? activityLogToForm(item) : createEmptyActivityLogForm());
    }

    function handleTypeChange(v: string) {
        const type = v as ActivityType;
        form.setField("activity_type", type);
        // Clear fields not relevant to the new type
        if (!EXERCISE_TYPES.has(type)) form.setField("duration_min", "");
        if (type !== "weight") form.setField("weight", "");
        if (type !== "length") form.setField("length", "");
    }

    function handlePetChange(petId: string) {
        form.setField("pet_id", petId);
        // If current activity type isn't valid for the new pet's species,
        // reset to the first available type for that species
        const grouped = getGroupedTypes(pets, petId);
        const allAllowed = [
            ...grouped.exercise,
            ...grouped.care,
            ...grouped.measurements,
            ...grouped.observations,
        ];
        if (!allAllowed.includes(form.values.activity_type)) {
            const firstType = allAllowed[0];
            if (firstType) {
                form.setField("activity_type", firstType);
                form.setField("duration_min", "");
                form.setField("weight", "");
                form.setField("length", "");
            }
        }
    }

    const save = useMutation({
        mutationFn: async (data: ActivityLogForm) => {
            const payload = {
                pet_id: data.pet_id,
                activity_type: data.activity_type,
                duration_min:
                    EXERCISE_TYPES.has(data.activity_type) && data.duration_min
                        ? Number(data.duration_min)
                        : null,
                weight:
                    data.activity_type === "weight" && data.weight
                        ? Number(data.weight)
                        : null,
                length: data.activity_type === "length" && data.length
                    ? Number(data.length)
                    : null,
                notes: data.notes || null,
                occurred_at: data.occurred_at,
            };

            const query = item
                ? supabase.from("activity_logs").update(payload).eq("id", item.id)
                : supabase.from("activity_logs").insert(payload);

            const { error } = await query;
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: activityQuery.queryKey });
            toast.success(isEdit ? "Updated" : "Logged");
            handleOpenChange(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) {
        return (
            <Button disabled variant="outline" className="rounded-full">
                Add a pet first
            </Button>
        );
    }

    const grouped = getGroupedTypes(pets, form.values.pet_id);
    const currentType = form.values.activity_type;
    const useDateOnly = DATE_ONLY_TYPES.has(currentType);
    const showDuration = EXERCISE_TYPES.has(currentType);
    const showWeight = currentType === "weight";
    const showLength = currentType === "length";
    const showNotes = true; // always show notes

    // Note placeholder based on type
    const notesPlaceholder =
        currentType === "grooming" ? "Product used, any observations…" :
            currentType === "feeding_observation" ? "Did they eat? How much? Any concerns…" :
                currentType === "shedding" ? "Shedding started, completed, any issues…" :
                    currentType === "uv_check" ? "Lamp condition, any issues…" :
                        currentType === "tank_cleaning" ? "What was cleaned, water parameters…" :
                            "Anything you'd like to remember";

    return (
        <FormDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={isEdit ? "Edit log" : "New log"}
            trigger={trigger}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const data = form.getValidated();
                    if (!data) return;
                    save.mutate(data);
                }}
                className="space-y-3"
            >
                {/* Pet selector */}
                <Field label="Pet" error={form.errors.pet_id}>
                    <Select
                        value={form.values.pet_id}
                        onValueChange={handlePetChange}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a pet" />
                        </SelectTrigger>
                        <SelectContent>
                            {pets.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                {/* Activity type — grouped by category */}
                <Field label="Type" error={form.errors.activity_type}>
                    <Select
                        value={form.values.activity_type}
                        onValueChange={handleTypeChange}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {grouped.exercise.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Exercise</SelectLabel>
                                    {grouped.exercise.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {ACTIVITY_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {grouped.care.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Care</SelectLabel>
                                    {grouped.care.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {ACTIVITY_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {grouped.measurements.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Measurements</SelectLabel>
                                    {grouped.measurements.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {ACTIVITY_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {grouped.observations.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Observations</SelectLabel>
                                    {grouped.observations.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {ACTIVITY_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                </Field>

                {/* Duration — exercise only */}
                {showDuration && (
                    <Field label="Duration (min)">
                        <Input
                            type="number"
                            min="1"
                            value={form.values.duration_min}
                            onChange={(e) => form.setField("duration_min", e.target.value)}
                            placeholder="e.g. 30"
                        />
                    </Field>
                )}

                {/* Weight — weight check only */}
                {showWeight && (
                    <Field label="Weight (kg)">
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={form.values.weight}
                            onChange={(e) => form.setField("weight", e.target.value)}
                            placeholder="e.g. 25.5"
                            required
                        />
                    </Field>
                )}

                {/* Length — length check only */}
                {showLength && (
                    <Field label="Length (cm)">
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={form.values.length}
                            onChange={(e) => form.setField("length", e.target.value)}
                            placeholder="e.g. 45.0"
                            required
                        />
                    </Field>
                )}

                {/* When */}
                <Field label="When">
                    {useDateOnly ? (
                        <DatePicker
                            value={form.values.occurred_at}
                            onChange={(date) => form.setField("occurred_at", date)}
                            placeholder="Select date"
                        />
                    ) : (
                        <DateTimePicker
                            value={form.values.occurred_at}
                            onChange={(v) => form.setField("occurred_at", v)}
                            placeholder="Select date and time"
                        />
                    )}
                </Field>

                {/* Notes */}
                {showNotes && (
                    <Field label="Notes">
                        <Textarea
                            rows={2}
                            value={form.values.notes}
                            onChange={(e) => form.setField("notes", e.target.value)}
                            placeholder={notesPlaceholder}
                        />
                    </Field>
                )}

                <Button
                    type="submit"
                    className="w-full rounded-full"
                    disabled={save.isPending}
                >
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save log"}
                </Button>
            </form>
        </FormDialog>
    );
}