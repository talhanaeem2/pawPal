import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushPermissionState() {
  if (!pushSupported()) return "unsupported" as const;
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

type PushResult = { ok: boolean; error?: string };

async function saveSubscription(sub: PushSubscription): Promise<PushResult> {
  const json = sub.toJSON();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not signed in." };

  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: false, error: "The browser returned an invalid push subscription." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userData.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Restores a browser subscription after the server has discarded an expired
 * endpoint. This never opens a permission prompt: it only runs after the
 * browser has already granted notification permission.
 */
export async function syncPushSubscription(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, error: "Push isn't supported on this browser." };

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) return { ok: false, error: "Missing VAPID public key." };

  if (Notification.permission !== "granted") {
    return { ok: false, error: "Permission was not granted." };
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  return saveSubscription(sub);
}

export async function subscribeToPush(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, error: "Push isn't supported on this browser." };

  // Browsers require this permission request to be initiated by a user action.
  // Once it has been granted, syncPushSubscription handles future repairs
  // without asking the user again.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Permission was not granted." };

  return syncPushSubscription();
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Push isn't supported on this browser." };

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
