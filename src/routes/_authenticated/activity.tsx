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
} from "lucide-react";
import z from "zod";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { petsQuery, activityQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";
import {
  ACITVITY_CARDS,
  ACTIVITY_FILTERS,
  ACTIVITY_TIME_FILTERS,
  EXERCISE_TYPES,
  formatGroupDate,
  formatMinutes,
  getDateFromOffset,
  getDateKey,
  getStartOfWeek
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

import { ActivityLog } from "@/schemas/activity";

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
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"exercise" | "care" | "history">("exercise");
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
      if (
        historyType !== "all" &&
        log.activity_type !== historyType
      ) {
        return false;
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

  const weekStart = getStartOfWeek();

  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

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

  const exerciseLogs = thisWeekLogs.filter(
    (log) => EXERCISE_TYPES.has(log.activity_type)
  );

  const previousWeekExerciseLogs = previousWeekLogs.filter((log) =>
    EXERCISE_TYPES.has(log.activity_type),
  );

  const walkCount = thisWeekLogs.filter(
    (log) => log.activity_type === "walk",
  ).length;

  const runCount = thisWeekLogs.filter(
    (log) => log.activity_type === "run",
  ).length;

  const playCount = thisWeekLogs.filter(
    (log) => log.activity_type === "play",
  ).length;

  const groomingCount = filteredLogs.filter(
    (log) => log.activity_type === "grooming",
  ).length;

  const exerciseMinutes = exerciseLogs.reduce(
    (total, log) => total + Number(log.duration_min ?? 0),
    0,
  );

  const previousWeekExerciseMinutes = previousWeekExerciseLogs.reduce(
    (total, log) => total + Number(log.duration_min ?? 0),
    0,
  );

  const activeDaysThisWeek = new Set(
    exerciseLogs.map((log) => getDateKey(log.occurred_at)),
  ).size;

  const averageExerciseMinutes =
    activeDaysThisWeek > 0
      ? exerciseMinutes / activeDaysThisWeek
      : 0;

  const exerciseChange =
    previousWeekExerciseMinutes > 0
      ? ((exerciseMinutes - previousWeekExerciseMinutes) /
        previousWeekExerciseMinutes) *
      100
      : null;

  const weightLogs = filteredLogs.filter(
    (log) =>
      log.activity_type === "weight" &&
      log.weight != null,
  );

  const getPetWeightLogs = (petId: string) =>
    weightLogs
      .filter((log) => log.pet_id === petId)
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() -
          new Date(a.occurred_at).getTime(),
      );

  const selectedPetWeightLogs =
    selectedPetId !== "all"
      ? getPetWeightLogs(selectedPetId)
      : [];

  const latestWeight =
    selectedPetId !== "all"
      ? selectedPetWeightLogs[0]
      : weightLogs[0];

  const previousWeight =
    selectedPetId !== "all"
      ? selectedPetWeightLogs[1]
      : undefined;

  const weightChange =
    latestWeight?.weight != null &&
      previousWeight?.weight != null
      ? Number(latestWeight.weight) -
      Number(previousWeight.weight)
      : null;

  const oldestWeight =
    selectedPetId !== "all"
      ? selectedPetWeightLogs[selectedPetWeightLogs.length - 1]
      : undefined;

  const totalWeightChange =
    latestWeight?.weight != null &&
      oldestWeight?.weight != null &&
      latestWeight.id !== oldestWeight.id
      ? Number(latestWeight.weight) -
      Number(oldestWeight.weight)
      : null;

  const weightHistoryCount = selectedPetWeightLogs.length;

  const activityDates = new Set(
    filteredLogs
      .filter((log) => EXERCISE_TYPES.has(log.activity_type))
      .map((log) => getDateKey(log.occurred_at)),
  );

  const todayKey = getDateKey(new Date().toISOString());
  let streak = 0;

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
      walkCount > 0
        ? `${walkCount} walk${walkCount === 1 ? "" : "s"}`
        : null,
      runCount > 0
        ? `${runCount} run${runCount === 1 ? "" : "s"}`
        : null,
      playCount > 0
        ? `${playCount} play session${playCount === 1 ? "" : "s"
        }`
        : null,
    ].filter(Boolean);

    if (exerciseChange !== null) {
      if (exerciseChange > 0) {
        return {
          title: "Great progress",
          text:
            selectedPetId === "all"
              ? `Exercise is up ${exerciseChange.toFixed(
                0,
              )}% from last week. You've logged ${activityParts.join(
                ", ",
              )} for ${formatMinutes(exerciseMinutes)} total.`
              : `This week is ${exerciseChange.toFixed(
                0,
              )}% more active than last week, with ${formatMinutes(
                exerciseMinutes,
              )} of exercise.`,
        };
      }

      if (exerciseChange < 0) {
        return {
          title: "Activity check-in",
          text: `Exercise is ${Math.abs(
            exerciseChange,
          ).toFixed(
            0,
          )}% lower than last week. You've logged ${formatMinutes(
            exerciseMinutes,
          )} so far this week.`,
        };
      }
    }

    return {
      title: "Exercise this week",
      text: `${activityParts.join(
        ", ",
      )} across ${activeDaysThisWeek} ${activeDaysThisWeek === 1 ? "day" : "days"
        }, totaling ${formatMinutes(exerciseMinutes)}.`,
    };
  }, [
    exerciseLogs.length,
    exerciseMinutes,
    exerciseChange,
    activeDaysThisWeek,
    walkCount,
    runCount,
    playCount,
    selectedPetId,
  ]);

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
                  Walks, runs, play, weight & grooming.
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
            description="Log walks, runs, play sessions, weight checks and grooming to build a history of your pet's everyday activity."
            cta="Log activity"
            to="/activity"
            search={{ new: true }}
          />

          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <h2 className="font-display text-lg">
              What you can track
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {ACITVITY_CARDS.map((card) => (
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
                Walks, runs, play, weight & grooming.
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
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["exercise", "Exercise", ActivityIcon],
                ["care", "Care", Scissors],
                ["history", "History", Clock3],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`flex items-center justify-center rounded-xl gap-1.5 px-3 py-2 text-sm font-medium transition ${activeTab === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "exercise" && (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
                <Clock3 className="h-4 w-4 text-primary" />
                <div className="mt-3 text-xl font-semibold">
                  {formatMinutes(Math.round(averageExerciseMinutes))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg. per active day
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
                <div className="flex justify-between items-center">
                  <ActivityIcon className="h-4 w-4 text-primary" />
                  {streak > 0 && (
                    <div className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs font-semibold">
                        {streak} {streak === 1 ? "day" : "days"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xl font-semibold">
                  {activeDaysThisWeek}/7
                </div>
                <p className="text-xs text-muted-foreground">
                  Active days
                </p>
              </div>
            </section>
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
          </div>
        )}
        {activeTab === "care" && (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
                <Scale className="h-4 w-4 text-primary" />

                <div className="mt-3 text-xl font-semibold">
                  {latestWeight?.weight != null
                    ? Number(latestWeight.weight).toFixed(1)
                    : "—"}
                  {latestWeight?.weight != null && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      kg
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPetId !== "all" ? "Current weight" : "Latest weight"}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
                <Scissors className="h-4 w-4 text-primary" />
                <div className="mt-3 text-xl font-semibold">
                  {groomingCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPetId !== "all" ? "Grooming this week" : "Grooming logs"}
                </p>
              </div>
            </section>

            {latestWeight && (
              <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                      <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg">
                        {selectedPetId !== "all" ? "Weight progress" : "Weight history"}
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pets.find(
                      (p) => p.id === latestWeight.pet_id,
                    )?.name ?? "Pet"}
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

            <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h2 className="font-display text-lg">
                    Grooming
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {selectedPetId !== "all" ? "Recent grooming sessions" : "Grooming logs"}
                  </p>
                </div>
              </div>

              {filteredLogs.filter(
                (log) => log.activity_type === "grooming",
              ).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No grooming recorded yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {filteredLogs
                    .filter(
                      (log) =>
                        log.activity_type === "grooming",
                    )
                    .slice(0, 3)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {pets.find(
                              (p) => p.id === log.pet_id,
                            )?.name ?? "Pet"}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {formatDate(
                              log.occurred_at,
                            )}
                          </p>
                        </div>

                        {log.notes && (
                          <p className="max-w-[50%] truncate text-xs text-muted-foreground">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </section>
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
                {ACTIVITY_FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHistoryType(value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${historyType === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground shadow-(--shadow-soft)"
                      }`}
                  >
                    {label}
                  </button>
                ))}
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
              <div className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
                <p className="text-sm text-muted-foreground">
                  No activity matches these filters.
                </p>
              </div>
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
    </Page>
  );
}