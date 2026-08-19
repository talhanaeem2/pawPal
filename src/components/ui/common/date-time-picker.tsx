import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TimePicker } from "./time-picker";

interface DateTimePickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function DateTimePicker({
    value,
    onChange,
    placeholder = "Choose date & time",
}: DateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"date" | "time">("date");

    const current = useMemo(() => (value ? parseISO(value) : undefined), [value]);
    const [selectedDate, setSelectedDate] = useState(current);

    useEffect(() => {
        if (!open) {
            setSelectedDate(current);
        }
    }, [current, open]);

    function handleTimeChange(time: string) {
        if (!selectedDate) return;

        const [hour, minute] = time.split(":").map(Number);
        const next = new Date(selectedDate);

        next.setHours(hour, minute, 0, 0);

        setSelectedDate(next);

        onChange(next.toISOString());

        setOpen(false);
        setStep("date");
    }

    const TriggerIcon = step === "date" ? CalendarIcon : Clock3;

    return (
        <Popover
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) {
                    setStep("date");
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-between font-normal rounded-xl"
                >
                    <span className={!value ? "text-muted-foreground" : ""}>
                        {current
                            ? format(current, "PPP • p")
                            : placeholder}
                    </span>

                    <TriggerIcon className="h-4 w-4 opacity-70" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                className="w-auto p-3"
            >
                {step === "date" ? (
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onDayClick={(date) => {
                            const d = new Date(date);

                            if (selectedDate) {
                                d.setHours(
                                    selectedDate.getHours(),
                                    selectedDate.getMinutes()
                                );
                            }

                            setSelectedDate(d);
                            setStep("time");
                        }}
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock3 className="h-4 w-4" />
                            Select time
                        </div>

                        <TimePicker
                            value={
                                selectedDate
                                    ? format(selectedDate, "HH:mm")
                                    : undefined
                            }
                            onChange={handleTimeChange}
                        />

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setStep("date")}
                            >
                                Back
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}