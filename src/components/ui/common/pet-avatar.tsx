
import { speciesEmoji } from "@/lib/pet-utils";
import { cn } from "@/lib/utils";

export function PetAvatar({
    pet,
    className = "h-14 w-14 text-3xl",
    emojiRef,
    emojiSize,
}: {
    pet: { species: string; photo_url?: string | null; name: string; };
    className?: string;
    emojiSize?: string;
    emojiRef?: React.RefObject<HTMLSpanElement | null>;
}) {
    if (pet.photo_url) {
        return (
            <div
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
            <span
                ref={emojiRef}
                className={cn("leading-none select-none", emojiSize)}
            >
                {speciesEmoji(pet.species)}
            </span>
        </div>
    );
}