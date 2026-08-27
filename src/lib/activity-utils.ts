import { ActivityType } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";
import { ActivityIcon, Bird, Bug, Dumbbell, Ear, Eye, Fish, Footprints, Leaf, type LucideIcon, Pill, Ruler, Scale, Scissors, Sparkles, Sun, Utensils, Waves, Zap } from "lucide-react";

export const EXERCISE_TYPES = new Set<string>([
    "walk", "run", "play", "training", "free_roam", "swim",
]);

export const CARE_TYPES = new Set<string>([
    "feeding", "grooming", "nail_trim", "bath", "ear_cleaning", "teeth_brushing",
    "wing_clip", "beak_trim", "tank_cleaning", "water_change",
]);

export const MEDICAL_TYPES = new Set<string>([
    "medication", "supplements", "flea_tick",
]);

export const MEASUREMENT_TYPES = new Set<string>([
    "weight", "length",
]);

export const OBSERVATION_TYPES = new Set<string>([
    "shedding", "feeding_observation", "uv_check",
]);

export const TIMED_TYPES = new Set<string>([
    "walk", "run", "play", "training", "free_roam", "swim",
]);

export const DATE_ONLY_TYPES = new Set<string>([
    "feeding", "grooming", "nail_trim", "bath", "ear_cleaning", "teeth_brushing",
    "wing_clip", "beak_trim", "tank_cleaning", "water_change",
    "medication", "supplements", "flea_tick",
    "weight", "length",
    "shedding", "feeding_observation", "uv_check",
]);

export type ActivityCategory = "exercise" | "care" | "medical" | "measurements" | "observations";

export interface SpeciesActivityConfig {
    exercise: ActivityType[];
    care: ActivityType[];
    medical: ActivityType[];
    measurements: ActivityType[];
    observations: ActivityType[];
}

export const SPECIES_ACTIVITIES: Record<string, SpeciesActivityConfig> = {
    dog: {
        exercise: ["walk", "run", "play", "training", "swim"],
        care: ["feeding", "grooming", "nail_trim", "bath", "ear_cleaning", "teeth_brushing"],
        medical: ["medication", "supplements", "flea_tick"],
        measurements: ["weight"],
        observations: [],
    },
    cat: {
        exercise: ["play", "training"],
        care: ["feeding", "grooming", "nail_trim", "bath", "ear_cleaning", "teeth_brushing"],
        medical: ["medication", "supplements", "flea_tick"],
        measurements: ["weight"],
        observations: [],
    },
    bird: {
        exercise: ["free_roam", "play"],
        care: ["feeding", "grooming", "wing_clip", "beak_trim"],
        medical: ["medication", "supplements"],
        measurements: ["weight"],
        observations: [],
    },
    fish: {
        exercise: [],
        care: ["feeding", "tank_cleaning", "water_change"],
        medical: ["medication", "supplements"],
        measurements: ["weight", "length"],
        observations: ["feeding_observation", "uv_check"],
    },
    reptile: {
        exercise: [],
        care: ["feeding", "grooming"],
        medical: ["medication", "supplements"],
        measurements: ["weight", "length"],
        observations: ["shedding", "feeding_observation", "uv_check"],
    },
    hamster: {
        exercise: ["free_roam", "play"],
        care: ["feeding", "grooming", "nail_trim"],
        medical: ["medication", "supplements"],
        measurements: ["weight"],
        observations: [],
    },
    rabbit: {
        exercise: ["free_roam", "play"],
        care: ["feeding", "grooming", "nail_trim", "bath", "ear_cleaning"],
        medical: ["medication", "supplements", "flea_tick"],
        measurements: ["weight"],
        observations: [],
    },
    other: {
        exercise: ["walk", "play", "training", "free_roam", "swim"],
        care: ["feeding", "grooming", "nail_trim", "bath", "ear_cleaning", "teeth_brushing"],
        medical: ["medication", "supplements", "flea_tick"],
        measurements: ["weight", "length"],
        observations: ["shedding", "feeding_observation"],
    },
};

export function getMergedSpeciesConfig(species: string[]): SpeciesActivityConfig {
    const merged: SpeciesActivityConfig = {
        exercise: [],
        care: [],
        medical: [],
        measurements: [],
        observations: [],
    };

    const seen = {
        exercise: new Set<string>(),
        care: new Set<string>(),
        medical: new Set<string>(),
        measurements: new Set<string>(),
        observations: new Set<string>(),
    };

    for (const s of species) {
        const config = SPECIES_ACTIVITIES[s] ?? SPECIES_ACTIVITIES.other;
        for (const cat of ["exercise", "care", "medical", "measurements", "observations"] as ActivityCategory[]) {
            for (const type of config[cat]) {
                if (!seen[cat].has(type)) {
                    seen[cat].add(type);
                    (merged[cat] as ActivityType[]).push(type);
                }
            }
        }
    }

    return merged;
}

export function getSpeciesAllowedTypes(species: string): ActivityType[] {
    const config = SPECIES_ACTIVITIES[species] ?? SPECIES_ACTIVITIES.other;
    return [
        ...config.exercise,
        ...config.care,
        ...config.medical,
        ...config.measurements,
        ...config.observations,
    ];
}

