import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery, vetQuery, activityQuery, vaccinationsQuery } from "@/lib/pet-queries";
import { Calendar, Stethoscope, Activity, Plus, PawPrint, Syringe } from "lucide-react";

import NotFoundState from "@/components/ui/not-found-state";
import InlineErrorState from "@/components/ui/inline-error-state";
import InlineLoader from "@/components/ui/inline-loader";
import PushPrompt from "@/components/ui/push-prompt";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { formatFrequency, formatKind, formatTime, getPreviewList, getVaccinationTone, getVaccinationToneClass, getVaccinationToneLabel } from "@/lib/utils";
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

  const today = new Date().toDateString();

  const groupedSchedule = Object.values(
    schedule.reduce((acc, item) => {
      const key = [
        item.kind,
        item.time_of_day ?? "",
        item.frequency,
        item.custom_frequency ?? "",
      ].join("|");

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);

      return acc;
    }, {} as Record<string, typeof schedule>)
  ).flatMap((items) => {
    const doneItems = items.filter(
      (item) =>
        item.last_done_at &&
        new Date(item.last_done_at).toDateString() === today
    );

    const pendingItems = items.filter(
      (item) =>
        !item.last_done_at ||
        new Date(item.last_done_at).toDateString() !== today
    );

    const groups: Array<{
      kind: string;
      time_of_day: string | null;
      items: typeof schedule;
    }> = [];

    if (doneItems.length > 0) {
      groups.push({
        kind: items[0].kind,
        time_of_day: items[0].time_of_day,
        items: doneItems,
      });
    }

    if (pendingItems.length > 1) {
      groups.push({
        kind: items[0].kind,
        time_of_day: items[0].time_of_day,
        items: pendingItems,
      });
    } else if (pendingItems.length === 1) {
      groups.push({
        kind: items[0].kind,
        time_of_day: items[0].time_of_day,
        items: pendingItems,
      });
    }

    return groups;
  });

  const todayData = getPreviewList(groupedSchedule, 5);
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
            {todayData.visible.map((group) => {
              const isGrouped = group.items.length > 1;
              const today = new Date().toDateString();

              const doneTodayGroup = group.items.every(
                (item) =>
                  item.last_done_at &&
                  new Date(item.last_done_at).toDateString() === today
              );

              if (isGrouped) {
                return (
                  <li
                    key={`${group.kind}-${group.time_of_day}`}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className={doneTodayGroup ? "opacity-50" : ""}>
                      <div className="font-medium text-sm capitalize">
                        {group.kind}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {group.items.length} pets
                        {group.time_of_day
                          ? ` · ${formatTime(group.time_of_day)}`
                          : ""}
                      </div>
                    </div>

                    {doneTodayGroup ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary">
                        Done
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                        {formatFrequency(group.items[0])}
                      </span>
                    )}
                  </li>
                );
              }

              const item = group.items[0];

              const doneToday =
                item.last_done_at &&
                new Date(item.last_done_at).toDateString() ===
                new Date().toDateString();

              const pet = pets.find((p) => p.id === item.pet_id);

              return (
                <li
                  key={item.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className={doneToday ? "opacity-50" : ""}>
                    <div className="font-medium text-sm capitalize">
                      {formatKind(item)}

                      <div className="text-xs text-muted-foreground capitalize">
                        {pet?.name ?? item.title} ·{" "}
                        {item.time_of_day
                          ? formatTime(item.time_of_day)
                          : formatFrequency(item)}
                      </div>
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