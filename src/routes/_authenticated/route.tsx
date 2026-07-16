import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { User } from "@supabase/supabase-js";
import { AuthContext } from "@/contexts/auth-context";

import Loader from "@/components/ui/common/loader";
import InstallPrompt from "@/components/ui/common/install-prompt";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottomNav";
import ErrorState from "@/components/ui/common/error-state";

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
  const [signingOut, setSigningOut] = useState(false);
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

      setUser((prev) => {
        if (!prev) return session.user;
        if (prev.id !== session.user.id) return session.user;
        return prev;
      });
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
    try {
      setSigningOut(true);

      await supabase.auth.signOut();

      await qc.cancelQueries();
      qc.clear();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, refetchProfile: refetch, signOut, signingOut, }}>
      <div className="h-dvh flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 mx-auto max-w-2xl px-5 py-2 w-full">
          <Outlet />
        </main>
        <BottomNav pathname={pathname} />
        <InstallPrompt />
      </div>
    </AuthContext.Provider>
  );
}
