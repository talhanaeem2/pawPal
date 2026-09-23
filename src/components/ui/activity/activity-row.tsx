import { useRef, useState, type TouchEvent } from "react";
import { Footprints, Pencil, Trash2 } from "lucide-react";

import { formatDate, formatDateTime } from "@/lib/utils";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, DATE_ONLY_TYPES, EXERCISE_TYPES, MEASUREMENT_TYPES } from "@/lib/activity-utils";

import { Button } from "../common/button";
import { ActivityFormDialog } from "./activity-form-dialog";

import { ActivityLog } from "@/schemas/activity";
import { getPetDisplayName, Pet } from "@/schemas/pets";

type ActivityRowProps = {
  item: ActivityLog;
  pets: Pet[];
  onDelete: (id: string) => void;
};

const SWIPE_ACTION_THRESHOLD = 72;
const MAX_SWIPE_DISTANCE = 96;

export function ActivityRow({ item, pets, onDelete }: ActivityRowProps) {
  const pet = pets.find((p) => p.id === item.pet_id);
  const Icon = ACTIVITY_ICONS[item.activity_type] ?? Footprints;
  const canHaveMissingData =
    EXERCISE_TYPES.has(item.activity_type) || MEASUREMENT_TYPES.has(item.activity_type);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.touches[0];

    if (!start || Math.abs(touch.clientY - start.y) > Math.abs(touch.clientX - start.x)) {
      return;
    }

    const distance = Math.max(
      -MAX_SWIPE_DISTANCE,
      Math.min(MAX_SWIPE_DISTANCE, touch.clientX - start.x),
    );
    setSwipeOffset(distance);
  }

  function handleTouchEnd() {
    const completedAction =
      swipeOffset >= SWIPE_ACTION_THRESHOLD
        ? "delete"
        : swipeOffset <= -SWIPE_ACTION_THRESHOLD
          ? "edit"
          : null;

    touchStart.current = null;
    setSwipeOffset(0);

    if (completedAction === "delete") {
      onDelete(item.id);
    }

    if (completedAction === "edit") {
      setEditOpen(true);
    }
  }

  return (
    <li className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-destructive text-destructive-foreground"
        aria-hidden="true"
      >
        <Trash2 className="h-4 w-4" />
        <span className="ml-1 text-xs font-medium">Delete</span>
      </div>
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <Pencil className="h-4 w-4" />
        <span className="ml-1 text-xs font-medium">Edit</span>
      </div>

      <div
        className="relative flex touch-pan-y items-center gap-3 bg-card p-4 transition-transform duration-200"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60">
          <Icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {ACTIVITY_LABELS[item.activity_type] ?? item.activity_type}
            <span className="capitalize">{pet ? ` · ${getPetDisplayName(pet)}` : ""}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {DATE_ONLY_TYPES.has(item.activity_type)
              ? formatDate(item.occurred_at)
              : formatDateTime(item.occurred_at)}
            {item.duration_min ? ` · ${item.duration_min} min` : ""}
            {item.weight ? ` · ${item.weight}${item.activity_type === "weight" ? " kg" : ""}` : ""}
            {item.length ? ` · ${item.length}${item.activity_type === "length" ? " cm" : ""}` : ""}
            <br />
            {!item.duration_min &&
              !item.weight &&
              !item.length &&
              !item.notes &&
              canHaveMissingData && <span className="opacity-50">No data logged</span>}
          </div>
          {item.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{item.notes}</p>}
        </div>
        <ActivityFormDialog
          pets={pets}
          item={item}
          open={editOpen}
          onOpenChange={setEditOpen}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Edit log">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete log"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
