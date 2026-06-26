import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Loader from "@/components/ui/loader";
import InstallPrompt from "@/components/ui/install-prompt";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottomNav";
import { User } from "@supabase/supabase-js";
import { AuthContext } from "@/contexts/auth-context";
import ErrorState from "@/components/ui/error-state";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch
  } = useQuery({
    ...profileQuery(user?.id ?? ""),
    enabled: !!user,
    staleTime: Infinity,
  });

  if (profileError) {
    return <ErrorState onRetry={refetch} />
  }

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        await supabase.auth.signOut();

        navigate({ to: "/auth", replace: true });
        return;
      }

      setUser(user);
      setChecked(true);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!checked) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  if (profileLoading) {
    return <Loader />;
  }

  if (!profile) {
    return <ErrorState />;
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();

    await qc.cancelQueries();
    qc.clear();
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, profile }}>
      <div className="min-h-screen pb-24">
        <Header onSignOut={signOut} loading={loading} />
        <main className="mx-auto max-w-2xl px-5 py-6">
          <Outlet />
        </main>
        <BottomNav pathname={pathname} />
        <InstallPrompt />
      </div>
    </AuthContext.Provider>
  );
}
