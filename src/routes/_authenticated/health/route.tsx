import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/health")({
    component: HealthLayout,
});

function HealthLayout() {
    return <Outlet />;
}