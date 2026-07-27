import { z } from "zod";

export const profileSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    timezone: z.string(),
    locale: z.string(),
    notifications_enabled: z.boolean(),
    has_completed_onboarding: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

export const profileFormSchema = z.object({
    display_name: z.string().trim().min(1, "Name is required"),
    avatar_url: z.string().default(""),
    timezone: z.string().default("UTC"),
    locale: z.string().default("en"),
    notifications_enabled: z.boolean().default(true),
    has_completed_onboarding: z.boolean().default(false),
});

export type ProfileForm = z.infer<typeof profileFormSchema>;

export const profileFormDefaults: ProfileForm = {
    display_name: "",
    avatar_url: "",
    timezone: "UTC",
    locale: "en",
    notifications_enabled: true,
    has_completed_onboarding: false,
};

export function profileToForm(profile: Profile): ProfileForm {
    return {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url ?? "",
        timezone: profile.timezone,
        locale: profile.locale,
        notifications_enabled: profile.notifications_enabled,
        has_completed_onboarding: profile.has_completed_onboarding,
    };
}

export function createEmptyProfileForm(): ProfileForm {
    return {
        ...profileFormDefaults,
    };
}