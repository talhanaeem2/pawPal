import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cron runs every 5 minutes — this is the tolerance window for "is it time yet".
const WINDOW_MINUTES = 5;
const HEADS_UP_MINUTES = 10;

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

async function findDueScheduleNotifications(now: Date): Promise<DueNotification[]> {
  const { data: items, error } = await supabase
    .from("schedule_items")
    .select("id, user_id, pet_id, title, kind, time_of_day, frequency, last_done_at, pets(name)")
    .not("time_of_day", "is", null);

  if (error) {
    console.error("Failed to fetch schedule_items", error);
    return [];
  }

  const out: DueNotification[] = [];
  const today = todayDateStr(now);

  for (const item of items ?? []) {
    if (item.frequency !== "daily") continue; // MVP: only daily-frequency items are time-triggered for now

    const doneToday =
      item.last_done_at && todayDateStr(new Date(item.last_done_at)) === today;
    if (doneToday) continue;

    const [h, m] = String(item.time_of_day).split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    const targetMs = target.getTime();
    const nowMs = now.getTime();

    const petName = (item as { pets?: { name?: string } }).pets?.name ?? "your pet";

    if (withinWindow(targetMs, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: "schedule_due",
        refId: item.id,
        fireDate: today,
        userId: item.user_id,
        title: `Time for ${item.title}`,
        body: `${petName} · ${item.kind}`,
      });
    } else if (withinWindow(targetMs - HEADS_UP_MINUTES * 60_000, nowMs, WINDOW_MINUTES)) {
      out.push({
        refType: "schedule_heads_up",
        refId: item.id,
        fireDate: today,
        userId: item.user_id,
        title: `Coming up: ${item.title}`,
        body: `In ${HEADS_UP_MINUTES} minutes · ${petName}`,
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
  const nowMs = now.getTime();

  for (const appt of appts ?? []) {
    const apptMs = new Date(appt.date).getTime();
    const petName = (appt as { pets?: { name?: string } }).pets?.name ?? "your pet";
    const fireDate = todayDateStr(now);

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

async function sendToUser(userId: string, payload: { title: string; body: string }) {
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
    const due = [
      ...(await findDueScheduleNotifications(now)),
      ...(await findDueVetNotifications(now)),
    ];

    let sent = 0;
    for (const n of due) {
      // Dedupe: try to claim this notification by inserting into the log first.
      // If it already exists (unique violation), skip — it was already sent.
      const { error: logError } = await supabase.from("notification_log").insert({
        ref_type: n.refType,
        ref_id: n.refId,
        fire_date: n.fireDate,
      });

      if (logError) {
        // 23505 = unique_violation in Postgres — expected when already sent
        if (logError.code !== "23505") console.error("Log insert failed", logError);
        continue;
      }

      await sendToUser(n.userId, { title: n.title, body: n.body });
      sent++;
    }

    return Response.json({ checked: due.length, sent });
  },
};