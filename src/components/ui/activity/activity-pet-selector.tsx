import { PawPrint } from "lucide-react";

import { PetAvatar } from "@/components/ui/common/pet-avatar";
import { cn } from "@/lib/utils";
import { Pet } from "@/schemas/pets";

type ActivityPetSelectorProps = {
  pets: Pet[];
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
};

export function ActivityPetSelector({
  pets,
  selectedPetId,
  onSelectPet,
}: ActivityPetSelectorProps) {
  if (pets.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 pt-1">
      <button
        type="button"
        onClick={() => onSelectPet("all")}
        className="flex shrink-0 flex-col items-center gap-1.5"
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition",
            selectedPetId === "all"
              ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
              : "bg-secondary/60 text-muted-foreground",
          )}
        >
          <PawPrint className="h-5 w-5" />
        </div>

        <span
          className={cn(
            "text-xs font-medium",
            selectedPetId === "all" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          All pets
        </span>
      </button>

      {pets.map((pet) => {
        const selected = selectedPetId === pet.id;

        return (
          <button
            key={pet.id}
            type="button"
            onClick={() => onSelectPet(pet.id)}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <PetAvatar
              pet={pet}
              className={cn(
                "h-12 w-12 transition",
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              emojiSize="text-2xl"
            />

            <span
              className={cn(
                "max-w-16 truncate text-xs font-medium",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {pet.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
