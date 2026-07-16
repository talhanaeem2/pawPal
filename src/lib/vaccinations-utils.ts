import { Vaccination } from "@/schemas/vacination";

export type VaccinationTone =
    | "overdue"
    | "due_soon"
    | "completed"
    | "scheduled"
    | "no_due_date";

export function getVaccinationTone(
    nextDueAt: string | null,
    completedAt?: string | null,
): VaccinationTone {
    if (completedAt) return "completed";

    if (!nextDueAt) return "no_due_date";

    const due = new Date(nextDueAt).getTime();
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;

    if (due < now) return "overdue";
    if (due - now <= days30) return "due_soon";

    return "scheduled";
}

export function getVaccinationToneClass(tone: VaccinationTone) {
    switch (tone) {
        case "overdue":
            return "text-[#C56B6B]";

        case "due_soon":
            return "text-[#C98B5A]";

        case "completed":
            return "text-[#6F947F]";

        case "no_due_date":
            return "text-muted-foreground";

        case "scheduled":
            return "text-muted-foreground";
    }
}

export function getVaccinationToneLabel(tone: VaccinationTone) {
    switch (tone) {
        case "overdue":
            return "Overdue";

        case "due_soon":
            return "Due soon";

        case "completed":
            return "Completed";

        case "scheduled":
            return "Scheduled";

        case "no_due_date":
            return "No due date";
    }
}

export function getVaccinationDisplay(v: Vaccination) {
    const tone = getVaccinationTone(
        v.next_due_at,
        v.completed_at,
    );

    return {
        className: getVaccinationToneClass(tone),
        label: getVaccinationToneLabel(tone),
        status: tone

    };
}

export function getActiveVaccinations(vaccinations: Vaccination[]) {
    return vaccinations
        .filter((v) => !v.completed_at)
        .filter((v) => v.next_due_at)
        .sort(
            (a, b) =>
                new Date(a.next_due_at!).getTime() -
                new Date(b.next_due_at!).getTime()
        );
}
