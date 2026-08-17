
import { speciesEmoji } from "@/lib/pet-utils";
import { cn } from "@/lib/utils";

export function PetAvatar({
    pet,
    className = "h-14 w-14 text-3xl",
    avatarRef
}: {
    pet: { species: string; photo_url?: string | null; name: string; };
    className?: string;
    avatarRef?: React.RefObject<HTMLDivElement | null>;
}) {
    if (pet.photo_url) {
        return (
            <div
                ref={avatarRef}
                className={cn("rounded-full bg-secondary/60 overflow-hidden shrink-0", className)}
            >
                <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="block h-full w-full object-cover"
                />
            </div>
        );
    }
    return (
        <div className={cn("rounded-full bg-secondary/60 flex items-center justify-center", className)}>
            {speciesEmoji(pet.species)}
        </div>
    );
}