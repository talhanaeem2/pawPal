import { formatTime } from "./utils";
import { getGroupedTypesForPets } from "./activity-utils";

import { Pet } from "@/schemas/pets";
import { ScheduleForm, ScheduleItem, ScheduleKind, scheduleKindSchema } from "@/schemas/schedule";

export const KIND_LABELS: Record<ScheduleKind, string> = {
    feeding: "Feeding",
    medication: "Medication",
    supplements: "Supplements",
    flea_tick: "Flea & Tick",
    grooming: "Grooming",
    bath: "Bath",
    nail_trim: "Nail trimming",
    ear_cleaning: "Ear cleaning",
    teeth_brushing: "Teeth brushing",
    wing_clip: "Wing clip",
    beak_trim: "Beak trim",
    tank_cleaning: "Tank cleaning",
    water_change: "Water change",
    uv_check: "UV lamp check",
    free_roam: "Free roam",
    swim: "Swim",
    walk: "Walk",
    play: "Play",
    run: "Run",
    training: "Training",
    weight: "Weight Check",
    length: "Length Check",
};

export const repeatUnitOptions = [
    {
        value: "day",
        singular: "Day",
        plural: "Days",
    },
    {
        value: "week",
        singular: "Week",
        plural: "Weeks",
    },
    {
        value: "month",
        singular: "Month",
        plural: "Months",
    },
    {
        value: "year",
        singular: "Year",
        plural: "Years",
    },
];

// Kinds where we ask for a duration or weight value before logging an
// activity — these show the LogActivityDialog prompt when marked done.
const PROMPT_LOG_KINDS = [
    "walk",
    "run",
    "play",
    "training",
    "free_roam",
    "swim",
    "weight",
    "length"
] as const;
type PromptLogKind = typeof PROMPT_LOG_KINDS[number];

export function isActivityKind(kind: string): kind is PromptLogKind {
    return PROMPT_LOG_KINDS.includes(kind as PromptLogKind);
}

// Kinds that log an activity automatically when marked done — there's no
// extra numeric value to capture, so we skip the dialog (same treatment
// "grooming" always got, now extended to every other event-style kind).
const AUTO_LOG_KINDS = [
    "feeding",
    "grooming",
    "bath",
    "nail_trim",
    "ear_cleaning",
    "teeth_brushing",
    "wing_clip",
    "beak_trim",
    "tank_cleaning",
    "water_change",
    "medication",
    "supplements",
    "flea_tick",
    "uv_check",
] as const;
type AutoLogKind = typeof AUTO_LOG_KINDS[number];

export function isAutoLogKind(kind: string): kind is AutoLogKind {
    return AUTO_LOG_KINDS.includes(kind as AutoLogKind);
}

// Every schedule kind now has a matching activity_type value, so this is a
// straight identity map. (Previously "run" was mapped to the "walk" activity
// type as a workaround from before "run" existed as its own activity type —
// that's no longer needed and was mis-tagging runs as walks in the exercise
// breakdown.)
export function getActivityType(kind: string): string {
    return kind;
}

export function buildOccurredAt(today: string, timeSlot: string | null): string {
    if (timeSlot) {
        // Combine today's date with the time slot in local time → UTC
        const [h, m] = timeSlot.split(":").map(Number);
        const d = new Date(today); // local midnight
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    }
    // No time slot — use noon today
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
}

export function formatKind(s: ScheduleItem) {
    return KIND_LABELS[s.kind as ScheduleKind] ?? s.kind;
}

export function formatFrequency(item: {
    repeat_every: number;
    repeat_unit: "day" | "week" | "month" | "year";
}) {
    if (item.repeat_every === 1) {
        switch (item.repeat_unit) {
            case "day":
                return "Daily";
            case "week":
                return "Weekly";
            case "month":
                return "Monthly";
            case "year":
                return "Yearly";
        }
    }

    return `Every ${item.repeat_every} ${item.repeat_unit}s`;
}

export function getTitlePlaceholder(kind: ScheduleForm["kind"]) {
    switch (kind) {
        case "feeding":
            return "Breakfast";

        case "medication":
            return "Heartworm medicine";

        case "supplements":
            return "Fish oil";

        case "walk":
            return "Morning walk";

        case "play":
            return "Morning play";

        case "run":
            return "Morning run";

        case "training":
            return "Recall practice";

        case "bath":
            return "Monthly bath";

        case "grooming":
            return "Brush coat";

        case "flea_tick":
            return "Monthly flea treatment";

        case "ear_cleaning":
            return "Clean ears";

        case "teeth_brushing":
            return "Brush teeth";

        case "nail_trim":
            return "Trim nails";

        case "weight":
            return "Weekly weigh-in";

        case "length":
            return "Monthly length check";

        case "free_roam":
            return "Free roam time";

        case "swim":
            return "Pool session";

        case "wing_clip":
            return "Wing trim";

        case "beak_trim":
            return "Beak trim";

        case "tank_cleaning":
            return "Weekly tank clean";

        case "water_change":
            return "25% water change";

        case "uv_check":
            return "UV lamp check";

        default:
            return "Reminder";
    }
}