// Shared species-aware grouping, keyed off actual Pet records rather than a
// species string — used by both ActivityFormDialog and ScheduleDialog so the
// two forms always agree on what's relevant for the pet(s) currently selected.
// With no pets selected yet, this merges across every pet the user owns so
// the form isn't empty before a pet is picked.
export function getGroupedTypesForPets(
    pets: Pet[],
    selectedPetIds: string[],
): SpeciesActivityConfig {
    const species =
        selectedPetIds.length > 0
            ? selectedPetIds.map(
                (id) => pets.find((pet) => pet.id === id)?.species ?? "other",
            )
            : pets.map((pet) => pet.species);

    return getMergedSpeciesConfig(species);
}

export const ACTIVITY_LABELS: Record<string, string> = {
    walk: "Walk",
    run: "Run",
    play: "Play",
    training: "Training",
    free_roam: "Free roam",
    swim: "Swim",
    feeding: "Feeding",
    grooming: "Grooming",
    nail_trim: "Nail trim",
    bath: "Bath",
    ear_cleaning: "Ear cleaning",
    teeth_brushing: "Teeth brushing",
    wing_clip: "Wing clip",
    beak_trim: "Beak trim",
    tank_cleaning: "Tank cleaning",
    water_change: "Water change",
    medication: "Medication",
    supplements: "Supplements",
    flea_tick: "Flea & tick",
    weight: "Weight check",
    length: "Length check",
    shedding: "Shedding",
    feeding_observation: "Feeding observation",
    uv_check: "UV lamp check",
};

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
    walk: Footprints,
    run: Zap,
    play: ActivityIcon,
    training: Dumbbell,
    free_roam: Bird,
    swim: Waves,
    feeding: Utensils,
    grooming: Scissors,
    nail_trim: Scissors,
    bath: Waves,
    ear_cleaning: Ear,
    teeth_brushing: Sparkles,
    wing_clip: Bird,
    beak_trim: Bird,
    tank_cleaning: Fish,
    water_change: Fish,
    medication: Pill,
    supplements: Leaf,
    flea_tick: Bug,
    weight: Scale,
    length: Ruler,
    shedding: Eye,
    feeding_observation: Eye,
    uv_check: Sun,
};

export function getTypeFilters(species: string): [string, string][] {
    const allowed = getSpeciesAllowedTypes(species);
    return [
        ["all", "All"],
        ...allowed.map((type) => [type, ACTIVITY_LABELS[type]] as [string, string]),
    ];
}

export const CATEGORY_FILTERS: [string, string][] = [
    ["all", "All"],
    ["exercise", "Exercise"],
    ["care", "Care"],
    ["medical", "Health"],
    ["measurements", "Growth"],
    ["observations", "Notes"],
];

export const ACTIVITY_CATEGORY_TYPES: Record<string, Set<string>> = {
    exercise: EXERCISE_TYPES,
    care: CARE_TYPES,
    medical: MEDICAL_TYPES,
    measurements: MEASUREMENT_TYPES,
    observations: OBSERVATION_TYPES,
};

export const ACTIVITY_TIME_FILTERS = [
    ["all", "All time"],
    ["today", "Today"],
    ["week", "This week"],
    ["month", "This month"],
];

export function getActivityCards(species: string[]) {
    const config = getMergedSpeciesConfig(species);

    const priority: ActivityType[] = [
        "feeding",
        "walk",
        "play",
        "run",
        "training",
        "free_roam",
        "swim",

        "grooming",
        "nail_trim",
        "bath",
        "ear_cleaning",
        "teeth_brushing",
        "wing_clip",
        "beak_trim",
        "tank_cleaning",
        "water_change",

        "medication",
        "supplements",
        "flea_tick",

        "weight",
        "length",

        "shedding",
        "feeding_observation",
        "uv_check",
    ];

    const available = new Set<ActivityType>([
        ...config.exercise,
        ...config.care,
        ...config.medical,
        ...config.measurements,
        ...config.observations,
    ]);

    return priority
        .filter((type) => available.has(type))
        .slice(0, 6)
        .map((type) => ({
            type,
            title: ACTIVITY_LABELS[type] ?? type,
            icon: ACTIVITY_ICONS[type] ?? ActivityIcon,
        }));
}

const getDateKeyFromDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
].join("-");

export const getDateFromOffset = (offset: number) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    return getDateKeyFromDate(date);
};

export function formatMinutes(min: number): string {
    if (min === 0) return "0";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const getDateKey = (date: string) => {
    const d = new Date(date);

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
};

export const getStartOfWeek = () => {
    const date = new Date();
    const day = date.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + diff);

    return date;
};

export const formatGroupDate = (dateKey: string) => {
    const [year, month, day] = dateKey
        .split("-")
        .map(Number);

    const date = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
        return "Today";
    }

    if (date.getTime() === yesterday.getTime()) {
        return "Yesterday";
    }

    return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
};