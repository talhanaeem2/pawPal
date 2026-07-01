import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery, vetQuery, activityQuery, vaccinationsQuery } from "@/lib/queries";
import { Calendar, Stethoscope, Activity, Plus, PawPrint, Syringe } from "lucide-react";

import NotFoundState from "@/components/ui/not-found-state";
import InlineErrorState from "@/components/ui/inline-error-state";
import InlineLoader from "@/components/ui/inline-loader";
import PushPrompt from "@/components/ui/push-prompt";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { formatFrequency, formatKind, formatPetNames, formatTime, getPreviewList, getVaccinationTone, getVaccinationToneClass, getVaccinationToneLabel, todayDateString } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { Empty } from "@/components/ui/empty";

export const Route = createFileRoute("/_authenticated/home")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(scheduleQuery);
    context.queryClient.ensureQueryData(vetQuery);
    context.queryClient.ensureQueryData(activityQuery);
    context.queryClient.ensureQueryData(vaccinationsQuery);
  },
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Home · Pawpal" }] }),
  component: Home,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function Home() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: schedule } = useSuspenseQuery(scheduleQuery);
  const { data: vet } = useSuspenseQuery(vetQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const today = todayDateString();

  const todayData = getPreviewList(schedule, 5);
  const upcomingVetSorted = vet
    .filter((v) => !v.completed && new Date(v.date) >= new Date(Date.now() - 86_400_000))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingVetData = getPreviewList(upcomingVetSorted, 3);
  const recentActivityData = getPreviewList(activity, 3);

  const vaccinationPreview = vaccinations
    .filter((v) => {
      if (v.completed_at || !v.next_due_at) return false;

      const due = new Date(v.next_due_at).getTime();

      return due < now || due - now <= thirtyDays;
    })
    .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

  const vaccinationData = getPreviewList(vaccinationPreview, 3);

  if (pets.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <PawPrint className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl mt-4">Welcome to Pawpal</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Add your first pet to start tracking meals, meds, vet visits and walks.
        </p>
        <Link to="/pets" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Add a pet
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="font-display text-3xl mt-1">Today with {pets.map((p) => p.name).slice(0, 2).join(" & ")}</h1>
      </div>

      <PushPrompt />

      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
        {pets.map((p) => (
          <Link key={p.id} to="/pets"
            className="shrink-0 rounded-2xl bg-card p-4 w-32 shadow-(--shadow-soft) hover:scale-[1.02] transition">
            <PetAvatar pet={p} size="h-14 w-14" textSize="text-3xl" />
            <div className="font-medium mt-2 truncate text-sm">{p.name}</div>
            <div className="text-xs text-muted-foreground truncate">{p.breed ?? p.species}</div>
          </Link>
        ))}
      </div>

      <Section title="Today's care" icon={Calendar} href="/schedule">
        {todayData.visible.length === 0 ? (
          <Empty text="No reminders yet." cta="Add one" href="/schedule" />
        ) : (
          <ul className="divide-y divide-border/60">
            {todayData.visible.map((item) => {
              const petStatuses = item.schedule_item_pets
                .map((schedulePet) => ({
                  ...schedulePet,
                  pet: pets.find((p) => p.id === schedulePet.pet_id),
                  done: schedulePet.schedule_completions.some(
                    (c) => c.completed_on === today
                  ),
                }))
                .sort((a, b) =>
                  (a.pet?.name ?? "").localeCompare(b.pet?.name ?? "")
                );

              const doneToday =
                petStatuses.length > 0 &&
                petStatuses.every((p) => p.done);

              const petLabel = formatPetNames(
                petStatuses
                  .map((p) => p.pet?.name)
                  .filter((name): name is string => !!name)
              );

              return (
                <li
                  key={item.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className={doneToday ? "opacity-50" : ""}>
                    <div className="font-medium text-sm capitalize">
                      {item.title}
                    </div>

                    <div className="text-xs text-muted-foreground capitalize">
                      {petLabel && `${petLabel} · `}
                      {formatKind(item)} ·{" "}
                      {item.time_of_day
                        ? formatTime(item.time_of_day)
                        : formatFrequency(item)}
                    </div>
                  </div>

                  {doneToday ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary">
                      Done
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                      {formatFrequency(item)}
                    </span>
                  )}
                </li>
              );
            })}
            {todayData.remaining > 0 && (
              <Link to="/schedule" className="block py-2 text-xs text-primary hover:underline">
                +{todayData.remaining} more reminders →
              </Link>
            )}
          </ul>
        )}
      </Section>

      <Section title="Upcoming vet" icon={Stethoscope} href="/health/vet">
        {upcomingVetData.visible.length === 0 ? (
          <Empty text="Nothing booked." cta="Schedule visit" href="/health/vet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {upcomingVetData.visible.map((v) => (
              <li key={v.id} className="py-3">
                <div className="font-medium text-sm capitalize">{v.reason}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {new Date(v.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {v.vet_name ? ` · ${v.vet_name}` : ""}
                </div>
              </li>
            ))}
            {upcomingVetData.remaining > 0 && (
              <Link to="/health/vet" className="block py-2 text-xs text-primary hover:underline">
                +{upcomingVetData.remaining} more visits →
              </Link>
            )}
          </ul>
        )}
      </Section>

      <Section title="Recent activity" icon={Activity} href="/activity">
        {recentActivityData.visible.length === 0 ? (
          <Empty text="No walks logged yet." cta="Log one" href="/activity" />
        ) : (
          <ul className="divide-y divide-border/60">
            {recentActivityData.visible.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm capitalize">{a.activity_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.activity_type === "weight" ? `${a.weight} kg` : `${a.duration_min} min`}
                </div>
              </li>
            ))}
            {recentActivityData.remaining > 0 && (
              <Link to="/activity" className="block py-2 text-xs text-primary hover:underline">
                +{recentActivityData.remaining} more activities →
              </Link>
            )}
          </ul>
        )}
      </Section>

      {vaccinationData.visible.length > 0 && (
        <Section title="Vaccinations" icon={Syringe} href="/health/vaccinations">
          <ul className="divide-y divide-border/60">
            {vaccinationData.visible.map((v) => {
              const tone = getVaccinationTone(
                v.next_due_at,
                v.completed_at,
              );

              return (
                <li key={v.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm capitalize">{v.vaccine_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Due{" "}
                      {new Date(v.next_due_at!).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${getVaccinationToneClass(tone)}`}
                  >
                    {getVaccinationToneLabel(tone)}
                  </span>
                </li>
              )
            })}
            {vaccinationData.remaining > 0 && (
              <Link to="/health/vaccinations" className="block py-2 text-xs text-primary hover:underline">
                +{vaccinationData.remaining} more vaccinations →
              </Link>
            )}
          </ul>
        </Section>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}