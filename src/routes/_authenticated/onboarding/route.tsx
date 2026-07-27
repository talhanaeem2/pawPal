import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.has_completed_onboarding) {
      navigate({ to: "/", replace: true });
    }
  }, [profile?.has_completed_onboarding, navigate]);

  if (profile?.has_completed_onboarding) return null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <main className="flex-1 min-h-0 mx-auto max-w-2xl px-5 py-2 w-full items-center flex justify-center">
        <Outlet />
      </main>
    </div>
  );
}