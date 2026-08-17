import { createFileRoute, type ErrorComponentProps, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, type UIEvent } from "react";
import {
  Calendar,
  Stethoscope,
  Activity,
  Plus,
  PawPrint,
  Syringe,
  ShieldPlus,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Clock3,
} from "lucide-react";

import {
  petsQuery,
  scheduleQuery,
  vetQuery,
  activityQuery,
  vaccinationsQuery,
  dewormingsQuery,
} from "@/lib/queries";
import { formatPetNames } from "@/lib/pet-utils";
import { formatKind } from "@/lib/schedule-utils";
import { getActiveVaccinations } from "@/lib/vaccinations-utils";
import { getActiveDewormings } from "@/lib/dewormings-utils";
import {
  cn,
  formatTime,
  getPreviewList,
  todayDateString,
  greeting,
  sectionStyle,
  getTimeSection,
  sectionOrder,
} from "@/lib/utils";

import NotFoundState from "@/components/ui/common/not-found-state";
import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import PushPrompt from "@/components/ui/common/push-prompt";
import { Section } from "@/components/layout/section";
import { Empty } from "@/components/ui/common/empty";
import { Page } from "@/components/layout/page";
import { PetAvatar } from "@/components/ui/common/pet-avatar";
import { DewormingRow } from "@/components/ui/dewormings/deworming-row";
import { VetRow } from "@/components/ui/vet/vet-row";
import { VaccinationRow } from "@/components/ui/vaccinations/vaccination-row";

