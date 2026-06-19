import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      throw redirect({ to: "/home" });
    }

    throw redirect({ to: "/auth" });
  },
});
