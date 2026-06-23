import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery, vetQuery, activityQuery } from "@/lib/pet-queries";
import { Calendar, Stethoscope, Activity, Plus, PawPrint } from "lucide-react";

import NotFoundState from "@/components/ui/not-found-state";
import InlineErrorState from "@/components/ui/inline-error-state";
import InlineLoader from "@/components/ui/inline-loader";
import PushPrompt from "@/components/ui/push-prompt";
import { PetAvatar } from "@/components/ui/pet-avatar";

export const Route = createFileRoute("/_authenticated/home")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(scheduleQuery);
    context.queryClient.ensureQueryData(vetQuery);
    context.queryClient.ensureQueryData(activityQuery);
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

  const today = schedule.slice(0, 5);
  const upcomingVet = vet.filter((v) => !v.completed && new Date(v.date) >= new Date(Date.now() - 86_400_000)).slice(0, 3);
  const recentActivity = activity.slice(0, 3);

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
        {today.length === 0 ? (
          <Empty text="No reminders yet." cta="Add one" href="/schedule" />
        ) : (
          <ul className="divide-y divide-border/60">
            {today.map((s) => {
              const doneToday = s.last_done_at && new Date(s.last_done_at).toDateString() === new Date().toDateString();
              return (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div className={doneToday ? "opacity-50" : ""}>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {s.kind} · {s.time_of_day?.slice(0, 5) ?? s.frequency}
                    </div>
                  </div>
                  {doneToday
                    ? <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary capitalize">Done</span>
                    : <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">{s.frequency}</span>
                  }
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Upcoming vet" icon={Stethoscope} href="/vet">
        {upcomingVet.length === 0 ? (
          <Empty text="Nothing booked." cta="Schedule visit" href="/vet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {upcomingVet.map((v) => (
              <li key={v.id} className="py-3">
                <div className="font-medium text-sm">{v.reason}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(v.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {v.vet_name ? ` · ${v.vet_name}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent activity" icon={Activity} href="/activity">
        {recentActivity.length === 0 ? (
          <Empty text="No walks logged yet." cta="Log one" href="/activity" />
        ) : (
          <ul className="divide-y divide-border/60">
            {recentActivity.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm capitalize">{a.activity_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.duration_min ? `${a.duration_min} min` : a.value ? `${a.value}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, href, children }: { title: string; icon: typeof Calendar; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <h2 className="font-display text-lg">{title}</h2>
        </div>
        <Link to={href} className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ text, cta, href }: { text: string; cta: string; href: string }) {
  return (
    <div className="py-2 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link to={href} className="text-xs font-medium text-primary hover:underline">{cta} →</Link>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}