export function getNotesPlaceholder(kind: ScheduleForm["kind"]) {
    switch (kind) {
        case "feeding":
            return "Mix with wet food";

        case "medication":
            return "Give after breakfast";

        case "walk":
            return "Easy pace";

        case "play":
            return "Tug of war";

        case "run":
            return "Jog";

        case "training":
            return "Use treats";

        case "bath":
            return "Avoid eyes";

        case "free_roam":
            return "Supervised, indoor only";

        case "swim":
            return "Life vest, shallow end";

        case "tank_cleaning":
            return "Wipe glass, rinse filter media";

        case "water_change":
            return "Dechlorinate first";

        case "uv_check":
            return "Replace bulb every 6–12 months";

        default:
            return "Optional notes";
    }
}

export function getTimeLabel(kind: ScheduleForm["kind"]) {
    switch (kind) {
        case "feeding":
            return "Feeding time";

        case "medication":
            return "Medication time";

        case "walk":
            return "Walk time";

        case "play":
            return "Play time";

        case "run":
            return "Run time";

        case "training":
            return "Training time";

        case "supplements":
            return "Supplement time";

        case "free_roam":
            return "Free roam time";

        case "swim":
            return "Swim time";

        default:
            return "Time";
    }
}

export function getStartDateLabel(kind: ScheduleForm["kind"]) {
    switch (kind) {
        case "medication":
            return "First dose";

        case "supplements":
            return "First dose";

        case "flea_tick":
            return "Treatment date";

        case "weight":
            return "First check";

        case "length":
            return "First check";

        case "tank_cleaning":
            return "Last cleaned";

        case "water_change":
            return "Last change";

        case "uv_check":
            return "Last checked";

        default:
            return "Start date";
    }
}

export function getStartDateDescription(kind: ScheduleForm["kind"]) {
    switch (kind) {
        case "medication":
            return "The schedule starts from this date.";

        case "supplements":
            return "The schedule starts from this date.";

        case "flea_tick":
            return "The next treatment will be calculated from this date.";

        case "weight":
            return "The first weight check will be scheduled from this date.";

        case "length":
            return "The first length check will be scheduled from this date.";

        case "tank_cleaning":
            return "The next cleaning will be calculated from this date.";

        case "water_change":
            return "The next water change will be calculated from this date.";

        case "uv_check":
            return "The next check will be calculated from this date.";

        default:
            return undefined;
    }
}

export function generateScheduleTitle(
    kind: ScheduleForm["kind"],
    timesOfDay?: string[]
) {
    const usePeriod = timesOfDay?.length === 1;

    const hour = usePeriod
        ? Number(timesOfDay![0].split(":")[0])
        : undefined;

    const period =
        hour === undefined
            ? ""
            : hour < 11
                ? "Morning "
                : hour < 17
                    ? "Afternoon "
                    : "Evening ";

    switch (kind) {
        case "feeding":
            return `${period}Meal`;

        case "medication":
            return `${period}Medication`;

        case "supplements":
            return `${period}Supplements`;

        case "walk":
            return "Walk";

        case "play":
            return "Play";

        case "run":
            return "Run";

        case "training":
            return "Training";

        case "bath":
            return "Bath";

        case "grooming":
            return "Grooming";

        case "ear_cleaning":
            return "Ear Cleaning";

        case "teeth_brushing":
            return "Teeth Brushing";

        case "nail_trim":
            return "Nail Trim";

        case "weight":
            return "Weight Check";

        case "length":
            return "Length Check";

        case "flea_tick":
            return "Flea & Tick";

        case "free_roam":
            return "Free Roam";

        case "swim":
            return "Swim";

        case "wing_clip":
            return "Wing Clip";

        case "beak_trim":
            return "Beak Trim";

        case "tank_cleaning":
            return "Tank Cleaning";

        case "water_change":
            return "Water Change";

        case "uv_check":
            return "UV Check";

        default:
            return "";
    }
}

