import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Footprints,
  Activity as ActivityIcon,
  Scale,
  Flame,
  Clock3,
  Scissors,
  PawPrint,
  type LucideIcon,
  Ruler,
} from "lucide-react";
import z from "zod";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { petsQuery, activityQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";
import {
  ACTIVITY_CATEGORY_TYPES,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  ACTIVITY_TIME_FILTERS,
  CATEGORY_FILTERS,
  EXERCISE_TYPES,
  formatGroupDate,
  formatMinutes,
  getActivityCards,
  getDateFromOffset,
  getDateKey,
  getMergedSpeciesConfig,
  getStartOfWeek,
  getTypeFilters,
  MEASUREMENT_TYPES,
} from "@/lib/activity-utils";
import { cn, formatDate } from "@/lib/utils";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { PetAvatar } from "@/components/ui/common/pet-avatar";
import { ActivityFormDialog } from "@/components/ui/activity/activity-form-dialog";
import { ActivityRow } from "@/components/ui/activity/activity-row";

import { ActivityLog, ActivityType } from "@/schemas/activity";

type MetricCard = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.ensureQueryData(petsQuery),
      context.queryClient.ensureQueryData(activityQuery),
    ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Activity · Pawpal" }] }),
  component: ActivityPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function ActivityPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: logs } = useSuspenseQuery(activityQuery);

  const qc = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>(() =>
    pets.length === 1 ? pets[0].id : "all"
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"exercise" | "care" | "health" | "history">("exercise");
  const [historyType, setHistoryType] = useState("all");
  const [historyDate, setHistoryDate] = useState("all");

  useEffect(() => {
    if (openCreate) {
      setCreateOpen(true);
      navigate({ search: { new: undefined }, replace: true });
    }
  }, [openCreate]);

  const { headerRef, descriptionRef, handleContentScroll } = useCollapsiblePageHeader();

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: activityQuery.queryKey,
      });

      toast.success("Removed");
    },

    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Failed",
      ),

    onSettled: () => setConfirmId(null),
  });

  const confirmItem = logs.find((l) => l.id === confirmId);

  const filteredLogs = useMemo(() => {
    return [...logs]
      .filter(
        (log) =>
          selectedPetId === "all" ||
          log.pet_id === selectedPetId,
      )
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() -
          new Date(a.occurred_at).getTime(),
      );
  }, [logs, selectedPetId]);

  const historyLogs = useMemo(() => {
    const now = new Date();

    return filteredLogs.filter((log) => {
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

      if (historyDate !== "all") {
        const logDate = new Date(log.occurred_at);
        if (historyDate === "today") {
          if (getDateKey(log.occurred_at) !== getDateKey(now.toISOString())) {
            return false;
          }
        }

        if (historyDate === "week") {
          const weekStart = getStartOfWeek();

          if (logDate < weekStart) {
            return false;
          }
        }

        if (historyDate === "month") {
          if (
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [filteredLogs, historyType, historyDate]);

  useEffect(() => {
    setHistoryType("all");
  }, [selectedPetId]);

  const weekStart = getStartOfWeek();
  const previousWeekStart = new Date(weekStart); previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const thisWeekLogs = filteredLogs.filter((log) => {
    const time = new Date(log.occurred_at).getTime();
    return time >= weekStart.getTime();
  });

  const previousWeekLogs = filteredLogs.filter((log) => {
    const time = new Date(log.occurred_at).getTime();
    return (
      time >= previousWeekStart.getTime() &&
      time < weekStart.getTime()
    );
  });

  const walkCount = thisWeekLogs.filter((log) => log.activity_type === "walk").length;
  const runCount = thisWeekLogs.filter((log) => log.activity_type === "run").length;
  const playCount = thisWeekLogs.filter((log) => log.activity_type === "play").length;
  const trainingCount = thisWeekLogs.filter((l) => l.activity_type === "training").length;
  const freeRoamCount = thisWeekLogs.filter((l) => l.activity_type === "free_roam").length;
  const swimCount = thisWeekLogs.filter((l) => l.activity_type === "swim").length;

  const exerciseLogs = thisWeekLogs.filter((log) => EXERCISE_TYPES.has(log.activity_type));
  const previousWeekExerciseLogs = previousWeekLogs.filter((log) => EXERCISE_TYPES.has(log.activity_type));

  const exerciseMinutes = exerciseLogs.reduce((total, log) => total + Number(log.duration_min ?? 0), 0);
  const previousWeekExerciseMinutes = previousWeekExerciseLogs.reduce((total, log) => total + Number(log.duration_min ?? 0), 0);

  const activeDaysThisWeek = new Set(exerciseLogs.map((log) => getDateKey(log.occurred_at))).size;

  const exerciseChange = previousWeekExerciseMinutes > 0 ? ((exerciseMinutes - previousWeekExerciseMinutes) / previousWeekExerciseMinutes) * 100 : null;

  const groomingCount = thisWeekLogs.filter(
    (log) => log.activity_type === "grooming",
  ).length;

  const weightLogs = filteredLogs.filter((log) => log.activity_type === "weight" && log.weight != null);
  const getPetWeightLogs = (petId: string) => weightLogs.filter((log) => log.pet_id === petId)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const measurementLogs = filteredLogs.filter((log) => MEASUREMENT_TYPES.has(log.activity_type) && (log.weight != null || log.length != null));
  const getPetMeasurementLogs = (petId: string) => measurementLogs.filter((log) => log.pet_id === petId)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const selectedPetMeasurementLogs = selectedPetId !== "all" ? getPetMeasurementLogs(selectedPetId) : [];
  const latestMeasurement = selectedPetId !== "all" ? selectedPetMeasurementLogs[0] : measurementLogs[0];
  const previousMeasurement = selectedPetId !== "all" ? selectedPetMeasurementLogs[1] : undefined;
  const measurementHistoryCount = selectedPetMeasurementLogs.length;
  const measurementType = latestMeasurement?.activity_type;
  const selectedTypeMeasurementLogs = selectedPetId !== "all" && measurementType ? selectedPetMeasurementLogs.filter((log) => log.activity_type === measurementType,) : [];
  const oldestMeasurement = selectedTypeMeasurementLogs[selectedTypeMeasurementLogs.length - 1];

  const getMeasurementUnit = (type: string) => {
    return type === "weight" ? "kg" : "cm";
  };

  const getMeasurementLabel = (type: string) => {
    return type === "weight" ? "Weight" : "Length";
  };

  const getMeasurementValue = (log: ActivityLog) => {
    if (log.activity_type === "weight") {
      return Number(log.weight);
    }

    if (log.activity_type === "length") {
      return Number(log.length);
    }

    return null;
  };

  const latestMeasurementValue = latestMeasurement ? getMeasurementValue(latestMeasurement) : null;
  const previousMeasurementValue = previousMeasurement ? getMeasurementValue(previousMeasurement) : null;
  const oldestMeasurementValue = oldestMeasurement ? getMeasurementValue(oldestMeasurement) : null;
  const measurementChange =
    latestMeasurementValue != null &&
      previousMeasurementValue != null ? latestMeasurementValue - previousMeasurementValue : null;

  const totalMeasurementChange =
    latestMeasurementValue != null &&
      oldestMeasurementValue != null &&
      latestMeasurement.id !== oldestMeasurement.id ? latestMeasurementValue - oldestMeasurementValue : null;

  const selectedPetWeightLogs = selectedPetId !== "all" ? getPetWeightLogs(selectedPetId) : [];
  const latestWeight = selectedPetId !== "all" ? selectedPetWeightLogs[0] : weightLogs[0];
  const previousWeight = selectedPetId !== "all" ? selectedPetWeightLogs[1] : undefined;
  const weightChange = latestWeight?.weight != null && previousWeight?.weight != null ? Number(latestWeight.weight) - Number(previousWeight.weight) : null;
  const oldestWeight = selectedPetId !== "all" ? selectedPetWeightLogs[selectedPetWeightLogs.length - 1] : undefined;
  const weightCheck = latestWeight?.weight != null && oldestWeight?.weight != null && latestWeight.id !== oldestWeight.id;
  const totalWeightChange = weightCheck ? Number(latestWeight.weight) - Number(oldestWeight.weight) : null;
  const weightHistoryCount = selectedPetWeightLogs.length;

  let streak = 0;
  const todayKey = getDateKey(new Date().toISOString());
  const startOffset = activityDates.has(todayKey) ? 0 : 1;

  for (let offset = startOffset; offset < 365; offset++) {
    if (activityDates.has(getDateFromOffset(offset))) {
      streak++;
    } else {
      break;
    }
  }

  const insight = useMemo(() => {
    if (exerciseLogs.length === 0) {
      return null;
    }

    const activityParts = [
      walkCount > 0 ? `${walkCount} walk${walkCount === 1 ? "" : "s"}` : null,
      runCount > 0 ? `${runCount} run${runCount === 1 ? "" : "s"}` : null,
      playCount > 0 ? `${playCount} play session${playCount === 1 ? "" : "s"}` : null,
      trainingCount > 0 ? `${trainingCount} training session${trainingCount === 1 ? "" : "s"}` : null,
      freeRoamCount > 0 ? `${freeRoamCount} free roam session${freeRoamCount === 1 ? "" : "s"}` : null,
      swimCount > 0 ? `${swimCount} swim session${swimCount === 1 ? "" : "s"}` : null,
    ].filter(Boolean);

    if (exerciseChange !== null) {
      if (exerciseChange > 0) {
        return {
          title: "Great progress",
          text: selectedPetId === "all"
            ? `Exercise is up ${exerciseChange.toFixed(0)}
            % from last week. You've logged ${activityParts.join(", ")}
             for ${formatMinutes(exerciseMinutes)} total.`
            : `This week is ${exerciseChange.toFixed(0)}
            % more active than last week, with ${formatMinutes(exerciseMinutes)} of exercise.`,
        };
      }

      if (exerciseChange < 0) {
        return {
          title: "Activity check-in",
          text: `Exercise is ${Math.abs(exerciseChange).toFixed(0)}
          % lower than last week. You've logged ${formatMinutes(exerciseMinutes)} so far this week.`,
        };
      }
    }

    return {
      title: "Exercise this week",
      text: `${activityParts.join(", ")}
       across ${activeDaysThisWeek} ${activeDaysThisWeek === 1 ? "day" : "days"}
       , totaling ${formatMinutes(exerciseMinutes)}.`,
    };
  }, [
    exerciseLogs.length,
    exerciseMinutes,
    exerciseChange,
    activeDaysThisWeek,
    walkCount,
    runCount,
    playCount,
    trainingCount,
    freeRoamCount,
    swimCount,
    selectedPetId,
  ]);

  const selectedSpecies = selectedPetId === "all"
    ? [...new Set(pets.map((p) => p.species))]
    : [pets.find((p) => p.id === selectedPetId)?.species ?? "other"];

  const mergedConfig = getMergedSpeciesConfig(selectedSpecies);
  const hasExercise = mergedConfig.exercise.length > 0;
  const tabCount = hasExercise ? 4 : 3;

  useEffect(() => {
    if (!hasExercise && activeTab === "exercise") {
      setActiveTab("care");
    }
  }, [hasExercise, activeTab]);

  const breakdown = [
    { type: "walk", label: "Walks", count: walkCount },
    { type: "run", label: "Runs", count: runCount },
    { type: "play", label: "Play", count: playCount },
    { type: "training", label: "Training", count: trainingCount },
    { type: "free_roam", label: "Free roam", count: freeRoamCount },
    { type: "swim", label: "Swim", count: swimCount },
  ].filter((item) => mergedConfig.exercise.includes(item.type as ActivityType));

  const maxBreakdownCount = Math.max(...breakdown.map((item) => item.count), 1,);

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, ActivityLog[]>();

    for (const log of historyLogs) {
      const key = getDateKey(log.occurred_at);
      const existing = groups.get(key);

      if (existing) {
        existing.push(log);
      } else {
        groups.set(key, [log]);
      }
    }

    return Array.from(groups.entries());
  }, [historyLogs]);

  const healthTypes = [
    ...mergedConfig.measurements,
    ...mergedConfig.observations,
  ];

  const careLogs = filteredLogs.filter((log) =>
    mergedConfig.care.includes(log.activity_type as ActivityType)
  );

  const healthLogs = filteredLogs.filter((log) =>
    healthTypes.includes(log.activity_type as ActivityType)
  );

  const careCounts = careLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.activity_type] = (acc[log.activity_type] ?? 0) + 1;
    return acc;
  }, {});

  const exerciseMetrics = [
    exerciseMinutes > 0
      ? {
        value: formatMinutes(exerciseMinutes),
        label: "Exercise this week",
        icon: Clock3,
      }
      : null,

    activeDaysThisWeek > 0
      ? {
        value: `${activeDaysThisWeek}/7`,
        label: "Active days",
        icon: ActivityIcon,
      }
      : null,

    exerciseLogs.length > 0
      ? {
        value: `${exerciseLogs.length}`,
        label: "Sessions this week",
        icon: Footprints,
      }
      : null,
  ].filter((metric): metric is MetricCard => metric !== null);

  const careMetrics = Object.entries(careCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      value: String(count),
      label: `${ACTIVITY_LABELS[type] ?? type} this week`,
      icon: ACTIVITY_ICONS[type] ?? Scissors,
    }));

  const careFallback =
    careLogs.length > 0
      ? [
        {
          value: String(careLogs.length),
          label: "Care sessions",
          icon: Scissors,
        },
      ]
      : [];

  const healthMetrics: MetricCard[] = [];

  if (latestMeasurement) {
    if (latestMeasurement.activity_type === "weight" && latestMeasurement.weight != null) {
      healthMetrics.push({
        value: `${Number(latestMeasurement.weight).toFixed(1)} kg`,
        label: selectedPetId !== "all" ? "Current weight" : "Latest weight",
        icon: Scale,
      });
    }

    if (latestMeasurement.activity_type === "length" && latestMeasurement.length != null) {
      healthMetrics.push({
        value: `${Number(latestMeasurement.length).toFixed(1)} cm`,
        label: selectedPetId !== "all" ? "Current length" : "Latest length",
        icon: Ruler,
      });
    }
  }

  if (weightChange !== null) {
    healthMetrics.push({
      value: `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`,
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

  const healthCards = healthMetrics.slice(0, 2);
  const exerciseCards = exerciseMetrics.slice(0, 2);
  const careCards = [...careMetrics, ...careFallback].slice(0, 2);

  function MetricCards({ metrics }: { metrics: MetricCard[] }) {
    if (metrics.length === 0) {
      return null;
    }

    return (
      <section
        className={cn(
          "grid gap-2",
          metrics.length === 1
            ? "grid-cols-1"
            : "grid-cols-2",
        )}
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)"
            >
              <Icon className="h-4 w-4 text-primary" />
              <div className="mt-3 text-xl font-semibold">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.label}
              </p>
            </div>
          );
        })}
      </section>
    );
  }

  const renderActivityEdit = (item: ActivityLog) => (
    <ActivityFormDialog
      pets={pets}
      item={item}
      trigger={
        <Button
          variant="ghost"
          size="icon"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );

  const renderActivityRow = (item: ActivityLog) => (
    <ActivityRow
      key={item.id}
      item={item}
      pets={pets}
      onDelete={setConfirmId}
      renderEdit={renderActivityEdit}
    />
  );

  const activityCards = getActivityCards(selectedSpecies);

  if (pets.length === 0) {
    return (
      <Page>
        <Page.Header
          ref={headerRef}
          className="gap-2 pt-3 pb-2"
        >
          <header className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl">
                Activity
              </h1>

              <div
                ref={descriptionRef}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground">
                  Track your pet's exercise, care & health.
                </p>
              </div>
            </div>

            <ActivityFormDialog
              pets={pets}
              trigger={
                <Button className="rounded-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Log
                </Button>
              }
              open={createOpen}
              onOpenChange={(o) => {
                setCreateOpen(o);
              }}
            />
          </header>
        </Page.Header>

        <Page.Content
          onScroll={handleContentScroll}
          extraScrollRoom={112}
        >
          <FeatureEmptyState
            icon={Footprints}
            title="Track every adventure"
            description="Log exercise, care and health activities to build a complete history of your pet's everyday life."
            cta="Log activity"
            to="/activity"
            search={{ new: true }}
          />
        </Page.Content>
      </Page>
    );
  }

  if (logs.length === 0) {
    return (
      <Page>
        <Page.Header
          ref={headerRef}
          className="gap-2 pt-3 pb-2"
        >
          <header className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl">
                Activity
              </h1>

              <div
                ref={descriptionRef}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground">
                  Track your pet's exercise, care & health.
                </p>
              </div>
            </div>

            <ActivityFormDialog
              pets={pets}
              trigger={
                <Button className="rounded-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Log
                </Button>
              }
              open={createOpen}
              onOpenChange={(o) => {
                setCreateOpen(o);
              }}
            />
          </header>
        </Page.Header>

        <Page.Content
          onScroll={handleContentScroll}
          extraScrollRoom={112}
        >
          <FeatureEmptyState
            icon={Footprints}
            title="Track every adventure"
            description="Log exercise, care and health activities to build a complete history of your pet's everyday life."
            cta="Log activity"
            to="/activity"
            search={{ new: true }}
          />

          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <h2 className="font-display text-lg">
              What you can track
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {activityCards.map((card) => (
                <div key={card.title} className="rounded-2xl bg-secondary/60 p-3 text-center">
                  <card.icon className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-xs font-medium">
                    {card.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header
        ref={headerRef}
        className="gap-2 pt-3 pb-2"
      >
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl">
              Activity
            </h1>

            <div
              ref={descriptionRef}
              className="overflow-hidden"
            >
              <p className="text-sm text-muted-foreground">
                Track your pet's everyday activity, care & health.
              </p>
            </div>
          </div>

          <ActivityFormDialog
            pets={pets}
            trigger={
              <Button className="rounded-full">
                <Plus className="h-4 w-4 mr-1" />
                Log
              </Button>
            }
            open={createOpen}
            onOpenChange={(o) => {
              setCreateOpen(o);
            }}
          />
        </header>
      </Page.Header>

      <Page.Content
        onScroll={handleContentScroll}
        extraScrollRoom={112}
      >
        {pets.length > 1 && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 pt-1">
            <button
              type="button"
              onClick={() => setSelectedPetId("all")}
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
                  selectedPetId === "all"
                    ? "text-foreground"
                    : "text-muted-foreground",
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
                  onClick={() => setSelectedPetId(pet.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <PetAvatar
                    pet={pet}
                    className={cn(
                      "h-12 w-12 transition",
                      selected &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    emojiSize="text-2xl"
                  />

                  <span
                    className={cn(
                      "max-w-16 truncate text-xs font-medium",
                      selected
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {pet.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="rounded-2xl bg-secondary/60 p-1">
          <div className={cn("grid gap-1", tabCount === 4 ? "grid-cols-4" : "grid-cols-3")}>
            {(
              [
                ...(hasExercise
                  ? [["exercise", "Exercise", ActivityIcon] as const]
                  : []),
                ["care", "Care", Scissors],
                ["health", "Health", Scale],
                ["history", "History", Clock3],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  "flex min-w-0 items-center justify-center rounded-xl font-medium transition",
                  tabCount === 4
                    ? "gap-1 p-2 text-xs"
                    : "gap-1.5 p-2 text-sm",
                  activeTab === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    tabCount === 4 ? "h-3.5 w-3.5" : "h-3.5 w-3.5",
                  )}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "exercise" && (
          <div className="space-y-5">
            {exerciseLogs.length === 0 ? (
              <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Footprints className="h-5 w-5 text-primary" />
                </div>

                <h2 className="mt-4 font-display text-lg">
                  No exercise this week
                </h2>

                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Log a walk, run, play session or other exercise to start seeing your
                  pet's weekly progress.
                </p>

                <ActivityFormDialog
                  pets={pets}
                  trigger={
                    <Button className="mt-4 rounded-full">
                      <Plus className="mr-1 h-4 w-4" />
                      Log exercise
                    </Button>
                  }
                />
              </section>
            ) : (
              <>
                <MetricCards metrics={exerciseCards} />
                {exerciseChange !== null && (
                  <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-lg">
                          Weekly progress
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Compared with last week
                        </p>
                      </div>

                      <div
                        className={cn("rounded-full px-3 py-1.5 text-xs font-semibold ",
                          exerciseChange > 0 ? "text-green-700 bg-green-100" : exerciseChange < 0 ?
                            "text-amber-700 bg-amber-100" : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {exerciseChange > 0 ? "+" : ""}
                        {exerciseChange.toFixed(0)}%
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-semibold">
                          {formatMinutes(exerciseMinutes)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This week
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium">
                          {formatMinutes(previousWeekExerciseMinutes)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last week
                        </p>
                      </div>
                    </div>
                  </section>
                )}
                <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg"> This week </h2>
                      <p className="mt-1 text-xs text-muted-foreground"> Your activity breakdown </p>
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                        <Flame className="h-3.5 w-3.5 text-red-500" />
                        {streak} day streak
                      </div>)}
                  </div>
                  <div className="mt-5 space-y-4">
                    {breakdown.map((item) => (
                      <div key={item.type}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm"> {item.label} </span>
                          <span className="text-xs text-muted-foreground"> {item.count} </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(item.count / maxBreakdownCount) * 100}%`, }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                {insight?.text && (
                  <section className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
                    <div className="flex items-center gap-2">
                      <ActivityIcon className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">
                        {insight.title}
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {insight.text}
                    </p>
                  </section>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === "care" && (
          <div className="space-y-5">
            <MetricCards metrics={careCards} />
            {careLogs.length > 0 && (() => {
              const thisWeekCare = thisWeekLogs.filter((l) =>
                mergedConfig.care.includes(l.activity_type as ActivityType)
              );

              const careBreakdown = mergedConfig.care
                .map((type) => ({
                  type,
                  label: ACTIVITY_LABELS[type] ?? type,
                  count: thisWeekCare.filter((l) => l.activity_type === type).length,
                  total: careLogs.filter((l) => l.activity_type === type).length,
                }))
                .filter((item) => item.total > 0); // only show types that have logs

              const maxCareCount = Math.max(...careBreakdown.map((i) => i.count), 1);

              if (careBreakdown.length === 0) return null;

              return (
                <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg">This week</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Care activity breakdown</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    {careBreakdown.map((item) => {
                      const Icon = ACTIVITY_ICONS[item.type] ?? Scissors;
                      return (
                        <div key={item.type}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {item.count} this week
                              </span>
                              <span className="text-xs text-muted-foreground/50">·</span>
                              <span className="text-xs text-muted-foreground">
                                {item.total} total
                              </span>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(item.count / maxCareCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Last session summary */}
                  <div className="mt-5 rounded-2xl bg-secondary/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Last care session</p>
                    <p className="mt-0.5 text-sm">
                      {(() => {
                        const last = careLogs[0];
                        if (!last) return "None recorded";
                        const pet = pets.find((p) => p.id === last.pet_id);
                        return `${ACTIVITY_LABELS[last.activity_type] ?? last.activity_type}${pet ? ` · ${pet.name}` : ""} · ${formatDate(last.occurred_at)}`;
                      })()}
                    </p>
                  </div>
                </section>
              );
            })()}
            {(() => {
              if (careLogs.length === 0 && mergedConfig.care.length === 0) {
                return null;
              }

              const byType = new Map<string, ActivityLog[]>();
              for (const log of careLogs) {
                if (!byType.has(log.activity_type)) byType.set(log.activity_type, []);
                byType.get(log.activity_type)!.push(log);
              }

              if (byType.size === 0) {
                return (
                  <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                      <Scissors className="h-5 w-5 text-primary" />
                    </div>

                    <h2 className="mt-4 font-display text-lg">
                      No care logged yet
                    </h2>

                    <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                      Keep track of grooming, baths and other care routines for your pet.
                    </p>

                    <ActivityFormDialog
                      pets={pets}
                      trigger={
                        <Button className="mt-4 rounded-full">
                          <Plus className="mr-1 h-4 w-4" />
                          Log care
                        </Button>
                      }
                    />
                  </section>
                );
              }

              return (
                <div className="space-y-4">
                  {[...byType.entries()].map(([type, typeLogs]) => {
                    const Icon = ACTIVITY_ICONS[type] ?? ActivityIcon;
                    return (
                      <section key={type} className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h2 className="font-display text-lg">
                                {ACTIVITY_LABELS[type] ?? type}
                              </h2>

                              <p className="text-xs text-muted-foreground">
                                {selectedPetId !== "all" ? `Recent ${ACTIVITY_LABELS[type] ?? type} sessions` : `${ACTIVITY_LABELS[type] ?? type} logs`}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {typeLogs.length} {typeLogs.length === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                        <ul className="divide-y divide-border/60">
                          {typeLogs.slice(0, 5).map((log) => (
                            <li key={log.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {pets.find((p) => p.id === log.pet_id)?.name ?? "Pet"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(log.occurred_at)}
                                  {log.notes && ` · ${log.notes}`}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              );
            })()}
          </div>
        )}
        {activeTab === "health" && (
          <div className="space-y-5">
            <MetricCards metrics={healthCards} />
            {healthLogs.length > 0 && (
              <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg">Health overview</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {healthLogs.length} total observation{healthLogs.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {healthTypes.map((type) => {
                    const typeLogs = healthLogs.filter((l) => l.activity_type === type);
                    if (typeLogs.length === 0) return null;
                    const Icon = ACTIVITY_ICONS[type] ?? ActivityIcon;
                    const last = typeLogs[0];
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ACTIVITY_LABELS[type] ?? type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {typeLogs.length} log{typeLogs.length === 1 ? "" : "s"} · Last{" "}
                              {formatDate(last.occurred_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {latestWeight && (
              <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                      <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg">
                        Weight history
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedPetId !== "all" ?
                          `${weightHistoryCount} measurement${weightHistoryCount === 1 ? '' : 's'}` :
                          "Latest recorded measurement"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-semibold">
                        {Number(latestWeight.weight).toFixed(1)}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        kg
                      </span>
                    </div>

                    {totalWeightChange !== null && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {totalWeightChange > 0 ? "+" : ""}
                          {totalWeightChange.toFixed(1)} kg
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Since first measurement
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {weightChange !== null && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Since previous measurement
                    </span>
                    <span className="text-sm font-medium">
                      {weightChange > 0 ? "+" : ""}
                      {weightChange.toFixed(1)} kg
                    </span>
                  </div>
                )}
                {latestWeight.pet_id && (
                  <p className="mt-2 text-xs text-muted-foreground capitalize">
                    {pets.find((p) => p.id === latestWeight.pet_id)?.name ?? "Pet"}
                  </p>
                )}

                {selectedPetId !== "all" &&
                  (() => {
                    const chartLogs = selectedPetWeightLogs
                      .slice(0, 12)
                      .reverse();

                    if (chartLogs.length < 2) return null;

                    const chartData = chartLogs.map((log) => ({
                      date: new Date(
                        log.occurred_at,
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      }),
                      weight: Number(log.weight),
                    }));

                    const weights = chartData.map(
                      (d) => d.weight,
                    );

                    const minWeight = Math.min(...weights);
                    const maxWeight = Math.max(...weights);

                    const padding = Math.max(
                      (maxWeight - minWeight) * 0.2,
                      0.5,
                    );

                    return (
                      <div className="mt-5">
                        <p className="mb-3 text-xs text-muted-foreground">
                          {chartLogs.length} measurements
                        </p>
                        <ResponsiveContainer
                          width="100%"
                          height={140}
                        >
                          <LineChart
                            data={chartData}
                            margin={{
                              top: 4,
                              right: 4,
                              left: -24,
                              bottom: 0,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{
                                fontSize: 10,
                                fill: "var(--muted-foreground)",
                              }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{
                                fontSize: 10,
                                fill: "var(--muted-foreground)",
                              }}
                              tickLine={false}
                              axisLine={false}
                              domain={[
                                Math.floor(
                                  minWeight - padding,
                                ),
                                Math.ceil(
                                  maxWeight + padding,
                                ),
                              ]}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "12px",
                                border: "1px solid var(--border)",
                                background: "var(--card)",
                                fontSize: 12,
                                color: "var(--foreground)",
                              }}
                              formatter={(v: number) => [
                                `${v.toFixed(1)} kg`,
                                "Weight",
                              ]}
                              labelStyle={{
                                color:
                                  "var(--muted-foreground)",
                                marginBottom: 2,
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="weight"
                              stroke="var(--primary)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--primary)",
                                r: 3,
                                strokeWidth: 0,
                              }}
                              activeDot={{
                                r: 5,
                                strokeWidth: 0,
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
              </section>
            )}
            {!latestWeight && (
              <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Scale className="h-5 w-5 text-primary" />
                </div>

                <h2 className="mt-4 font-display text-lg">
                  Start tracking weight
                </h2>

                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Record your pet's weight over time to monitor changes and see their
                  growth history.
                </p>

                <ActivityFormDialog
                  pets={pets}
                  trigger={
                    <Button className="mt-4 rounded-full">
                      <Plus className="mr-1 h-4 w-4" />
                      Log weight
                    </Button>
                  }
                />
              </section>
            )}
            {(() => {
              if (healthLogs.length === 0 && healthTypes.length === 0) {
                return null;
              }

              const byType = new Map<string, ActivityLog[]>();
              for (const log of healthLogs) {
                if (!byType.has(log.activity_type)) byType.set(log.activity_type, []);
                byType.get(log.activity_type)!.push(log);
              }

              if (byType.size === 0) {
                return (
                  <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                      <ActivityIcon className="h-5 w-5 text-primary" />
                    </div>

                    <h2 className="mt-4 font-display text-lg">
                      No health observations yet
                    </h2>

                    <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                      Record health observations and measurements to keep a useful history
                      for your pet.
                    </p>

                    <ActivityFormDialog
                      pets={pets}
                      trigger={
                        <Button className="mt-4 rounded-full">
                          <Plus className="mr-1 h-4 w-4" />
                          Log health
                        </Button>
                      }
                    />
                  </section>
                );
              }

              return (
                <div className="space-y-4">
                  {[...byType.entries()].map(([type, typeLogs]) => {
                    const Icon = ACTIVITY_ICONS[type] ?? ActivityIcon;
                    return (
                      <section key={type} className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h2 className="font-display text-lg">
                                {ACTIVITY_LABELS[type] ?? type}
                              </h2>

                              <p className="text-xs text-muted-foreground">
                                {selectedPetId !== "all" ? `Recent ${ACTIVITY_LABELS[type] ?? type} sessions` : `${ACTIVITY_LABELS[type] ?? type} logs`}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {typeLogs.length} {typeLogs.length === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                        <ul className="divide-y divide-border/60">
                          {typeLogs.slice(0, 5).map((log) => (
                            <li key={log.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {pets.find((p) => p.id === log.pet_id)?.name ?? "Pet"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(log.occurred_at)}
                                  {log.notes && ` · ${log.notes}`}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              );
            })()}
          </div>
        )}
        {activeTab === "history" && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">
                  Activity history
                </h2>
                <p className="text-xs text-muted-foreground">
                  {historyLogs.length}{" "}
                  {historyLogs.length === 1 ? "entry" : "entries"}
                </p>
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {(() => {
                  const isAllPets = selectedPetId === "all";
                  const filters = isAllPets
                    ? CATEGORY_FILTERS
                    : getTypeFilters(pets.find((p) => p.id === selectedPetId)?.species ?? "other");

                  return (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {filters.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setHistoryType(value)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${historyType === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground shadow-(--shadow-soft)"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {ACTIVITY_TIME_FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHistoryDate(value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${historyDate === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground shadow-(--shadow-soft)"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {historyLogs.length === 0 ? (
              <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                  <Clock3 className="h-5 w-5 text-primary" />
                </div>

                <h2 className="mt-3 font-display text-base">
                  {filteredLogs.length === 0
                    ? "No activity recorded yet"
                    : "No matching activity"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {filteredLogs.length === 0
                    ? "Activity you log will appear here."
                    : "Try changing the activity or date filters."}
                </p>

                {filteredLogs.length === 0 ? (
                  <ActivityFormDialog
                    pets={pets}
                    trigger={
                      <Button className="mt-4 rounded-full">
                        <Plus className="mr-1 h-4 w-4" />
                        Log activity
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    variant="secondary"
                    className="mt-4 rounded-full"
                    onClick={() => {
                      setHistoryType("all");
                      setHistoryDate("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </section>
            ) : (
              <div className="space-y-5">
                {groupedLogs.map(([dateKey, dateLogs]) => (
                  <div key={dateKey}>
                    <div className="mb-2 px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatGroupDate(dateKey)}
                      </h3>
                    </div>

                    <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
                      {dateLogs.map(renderActivityRow)}
                    </ul>
                  </div>
                ),
                )}
              </div>
            )}
          </section>
        )}
      </Page.Content>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) =>
          !o && setConfirmId(null)
        }
        title="Remove this log?"
        description={`This will permanently delete the ${confirmItem?.activity_type ?? ""
          } log. This can't be undone.`}
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() =>
          confirmId && del.mutate(confirmId)
        }
      />
    </Page >
  );
}