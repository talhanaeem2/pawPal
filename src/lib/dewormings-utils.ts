import { Deworming } from "@/schemas/deworming";

export type DewormingDueTone =
    | "overdue"
    | "due_soon"
    | "scheduled";

export function getDewormingDueTone(
    nextDueAt: string | null,
): DewormingDueTone {
    if (!nextDueAt) return "scheduled";

    const due = new Date(nextDueAt).getTime();
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
    }
}

export function getDewormingDisplay(d: Deworming) {
    const tone = getDewormingDueTone(
        d.next_due_at,
    );

    return {
        className: getDewormingDueToneClass(tone),
        label: getDewormingDueToneLabel(tone),
        status: tone
    };
}

export function getActiveDewormings(dewormings: Deworming[]) {
    return dewormings
        .sort(
            (a, b) =>
                new Date(a.next_due_at).getTime() -
                new Date(b.next_due_at).getTime()
        );
}
