import { useState } from "react";
import { Check, CircleOff, Pencil, Trash2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/common/accordion";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { formatKind } from "@/lib/schedule-utils";
import { cn, formatTime } from "@/lib/utils";
import { getPetDisplayName, Pet } from "@/schemas/pets";

import { ScheduleListItem } from "./schedule-dashboard";
import { ScheduleDialog } from "./schedule-dialog";

type ScheduleToggleInput = {
  scheduleItemId: string;
  scheduleItemPetId?: string;
  markDone: boolean;
  wasSkipped?: boolean;
  timeSlots: (string | null)[];
  note?: string;
};

type ScheduleListProps = {
  items: ScheduleListItem[];
  pets: Pet[];
  today: string;
  isToggling: boolean;
  onToggle: (input: ScheduleToggleInput) => void;
  onSkip: (scheduleItemId: string) => void;
  onDelete: (scheduleItemId: string) => void;
};

export function ScheduleList({
  items,
  pets,
  today,
  isToggling,
  onToggle,
  onSkip,
  onDelete,
}: ScheduleListProps) {
  const [pendingCompletion, setPendingCompletion] = useState<{
    input: ScheduleToggleInput;
    count: number;
  } | null>(null);

  function requestToggle(input: ScheduleToggleInput, item: ScheduleListItem) {
    const remainingCount = getRemainingCompletionCount(item, today);
    const isBulkCompletion = input.markDone && !input.scheduleItemPetId && remainingCount > 1;

    if (isBulkCompletion) {
      setPendingCompletion({ input, count: remainingCount });
      return;
    }

    onToggle(input);
  }

  return (
    <>
      <Accordion type="single" collapsible className="rounded-3xl bg-card shadow-(--shadow-soft)">
        {items.map((item) =>
          item.useAccordion ? (
            <ScheduleExpandableItem
              key={item.schedule.id}
              item={item}
              pets={pets}
              today={today}
              isToggling={isToggling}
              onToggle={(input) => requestToggle(input, item)}
              onSkip={onSkip}
              onDelete={onDelete}
            />
          ) : (
            <ScheduleCompactItem
              key={item.schedule.id}
              item={item}
              pets={pets}
              today={today}
              isToggling={isToggling}
              onToggle={(input) => requestToggle(input, item)}
              onSkip={onSkip}
              onDelete={onDelete}
            />
          ),
        )}
      </Accordion>

      <ConfirmDialog
        open={pendingCompletion !== null}
        onOpenChange={(open) => !open && setPendingCompletion(null)}
        title={`Mark ${pendingCompletion?.count ?? 0} reminders done?`}
        description="This will complete every remaining time and pet in this reminder."
        confirmText="Mark done"
        loading={isToggling}
        onConfirm={() => {
          if (pendingCompletion) {
            onToggle(pendingCompletion.input);
            setPendingCompletion(null);
          }
        }}
      />
    </>
  );
}

function getRemainingCompletionCount(item: ScheduleListItem, today: string) {
  return item.pets.reduce(
    (total, pet) =>
      total +
      item.times.filter(
        (time) =>
          !pet.schedule_completions.some(
            (completion) =>
              completion.completed_on === today &&
              completion.time_slot === time &&
              completion.status === "completed",
          ),
      ).length,
    0,
  );
}

type ScheduleItemProps = Omit<ScheduleListProps, "items"> & {
  item: ScheduleListItem;
};

function ScheduleCompactItem({
  item,
  pets,
  today,
  isToggling,
  onToggle,
  onSkip,
  onDelete,
}: ScheduleItemProps) {
  const { schedule } = item;
  const detail = item.detailRows[0];
  const completionNotes = getCompletionNotes(item, today);

  return (
    <div className="flex flex-col gap-1 border-b last:border-b-0">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <CompletionButton
          done={item.allDone}
          skipped={item.allSkipped}
          disabled={isToggling}
          onClick={() =>
            onToggle({
              scheduleItemId: schedule.id,
              markDone: item.allSkipped ? false : !item.allDone,
              wasSkipped: item.allSkipped,
              timeSlots: item.times,
            })
          }
        />

        <div className="min-w-0 flex-1">
          <ScheduleItemSummary item={item} />

          {item.petCount === 1 && item.hasDetails && detail?.dosage && (
            <div className="text-xs">
              <span className="font-medium">{item.detailField.label}:</span>{" "}
              <span className="text-muted-foreground">{detail.dosage}</span>
            </div>
          )}

          {item.petCount === 1 && item.hasDetails && detail?.notes && (
            <div className="mt-0.5 text-xs italic text-muted-foreground">{detail.notes}</div>
          )}

          {completionNotes.map((note) => (
            <p key={note} className="mt-1 text-xs italic text-muted-foreground">
              Today&apos;s note: {note}
            </p>
          ))}
        </div>

        <ScheduleItemActions
          pets={pets}
          item={item}
          isToggling={isToggling}
          onSkip={onSkip}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function ScheduleExpandableItem({
  item,
  pets,
  today,
  isToggling,
  onToggle,
  onSkip,
  onDelete,
}: ScheduleItemProps) {
  const { schedule } = item;

  return (
    <AccordionItem value={schedule.id}>
      <div
        className={cn(
          "flex items-center gap-3 px-4 transition-all duration-200",
          item.allSettled && "opacity-70",
        )}
      >
        <CompletionButton
          done={item.allDone}
          skipped={item.allSkipped}
          disabled={isToggling}
          onClick={() =>
            onToggle({
              scheduleItemId: schedule.id,
              markDone: item.allSkipped ? false : !item.allDone,
              wasSkipped: item.allSkipped,
              timeSlots: item.times,
            })
          }
        />

        <div className="min-w-0 flex-1">
          <AccordionTrigger className="flex-1 hover:no-underline">
            <div className="text-left">
              <ScheduleItemSummary item={item} />
            </div>
          </AccordionTrigger>
        </div>

        <ScheduleItemActions
          pets={pets}
          item={item}
          isToggling={isToggling}
          onSkip={onSkip}
          onDelete={onDelete}
          stopPropagation
        />
      </div>

      <AccordionContent className="space-y-4 px-4 pb-4">
        <div className="grid grid-cols-1 gap-2 px-4">
          {item.pets.map((pet) => (
            <div key={pet.id} className="flex flex-col gap-1">
              {item.multiplePets && (
                <div className="text-sm font-medium capitalize">
                  {pet.pet ? getPetDisplayName(pet.pet) : ""}
                </div>
              )}

              {item.times.map((time) => {
                const completionForTime = pet.schedule_completions.find(
                  (completion) =>
                    completion.completed_on === today && completion.time_slot === time,
                );
                const doneForTime = completionForTime?.status === "completed";
                const skippedForTime = completionForTime?.status === "skipped";
                const doneToday = pet.schedule_completions.some(
                  (completion) =>
                    completion.completed_on === today && completion.status === "completed",
                );
                const isSkipped = item.hasTime
                  ? skippedForTime
                  : completionForTime?.status === "skipped";
                const isDone = item.hasTime ? doneForTime : doneToday;

                return (
                  <button
                    key={pet.id + "-" + String(time)}
                    onClick={() =>
                      onToggle({
                        scheduleItemId: item.schedule.id,
                        scheduleItemPetId: pet.id,
                        markDone: isSkipped ? false : !isDone,
                        wasSkipped: isSkipped,
                        timeSlots: item.hasTime ? [time] : [null],
                      })
                    }
                    disabled={isToggling}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground opacity-70"
                        : isSkipped
                          ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                          : "border-border bg-card hover:bg-accent/40",
                    )}
                  >
                    {isSkipped ? (
                      <CircleOff className="h-3 w-3" />
                    ) : (
                      <Check className={cn("h-3 w-3", !isDone && "opacity-70")} />
                    )}
                    {isSkipped ? "Skipped" : item.hasTime ? formatScheduleTime(time) : "Done"}
                  </button>
                );
              })}

              {(pet.dosage || pet.notes) && (
                <div className="space-y-2 pt-2">
                  <div className="space-y-0.5">
                    {pet.dosage && (
                      <div className="px-2 text-xs">
                        <span className="font-medium">{item.detailField.label}:</span>{" "}
                        <span className="text-muted-foreground">{pet.dosage}</span>
                      </div>
                    )}
                    {pet.notes && (
                      <div className="px-2 text-xs italic text-muted-foreground">
                        <span>{pet.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.times.map((time) => {
                const note = pet.schedule_completions.find(
                  (completion) =>
                    completion.completed_on === today && completion.time_slot === time,
                )?.note;

                return note ? (
                  <p key={`note-${String(time)}`} className="px-2 pt-1 text-xs italic text-muted-foreground">
                    {note}
                  </p>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ScheduleItemSummary({ item }: { item: ScheduleListItem }) {
  return (
    <>
      <div
        className={cn("text-sm font-medium capitalize", item.allSettled && "line-through opacity-70")}
      >
        {item.schedule.title}
      </div>
      <div className="text-xs capitalize text-muted-foreground">
        {item.petLabel && item.petLabel + " · "}
        {formatKind(item.schedule)} · {item.preview}
        {item.allSkipped && " · Skipped today"}
      </div>
    </>
  );
}

function ScheduleItemActions({
  pets,
  item,
  isToggling,
  onSkip,
  onDelete,
  stopPropagation = false,
}: {
  pets: Pet[];
  item: ScheduleListItem;
  isToggling: boolean;
  onSkip: (scheduleItemId: string) => void;
  onDelete: (scheduleItemId: string) => void;
  stopPropagation?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <ScheduleDialog
        pets={pets}
        item={item.schedule}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      {!item.allDone && (
        <Button
          variant="ghost"
          size="icon"
          disabled={isToggling}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
            onSkip(item.schedule.id);
          }}
          aria-label="Skip reminder for today"
        >
          <CircleOff className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          onDelete(item.schedule.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CompletionButton({
  done,
  skipped,
  disabled,
  onClick,
}: {
  done: boolean;
  skipped: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        done
          ? "border-primary bg-primary text-primary-foreground opacity-70"
          : skipped
            ? "border-muted-foreground/30 bg-muted text-muted-foreground"
            : "border-border hover:bg-accent/40",
      )}
    >
      {skipped ? <CircleOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
    </button>
  );
}

function formatScheduleTime(time: string | null) {
  return time ? formatTime(time) : "";
}

function getCompletionNotes(item: ScheduleListItem, today: string) {
  return [...new Set(
    item.pets.flatMap((pet) =>
      pet.schedule_completions
        .filter(
          (completion) =>
            completion.completed_on === today &&
            completion.status === "completed" &&
            Boolean(completion.note?.trim()),
        )
        .map((completion) => completion.note!.trim()),
    ),
  )];
}
