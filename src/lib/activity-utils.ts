import { ActivityIcon, Footprints, Scale, Scissors, Zap } from "lucide-react";

export const EXERCISE_TYPES = new Set(["walk", "run", "play"]);

export const ACTIVITY_LABELS: Record<string, string> = {
    walk: "Walk",
    run: "Run",
    play: "Play",
    weight: "Weight check",
    grooming: "Grooming",
};

export const ACTIVITY_FILTERS = [
    ["all", "All"],
    ["walk", "Walks"],
    ["run", "Runs"],
    ["play", "Play"],
    ["weight", "Weight"],
    ["grooming", "Grooming"],
];

export const ACTIVITY_TIME_FILTERS = [
    ["all", "All time"],
    ["today", "Today"],
    ["week", "This week"],
    ["month", "This month"],
];

export const ACITVITY_CARDS = [
    {
        title: "Walks",
        icon: Footprints,
    },
    {
        title: "Runs",
        icon: Zap,
    },
    {
        title: "Play",
        icon: ActivityIcon,
    },
    {
        title: "Weight Checks",
        icon: Scale,
    },
    {
        title: "Grooming",
        icon: Scissors,
    }
];

const getDateKeyFromDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
].join("-");

export const getDateFromOffset = (offset: number) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    return getDateKeyFromDate(date);
};

export function formatMinutes(min: number): string {
    if (min === 0) return "0";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const getDateKey = (date: string) => {
    const d = new Date(date);

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
};

export const getStartOfWeek = () => {
    const date = new Date();
    const day = date.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + diff);

    return date;
};

export const formatGroupDate = (dateKey: string) => {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
        return "Today";
    }

    if (date.getTime() === yesterday.getTime()) {
        return "Yesterday";
    }

    return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
};