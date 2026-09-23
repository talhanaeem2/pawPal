import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { activityQuery, scheduleQuery } from "@/lib/queries";
import {
  applyTimeSlotFilter,
  buildOccurredAt,
  getActivityType,
  isActivityKind,
  isAutoLogKind,
} from "@/lib/schedule-utils";
import { ScheduleWithPets } from "@/schemas/schedule";

type ScheduleToggleInput = {
  scheduleItemId: string;
  scheduleItemPetId?: string;
  markDone: boolean;
  wasSkipped?: boolean;
  timeSlots: (string | null)[];
  note?: string;
};

type LogDialogState = {
  open: boolean;
  schedule: ScheduleWithPets | null;
  timeSlots: (string | null)[];
  targetPetId?: string;
};

type UndoDialogState = {
  open: boolean;
  schedule: ScheduleWithPets | null;
  timeSlots: (string | null)[];
  targetPetId?: string;
};

type CompletionNoteState = {
  scheduleItemId: string;
  scheduleItemPetId?: string;
  timeSlots: (string | null)[];
  title: string;
};

type UseScheduleActionsInput = {
  items: ScheduleWithPets[];
  today: string;
};

export function useScheduleActions({
  items,
  today,
}: UseScheduleActionsInput) {
  const queryClient = useQueryClient();
  const [logDialogState, setLogDialogState] = useState<LogDialogState>({
    open: false,
    schedule: null,
    timeSlots: [],
  });
  const [undoDialogState, setUndoDialogState] = useState<UndoDialogState>({
    open: false,
    schedule: null,
    timeSlots: [],
  });
  const [completionNoteState, setCompletionNoteState] = useState<CompletionNoteState | null>(
    null,
  );

  const logActivity = useMutation({
    mutationFn: async ({
      schedule,
      timeSlot,
      targetPetId,
    }: {
      schedule: ScheduleWithPets;
      timeSlot: string | null;
      targetPetId?: string;
    }) => {
      const petsToLog = schedule.schedule_item_pets.filter(
        (pet) => !targetPetId || pet.pet_id === targetPetId,
      );

      if (petsToLog.length === 0) {
        throw new Error("No pet found for this schedule item");
      }

      const sessionId = petsToLog.length > 1 ? crypto.randomUUID() : null;

      const { error } = await supabase.from("activity_logs").insert(
        petsToLog.map((pet) => ({
          pet_id: pet.pet_id,
          activity_type: getActivityType(schedule.kind),
          occurred_at: buildOccurredAt(today, timeSlot),
          duration_min: null,
          weight: null,
          session_id: sessionId,
          notes: null,
        })),
      );

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activityQuery.queryKey,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't log activity",
      );
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
      timeSlots,
      note,
    }: ScheduleToggleInput) => {
      const schedule = items.find((item) => item.id === scheduleItemId);

      if (!schedule) {
        throw new Error("Schedule not found");
      }

      const multiplePets = schedule.schedule_item_pets.length > 1;

      if (markDone) {
        const petsToComplete = scheduleItemPetId
          ? schedule.schedule_item_pets.filter(
            (pet) => pet.id === scheduleItemPetId,
          )
          : schedule.schedule_item_pets;

        if (scheduleItemPetId && petsToComplete.length === 0) {
          throw new Error("Pet not found");
        }

        const skippedCompletionIds = petsToComplete.flatMap((pet) =>
          timeSlots.flatMap((timeSlot) =>
            pet.schedule_completions
              .filter(
                (completion) =>
                  completion.completed_on === today &&
                  completion.time_slot === timeSlot &&
                  completion.status === "skipped",
              )
              .map((completion) => completion.id),
          ),
        );

        if (skippedCompletionIds.length > 0) {
          const { error } = await supabase
            .from("schedule_completions")
            .delete()
            .in("id", skippedCompletionIds);

          if (error) {
            throw error;
          }
        }

        const rows = petsToComplete.flatMap((pet) =>
          timeSlots
            .filter(
              (timeSlot) =>
                !pet.schedule_completions.some(
                  (completion) =>
                    completion.completed_on === today &&
                    completion.time_slot === timeSlot &&
                    completion.status === "completed",
                ),
            )
            .map((timeSlot) => ({
              schedule_item_pet_id: pet.id,
              completed_on: today,
              time_slot: timeSlot,
              status: "completed",
              note: note?.trim() || null,
            })),
        );

        if (rows.length > 0) {
          const { error } = await supabase
            .from("schedule_completions")
            .insert(rows);

          if (error) {
            throw error;
          }
        }
      } else {
        const scheduleItemPetIds = scheduleItemPetId
          ? [scheduleItemPetId]
          : schedule.schedule_item_pets.map((pet) => pet.id);
        let query = supabase
          .from("schedule_completions")
          .delete()
          .in("schedule_item_pet_id", scheduleItemPetIds)
          .eq("completed_on", today);

        query = applyTimeSlotFilter(query, timeSlots);

        const { error } = await query;

        if (error) {
          throw error;
        }
      }

      return {
        markDone,
        allPets: !scheduleItemPetId,
        multiplePets,
        scheduleItemId,
        scheduleItemPetId,
        timeSlots,
        title: schedule.title,
        note,
      };
    },
    onSuccess: ({
      markDone,
      multiplePets,
      allPets,
      scheduleItemId,
      scheduleItemPetId,
      timeSlots,
      title,
      note,
    }) => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });

      const message = markDone
        ? allPets && multiplePets
          ? "Marked all reminders done"
          : "Reminder completed"
        : allPets && multiplePets
          ? "Marked all reminders undone"
          : "Marked undone";

      toast.success(message, {
        action:
          markDone && !note?.trim()
            ? {
                label: "Add note",
                onClick: () =>
                  setCompletionNoteState({
                    scheduleItemId,
                    scheduleItemPetId,
                    timeSlots,
                    title,
                  }),
              }
            : undefined,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed");
    },
  });

  const skip = useMutation({
    mutationFn: async (scheduleItemId: string) => {
      const schedule = items.find((item) => item.id === scheduleItemId);

      if (!schedule) {
        throw new Error("Schedule not found");
      }

      const slots = schedule.times_of_day.length > 0
        ? schedule.times_of_day
        : [null];
      const rows = schedule.schedule_item_pets.flatMap((pet) =>
        slots
          .filter(
            (timeSlot) =>
              !pet.schedule_completions.some(
                (completion) =>
                  completion.completed_on === today && completion.time_slot === timeSlot,
              ),
          )
          .map((timeSlot) => ({
            schedule_item_pet_id: pet.id,
            completed_on: today,
            time_slot: timeSlot,
            status: "skipped",
          })),
      );

      if (rows.length > 0) {
        const { error } = await supabase.from("schedule_completions").insert(rows);

        if (error) {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });
      toast.success("Skipped for today");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't skip this reminder");
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_items").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });
      toast.success("Removed");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed");
    },
  });

  const saveCompletionNote = useMutation({
    mutationFn: async (note: string) => {
      const state = completionNoteState;
      const schedule = state && items.find((item) => item.id === state.scheduleItemId);

      if (!state || !schedule) {
        throw new Error("Schedule not found");
      }

      const scheduleItemPetIds = state.scheduleItemPetId
        ? [state.scheduleItemPetId]
        : schedule.schedule_item_pets.map((pet) => pet.id);
      let query = supabase
        .from("schedule_completions")
        .update({ note: note.trim() || null })
        .in("schedule_item_pet_id", scheduleItemPetIds)
        .eq("completed_on", today)
        .eq("status", "completed");

      query = applyTimeSlotFilter(query, state.timeSlots);
      const { error } = await query;

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });
      setCompletionNoteState(null);
      toast.success("Note saved");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't save the note");
    },
  });

  const handleToggle = useCallback(
    async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
      wasSkipped,
      timeSlots,
      note,
    }: ScheduleToggleInput) => {
      const schedule = items.find((item) => item.id === scheduleItemId);

      if (!schedule) {
        return;
      }

      if (!markDone && wasSkipped) {
        toggle.mutate({
          scheduleItemId,
          scheduleItemPetId,
          markDone: false,
          timeSlots,
        });
        return;
      }

      const targetPetId = scheduleItemPetId
        ? schedule.schedule_item_pets.find((pet) => pet.id === scheduleItemPetId)
          ?.pet_id
        : undefined;

      if (markDone && isAutoLogKind(schedule.kind)) {
        try {
          await logActivity.mutateAsync({
            schedule,
            timeSlot: timeSlots[0] ?? null,
            targetPetId,
          });
          await toggle.mutateAsync({
            scheduleItemId,
            scheduleItemPetId,
            markDone: true,
            timeSlots,
            note,
          });
        } catch {
          // The involved mutations show their own error toast.
        }

        return;
      }

      if (markDone && isActivityKind(schedule.kind)) {
        setLogDialogState({
          open: true,
          schedule,
          timeSlots,
          targetPetId,
        });
        return;
      }

      if (
        !markDone &&
        (isActivityKind(schedule.kind) || isAutoLogKind(schedule.kind))
      ) {
        setUndoDialogState({
          open: true,
          schedule,
          timeSlots,
          targetPetId,
        });
        return;
      }

      toggle.mutate({
        scheduleItemId,
        scheduleItemPetId,
        markDone,
        timeSlots,
      });
    },
    [items, logActivity, toggle],
  );

  const markLoggedActivityDone = useCallback((note?: string) => {
    const schedule = logDialogState.schedule;

    if (!schedule) {
      return;
    }

    const targetScheduleItemPet = logDialogState.targetPetId
      ? schedule.schedule_item_pets.find(
        (pet) => pet.pet_id === logDialogState.targetPetId,
      )
      : undefined;

    toggle.mutate({
      scheduleItemId: schedule.id,
      scheduleItemPetId: targetScheduleItemPet?.id,
      markDone: true,
      timeSlots: logDialogState.timeSlots.length > 0
        ? logDialogState.timeSlots
        : [null],
      note,
    });
  }, [logDialogState, toggle]);

  const undoLoggedActivity = useCallback(
    async (deleteLog: boolean) => {
      const schedule = undoDialogState.schedule;

      if (!schedule) {
        return;
      }

      const targetScheduleItemPet = undoDialogState.targetPetId
        ? schedule.schedule_item_pets.find(
          (pet) => pet.pet_id === undoDialogState.targetPetId,
        )
        : undefined;

      toggle.mutate({
        scheduleItemId: schedule.id,
        scheduleItemPetId: targetScheduleItemPet?.id,
        markDone: false,
        timeSlots: undoDialogState.timeSlots,
      });

      if (!deleteLog) {
        return;
      }

      const petIds = targetScheduleItemPet
        ? [targetScheduleItemPet.pet_id]
        : schedule.schedule_item_pets.map((pet) => pet.pet_id);
      const activityType = getActivityType(schedule.kind);
      const deleteErrors: string[] = [];

      for (const slot of undoDialogState.timeSlots) {
        const occurredAt = buildOccurredAt(today, slot);
        const from = new Date(new Date(occurredAt).getTime() - 60 * 60_000).toISOString();
        const to = new Date(new Date(occurredAt).getTime() + 60 * 60_000).toISOString();

        const { error } = await supabase
          .from("activity_logs")
          .delete()
          .in("pet_id", petIds)
          .eq("activity_type", activityType)
          .gte("occurred_at", from)
          .lte("occurred_at", to);

        if (error) {
          deleteErrors.push(slot ?? "no-time");
        }
      }

      if (deleteErrors.length > 0) {
        toast.error("Reminder undone but couldn't delete some activity logs");
      } else {
        queryClient.invalidateQueries({ queryKey: activityQuery.queryKey });
      }
    },
    [queryClient, today, toggle, undoDialogState],
  );

  return {
    completionNoteState,
    deleteSchedule,
    handleToggle,
    handleSkip: (scheduleItemId: string) => skip.mutate(scheduleItemId),
    isToggling: toggle.isPending || skip.isPending,
    isSavingCompletionNote: saveCompletionNote.isPending,
    logDialogState,
    markLoggedActivityDone,
    saveCompletionNote: (note: string) => saveCompletionNote.mutate(note),
    setCompletionNoteState,
    setLogDialogState,
    setUndoDialogState,
    undoDialogState,
    undoLoggedActivity,
  };
}
