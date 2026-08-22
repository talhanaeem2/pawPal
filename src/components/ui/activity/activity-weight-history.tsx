import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Scale } from "lucide-react";

import { ActivityLog } from "@/schemas/activity";

type ActivityWeightHistoryProps = {
  latestWeight: ActivityLog;
  selectedPetId: string;
  selectedPetWeightLogs: ActivityLog[];
  weightChange: number | null;
  totalWeightChange: number | null;
  weightHistoryCount: number;
  petName: string | undefined;
};

export function ActivityWeightHistory({
  latestWeight,
  selectedPetId,
  selectedPetWeightLogs,
  weightChange,
  totalWeightChange,
  weightHistoryCount,
  petName,
}: ActivityWeightHistoryProps) {
  const chart = useMemo(() => {
    if (selectedPetId === "all") {
      return null;
    }

    const chartLogs = selectedPetWeightLogs.slice(0, 12).reverse();

    if (chartLogs.length < 2) {
      return null;
    }

    const data = chartLogs.map((log) => ({
      date: new Date(log.occurred_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      weight: Number(log.weight),
    }));
    const weights = data.map((entry) => entry.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    return {
      data,
      minWeight,
      maxWeight,
      padding: Math.max((maxWeight - minWeight) * 0.2, 0.5),
    };
  }, [selectedPetId, selectedPetWeightLogs]);

  return (
    <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg">Weight history</h2>
            <p className="text-xs text-muted-foreground">
              {selectedPetId !== "all"
                ? String(weightHistoryCount) +
                  " measurement" +
                  (weightHistoryCount === 1 ? "" : "s")
                : "Latest recorded measurement"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-semibold">{Number(latestWeight.weight).toFixed(1)}</span>
            <span className="ml-1 text-sm text-muted-foreground">kg</span>
          </div>

          {totalWeightChange !== null && (
            <div className="text-right">
              <p className="text-sm font-semibold">
                {totalWeightChange > 0 ? "+" : ""}
                {totalWeightChange.toFixed(1)} kg
              </p>
              <p className="text-xs text-muted-foreground">Since first measurement</p>
            </div>
          )}
        </div>
      </div>

      {weightChange !== null && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
          <span className="text-xs text-muted-foreground">Since previous measurement</span>
          <span className="text-sm font-medium">
            {weightChange > 0 ? "+" : ""}
            {weightChange.toFixed(1)} kg
          </span>
        </div>
      )}

      {latestWeight.pet_id && (
        <p className="mt-2 text-xs text-muted-foreground capitalize">{petName ?? "Pet"}</p>
      )}

      {chart && (
        <div className="mt-5">
          <p className="mb-3 text-xs text-muted-foreground">{chart.data.length} measurements</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chart.data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                  Math.floor(chart.minWeight - chart.padding),
                  Math.ceil(chart.maxWeight + chart.padding),
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
                formatter={(value: number) => [value.toFixed(1) + " kg", "Weight"]}
                labelStyle={{
                  color: "var(--muted-foreground)",
                  marginBottom: 2,
                }}
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
      )}
    </section>
  );
}
