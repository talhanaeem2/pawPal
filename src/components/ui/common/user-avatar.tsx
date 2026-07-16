import { User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

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

function getContentSize(size: string) {
    if (size.includes("20") || size.includes("24")) {
        return {
            text: "text-2xl",
            icon: "h-10 w-10",
        };
    }

    if (size.includes("16")) {
        return {
            text: "text-xl",
            icon: "h-8 w-8",
        };
    }

    if (size.includes("12")) {
        return {
            text: "text-base",
            icon: "h-6 w-6",
        };
    }

    return {
        text: "text-xs",
        icon: "h-4 w-4",
    };
}

export function UserAvatar({
    name,
    avatarUrl,
    className = "h-8 w-8",
}: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [avatarUrl]);

    const initials = getInitials(name);
    const size = getContentSize(className);

    if (avatarUrl && !imageError) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? "User"}
                onError={() => setImageError(true)}
                className={cn(
                    "rounded-full object-cover shrink-0",
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                "rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-semibold select-none",
                className
            )}
        >
            {initials ? (
                <span className={size.text}>{initials}</span>
            ) : (
                <UserIcon className={size.icon} />
            )}
        </div>
    );
}