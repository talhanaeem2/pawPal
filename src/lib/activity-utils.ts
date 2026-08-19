export const EXERCISE_TYPES = new Set(["walk", "run", "play"]);

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
    if (min < 60) return `${min}`;
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