import { User as UserIcon } from "lucide-react";
import { useState } from "react";

type UserAvatarProps = {
    name?: string | null;
    avatarUrl?: string | null;
    className?: string;
};

function getInitials(name?: string | null) {
    if (!name) return null;

    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return parts[0].slice(0, 2).toUpperCase();
}

export function UserAvatar({
    name,
    avatarUrl,
    className = "h-8 w-8",
}: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);

    const initials = getInitials(name);

    if (avatarUrl && !imageError) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? "User"}
                className={`${className} rounded-full object-cover`}
                onError={() => setImageError(true)}
            />
        );
    }

    if (initials) {
        return (
            <div
                className={`${className} rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium`}
            >
                {initials}
            </div>
        );
    }

    return (
        <div
            className={`${className} rounded-full bg-primary/20 flex items-center justify-center`}
        >
            <UserIcon className="h-4 w-4" />
        </div>
    );
}