import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/common/button";
import { ACTIVITY_LABELS } from "@/lib/activity-utils";
import { formatDateTime } from "@/lib/utils";
import { ActivityLog } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

type PetActivityExportProps = {
  pet: Pet;
  logs: ActivityLog[];
};

export function PetActivityExport({ pet, logs }: PetActivityExportProps) {
  if (logs.length === 0) {
    return null;
  }

  function downloadCsv() {
    const columns = ["Date", "Activity", "Duration (min)", "Weight (kg)", "Length (cm)", "Notes"];
    const rows = logs.map((log) => [
      formatDateTime(log.occurred_at),
      ACTIVITY_LABELS[log.activity_type] ?? log.activity_type,
      log.duration_min ?? "",
      log.weight ?? "",
      log.length ?? "",
      log.notes ?? "",
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = pet.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "pet";

    link.href = downloadUrl;
    link.download = `${safeName}-activity-history.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    toast.success("Activity history downloaded");
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg">Share activity history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download {pet.name}&apos;s {logs.length} logged {logs.length === 1 ? "activity" : "activities"} as a CSV for a vet visit.
          </p>
        </div>
      </div>
      <Button variant="secondary" className="mt-4 w-full rounded-full" onClick={downloadCsv}>
        <Download className="mr-2 h-4 w-4" />
        Download CSV
      </Button>
    </section>
  );
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
