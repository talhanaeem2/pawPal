import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import Picker from "react-mobile-picker";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface TimePickerProps {
    value?: string; // "HH:mm"
    onChange: (value: string) => void;
    placeholder?: string;
}

export function TimePicker({
    value,
    onChange,
    placeholder = "Choose time",
}: TimePickerProps) {
    const [open, setOpen] = useState(false);

    const current = useMemo(() => {
        if (!value) return null;

        const [h, m] = value.split(":").map(Number);

        return {
            hour24: h,
            minute: m,
        };
    }, [value]);

    const hour12 = current
        ? current.hour24 % 12 === 0
            ? 12
            : current.hour24 % 12
        : 9;

    const isPM = current ? current.hour24 >= 12 : false;

    const [pickerValue, setPickerValue] = useState({
        hour: String(hour12),
        minute: String(current?.minute ?? 0).padStart(2, "0"),
        period: isPM ? "PM" : "AM",
    });

    useEffect(() => {
        if (!open) return;

        setPickerValue({
            hour: String(hour12),
            minute: String(current?.minute ?? 0).padStart(2, "0"),
            period: isPM ? "PM" : "AM",
        });
    }, [open, hour12, current, isPM]);

    function applyTime() {
        let hour24 = Number(pickerValue.hour) % 12;

        if (pickerValue.period === "PM") {
            hour24 += 12;
        }

        const result = `${String(hour24).padStart(2, "0")}:${pickerValue.minute}`;

        onChange(result);

        setOpen(false);
    }

    const displayValue = useMemo(() => {
        if (!value) return placeholder;

        const [h, m] = value.split(":").map(Number);

        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 === 0 ? 12 : h % 12;

        return `${hour}:${String(m).padStart(2, "0")} ${period}`;
    }, [value, placeholder]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-between rounded-xl font-normal"
                >
                    <span className={!value ? "text-muted-foreground" : ""}>
                        {displayValue}
                    </span>

                    <Clock3 className="h-4 w-4 opacity-70" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock3 className="h-4 w-4" />
                        Select time
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-background">
                        <Picker
                            value={pickerValue}
                            onChange={setPickerValue}
                            height={180}
                            itemHeight={40}
                            wheelMode="natural"
                        >
                            <Picker.Column name="hour">
                                {Array.from({ length: 12 }, (_, i) => (
                                    <Picker.Item key={i + 1} value={String(i + 1)}>
                                        {i + 1}
                                    </Picker.Item>
                                ))}
                            </Picker.Column>

                            <Picker.Column name="minute">
                                {[0, 15, 30, 45].map((m) => (
                                    <Picker.Item
                                        key={m}
                                        value={String(m).padStart(2, "0")}
                                    >
                                        {String(m).padStart(2, "0")}
                                    </Picker.Item>
                                ))}
                            </Picker.Column>

                            <Picker.Column name="period">
                                <Picker.Item value="AM">AM</Picker.Item>
                                <Picker.Item value="PM">PM</Picker.Item>
                            </Picker.Column>
                        </Picker>
                    </div>

                    <Button className="w-full" onClick={applyTime}>
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}