export const Route = createFileRoute("/_authenticated/home")({
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.ensureQueryData(petsQuery),
      context.queryClient.ensureQueryData(scheduleQuery),
      context.queryClient.ensureQueryData(vetQuery),
      context.queryClient.ensureQueryData(activityQuery),
      context.queryClient.ensureQueryData(vaccinationsQuery),
      context.queryClient.ensureQueryData(dewormingsQuery),
    ]),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Home · Pawpal" }] }),
  component: Home,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function Home() {
  const petDockHeaderRef = useRef<HTMLDivElement>(null);
  const petDockIntroRef = useRef<HTMLDivElement>(null);
  const petDockRef = useRef<HTMLElement>(null);
  const scrollProgressRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: schedule } = useSuspenseQuery(scheduleQuery);
  const { data: vet } = useSuspenseQuery(vetQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);
  const { data: dewormings } = useSuspenseQuery(dewormingsQuery);

  const today = todayDateString();

  const upcomingVetSorted = vet
    .filter((v) => {
      if (v.completed) return false;
      const ms = new Date(v.date).getTime();
      return ms >= Date.now() - 86_400_000 && ms <= Date.now() + 7 * 86_400_000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingVetData = getPreviewList(upcomingVetSorted, 3);
  const recentActivityData = getPreviewList(activity, 3);

  const vaccinationData = getPreviewList(
    getActiveVaccinations(vaccinations).filter((v) => {
      if (!v.next_due_at) return false;
      return new Date(v.next_due_at).getTime() <= Date.now() + 7 * 86_400_000;
    }),
    3,
  );

  const dewormingData = getPreviewList(
    getActiveDewormings(dewormings).filter((d) => {
      if (!d.next_due_at) return false;
      return new Date(d.next_due_at).getTime() <= Date.now() + 7 * 86_400_000;
    }),
    3,
  );

  const hasVaccinations = vaccinations.length > 0;
  const hasDewormings = dewormings.length > 0;
  const hasVetVisits = vet.length > 0;
  const hasActivities = activity.length > 0;
  const showExploreCard = !hasVaccinations || !hasDewormings || !hasVetVisits || !hasActivities;

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  function handleContentScroll(event: UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const maxScrollTop = container.scrollHeight - container.clientHeight;

    if (maxScrollTop < 112) {
      return;
    }

    scrollProgressRef.current = Math.min(event.currentTarget.scrollTop / 112, 1);

    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      const progress = scrollProgressRef.current;
      const header = petDockHeaderRef.current;
      const intro = petDockIntroRef.current;
      const dock = petDockRef.current;

      if (header) {
        header.style.paddingTop = `${4 + 12 * (1 - progress)}px`;
        header.style.paddingBottom = `${8 + 4 * (1 - progress)}px`;
        header.style.gap = `${12 * (1 - progress)}px`;
      }

      if (intro) {
        intro.style.maxHeight = `${intro.scrollHeight * (1 - progress)}px`;
        intro.style.opacity = String(1 - progress);
        intro.style.transform = `translateY(${-8 * progress}px)`;
        intro.style.pointerEvents = progress > 0.98 ? "none" : "";
      }

      if (dock) {
        dock.style.gap = `${12 - 4 * progress}px`;
        dock.style.paddingBottom = `${8 - 4 * progress}px`;

        dock.querySelectorAll<HTMLElement>("[data-pet-dock-item]").forEach((item) => {
          item.style.width = `${128 - 88 * progress}px`;
          item.style.height = `${56 - 16 * progress}px`;
          item.style.paddingInline = `${10 * (1 - progress)}px`;
          item.style.gap = `${10 * (1 - progress)}px`;

          const label = item.querySelector<HTMLElement>("[data-pet-dock-label]");

          if (label) {
            label.style.width = `${64 * (1 - progress)}px`;
            label.style.opacity = String(1 - progress);
          }
        });
      }

      scrollFrameRef.current = null;
    });
  }

  if (pets.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <PawPrint className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl mt-4">Welcome to Pawpal</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Add your first pet to keep track of reminders, vaccinations, dewormings, vet visits, and
          everyday care—all in one place.
        </p>
        <Link
          to="/pets"
          search={{ new: true }}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add a pet
        </Link>
      </div>
    );
  }

  return (
    <Page>
      <Page.Header ref={petDockHeaderRef} className="gap-3 pt-4 pb-3">
        <div
          ref={petDockIntroRef}
          className="max-h-64 overflow-hidden will-change-[max-height,opacity,transform] motion-reduce:transform-none"
        >
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="font-display text-3xl mt-1">
              Today with{" "}
              {pets
                .map((p) => p.name)
                .slice(0, 2)
                .join(" & ")}
            </h1>
          </div>
          <div className="mt-4">
            <PushPrompt />
          </div>
        </div>
        <nav
          ref={petDockRef}
          aria-label="Your pets"
          className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2"
        >
          {pets.map((p) => (
            <Link
              key={p.id}
              to="/pets/$petId"
              params={{ petId: p.id }}
              aria-label={`Open ${p.name}'s profile`}
              data-pet-dock-item
              className="flex h-14 w-32 shrink-0 items-center gap-2.5 overflow-hidden rounded-full bg-card px-2.5 shadow-(--shadow-soft) hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary will-change-[width,height,padding,gap]"
            >
              <PetAvatar pet={p} className="h-10 w-10 min-w-10 text-2xl" />
              <div
                data-pet-dock-label
                className="w-16 min-w-0 overflow-hidden whitespace-nowrap will-change-[width,opacity]"
              >
                <div className="truncate text-sm font-medium capitalize">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground capitalize">{p.breed ?? p.species}</div>
              </div>
            </Link>
          ))}
        </nav>
      </Page.Header>

      <Page.Content onScroll={handleContentScroll}>
        <Section title="Today's care" icon={Calendar} href="/schedule">
          {schedule.length === 0 ? (
            <Empty
              text="No reminders yet."
              cta="Add reminder"
              href="/schedule"
              search={{ new: true }}
            />
          ) : (
            (() => {
              const rows = schedule.flatMap((item) => {
                const times = item.times_of_day.length > 0 ? item.times_of_day : [null as null];

                return times.map((time) => ({
                  item,
                  time,
                  key: `${item.id}-${time ?? "no-time"}`,
                }));
              });

              const groupedRows = rows.reduce(
                (acc, row) => {
                  const section = getTimeSection(row.time);

                  if (!acc[section]) {
                    acc[section] = [];
                  }

                  acc[section].push(row);

                  return acc;
                },
                {} as Record<string, typeof rows>,
              );

              return (
                <div className="space-y-3">
                  {sectionOrder.map((section) => {
                    const sectionRows = groupedRows[section];

                    if (!sectionRows?.length) return null;

                    const timeGroups = sectionRows.reduce(
                      (acc, row) => {
                        const key = row.time ?? "no-time";

                        if (!acc[key]) {
                          acc[key] = [];
                        }

                        acc[key].push(row);

                        return acc;
                      },
                      {} as Record<string, typeof sectionRows>,
                    );

                    const { Icon: SectionIcon } = sectionStyle(section);

                    return (
                      <div
                        key={section}
                        className={cn(
                          "rounded-2xl border-l-4 pl-4 py-2",
                          sectionStyle(section).border,
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <SectionIcon className={cn("h-4 w-4", sectionStyle(section).icon)} />
                          <h3 className="text-xs font-semibold uppercase tracking-wide">
                            {section}
                          </h3>
                        </div>

                        <ul className="divide-border/60 flex flex-col gap-4">
                          {Object.entries(timeGroups).map(([timeKey, rows], index) => {
                            return (
                              <li key={timeKey}>
                                {index > 0 && <div className="mb-1 h-px bg-border/50" />}
                                {timeKey !== "no-time" && (
                                  <div
                                    className={cn(
                                      "mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold items-center",
                                      sectionStyle(section).pill,
                                    )}
                                  >
                                    {formatTime(timeKey)}
                                  </div>
                                )}
                                <div className="space-y-2">
                                  {rows.map(({ item, time, key }) => {
                                    const petStatuses = item.schedule_item_pets.map((sip) => ({
                                      ...sip,
                                      pet: pets.find((p) => p.id === sip.pet_id),
                                      done: sip.schedule_completions.some(
                                        (c) => c.completed_on === today && c.time_slot === time,
                                      ),
                                    }));

                                    const doneToday =
                                      petStatuses.length > 0 && petStatuses.every((p) => p.done);

                                    const petLabel = formatPetNames(
                                      petStatuses
                                        .map((p) => p.pet?.name)
                                        .filter((n): n is string => !!n),
                                    );

                                    return (
                                      <div
                                        key={key}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <div
                                          className={cn(
                                            doneToday && "opacity-70",
                                            "transition-all duration-200 min-w-0",
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              doneToday && "line-through",
                                              "text-sm capitalize truncate",
                                            )}
                                          >
                                            {item.title}
                                          </div>
                                          <div className="text-xs text-muted-foreground capitalize truncate">
                                            {petLabel && `${petLabel} · `}
                                            {formatKind(item)}
                                          </div>
                                        </div>

                                        {doneToday && (
                                          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary">
                                            Completed
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </Section>

        {upcomingVetData.visible.length > 0 && (
          <Section title="Upcoming vet" icon={Stethoscope} href="/health/vet">
            <ul className="divide-y divide-border/60">
              {upcomingVetData.visible.map((v) => (
                <VetRow item={v} pets={pets} key={v.id} />
              ))}
              {upcomingVetData.remaining > 0 && (
                <Link to="/health/vet" className="block py-2 text-xs text-primary hover:underline">
                  +{upcomingVetData.remaining} more visits →
                </Link>
              )}
            </ul>
          </Section>
        )}

        {recentActivityData.visible.length > 0 && (
          <Section title="Recent activity" icon={Activity} href="/activity">
            <ul className="divide-y divide-border/60">
              {recentActivityData.visible.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm capitalize">{a.activity_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.occurred_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
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
          </Section>
        )}

        {vaccinationData.visible.length > 0 && (
          <Section title="Vaccinations" icon={Syringe} href="/health/vaccinations">
            <ul className="divide-y divide-border/60">
              {vaccinationData.visible.map((v) => (
                <VaccinationRow item={v} pets={pets} key={v.id} />
              ))}
              {vaccinationData.remaining > 0 && (
                <Link
                  to="/health/vaccinations"
                  className="block py-2 text-xs text-primary hover:underline"
                >
                  +{vaccinationData.remaining} more vaccinations →
                </Link>
              )}
            </ul>
          </Section>
        )}

        {dewormingData.visible.length > 0 && (
          <Section title="Dewormings" icon={Syringe} href="/health/dewormings">
            <ul className="divide-y divide-border/60">
              {dewormingData.visible.map((d) => (
                <DewormingRow item={d} pets={pets} key={d.id} />
              ))}
              {dewormingData.remaining > 0 && (
                <Link
                  to="/health/dewormings"
                  className="block py-2 text-xs text-primary hover:underline"
                >
                  +{dewormingData.remaining} more dewormings →
                </Link>
              )}
            </ul>
          </Section>
        )}

        {showExploreCard && (
          <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <h2 className="font-display text-lg">Get started</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your pet's health and history organized.
            </p>

            <div className="mt-4 space-y-2">
              {!hasVaccinations && (
                <Link
                  to="/health/vaccinations"
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <Syringe className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Vaccinations</p>
                      <p className="text-xs text-muted-foreground">Track vaccines and reminders</p>
                    </div>
                  </div>
                </Link>
              )}

              {!hasDewormings && (
                <Link
                  to="/health/dewormings"
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <ShieldPlus className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Dewormings</p>
                      <p className="text-xs text-muted-foreground">
                        Keep deworming schedules on track
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {!hasActivities && (
                <Link
                  to="/activity"
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Activity</p>
                      <p className="text-xs text-muted-foreground">Log walks, weight and more</p>
                    </div>
                  </div>
                </Link>
              )}

              {!hasVetVisits && (
                <Link
                  to="/health/vet"
                  search={{ new: true }}
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Vet visits</p>
                      <p className="text-xs text-muted-foreground">
                        Schedule checkups and appointments
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}
        <div className="h-24 shrink-0" aria-hidden="true" />
      </Page.Content>
    </Page>
  );
}
