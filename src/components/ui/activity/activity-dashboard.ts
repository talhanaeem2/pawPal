import {
  Activity as ActivityIcon,
  Clock3,
  Footprints,
  Ruler,
  Scale,
  Scissors,
  type LucideIcon,
} from "lucide-react";

import {
  ACTIVITY_CATEGORY_TYPES,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  EXERCISE_TYPES,
  MEASUREMENT_TYPES,
  formatMinutes,
  getDateFromOffset,
  getDateKey,
  getMergedSpeciesConfig,
  getStartOfWeek,
  type SpeciesActivityConfig,
} from "@/lib/activity-utils";
import { ActivityLog, ActivityType } from "@/schemas/activity";
import { getPetDisplayName, Pet } from "@/schemas/pets";

export type ActivityTab = "exercise" | "care" | "health" | "history";

export type MetricCard = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type ActivityInsight = {
  title: string;
  text: string;
};

type ActivityBreakdown = {
  type: ActivityType;
  label: string;
  count: number;
};

type CareBreakdown = ActivityBreakdown & {
  total: number;
};

type DashboardInput = {
  logs: ActivityLog[];
  pets: Pet[];
  selectedPetId: string;
  historyType: string;
  historyDate: string;
};

type DashboardExercise = {
  logs: ActivityLog[];
  minutes: number;
  previousWeekMinutes: number;
  change: number | null;
  activeDays: number;
  streak: number;
  breakdown: ActivityBreakdown[];
  maxBreakdownCount: number;
  insight: ActivityInsight | null;
  cards: MetricCard[];
};

type DashboardCare = {
  logs: ActivityLog[];
  groupedLogs: [string, ActivityLog[]][];
  breakdown: CareBreakdown[];
  maxBreakdownCount: number;
  cards: MetricCard[];
};

type DashboardHealth = {
  logs: ActivityLog[];
  types: ActivityType[];
  groupedLogs: [string, ActivityLog[]][];
  latestWeight: ActivityLog | undefined;
  selectedPetWeightLogs: ActivityLog[];
  weightChange: number | null;
  totalWeightChange: number | null;
  weightHistoryCount: number;
  cards: MetricCard[];
};

export type ActivityDashboard = {
  selectedSpecies: string[];
  mergedConfig: SpeciesActivityConfig;
  hasExercise: boolean;
  filteredLogs: ActivityLog[];
  historyLogs: ActivityLog[];
  groupedHistoryLogs: [string, ActivityLog[]][];
  petNames: Map<string, string>;
  exercise: DashboardExercise;
  care: DashboardCare;
  health: DashboardHealth;
};

const exerciseBreakdownLabels: Record<string, string> = {
  walk: "Walks",
  run: "Runs",
  play: "Play",
  training: "Training",
  free_roam: "Free roam",
  swim: "Swim",
};

function groupLogsByType(logs: ActivityLog[]) {
  const logsByType = new Map<string, ActivityLog[]>();

  for (const log of logs) {
    const existing = logsByType.get(log.activity_type);

    if (existing) {
      existing.push(log);
    } else {
      logsByType.set(log.activity_type, [log]);
    }
  }

  return Array.from(logsByType.entries());
}

function groupLogsByDate(logs: ActivityLog[]) {
  const logsByDate = new Map<string, ActivityLog[]>();

  for (const log of logs) {
    const dateKey = getDateKey(log.occurred_at);
    const existing = logsByDate.get(dateKey);

    if (existing) {
      existing.push(log);
    } else {
      logsByDate.set(dateKey, [log]);
    }
  }

  return Array.from(logsByDate.entries());
}

function dedupeBySessionId(logs: ActivityLog[]): ActivityLog[] {
  const seenSessions = new Set<string>();
  const seenTimestamps = new Set<string>();
  const result: ActivityLog[] = [];

  for (const log of logs) {
    const minuteKey = log.activity_type + "|" + log.occurred_at.slice(0, 16);

    if (log.session_id) {
      if (seenSessions.has(log.session_id)) {
        continue;
      }

      if (seenTimestamps.has(minuteKey)) {
        continue;
      }

      seenSessions.add(log.session_id);
      seenTimestamps.add(minuteKey);
      result.push(log);
      continue;
    }

    if (seenTimestamps.has(minuteKey)) {
      continue;
    }

    seenTimestamps.add(minuteKey);
    result.push(log);
  }

  return result;
}

