import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
}: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const date = value ? parseISO(value) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between rounded-xl font-normal"
                >
                    <span className={value ? "" : "text-muted-foreground"}>
                        {value ? format(date!, "PPP") : placeholder}
                    </span>

                    <CalendarIcon className="h-4 w-4 opacity-70" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-auto p-0"
                align="start"
            >
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selected) => {
                        if (!selected) return;
                        onChange(format(selected, "yyyy-MM-dd"));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}