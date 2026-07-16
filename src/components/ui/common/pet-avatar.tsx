import { speciesEmoji } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PetAvatar({
    pet,
    className = "h-14 w-14 text-3xl"
}: {
    pet: { species: string; photo_url?: string | null };
    className?: string;
}) {
    if (pet.photo_url) {
        return (
            <img
                src={pet.photo_url}
                alt=""
                className={cn("rounded-full object-cover bg-secondary/60 min-w-14", className)}
            />
        );
    }
    return (
        <div className={cn("rounded-full bg-secondary/60 flex items-center justify-center", className)}>
            {speciesEmoji(pet.species)}
        </div>
    );
}