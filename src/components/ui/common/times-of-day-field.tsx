import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";

import { Button } from "./button";
import { Field } from "./field";
import { TimePicker } from "./time-picker";

export function TimesOfDayField({
    value,
    onChange,
}: {
    value: string[];
    onChange: (times: string[]) => void;
}) {
    const [mode, setMode] = useState<"simple" | "custom">(
        // Start in custom mode if existing times don't fit the evenly-spaced pattern
        value.length > 0 && !isEvenlySpaced(value) ? "custom" : "simple"
    );
    const [count, setCount] = useState(() => Math.max(value.length, 2));
    const [startTime, setStartTime] = useState(() => value[0] ?? "07:00");

    // Recalculate preview times for simple mode
    const simpleTimes = generateEvenTimes(startTime, count);

    // Sync simple mode → onChange whenever count or startTime changes
    useEffect(() => {
        if (mode === "simple") {
            onChange(simpleTimes);
        }
    }, [mode, startTime, count]);

    function handleCustomTimeChange(index: number, newTime: string) {
        const updated = [...value];
        updated[index] = newTime;
        // Deduplicate and sort
        const deduped = [...new Set(updated)].sort();
        onChange(deduped);
    }

    function addCustomTime() {
        if (value.length >= 24) return;
        // Just find the middle of the largest gap (original algorithm, no midnight avoidance)
        const candidate = findLargestGapMidpoint(value);
        const deduped = [...new Set([...value, candidate])].sort();
        onChange(deduped);
    }

    function redistributeEvenly() {
        const newTimes = generateEvenTimes(value[0] ?? "07:00", value.length);
        onChange(newTimes);
    }

    function removeTime(index: number) {
        onChange(value.filter((_, i) => i !== index));
    }

    if (mode === "simple") {
        return (
            <Field label="Times per day">
                <div className="space-y-3">
                    {/* Count selector */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setCount(n)}
                                className={`h-10 w-10 rounded-full text-sm font-medium transition ${count === n
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    {/* Start time */}
                    <Field label="Starting from">
                        <TimePicker value={startTime} onChange={setStartTime} />
                    </Field>

                    {/* Preview */}
                    {simpleTimes.length > 0 &&
                        TimesDisplay({ times: value })
                    }

                    {/* Switch to custom */}
                    <button
                        type="button"
                        onClick={() => {
                            onChange(simpleTimes); // commit current simple times
                            setMode("custom");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                        Set custom times instead
                    </button>
                </div>
            </Field>
        );
    }

    // Custom mode
    return (
        <Field label="Times">
            <div className="space-y-2">
                {value.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <TimePicker
                            value={time}
                            onChange={(t) => handleCustomTimeChange(index, t)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTime(index)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full text-xs"
                    onClick={addCustomTime}
                    disabled={value.length >= 24}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    {value.length >= 24 ? "Maximum times reached" : "Add time"}
                </Button>

                {value.length > 1 && (
                    <button
                        type="button"
                        onClick={redistributeEvenly}
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline w-full text-center"
                    >
                        Redistribute evenly
                    </button>
                )}

                {/* Switch back to simple */}
                <button
                    type="button"
                    onClick={() => {
                        setCount(Math.max(value.length, 2));
                        setStartTime(value[0] ?? "07:00");
                        setMode("simple");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                    Use evenly spaced times instead
                </button>
            </div>
        </Field>
    );
}

// Helper: generate N evenly spaced times starting from startTime within 24hrs
function generateEvenTimes(startTime: string, count: number): string[] {
    if (count === 0) return [];
    const [h, m] = startTime.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const intervalMinutes = Math.floor((24 * 60) / count);

    return Array.from({ length: count }, (_, i) => {
        const total = (startMinutes + i * intervalMinutes) % (24 * 60);
        const hh = Math.floor(total / 60);
        const mm = total % 60;
        return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    });
}

// Helper: check if times array is evenly spaced (within 1 min tolerance)
function isEvenlySpaced(times: string[]): boolean {
    if (times.length <= 1) return true;
    const minutes = times.map((t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    });
    const intervals = minutes.slice(1).map((m, i) => m - minutes[i]);
    const first = intervals[0];
    return intervals.every((iv) => Math.abs(iv - first) <= 1);
}

function findLargestGapMidpoint(existing: string[]): string {
    if (existing.length === 0) return "12:00";

    const minutes = [...existing]
        .map((t) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        })
        .sort((a, b) => a - b);

    let maxGap = 0;
    let gapStart = 0;

    // Check gaps between consecutive times
    for (let i = 0; i < minutes.length - 1; i++) {
        const gap = minutes[i + 1] - minutes[i];
        if (gap > maxGap) {
            maxGap = gap;
            gapStart = minutes[i];
        }
    }

    // Check wrap-around gap (last → first, going through midnight)
    const wrapGap = (minutes[0] + 24 * 60) - minutes[minutes.length - 1];
    if (wrapGap > maxGap) {
        maxGap = wrapGap;
        gapStart = minutes[minutes.length - 1];
    }

    const rawMinutes = (gapStart + Math.floor(maxGap / 2)) % (24 * 60);
    const rounded = Math.round(rawMinutes / 5) * 5 % (24 * 60);
    const hh = Math.floor(rounded / 60);
    const mm = rounded % 60;
    const candidate = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

    if (existing.includes(candidate)) {
        const rawHh = Math.floor(rawMinutes / 60);
        const rawMm = rawMinutes % 60;
        return `${String(rawHh).padStart(2, "0")}:${String(rawMm).padStart(2, "0")}`;
    }

    return candidate;
}

function TimesDisplay({ times }: { times: string[] }) {
    if (times.length === 0) return null;

    // 12+ times: just show the pattern, not individual times
    if (times.length >= 12) {
        const intervals = times.slice(1).map((t, i) => {
            const [h1, m1] = times[i].split(":").map(Number);
            const [h2, m2] = t.split(":").map(Number);
            return (h2 * 60 + m2) - (h1 * 60 + m1);
        });
        const allEqual = intervals.every((iv) => iv === intervals[0]);
        const intervalHrs = intervals[0] / 60;

        return (
            <div>
                <p className="text-xs text-muted-foreground mb-0.5">Reminders at</p>
                <p className="text-sm font-medium">
                    {allEqual
                        ? `Every ${intervalHrs % 1 === 0 ? intervalHrs : intervalHrs.toFixed(1)} hours · ${times.length}× daily`
                        : `${times.length} times daily · ${times[0]} – ${times[times.length - 1]}`
                    }
                </p>
            </div>
        );
    }

    // 6-11 times: compact 3-column grid
    if (times.length >= 6) {
        return (
            <div>
                <p className="text-xs text-muted-foreground mb-2">Reminders at</p>
                <div className="grid grid-cols-3 gap-1">
                    {times.map((t) => (
                        <span key={t} className="text-xs font-medium text-center bg-secondary rounded-lg py-1">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    // Under 6: pills (current behaviour)
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-1">Reminders at</p>
            <div className="flex flex-wrap gap-1.5">
                {times.map((t) => (
                    <span key={t} className="text-xs font-medium bg-secondary rounded-full px-2.5 py-1">
                        {t}
                    </span>
                ))}
            </div>
        </div>
    );
}