export function getScheduleDetailField(kind: string) {
    switch (kind) {
        case "feeding":
            return {
                label: "Amount",
                placeholder: "e.g. 1 cup, 150 g, ½ can",
            };

        case "medication":
            return {
                label: "Dose",
                placeholder: "e.g. 1 tablet, 5 ml, 2 drops",
            };

        case "supplements":
            return {
                label: "Supplement",
                placeholder: "e.g. 1 chew, 2 pumps, 5 ml",
            };

        case "walk":
            return {
                label: "Duration",
                placeholder: "e.g. 30 min walk, 20 min run",
            };

        case "play":
            return {
                label: "Duration",
                placeholder: "e.g. 20 min play",
            };

        case "run":
            return {
                label: "Duration",
                placeholder: "e.g. 10 min run",
            };

        case "training":
            return {
                label: "Session",
                placeholder: "e.g. 15 min, Recall practice",
            };

        case "bath":
            return {
                label: "Products",
                placeholder: "e.g. Oatmeal shampoo, Conditioner",
            };

        case "grooming":
            return {
                label: "Details",
                placeholder: "e.g. Brush coat, Deshedding, 15 min",
            };

        case "ear_cleaning":
            return {
                label: "Cleaner",
                placeholder: "e.g. Ear solution, 5 drops",
            };

        case "teeth_brushing":
            return {
                label: "Toothpaste",
                placeholder: "e.g. Poultry toothpaste",
            };

        case "nail_trim":
            return {
                label: "Details",
                placeholder: "e.g. Trim + file",
            };

        case "flea_tick":
            return {
                label: "Treatment",
                placeholder: "e.g. NexGard, Frontline, Bravecto",
            };

        case "weight":
            return {
                label: "Target",
                placeholder: "e.g. 32 kg, Monthly check",
            };

        case "length":
            return {
                label: "Details",
                placeholder: "e.g. 64 cm, Monthly check",
            };

        case "free_roam":
            return {
                label: "Duration",
                placeholder: "e.g. 30 min free roam, supervised",
            };

        case "swim":
            return {
                label: "Duration",
                placeholder: "e.g. 15 min swim",
            };

        case "wing_clip":
            return {
                label: "Details",
                placeholder: "e.g. Both wings, light trim",
            };

        case "beak_trim":
            return {
                label: "Details",
                placeholder: "e.g. Light filing",
            };

        case "tank_cleaning":
            return {
                label: "Details",
                placeholder: "e.g. Full clean, filter rinse",
            };

        case "water_change":
            return {
                label: "Amount",
                placeholder: "e.g. 25%, 2 gallons",
            };

        case "uv_check":
            return {
                label: "Details",
                placeholder: "e.g. Bulb replaced, intensity checked",
            };

        default:
            return {
                label: "Details",
                placeholder: "Optional details",
            };
    }
}

const TIME_REQUIRED_KINDS = new Set([
    "feeding",
    "medication",
    "supplements",
    "training",
    "walk",
    "play",
    "run",
    "free_roam",
    "swim",
]);

const START_DATE_REQUIRED_KINDS = new Set([
    "medication",
    "supplements",
    "flea_tick",
    "weight",
    "length",
    "tank_cleaning",
    "water_change",
    "uv_check",
]);

export function requiresScheduleTime(kind: string) {
    return TIME_REQUIRED_KINDS.has(kind);
}

export function requiresScheduleStartDate(kind: string) {
    return START_DATE_REQUIRED_KINDS.has(kind);
}

// Every schedule kind that's actually assignable via scheduleKindSchema —
// used to filter the shared species taxonomy down to what's schedulable
// (excludes activity-only observation types like shedding/feeding_observation
// and the "length" measurement, which aren't things you'd set a recurring
// reminder for).
const SCHEDULABLE_KINDS = new Set<string>(scheduleKindSchema.options);

export type GroupedScheduleKinds = {
    exercise: ScheduleKind[];
    care: ScheduleKind[];
    medical: ScheduleKind[];
    measurements: ScheduleKind[];
};

// Species-aware kind list for the schedule form's "Reminder type" dropdown,
// mirroring ActivityFormDialog's species-based type grouping. Observation
// types that happen to be schedulable (currently just uv_check) are folded
// into "care" since Schedule doesn't have its own Observations group.
export function getGroupedScheduleKinds(
    pets: Pet[],
    petIds: string[],
): GroupedScheduleKinds {
    const grouped = getGroupedTypesForPets(pets, petIds);

    const toKinds = (types: string[]) =>
        types.filter((type): type is ScheduleKind => SCHEDULABLE_KINDS.has(type));

    return {
        exercise: toKinds(grouped.exercise),
        care: [...toKinds(grouped.care), ...toKinds(grouped.observations)],
        medical: toKinds(grouped.medical),
        measurements: toKinds(grouped.measurements),
    };
}

export function applyTimeSlotFilter<T extends {
    in: (...args: any[]) => T;
    is: (...args: any[]) => T;
    or: (...args: any[]) => T;
}>(
    query: T,
    timeSlots: (string | null)[]
): T {
    const nonNullTimes = timeSlots.filter(
        (t): t is string => t !== null
    );

    if (nonNullTimes.length && timeSlots.includes(null)) {
        return query.or(
            `time_slot.in.(${nonNullTimes.join(",")}),time_slot.is.null`
        );
    }

    if (nonNullTimes.length) {
        return query.in("time_slot", nonNullTimes);
    }

    return query.is("time_slot", null);
}

export function formatScheduleTime(time: string | null) {
    return time ? formatTime(time) : "";
}