function getActivityInsight({
  activityCounts,
  activeDays,
  change,
  exerciseMinutes,
  previousWeekMinutes,
  hasExercise,
  selectedPetId,
}: {
  activityCounts: Record<string, number>;
  activeDays: number;
  change: number | null;
  exerciseMinutes: number;
  previousWeekMinutes: number;
  hasExercise: boolean;
  selectedPetId: string;
}): ActivityInsight | null {
  if (!hasExercise) {
    return null;
  }

  const pluralize = (count: number, label: string) =>
    String(count) + " " + label + (count === 1 ? "" : "s");

  const activityParts = [
    activityCounts.walk ? pluralize(activityCounts.walk, "walk") : null,
    activityCounts.run ? pluralize(activityCounts.run, "run") : null,
    activityCounts.play ? pluralize(activityCounts.play, "play session") : null,
    activityCounts.training ? pluralize(activityCounts.training, "training session") : null,
    activityCounts.free_roam ? pluralize(activityCounts.free_roam, "free roam session") : null,
    activityCounts.swim ? pluralize(activityCounts.swim, "swim session") : null,
  ].filter((part): part is string => part !== null);

  if (change !== null) {
    const diffMinutes = Math.abs(exerciseMinutes - previousWeekMinutes);
    const diffLabel = formatMinutes(diffMinutes);

    if (change > 0) {
      return {
        title: "Good week so far",
        text:
          selectedPetId === "all"
            ? "You've logged " +
            activityParts.join(", ") +
            " this week — " +
            formatMinutes(exerciseMinutes) +
            " total, " +
            diffLabel +
            " more than last week."
            : formatMinutes(exerciseMinutes) +
            " of exercise this week, " +
            diffLabel +
            " more than last week's " +
            formatMinutes(previousWeekMinutes) +
            ".",
      };
    }

    if (change < 0) {
      return {
        title: "A quieter week",
        text:
          formatMinutes(exerciseMinutes) +
          " logged so far this week, " +
          diffLabel +
          " less than last week. Still time to catch up!",
      };
    }
  }

  return {
    title: "Exercise this week",
    text:
      activityParts.join(", ") +
      " across " +
      activeDays +
      " " +
      (activeDays === 1 ? "day" : "days") +
      ", totaling " +
      formatMinutes(exerciseMinutes) +
      ".",
  };
}

