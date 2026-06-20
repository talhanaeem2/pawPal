import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Loader from "@/components/ui/loader";
import InstallPrompt from "@/components/ui/install-prompt";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        navigate({ to: "/auth", replace: true });
      } else {
        setChecked(true);
      }
    });
    return () => { active = false; };
  }, [navigate]);

  if (!checked) return <Loader />;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen pb-24">
      <Header onSignOut={signOut} />
      <main className="mx-auto max-w-2xl px-5 py-6">
        <Outlet />
      </main>
      <BottomNav pathname={pathname} />
      <InstallPrompt />
    </div>
  );
}
