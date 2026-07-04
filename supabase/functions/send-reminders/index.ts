import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cron runs every 5 minutes — this is the tolerance window for "is it time yet".
const WINDOW_MINUTES = 10;
const HEADS_UP_MINUTES = 10;

// MVP: single fixed timezone offset (Pakistan Standard Time, UTC+5, no DST).
// time_of_day is entered by users in local time but the server clock is UTC,
// so we shift "now" forward by this offset before comparing against time_of_day.
const LOCAL_OFFSET_MINUTES = 5 * 60;

type DueNotification = {
  refType: string;
  refId: string;
  fireDate: string; // YYYY-MM-DD, used for dedupe
  userId: string;
  title: string;
  body: string;
};

function withinWindow(targetMs: number, nowMs: number, windowMin: number) {
  const diff = targetMs - nowMs;
  // True if target falls within the last WINDOW_MINUTES up to now (catch-up safe)
  return diff <= 0 && diff > -windowMin * 60_000;
}

function todayDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function findDueScheduleNotifications(
  now: Date,
): Promise<DueNotification[]> {
  const { data: items, error } = await supabase
    .from("schedule_items")
    .select(`id, user_id, title, kind, time_of_day, frequency, 
    schedule_item_pets (
    id,
    pet_id,
    pets (name),
    schedule_completions (
    schedule_item_pet_id,
      completed_on
    )
  )`)
    .not("time_of_day", "is", null);

  if (error) {
    console.error("Failed to fetch schedule_items", error);
    return [];
  }

  const out: DueNotification[] = [];
  const localNow = new Date(now.getTime() + LOCAL_OFFSET_MINUTES * 60_000);
  const today = todayDateStr(localNow);

  for (const item of items ?? []) {
    if (item.frequency !== "daily") continue; // MVP: only daily-frequency items are time-triggered for now

    const petStatuses = item.schedule_item_pets ?? [];

    const pendingPets = petStatuses.filter((pet) => {
      const completions = (pet.schedule_completions ?? []).filter(
        (c) => c.schedule_item_pet_id === pet.id,
      );

      if (completions.length === 0) {
        return true;
      }

      const latest = completions.reduce((a, b) =>
        a.completed_on > b.completed_on ? a : b
      );

      return latest.completed_on !== today;
    });

    const [h, m] = String(item.time_of_day).split(":").map(Number);
    const target = new Date(localNow);
    target.setUTCHours(h, m, 0, 0);

    const targetMs = target.getTime();
    const nowMs = localNow.getTime();

    if (pendingPets.length === 0) {
      continue;
    }

    const petNames = pendingPets
      .flatMap((p) => p.pets ?? [])
      .map((pet) => pet.name)
      .filter((n): n is string => !!n)
      .sort();

    if (withinWindow(targetMs, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: "schedule_due",
        refId: item.id,
        fireDate: today,
        userId: item.user_id,
        title: `Time for ${item.title}`,
        body: buildScheduleBody(
          item.kind,
          petNames,
          false,
        ),
      });
    } else if (
      withinWindow(targetMs - HEADS_UP_MINUTES * 60_000, nowMs, WINDOW_MINUTES)
    ) {
      out.push({
        refType: "schedule_heads_up",
        refId: item.id,
        fireDate: today,
        userId: item.user_id,
        title: `Coming up: ${item.title}`,
        body: buildScheduleBody(
          item.kind,
          petNames,
          true,
        ),
      });
    }
  }

  return out;
}

async function findDueVetNotifications(now: Date): Promise<DueNotification[]> {
  const { data: appts, error } = await supabase
    .from("vet_appointments")
    .select("id, user_id, pet_id, date, reason, completed, pets(name)")
    .eq("completed", false);

  if (error) {
    console.error("Failed to fetch vet_appointments", error);
    return [];
  }

  const out: DueNotification[] = [];

  const localNow =
    new Date(now.getTime() + LOCAL_OFFSET_MINUTES * 60000);

  const nowMs = localNow.getTime();
  const fireDate = todayDateStr(localNow);

  for (const appt of appts ?? []) {
    const apptMs = new Date(appt.date).getTime();
    const petName = (appt as { pets?: { name?: string } }).pets?.name ??
      "your pet";

    if (withinWindow(apptMs - 24 * 60 * 60_000, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: "vet_1day",
        refId: appt.id,
        fireDate,
        userId: appt.user_id,
        title: `Vet visit tomorrow`,
        body: `${petName} · ${appt.reason}`,
      });
    }
    if (withinWindow(apptMs - 60 * 60_000, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: "vet_1hour",
        refId: appt.id,
        fireDate,
        userId: appt.user_id,
        title: `Vet visit in 1 hour`,
        body: `${petName} · ${appt.reason}`,
      });
    }
  }

  return out;
}