export function getActivityDashboard({
  logs,
  pets,
  selectedPetId,
  historyType,
  historyDate,
}: DashboardInput): ActivityDashboard {
  const selectedPet = pets.find((pet) => pet.id === selectedPetId);
  const selectedSpecies =
    selectedPetId === "all"
      ? [...new Set(pets.map((pet) => pet.species))]
      : [selectedPet?.species ?? "other"];
  const mergedConfig = getMergedSpeciesConfig(selectedSpecies);
  const healthTypes = [...mergedConfig.measurements, ...mergedConfig.medical, ...mergedConfig.observations];
  const petNames = new Map(pets.map((pet) => [pet.id, getPetDisplayName(pet)]));
  const filteredLogs = logs
    .filter((log) => selectedPetId === "all" || log.pet_id === selectedPetId)
    .sort(
      (left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
    );

  const now = new Date();
  const weekStart = getStartOfWeek();
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const thisWeekLogs: ActivityLog[] = [];
  const previousWeekLogs: ActivityLog[] = [];
  const activityDates = new Set<string>();

  for (const log of filteredLogs) {
    const occurredAt = new Date(log.occurred_at);
    const occurredAtTime = occurredAt.getTime();

    if (occurredAtTime >= weekStart.getTime()) {
      thisWeekLogs.push(log);
    } else if (
      occurredAtTime >= previousWeekStart.getTime() &&
      occurredAtTime < weekStart.getTime()
    ) {
      previousWeekLogs.push(log);
    }

    if (EXERCISE_TYPES.has(log.activity_type)) {
      activityDates.add(getDateKey(log.occurred_at));
    }
  }

  const activityCounts: Record<string, number> = {};
  const exerciseLogs: ActivityLog[] = [];
  const thisWeekCareCounts: Record<string, number> = {};

  const dedupedThisWeekLogs = dedupeBySessionId(thisWeekLogs);
  const dedupedPreviousWeekLogs = dedupeBySessionId(previousWeekLogs);

  for (const log of dedupedThisWeekLogs) {
    if (EXERCISE_TYPES.has(log.activity_type)) {
      exerciseLogs.push(log);
      activityCounts[log.activity_type] = (activityCounts[log.activity_type] ?? 0) + 1;
    }

    if (mergedConfig.care.includes(log.activity_type as ActivityType)) {
      thisWeekCareCounts[log.activity_type] = (thisWeekCareCounts[log.activity_type] ?? 0) + 1;
    }
  }

  const previousWeekExerciseLogs = dedupedPreviousWeekLogs.filter((log) =>
    EXERCISE_TYPES.has(log.activity_type),
  );
  const exerciseMinutes = exerciseLogs.reduce(
    (total, log) => total + Number(log.duration_min ?? 0),
    0,
  );
  const previousWeekMinutes = previousWeekExerciseLogs.reduce(
    (total, log) => total + Number(log.duration_min ?? 0),
    0,
  );
  const activeDays = new Set(exerciseLogs.map((log) => getDateKey(log.occurred_at))).size;
  const exerciseChange =
    previousWeekMinutes > 0
      ? ((exerciseMinutes - previousWeekMinutes) / previousWeekMinutes) * 100
      : null;

  let streak = 0;
  const todayKey = getDateKey(now.toISOString());
  const startOffset = activityDates.has(todayKey) ? 0 : 1;

  for (let offset = startOffset; offset < 365; offset += 1) {
    if (activityDates.has(getDateFromOffset(offset))) {
      streak += 1;
    } else {
      break;
    }
  }

  const breakdown = Object.entries(exerciseBreakdownLabels)
    .filter(([type]) => mergedConfig.exercise.includes(type as ActivityType))
    .map(([type, label]) => ({
      type: type as ActivityType,
      label,
      count: activityCounts[type] ?? 0,
    }));
  const maxBreakdownCount = Math.max(...breakdown.map((item) => item.count), 1);

  const careLogs = filteredLogs.filter((log) =>
    mergedConfig.care.includes(log.activity_type as ActivityType),
  );
  const careTotals: Record<string, number> = {};

  for (const log of dedupeBySessionId(careLogs)) {
    careTotals[log.activity_type] = (careTotals[log.activity_type] ?? 0) + 1;
  }

  const careBreakdown = mergedConfig.care
    .map((type) => ({
      type,
      label: ACTIVITY_LABELS[type] ?? type,
      count: thisWeekCareCounts[type] ?? 0,
      total: careTotals[type] ?? 0,
    }))
    .filter((item) => item.total > 0);
  const maxCareBreakdownCount = Math.max(...careBreakdown.map((item) => item.count), 1);
  const careMetrics = Object.entries(thisWeekCareCounts)
    .sort(([, left], [, right]) => right - left)
    .map(([type, count]) => ({
      value: String(count),
      label: (ACTIVITY_LABELS[type] ?? type) + " this week",
      icon: ACTIVITY_ICONS[type] ?? Scissors,
    }));
  const careFallback =
    careLogs.length > 0
      ? [
        {
          value: String(dedupeBySessionId(careLogs).length),
          label: "Care sessions",
          icon: Scissors,
        },
      ]
      : [];

  const healthLogs = filteredLogs.filter((log) =>
    healthTypes.includes(log.activity_type as ActivityType),
  );
  const measurementLogs = filteredLogs.filter(
    (log) =>
      MEASUREMENT_TYPES.has(log.activity_type) && (log.weight !== null || log.length !== null),
  );
  const latestMeasurement = measurementLogs[0];
  const weightLogs = filteredLogs.filter(
    (log) => log.activity_type === "weight" && log.weight !== null,
  );
  const selectedPetWeightLogs = selectedPetId === "all" ? [] : weightLogs;
  const latestWeight = selectedPetId === "all" ? weightLogs[0] : selectedPetWeightLogs[0];
  const previousWeight = selectedPetId === "all" ? undefined : selectedPetWeightLogs[1];
  const oldestWeight =
    selectedPetId === "all" ? undefined : selectedPetWeightLogs[selectedPetWeightLogs.length - 1];
  const weightChange =
    latestWeight?.weight !== null &&
      latestWeight?.weight !== undefined &&
      previousWeight?.weight !== null &&
      previousWeight?.weight !== undefined
      ? Number(latestWeight.weight) - Number(previousWeight.weight)
      : null;
  const totalWeightChange =
    latestWeight?.weight !== null &&
      latestWeight?.weight !== undefined &&
      oldestWeight?.weight !== null &&
      oldestWeight?.weight !== undefined &&
      latestWeight.id !== oldestWeight.id
      ? Number(latestWeight.weight) - Number(oldestWeight.weight)
      : null;
  const healthMetrics: MetricCard[] = [];

  if (latestMeasurement?.activity_type === "weight" && latestMeasurement.weight !== null) {
    healthMetrics.push({
      value: Number(latestMeasurement.weight).toFixed(1) + " kg",
      label: selectedPetId !== "all" ? "Current weight" : "Latest weight",
      icon: Scale,
    });
  }

  if (latestMeasurement?.activity_type === "length" && latestMeasurement.length !== null) {
    healthMetrics.push({
      value: Number(latestMeasurement.length).toFixed(1) + " cm",
      label: selectedPetId !== "all" ? "Current length" : "Latest length",
      icon: Ruler,
    });
  }

  if (weightChange !== null) {
    healthMetrics.push({
      value: (weightChange > 0 ? "+" : "") + weightChange.toFixed(1) + " kg",
      label: "Since last measurement",
      icon: Scale,
    });
  }

  if (healthLogs.length > 0) {
    healthMetrics.push({
      value: String(healthLogs.length),
      label: "Health logs",
      icon: ActivityIcon,
    });
  }

  const historyLogs = filteredLogs.filter((log) => {
    if (historyType !== "all") {
      const categoryTypes = ACTIVITY_CATEGORY_TYPES[historyType];

      if (categoryTypes) {
        if (!categoryTypes.has(log.activity_type)) {
          return false;
        }
      } else if (log.activity_type !== historyType) {
        return false;
      }
    }

    if (historyDate === "today") {
      return getDateKey(log.occurred_at) === getDateKey(now.toISOString());
    }

    if (historyDate === "week") {
      return new Date(log.occurred_at) >= weekStart;
    }

    if (historyDate === "month") {
      const logDate = new Date(log.occurred_at);
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  return {
    selectedSpecies,
    mergedConfig,
    hasExercise: mergedConfig.exercise.length > 0,
    filteredLogs,
    historyLogs,
    groupedHistoryLogs: groupLogsByDate(historyLogs),
    petNames,
    exercise: {
      logs: exerciseLogs,
      minutes: exerciseMinutes,
      previousWeekMinutes,
      change: exerciseChange,
      activeDays,
      streak,
      breakdown,
      maxBreakdownCount,
      insight: getActivityInsight({
        activityCounts,
        activeDays,
        change: exerciseChange,
        exerciseMinutes,
        previousWeekMinutes,
        hasExercise: exerciseLogs.length > 0,
        selectedPetId,
      }),
      cards: [
        exerciseMinutes > 0
          ? {
            value: formatMinutes(exerciseMinutes),
            label: "Exercise this week",
            icon: Clock3,
          }
          : null,
        activeDays > 0
          ? {
            value: String(activeDays) + "/7",
            label: "Active days",
            icon: ActivityIcon,
          }
          : null,
        exerciseLogs.length > 0
          ? {
            value: String(exerciseLogs.length),
            label: "Sessions this week",
            icon: Footprints,
          }
          : null,
      ]
        .filter((metric): metric is MetricCard => metric !== null)
        .slice(0, 2),
    },
    care: {
      logs: careLogs,
      groupedLogs: groupLogsByType(careLogs),
      breakdown: careBreakdown,
      maxBreakdownCount: maxCareBreakdownCount,
      cards: [...careMetrics, ...careFallback].slice(0, 2),
    },
    health: {
      logs: healthLogs,
      types: healthTypes,
      groupedLogs: groupLogsByType(healthLogs),
      latestWeight,
      selectedPetWeightLogs,
      weightChange,
      totalWeightChange,
      weightHistoryCount: selectedPetWeightLogs.length,
      cards: healthMetrics.slice(0, 2),
    },
  };
}