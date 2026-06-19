import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PawPrint } from "lucide-react";

import Loader from "@/components/ui/loader";

export const Route = createFileRoute("/auth")({
  ssr: false,
  pendingComponent: () => <Loader />,
  head: () => ({
    meta: [
      { title: "Sign in · Pawpal" },
      { name: "description", content: "Sign in to your Pawpal pet care account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        navigate({ to: "/", replace: true });
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: "/", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{ background: "linear-gradient(160deg, var(--sage-soft) 0%, var(--cream) 45%, var(--peach-soft) 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-card shadow-(--shadow-soft) flex items-center justify-center">
            <PawPrint className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-3xl mt-4">Pawpal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Welcome back." : "A calmer way to care for your pets."}
          </p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-(--shadow-soft)">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-11">
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" onClick={google} disabled={loading}
            className="w-full rounded-full h-11 bg-background">
            Continue with Google
          </Button>

          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
