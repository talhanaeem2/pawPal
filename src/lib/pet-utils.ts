import { Dog, Cat, Rabbit, Bird, Fish, Bug, Ham, PawPrint } from "lucide-react";

export const PET_SPECIES = [
    "dog",
    "cat",
    "rabbit",
    "bird",
    "fish",
    "reptile",
    "hamster",
    "other",
];

export const PET_SPECIES_ICONS = {
    dog: Dog,
    cat: Cat,
    rabbit: Rabbit,
    bird: Bird,
    fish: Fish,
    reptile: Bug,
    hamster: Ham,
} satisfies Record<(typeof PET_SPECIES)[number], React.ElementType>;

export function getSpeciesIcon(species: string) {
    return PET_SPECIES_ICONS[
        species as keyof typeof PET_SPECIES_ICONS
    ] ?? PawPrint;
}

export const speciesEmoji = (s: string) => {
    const map: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", fish: "🐠", reptile: "🦎", hamster: "🐹" };
    return map[s.toLowerCase()] ?? "🐾";
};

export function getPetAgeLabel(birthdate: string | null) {
    if (!birthdate) return null;

    const birth = new Date(birthdate);
    const now = new Date();

    let months =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth());

    if (now.getDate() < birth.getDate()) {
        months--;
    }

    if (months < 0) months = 0;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
        return `${remainingMonths}mo`;
    }

    if (remainingMonths === 0) {
        return `${years}y`;
    }

    return `${years}y ${remainingMonths}mo`;
};

export function getPetGenderLabel(gender: string | null, neutered: boolean) {
    return gender && gender !== "unknown"
        ? neutered
            ? gender === "male"
                ? "Neutered"
                : "Spayed"
            : gender === "male"
                ? "Male"
                : "Female"
        : null;
}

export function formatPetNames(names: string[]) {
    const validNames = names.filter(Boolean);

    if (validNames.length <= 3) {
        return validNames.join(", ");
    }

    return `${validNames.slice(0, 3).join(", ")} +${validNames.length - 3}`;
}

export function ageToBirthdate(
    years?: string,
    months?: string
): string | null {
    const y = Number(years || 0);
    const m = Number(months || 0);

    if (y === 0 && m === 0) return null;

    const date = new Date();

    date.setFullYear(date.getFullYear() - y);
    date.setMonth(date.getMonth() - m);

    return date.toISOString().split("T")[0];
}

export function birthdateToAge(birthdate: string | null) {
    if (!birthdate) {
        return {
            years: "",
            months: "",
        };
    }

    const birth = new Date(birthdate);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (today.getDate() < birth.getDate()) {
        months--;
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return {
        years: String(Math.max(years, 0)),
        months: String(Math.max(months, 0)),
    };
}