async function findDueHealthNotifications(
  now: Date,
  table: "vaccinations" | "dewormings",
): Promise<DueNotification[]> {
  const isVaccination = table === "vaccinations";

  const query = isVaccination
    ? supabase
      .from("vaccinations")
      .select("id,user_id,next_due_at,completed_at,vaccine_name,pets(name)")
      .is("completed_at", null)
    : supabase
      .from("dewormings")
      .select(
        "id,user_id,next_due_at,product_name,pets(name)",
      );

  const { data, error } = await query.not("next_due_at", "is", null).order("next_due_at");

  if (error) {
    console.error(`Failed to fetch ${table}`, error);
    return [];
  }

  const out: DueNotification[] = [];

  const localNow = new Date(now.getTime() + LOCAL_OFFSET_MINUTES * 60_000);
  const nowMs = localNow.getTime();
  const fireDate = todayDateStr(localNow);

  for (const item of data ?? []) {

    const [year, month, day] = item.next_due_at!.split("-").map(Number);

    const dueDate = new Date(Date.UTC(year, month - 1, day));
    dueDate.setUTCMinutes(dueDate.getUTCMinutes() + LOCAL_OFFSET_MINUTES);

    const dueMs = new Date(item.next_due_at!).getTime();

    const petName = (item as { pets?: { name?: string } }).pets?.name ??
      "your pet";

    const treatmentName = isVaccination
      ? (item as { vaccine_name: string }).vaccine_name
      : (item as { product_name: string }).product_name;

    console.log({
      next_due_at: item.next_due_at,
      due: new Date(item.next_due_at!).toISOString(),
      dueMs,
      now: localNow.toISOString(),
      diffHours: (dueMs - nowMs) / 3_600_000,
    });

    if (withinWindow(dueMs - 24 * 60 * 60_000, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: `${table}_1day`,
        refId: item.id,
        fireDate,
        userId: item.user_id,
        title: isVaccination ? "Vaccination due tomorrow" : "Deworming due tomorrow",
        body: `${petName} is due for ${treatmentName}.`
      });
    }

    if (withinWindow(dueMs - 60 * 60_000, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: `${table}_1hour`,
        refId: item.id,
        fireDate,
        userId: item.user_id,
        title: isVaccination ? "Vaccination due in 1 hour" : "Deworming due in 1 hour",
        body: `${petName} is due for ${treatmentName}.`
      });
    }
  }

  return out;
}

function formatPetNames(names: string[]): string {
  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  if (names.length === 3) {
    return `${names[0]}, ${names[1]} and ${names[2]}`;
  }

  const shown = names.slice(0, 3).join(", ");
  return `${shown} +${names.length - 3} more`;
}

function buildScheduleBody(
  kind: string | undefined,
  names: string[],
  isHeadsUp: boolean,
) {
  const pets = formatPetNames(names);

  const action = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Task";

  if (names.length <= 3) {
    return isHeadsUp
      ? `In ${HEADS_UP_MINUTES} minutes · ${action} for ${pets}`
      : `${action} for ${pets}`;
  }

  return isHeadsUp
    ? `In ${HEADS_UP_MINUTES} minutes · ${pets} need ${action}`
    : `${pets} need ${action}`;
}

async function sendToUser(
  userId: string,
  payload: { title: string; body: string },
) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked — clean it up
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push send failed", sub.id, err);
        }
      }
    }),
  );
}

export default {
  fetch: async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const now = new Date();

    const [
      schedules,
      vets,
      vaccinations,
      dewormings,
    ] = await Promise.all([
      findDueScheduleNotifications(now),
      findDueVetNotifications(now),
      findDueHealthNotifications(now, "vaccinations"),
      findDueHealthNotifications(now, "dewormings"),
    ]);

    const due = [
      ...schedules,
      ...vets,
      ...vaccinations,
      ...dewormings,
    ];

    let sent = 0;
    for (const n of due) {
      // Dedupe: try to claim this notification by inserting into the log first.
      // If it already exists (unique violation), skip — it was already sent.
      const { error: logError } = await supabase.from("notification_log")
        .insert({
          ref_type: n.refType,
          ref_id: n.refId,
          fire_date: n.fireDate,
        });

      if (logError) {
        // 23505 = unique_violation in Postgres — expected when already sent
        if (logError.code !== "23505") {
          console.error("Log insert failed", logError);
        }
        continue;
      }

      await sendToUser(n.userId, { title: n.title, body: n.body });
      sent++;
    }

    return Response.json({ checked: due.length, sent });
  },
};
