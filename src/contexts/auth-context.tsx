import { createContext, useContext } from "react";

import type { User } from "@supabase/supabase-js";

import { Profile } from "@/schemas/profile";

type AuthContextValue = {
    user: User;
    profile: Profile;
    refetchProfile: () => Promise<unknown>;
    signOut: () => void;
    signingOut: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthContext");
    }

    return context;
}