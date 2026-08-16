import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function extractStoragePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;

  const markers = [`/storage/v1/object/public/${bucket}/`, `/object/public/${bucket}/`];

  for (const marker of markers) {
    const idx = url.indexOf(marker);

    if (idx !== -1) {
      return decodeURIComponent(url.slice(idx + marker.length)).split("?")[0];
    }
  }

  return null;
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { error };
  }

  const authError = error as Error & {
    code?: string;
    status?: number;
  };

  return {
    name: authError.name,
    message: authError.message,
    code: authError.code,
    status: authError.status,
  };
}

async function deleteProfilePhoto(userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  // A missing profile must not prevent deletion of an otherwise valid account.
  if (error && error.code !== "PGRST116") throw error;

  if (!profile?.avatar_url) return;

  const path = extractStoragePath(profile.avatar_url, "profile-photos");

  if (!path) return;

  const { error: storageError } = await supabase.storage.from("profile-photos").remove([path]);

  if (storageError) {
    console.error("Failed to delete profile photo", storageError);
  }
}

async function deletePetPhotos(userId: string) {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("photo_url")
    .eq("user_id", userId);

  if (error) throw error;

  const paths = (pets ?? [])
    .map((pet) => extractStoragePath(pet.photo_url, "pet-photos"))
    .filter((path): path is string => !!path);

  if (paths.length === 0) return;

  const { error: storageError } = await supabase.storage.from("pet-photos").remove(paths);

  if (storageError) {
    console.error("Failed to delete pet photos", storageError);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    await Promise.all([deleteProfilePhoto(user.id), deletePetPhotos(user.id)]);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Supabase Auth rejected account deletion", {
        userId: user.id,
        ...errorDetails(deleteError),
      });
      throw deleteError;
    }

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error("Account deletion failed", {
      userId: user.id,
      ...errorDetails(err),
    });

    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
