import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Pencil, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import z from "zod";

import { petsQuery, vetQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

import InlineLoader from "@/components/ui/common/inline-loader";
import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/common/breadcrumb";
import { Button } from "@/components/ui/common/button";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { FeatureEmptyState } from "@/components/ui/common/feature-empty-state";
import { Page } from "@/components/layout/page";
import { VetFormDialog } from "@/components/ui/vet/vet-form-dialog";
import { HealthGroup } from "@/components/ui/common/health-group";
import { VetRow } from "@/components/ui/vet/vet-row";

import { VetAppointment } from "@/schemas/vet";

export const Route = createFileRoute("/_authenticated/health/vet")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: async ({ context }) => await Promise.all([
    context.queryClient.ensureQueryData(petsQuery),
    context.queryClient.ensureQueryData(vetQuery),
  ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Vet · Pawpal" }] }),
  component: VetPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function VetPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: appts } = useSuspenseQuery(vetQuery);
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const { new: openCreate } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const now = Date.now();
  const upcoming = appts
    .filter((a) => !a.completed && new Date(a.date).getTime() >= now - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = appts.filter((a) => a.completed || new Date(a.date).getTime() < now - 86_400_000);

  const toggle = useMutation({
    mutationFn: async (a: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("vet_appointments").update({ completed: !a.completed }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vetQuery.queryKey }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vet_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vetQuery.queryKey });
      toast.success("Removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = appts.find((a) => a.id === confirmId);

  const renderVetEdit = (item: VetAppointment) => (
    <VetFormDialog
      pets={pets}
      item={item}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );

  const renderVetRow = (item: VetAppointment) => (
    <VetRow
      key={item.id}
      item={item}
      pets={pets}
      onDelete={(item) => setConfirmId(item.id)}
      onToggle={(a) => toggle.mutate(a)}
      renderEdit={renderVetEdit}
    />
  );

  const sections = [
    {
      title: "Upcoming",
      emptyMessage: "No upcoming appointments.",
      items: upcoming,
    },
    {
      title: "History",
      emptyMessage: "Nothing yet.",
      items: past,
    },
  ];

  return (
    <Page>
      <Page.Header>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/health">Health</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbPage>Vet</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">Vet</h1>
            <p className="text-sm text-muted-foreground">Appointments & history.</p>
          </div>
          <VetFormDialog
            pets={pets}
            initialOpen={openCreate}
            trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" />Add</Button>}
            onClose={() => navigate({
              search: { new: undefined },
              replace: true,
            })}
          />
        </header>
      </Page.Header>

      <Page.Content>
        {appts.length === 0 ? (
          <FeatureEmptyState
            icon={Stethoscope}
            title="Keep every vet visit organized"
            description="Save upcoming appointments and review previous visits in one place."
            cta="Schedule visit"
            to="/health/vet"
            search={{ new: true }}
          />
        ) : sections.filter(section => section.items.length > 0).map(section => (
          <HealthGroup
            key={section.title}
            title={section.title}
            emptyMessage={section.emptyMessage}
            hasItems={section.items.length > 0}
          >
            {section.items.map(renderVetRow)}
          </HealthGroup>
        ))}
      </Page.Content>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title={`Remove ${confirmItem?.reason ?? "this appointment"}?`}
        description="This appointment will be permanently deleted. This can't be undone."
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() => confirmId && del.mutate(confirmId)}
      />
    </Page>
  );
}
