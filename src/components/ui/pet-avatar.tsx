import { speciesEmoji } from "@/lib/queries";

export function PetAvatar({
    pet,
    size = "h-14 w-14",
    textSize = "text-3xl",
}: {
    pet: { species: string; photo_url?: string | null };
    size?: string;
    textSize?: string;
}) {
    if (pet.photo_url) {
        return (
            <img
                src={pet.photo_url}
                alt=""
                className={`${size} rounded-2xl object-cover bg-secondary/60`}
            />
        );
    }
    return (
        <div className={`${size} rounded-2xl bg-secondary/60 flex items-center justify-center ${textSize}`}>
            {speciesEmoji(pet.species)}
        </div>
    );
}