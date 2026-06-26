import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

type AuthContextValue = {
    user: User;
    profile: Profile;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthContext");
    }

    return context;
}