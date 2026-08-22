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
} from "@/lib/schedule-utils";

import { ScheduleWithPets } from "@/schemas/schedule";

type ScheduleToggleInput = {
  scheduleItemId: string;
  scheduleItemPetId?: string;
  markDone: boolean;
  timeSlots: (string | null)[];
};

type LogDialogState = {
  open: boolean;
  schedule: ScheduleWithPets | null;
  timeSlot: string | null;
  targetPetId?: string;
};

type UndoDialogState = {
  open: boolean;
  schedule: ScheduleWithPets | null;
  timeSlots: (string | null)[];
  targetPetId?: string;
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
    timeSlot: null,
  });
  const [undoDialogState, setUndoDialogState] = useState<UndoDialogState>({
    open: false,
    schedule: null,
    timeSlots: [],
  });

  const logGrooming = useMutation({
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
        throw new Error("No pet found for this grooming schedule");
      }

      const { error } = await supabase.from("activity_logs").insert(
        petsToLog.map((pet) => ({
          pet_id: pet.pet_id,
          activity_type: "grooming",
          occurred_at: buildOccurredAt(today, timeSlot),
          duration_min: null,
          weight: null,
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
          : "Couldn't log grooming activity",
      );
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
      timeSlots,
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

        const rows = petsToComplete.flatMap((pet) =>
          timeSlots
            .filter(
              (timeSlot) =>
                !pet.schedule_completions.some(
                  (completion) =>
                    completion.completed_on === today &&
                    completion.time_slot === timeSlot,
                ),
            )
            .map((timeSlot) => ({
              schedule_item_pet_id: pet.id,
              completed_on: today,
              time_slot: timeSlot,
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
      };
    },
    onSuccess: ({ markDone, multiplePets, allPets }) => {
      queryClient.invalidateQueries({ queryKey: scheduleQuery.queryKey });

      const message = markDone
        ? allPets && multiplePets
          ? "Marked all reminders done"
          : "Reminder completed"
        : allPets && multiplePets
          ? "Marked all reminders undone"
          : "Marked undone";

      toast.success(message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed");
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

  const handleToggle = useCallback(
    async ({
      scheduleItemId,
      scheduleItemPetId,
      markDone,
      timeSlots,
    }: ScheduleToggleInput) => {
      const schedule = items.find((item) => item.id === scheduleItemId);

      if (!schedule) {
        return;
      }

      const targetPetId = scheduleItemPetId
        ? schedule.schedule_item_pets.find((pet) => pet.id === scheduleItemPetId)
          ?.pet_id
        : undefined;

      if (markDone && schedule.kind === "grooming") {
        try {
          await logGrooming.mutateAsync({
            schedule,
            timeSlot: timeSlots[0] ?? null,
            targetPetId,
          });
          await toggle.mutateAsync({
            scheduleItemId,
            scheduleItemPetId,
            markDone: true,
            timeSlots,
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
          timeSlot: timeSlots[0] ?? null,
          targetPetId,
        });
        return;
      }

      if (!markDone && isActivityKind(schedule.kind)) {
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
    [items, logGrooming, toggle],
  );

  const markLoggedActivityDone = useCallback(() => {
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
      timeSlots: logDialogState.timeSlot
        ? [logDialogState.timeSlot]
        : [null],
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

      const occurredAt = buildOccurredAt(
        today,
        undoDialogState.timeSlots[0] ?? null,
      );
      const petIds = targetScheduleItemPet
        ? [targetScheduleItemPet.pet_id]
        : schedule.schedule_item_pets.map((pet) => pet.pet_id);
      const activityType = getActivityType(schedule.kind);
      const from = new Date(
        new Date(occurredAt).getTime() - 60 * 60_000,
      ).toISOString();
      const to = new Date(
        new Date(occurredAt).getTime() + 60 * 60_000,
      ).toISOString();
      const { error } = await supabase
        .from("activity_logs")
        .delete()
        .in("pet_id", petIds)
        .eq("activity_type", activityType)
        .gte("occurred_at", from)
        .lte("occurred_at", to);

      if (error) {
        toast.error("Reminder undone but couldn't delete activity log");
      } else {
        queryClient.invalidateQueries({ queryKey: activityQuery.queryKey });
      }
    },
    [queryClient, today, toggle, undoDialogState],
  );

  return {
    deleteSchedule,
    handleToggle,
    isToggling: toggle.isPending,
    logDialogState,
    markLoggedActivityDone,
    setLogDialogState,
    setUndoDialogState,
    undoDialogState,
    undoLoggedActivity,
  };
}