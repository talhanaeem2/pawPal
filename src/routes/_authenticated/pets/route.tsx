import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pets")({
    component: PetLayout,
});

function PetLayout() {
    return <Outlet />;
}