import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Pet = {
    id: string;
    name: string;
};

type PetMultiSelectProps = {
    pets: Pet[];
    value: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
};

export function PetMultiSelect({
    pets,
    value,
    onChange,
    placeholder = "Select pets",
}: PetMultiSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedPets = useMemo(
        () => pets.filter((p) => value.includes(p.id))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [pets, value],
    );

    const summary = useMemo(() => {
        if (selectedPets.length === 0) {
            return placeholder;
        }

        const names = selectedPets.map((p) => p.name);

        if (names.length <= 3) {
            return names.join(", ");
        }

        return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
    }, [selectedPets, placeholder]);

    function toggle(id: string) {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    }

    function remove(id: string) {
        onChange(value.filter((v) => v !== id));
    }

    function selectAll() {
        onChange(pets.map((p) => p.id));
    }

    function clearAll() {
        onChange([]);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                >
                    <span className="truncate">{summary}</span>

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                    <CommandInput placeholder="Search pets..." />

                    <CommandList>
                        <CommandEmpty>No pets found.</CommandEmpty>

                        {selectedPets.length > 0 && (
                            <div className="border-b p-3">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    {selectedPets.length} selected
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {selectedPets.map((pet) => (
                                        <Badge
                                            key={pet.id}
                                            variant="secondary"
                                            className="gap-1 pr-1 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                remove(pet.id);
                                            }}
                                        >
                                            {pet.name}

                                            <X className="h-3 w-3 opacity-70" />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between border-b p-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAll}
                                disabled={value.length === pets.length}
                            >
                                Select all
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                disabled={value.length === 0}
                            >
                                Clear all
                            </Button>
                        </div>

                        <CommandGroup>
                            {pets.map((pet) => {
                                const selected = value.includes(pet.id);

                                return (
                                    <CommandItem
                                        key={pet.id}
                                        value={pet.name}
                                        onSelect={() => toggle(pet.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selected ? "opacity-100" : "opacity-0",
                                            )}
                                        />

                                        {pet.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}