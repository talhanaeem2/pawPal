import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/pets/$petId')({
    component: SinglePetLayout,
})

function SinglePetLayout() {
    return <Outlet />;
}
