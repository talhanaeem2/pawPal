import { Deworming } from "@/schemas/deworming";

export type DewormingDueTone =
    | "overdue"
    | "due_soon"
    | "scheduled"
    | "completed";

export function getDewormingDueTone(d: Deworming): DewormingDueTone {
    if (d.completed_at) return "completed";

    if (!d.next_due_at) return "scheduled";

    const due = new Date(d.next_due_at).getTime();
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;

    if (due < now) return "overdue";
    if (due - now <= days30) return "due_soon";

    return "scheduled";
}

export function getDewormingDueToneClass(tone: DewormingDueTone) {
    switch (tone) {
        case "overdue":
            return "text-[#C56B6B]";

        case "due_soon":
            return "text-[#C98B5A]";

        case "scheduled":
            return "text-muted-foreground";

        case "completed":
            return "text-[#6F947F]";
    }
}

export function getDewormingDueToneLabel(tone: DewormingDueTone) {
    switch (tone) {
        case "overdue":
            return "Overdue";

        case "due_soon":
            return "Due soon";

        case "scheduled":
            return "Scheduled";

        case "completed":
            return "Completed";
    }
}

export function getDewormingDisplay(d: Deworming) {
    const tone = getDewormingDueTone(d);

    return {
        className: getDewormingDueToneClass(tone),
        label: getDewormingDueToneLabel(tone),
        status: tone
    };
}

export function getActiveDewormings(dewormings: Deworming[]) {
    return dewormings
        .filter((d) => !d.completed_at)
        .sort((a, b) => new Date(a.next_due_at).getTime() - new Date(b.next_due_at).getTime());
}
