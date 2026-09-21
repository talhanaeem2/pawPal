
import { speciesEmoji } from "@/lib/pet-utils";
import { cn } from "@/lib/utils";

export function PetAvatar({
    pet,
    className = "h-14 w-14 text-3xl",
    emojiRef,
    emojiSize,
}: {
    pet: {
        species: string;
        photo_url?: string | null;
        name: string;
        pet_type?: "individual" | "group";
        group_size?: number | null;
    };
    className?: string;
    emojiSize?: string;
    emojiRef?: React.RefObject<HTMLSpanElement | null>;
}) {
    const groupBadge = pet.pet_type === "group" && pet.group_size ? (
        <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
            data-pet-avatar-badge
        >
            {pet.group_size}
        </span>
    ) : null;

    if (pet.photo_url) {
        return (
            <div className={cn("relative shrink-0", className)}>
                <div className="h-full w-full rounded-full bg-secondary/60 overflow-hidden">
                    <img
                        src={pet.photo_url}
                        alt={pet.name}
                        className="block h-full w-full object-cover"
                    />
                </div>
                {groupBadge}
            </div>
        );
    }
    return (
        <div className={cn("relative shrink-0", className)}>
            <div className="h-full w-full rounded-full bg-secondary/60 flex items-center justify-center">
                <span
                    ref={emojiRef}
                    className={cn("leading-none select-none", emojiSize)}
                >
                    {speciesEmoji(pet.species)}
                </span>
            </div>
            {groupBadge}
        </div>
    );
}