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
} from "lucide-react";
import z from "zod";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { petsQuery, activityQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useCollapsiblePageHeader } from "@/hooks/use-collapsible-page-header";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
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

  /*
   * ------------------------------------------------------------
   * Filtered + sorted activity
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * Date helpers
   * ------------------------------------------------------------
   */

  const getDateKey = (date: string) => {
    const d = new Date(date);

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const getStartOfWeek = () => {
    const date = new Date();
    const day = date.getDay();

    // Monday = 0
    const diff = day === 0 ? -6 : 1 - day;

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + diff);

    return date;
  };

  /*
   * ------------------------------------------------------------
   * This week
   * ------------------------------------------------------------
   */

  const weekStart = getStartOfWeek();

  const thisWeekLogs = filteredLogs.filter(
    (log) =>
      new Date(log.occurred_at).getTime() >=
      weekStart.getTime(),
  );

  const walkCount = thisWeekLogs.filter(
    (log) => log.activity_type === "walk",
  ).length;

  const playCount = thisWeekLogs.filter(
    (log) => log.activity_type === "play",
  ).length;

  const weightCount = thisWeekLogs.filter(
    (log) => log.activity_type === "weight",
  ).length;

  const exerciseMinutes = thisWeekLogs.reduce(
    (total, log) =>
      total +
      (log.activity_type === "walk"
        ? Number(log.duration_min ?? 0)
        : 0),
    0,
  );

  /*
   * ------------------------------------------------------------
   * Latest weight
   * ------------------------------------------------------------
   */

  const weightLogs = filteredLogs.filter(
    (log) =>
      log.activity_type === "weight" &&
      log.weight != null,
  );

  const latestWeight = weightLogs[0];

  /*
   * Compare latest weight against the previous measurement
   * for the same pet.
   */

  const previousWeight = latestWeight
    ? weightLogs.find(
      (log) =>
        log.pet_id === latestWeight.pet_id &&
        log.id !== latestWeight.id,
    )
    : undefined;

  const weightChange =
    latestWeight?.weight != null &&
      previousWeight?.weight != null
      ? Number(latestWeight.weight) -
      Number(previousWeight.weight)
      : null;

  /*
   * ------------------------------------------------------------
   * Activity streak
   * ------------------------------------------------------------
   *
   * A streak is based on consecutive days with at least
   * one activity.
   */

  const activityDates = new Set(
    filteredLogs
      .filter(
        (log) =>
          log.activity_type === "walk" ||
          log.activity_type === "play",
      )
      .map((log) => getDateKey(log.occurred_at)),
  );

  const getDateKeyFromDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  const getDateFromOffset = (offset: number) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    return getDateKeyFromDate(date);
  };

  function formatMinutes(min: number): string {
    if (min === 0) return "0";
    if (min < 60) return `${min}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  let streak = 0;

  for (let offset = 0; offset < 365; offset++) {
    if (activityDates.has(getDateFromOffset(offset))) {
      streak++;
    } else {
      break;
    }
  }

  /*
   * ------------------------------------------------------------
   * Activity breakdown
   * ------------------------------------------------------------
   */

  const breakdown = [
    {
      type: "walk",
      label: "Walks",
      count: walkCount,
    },
    {
      type: "play",
      label: "Play",
      count: playCount,
    },
    {
      type: "weight",
      label: "Weight",
      count: weightCount,
    },
  ];

  const maxBreakdownCount = Math.max(
    ...breakdown.map((item) => item.count),
    1,
  );

  /*
   * ------------------------------------------------------------
   * Simple insight
   * ------------------------------------------------------------
   */

  const insight = useMemo(() => {
    if (thisWeekLogs.length === 0) {
      return null;
    }

    if (exerciseMinutes > 0 && walkCount > 0) {
      const averageWalk =
        Math.round(exerciseMinutes / walkCount);

      return {
        title: "Activity insight",
        text:
          selectedPetId === "all"
            ? `You've logged ${walkCount} walk${walkCount === 1 ? "" : "s"
            } this week, averaging about ${averageWalk} minutes each.`
            : `This week has ${walkCount} walk${walkCount === 1 ? "" : "s"
            }, averaging about ${averageWalk} minutes each.`,
      };
    }

    if (weightChange !== null) {
      const direction =
        weightChange > 0
          ? "increased"
          : weightChange < 0
            ? "decreased"
            : "stayed the same";

      return {
        title: "Weight insight",
        text:
          latestWeight && latestWeight.weight != null
            ? `Latest recorded weight is ${Number(
              latestWeight.weight,
            ).toFixed(1)} kg and has ${direction} by ${Math.abs(
              weightChange,
            ).toFixed(1)} kg since the previous measurement.`
            : null,
      };
    }

    return {
      title: "Activity insight",
      text: `${thisWeekLogs.length} activit${thisWeekLogs.length === 1 ? "y" : "ies"
        } logged this week.`,
    };
  }, [
    thisWeekLogs.length,
    exerciseMinutes,
    walkCount,
    weightChange,
    latestWeight,
    selectedPetId,
  ]);

  /*
   * ------------------------------------------------------------
   * Group history by date
   * ------------------------------------------------------------
   */

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, ActivityLog[]>();

    for (const log of filteredLogs) {
      const key = getDateKey(log.occurred_at);

      const existing = groups.get(key);

      if (existing) {
        existing.push(log);
      } else {
        groups.set(key, [log]);
      }
    }

    return Array.from(groups.entries());
  }, [filteredLogs]);

  const formatGroupDate = (dateKey: string) => {
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

  /*
   * ------------------------------------------------------------
   * Edit row
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * Empty state
   * ------------------------------------------------------------
   */

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
                  Walks, play & weight.
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
            description="Log walks, play sessions and weight to build a history of your pet's everyday activity."
            cta="Log activity"
            to="/activity"
            search={{ new: true }}
          />

          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <h2 className="font-display text-lg">
              What you can track
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-secondary/60 p-3 text-center">
                <Footprints className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-medium">
                  Walks
                </p>
              </div>

              <div className="rounded-2xl bg-secondary/60 p-3 text-center">
                <ActivityIcon className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-medium">
                  Play
                </p>
              </div>

              <div className="rounded-2xl bg-secondary/60 p-3 text-center">
                <Scale className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-medium">
                  Weight
                </p>
              </div>
            </div>
          </section>

          <div className="h-24" aria-hidden="true" />
        </Page.Content>
      </Page>
    );
  }

  /*
   * ------------------------------------------------------------
   * Main page
   * ------------------------------------------------------------
   */

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
                Walks, play & weight.
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
        {/* -------------------------------------------------- */}
        {/* Pet filter                                         */}
        {/* -------------------------------------------------- */}

        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            <button
              type="button"
              onClick={() => setSelectedPetId("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${selectedPetId === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground shadow-(--shadow-soft)"
                }`}
            >
              All pets
            </button>

            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() =>
                  setSelectedPetId(pet.id)
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${selectedPetId === pet.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground shadow-(--shadow-soft)"
                  }`}
              >
                {pet.name}
              </button>
            ))}
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* Summary cards                                      */}
        {/* -------------------------------------------------- */}

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
            <ActivityIcon className="h-4 w-4 text-primary" />

            <div className="mt-3 text-xl font-semibold">
              {thisWeekLogs.length}
            </div>

            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
            <Clock3 className="h-4 w-4 text-primary" />

            <div className="mt-3 text-xl font-semibold">
              {formatMinutes(exerciseMinutes)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {exerciseMinutes >= 60 ? "" : "min"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Exercise
            </p>
          </div>

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
              Latest weight
            </p>
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* This week                                         */}
        {/* -------------------------------------------------- */}

        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg">
                This week
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Your activity breakdown
              </p>
            </div>

            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                <Flame className="h-3.5 w-3.5 text-primary" />
                {streak} day streak
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {breakdown.map((item) => (
              <div key={item.type}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm">
                    {item.label}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(item.count /
                        maxBreakdownCount) *
                        100
                        }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-2xl bg-secondary/50 py-3">
            <div className="text-center">
              <div className="text-sm font-semibold">
                {walkCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Walks
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold">
                {playCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Play
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold">
                {weightCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Weights
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* Weight change                                     */}
        {/* -------------------------------------------------- */}

        {latestWeight && (
          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                <Scale className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h2 className="font-medium">
                  Weight
                </h2>

                <p className="text-xs text-muted-foreground">
                  Latest recorded measurement
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-3xl font-semibold">
                  {Number(latestWeight.weight).toFixed(1)}
                </span>

                <span className="ml-1 text-sm text-muted-foreground">
                  kg
                </span>
              </div>

              {weightChange !== null && (
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${weightChange > 0
                    ? "bg-secondary text-foreground"
                    : weightChange < 0
                      ? "bg-secondary text-foreground"
                      : "bg-secondary text-muted-foreground"
                    }`}
                >
                  {weightChange > 0 ? "+" : ""}
                  {weightChange.toFixed(1)} kg
                </span>
              )}
            </div>

            {latestWeight.pet_id && (
              <p className="mt-2 text-xs text-muted-foreground">
                {pets.find(
                  (p) =>
                    p.id === latestWeight.pet_id,
                )?.name ?? "Pet"}
              </p>
            )}
            {/* Weight trend chart */}
            {(() => {
              // Get weight logs for the selected pet (or all pets if "all" selected)
              if (selectedPetId === "all") return null;

              const chartLogs = weightLogs
                .filter((log) => log.pet_id === selectedPetId)
                .slice(0, 10) // last 10 measurements
                .reverse();   // oldest first

              if (chartLogs.length < 2) return null; // need at least 2 points for a line

              const chartData = chartLogs.map((log) => ({
                date: new Date(log.occurred_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
                weight: Number(log.weight),
                pet: pets.find((p) => p.id === log.pet_id)?.name ?? "",
              }));

              const weights = chartData.map((d) => d.weight);
              const minWeight = Math.min(...weights);
              const maxWeight = Math.max(...weights);
              const padding = Math.max((maxWeight - minWeight) * 0.2, 0.5);

              return (
                <div className="mt-5">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Last {chartLogs.length} measurements
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        domain={[
                          Math.floor(minWeight - padding),
                          Math.ceil(maxWeight + padding),
                        ]}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(v: number) => [`${v.toFixed(1)} kg`, "Weight"]}
                        labelStyle={{ color: "var(--muted-foreground)", marginBottom: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ fill: "var(--primary)", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </section>
        )}

        {/* -------------------------------------------------- */}
        {/* Insight                                           */}
        {/* -------------------------------------------------- */}

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

        {/* -------------------------------------------------- */}
        {/* History                                            */}
        {/* -------------------------------------------------- */}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg">
                Activity history
              </h2>

              <p className="text-xs text-muted-foreground">
                {filteredLogs.length}{" "}
                {filteredLogs.length === 1
                  ? "entry"
                  : "entries"}
              </p>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
              <p className="text-sm text-muted-foreground">
                No activity recorded for this pet yet.
              </p>

              <ActivityFormDialog
                pets={pets}
                trigger={
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Log activity
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-5">
              {groupedLogs.map(
                ([dateKey, dateLogs]) => (
                  <div key={dateKey}>
                    <div className="mb-2 px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatGroupDate(dateKey)}
                      </h3>
                    </div>

                    <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
                      {dateLogs.map(
                        renderActivityRow,
                      )}
                    </ul>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
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