import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Footprints, Pill, UtensilsCrossed, Clock } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useZodForm } from "@/hooks/use-zod-form";
import { scheduleQuery } from "@/lib/queries";
import { formatFrequency, generateScheduleTitle, repeatUnitOptions } from "@/lib/schedule.utils";

import { Button } from "@/components/ui/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog";
import { Field } from "@/components/ui/common/field";
import { Input } from "@/components/ui/common/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";
import { Page } from "@/components/layout/page";
import { TimePicker } from "@/components/ui/common/time-picker";

import { createEmptyScheduleForm, OnboardingReminderForm, onboardingReminderSchema, ScheduleForm } from "@/schemas/schedule";

const reminders = [
    {
        value: "feeding",
        title: "Feeding",
        description: "Remind me when it's meal time.",
        icon: UtensilsCrossed,
    },
    {
        value: "medication",
        title: "Medication",
        description: "Never miss another dose.",
        icon: Pill,
    },
    {
        value: "exercise",
        title: "Exercise",
        description: "Walks and play sessions.",
        icon: Footprints,
    },
];

export const Route = createFileRoute("/_authenticated/onboarding/reminder")({
    validateSearch: (search: Record<string, unknown>) => ({
        petId: String(search.petId),
    }),
    component: ReminderPage,
});

function ReminderPage() {
    const navigate = Route.useNavigate();
    const { petId } = Route.useSearch();
    const qc = useQueryClient();

    const [open, setOpen] = useState(false);
    const form = useZodForm(
        onboardingReminderSchema,
        createEmptyScheduleForm(petId)
    );

    const dialogTitle = reminders.find(r => r.value === form.values.kind)?.title ?? "Reminder";

    const save = useMutation({
        mutationFn: async (data: OnboardingReminderForm) => {
            const title = generateScheduleTitle(data.kind, data.time_of_day);

            const payload = {
                kind: data.kind,
                title,
                time_of_day: data.time_of_day || null,
                repeat_every: data.repeat_every,
                repeat_unit: data.repeat_unit,
                start_date: data.start_date,
            };

            const petLinks = (scheduleId: string) =>
                data.pet_details.map((detail) => ({
                    schedule_item_id: scheduleId,
                    pet_id: detail.pet_id,
                    dosage: detail.dosage.trim() || null,
                    notes: detail.notes.trim() || null,
                }));

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
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: scheduleQuery.queryKey });
            toast.success("Added");
            setOpen(false);
            form.reset(createEmptyScheduleForm(petId));
            navigate({ to: "/onboarding/complete" })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    return (
        <Page>
            <Page.Content>
                <div className="w-full space-y-8">
                    <div className="text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
                            <Clock className="h-10 w-10 text-primary" />
                        </div>

                        <h1 className="mt-6 font-display text-3xl">
                            Let's build your pet's routine
                        </h1>

                        <p className="mt-2 text-muted-foreground">
                            We'll help you remember your pet's routine.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {reminders.map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => form.setField("kind", item.value as ScheduleForm["kind"])}
                                    className={cn(
                                        "w-full rounded-2xl border p-4 transition-all duration-200",
                                        "flex items-center gap-4 text-left",
                                        form.values.kind === item.value
                                            ? "border-primary bg-primary/10 shadow-(--shadow-soft)"
                                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-medium">
                                            {item.title}
                                        </p>

                                        <p className="text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <Button
                        className="h-11 w-full rounded-full"
                        onClick={() => setOpen(true)}
                    >
                        Continue
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent className="rounded-3xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {dialogTitle} reminder
                                </DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const data = form.getValidated();
                                    if (!data) return;
                                    save.mutate(data);
                                }}
                                className="flex flex-1 flex-col min-h-0"
                            >
                                <div className="space-y-4">
                                    <Field label="When should we remind you?">
                                        {/* <Input type="time" value={form.values.time_of_day} onChange={(e) => form.setField("time_of_day", e.target.value)} /> */}
                                        <TimePicker
                                            value={form.values.time_of_day}
                                            onChange={(time) => form.setField("time_of_day", time)}
                                        />
                                    </Field>

                                    <Field label="How often?">
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
                                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                                        {save.isPending ? "Saving…" : "Create reminder"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </Page.Content>
        </Page>
    );
}