import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, PawPrint, Calendar, Stethoscope, Activity, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Loader from "@/components/ui/loader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

const nav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/pets", label: "Pets", icon: PawPrint },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/vet", label: "Vet", icon: Stethoscope },
  { to: "/activity", label: "Activity", icon: Activity },
] as const;

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
      <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-14">
          <Link to="/home" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="font-display text-lg">Pawpal</span>
          </Link>
          <button onClick={signOut}
            className="text-muted-foreground hover:text-foreground p-2 rounded-full"
            aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl grid grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
            return (
              <Link key={to} to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
