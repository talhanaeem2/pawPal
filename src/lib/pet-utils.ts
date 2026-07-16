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
